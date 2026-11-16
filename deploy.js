import { ethers } from "ethers";
import fs from "fs";

// BASE SEPOLIA - For Zenith Escrow Phase 1.1
const RPC_URL = "https://sepolia.base.org";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// SAFE: Key comes from secret, NOT written in file
// In your terminal, you will run:
// $env:PRIVATE_KEY="your-NEW-private-key"  (Windows PowerShell)
// NEVER commit your private key to GitHub again
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.log("ERROR: Set PRIVATE_KEY first! Use your NEW wallet key, not the old leaked one.");
  process.exit(1);
}
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

async function main() {
  console.log("Deploying from:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  if (balance == 0n) {
    console.log("ERROR: No ETH! Get faucet!!");
    return;
  }

  const abi = JSON.parse(fs.readFileSync("./build/ZenithMallEscrow.abi", "utf8"));
  const bytecode = fs.readFileSync("./build/ZenithMallEscrow.bin", "utf8");

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);

  // Mock USDC address for testing - Replace with Base Sepolia USDC if you have one
  const MOCK_USDC = ethers.getAddress("0x036CbD53842c5426634e7929541eC2318f3dCF7e");
  console.log("Deploying ZenithMallEscrow...");
  const contract = await factory.deploy(MOCK_USDC);
  console.log("Waiting for confirmation...");
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("SUCCESS! Zenith Escrow deployed to:", address);
  console.log("Network: Base Sepolia - Check on https://sepolia.basescan.org/address/" + address);
}

main().catch((err) => {
  console.log("Deploy Failed:", err);
  process.exit(1);
});
