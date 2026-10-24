import { ethers } from "ethers";
import fs from "fs";

const RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// PASTE YOUR PRIVATE KEY HERE - 64 chars starting with 0x
const PRIVATE_KEY = "0xccaf1cc952e3bcd47325f9b0bbf138d8521cde0ab739477d6b08b363acba0f94";

const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

async function main() {
  console.log("=================================");
  console.log("Deploying from:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  
  if (balance == 0n) {
    console.log("ERROR: No ETH! Get faucet!");
    return;
  }

  const abi = JSON.parse(fs.readFileSync("./build/ZenithMallEscrow.abi", "utf8"));
  const bytecode = fs.readFileSync("./build/ZenithMallEscrow.bin", "utf8").trim();

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);

  // Mock USDC address - works for testing
  const MOCK_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  
  console.log("Deploying ZenithMallEscrow...");
  const contract = await factory.deploy(MOCK_USDC);
  
  console.log("Waiting for confirmation...");
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log("=================================");
  console.log("SUCCESS! Zenith Escrow deployed to:", address);
  console.log("=================================");
}

main().catch((err) => {
  console.error("Deploy Failed:", err);
  process.exit(1);
});
