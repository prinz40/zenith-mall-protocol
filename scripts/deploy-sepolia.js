// Zenith Mall Escrow v2 - Deploy to Sepolia - 90/10
// Run: npx hardhat compile && npx hardhat run scripts/deploy-sepolia.js --network sepolia
// Needs .env: PRIVATE_KEY, SEPOLIA_RPC_URL, USDC_SEPOLIA_ADDRESS
// Output: Saves to deployments/sepolia-v2.json + prints Etherscan link

import { createPublicClient, createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const RPC = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const USDC_SEPOLIA = process.env.USDC_SEPOLIA_ADDRESS;

// Sepolia USDC (Circle testnet) - If .env missing, use this known address
// Verify on Etherscan before mainnet: https://sepolia.etherscan.io
const FALLBACK_USDC = "0x1c7D4abE48Ba0F1F1b5D8eF1e5A87C8C5C3b8a1"; // REPLACE with your verified Sepolia USDC if different
const USDC = USDC_SEPOLIA || FALLBACK_USDC;

if (!process.env.PRIVATE_KEY) {
  console.log("❌ Missing PRIVATE_KEY in .env");
  process.exit(1);
}

const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) });
const walletClient = createWalletClient({ account, chain: sepolia, transport: http(RPC) });

async function main() {
  console.log("=== ZENITH ESCROW v2 DEPLOY ===");
  console.log("Deployer (Admin):", account.address);
  console.log("USDC Sepolia:", USDC);
  console.log("RPC:", RPC);

  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Balance:", (Number(balance) / 1e18).toFixed(4), "SepoliaETH");
  if (balance === 0n) {
    console.log("❌ No SepoliaETH - Get from https://sepoliafaucet.com");
    process.exit(1);
  }

  // FIXED v2 - Find EXACT artifact: ZenithMallEscrow, NOT ZenithMall
  const candidates = [
    "./artifacts/contracts/ZenithEscrow.sol/ZenithMallEscrow.json",
    "./artifacts/contracts/contracts/ZenithEscrow.sol/ZenithMallEscrow.json",
    "./artifacts/contracts/ZenithMallEscrow.sol/ZenithMallEscrow.json",
  ];
  let artifactFile = candidates.find(f => fs.existsSync(f));
  if (!artifactFile) {
    // Fallback: search all artifacts for ZenithMallEscrow
    const files = fs.readdirSync("./artifacts/contracts").flatMap(d => {
      try { return fs.readdirSync("./artifacts/contracts/" + d).map(f => "./artifacts/contracts/" + d + "/" + f) } catch { return [] }
    });
    artifactFile = files.find(f => f.includes("ZenithMallEscrow") && f.endsWith(".json") && !f.includes(".dbg"));
  }
  if (!artifactFile) {
    console.log("❌ Artifact not found! Run: npx hardhat compile");
    console.log("Expected: ./artifacts/contracts/ZenithEscrow.sol/ZenithMallEscrow.json");
    process.exit(1);
  }
  console.log("Using artifact:", artifactFile);
  const artifact = JSON.parse(fs.readFileSync(artifactFile, 'utf8'));

  // FIXED v2 - MUST pass USDC address to constructor!
  console.log("\nDeploying ZenithMallEscrow v2 with USDC:", USDC);
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [USDC], // <-- v2 constructor arg - THIS WAS MISSING!
  });
  console.log("TX:", hash);
  console.log("Waiting for confirmation...");
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const newAddress = receipt.contractAddress;

  console.log("\n✅ DEPLOYED! Zenith Escrow v2:", newAddress);
  console.log("Etherscan: https://sepolia.etherscan.io/address/" + newAddress);
  console.log("\n--- COPY THIS TO .env ---");
  console.log(`ESCROW_V2_ADDRESS=${newAddress}`);
  console.log("-------------------------");
  console.log("Old v1 0x96de... is DEAD - DO NOT USE!");

  // FIXED v2 - Save address so test can use it - No more lost address!
  const outDir = "./deployments";
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const deployment = {
    network: "sepolia",
    version: "v2",
    contract: "ZenithMallEscrow",
    address: newAddress,
    deployer: account.address,
    usdc: USDC,
    platformFeePercent: 10,
    txHash: hash,
    blockNumber: Number(receipt.blockNumber),
    etherscan: `https://sepolia.etherscan.io/address/${newAddress}`,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(outDir, "sepolia-v2.json"), JSON.stringify(deployment, null, 2));
  console.log("Saved to: deployments/sepolia-v2.json");

  // Verify fee on-chain
  const fee = await publicClient.readContract({
    address: newAddress,
    abi: artifact.abi,
    functionName: 'PLATFORM_FEE_PERCENT',
  });
  console.log("On-chain PLATFORM_FEE_PERCENT =", fee.toString(), fee === 10n ? "✅ 90/10 CONFIRMED" : "❌ WRONG FEE!");
}

main().catch((e) => { console.error("❌ DEPLOY FAILED:", e.message); process.exit(1); });
