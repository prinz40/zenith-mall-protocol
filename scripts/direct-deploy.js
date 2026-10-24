import fs from "fs";
import solc from "solc";
import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();
const source = fs.readFileSync("contracts/ZenithEscrow.sol", "utf8");
const input = {
  language: "Solidity",
  sources: { "ZenithEscrow.sol": { content: source } },
  settings: { outputSelection: { "*": { "*": ["abi","evm.bytecode"] } }, optimizer: { enabled: true, runs: 200 } }
};
console.log("Compiling ZenithMallEscrow...");
const output = JSON.parse(solc.compile(JSON.stringify(input)));
if (output.errors) {
  for (const e of output.errors) {
    console.log(e.formattedMessage);
    if (e.severity === 'error') throw new Error("Compile failed");
  }
}
console.log("Contracts found:", Object.keys(output.contracts["ZenithEscrow.sol"]));
const contract = output.contracts["ZenithEscrow.sol"]["ZenithMallEscrow"];
const abi = contract.abi;
const bytecode = "0x"+contract.evm.bytecode.object;
console.log("Connecting to Base Sepolia...");
const pkRaw = process.env.PRIVATE_KEY || "";
const pk = pkRaw.startsWith("0x") ? pkRaw : "0x"+pkRaw;
const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
const wallet = new ethers.Wallet(pk, provider);
console.log("Deploying from:", wallet.address);
// Base Sepolia USDC — you can change via STABLECOIN_ADDRESS in .env
const stablecoin = process.env.STABLECOIN_ADDRESS || "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
console.log("Using stablecoin:", stablecoin);
const factory = new ethers.ContractFactory(abi, bytecode, wallet);
const deployed = await factory.deploy(stablecoin);
console.log("Tx sent:", deployed.deploymentTransaction().hash);
await deployed.waitForDeployment();
const addr = await deployed.getAddress();
console.log("✅ ZENITH MALL ESCROW DEPLOYED TO:", addr);
console.log("Basescan: https://sepolia.basescan.org/address/"+addr);
