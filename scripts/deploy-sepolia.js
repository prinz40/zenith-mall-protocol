import { createPublicClient, createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const publicClient = createPublicClient({ chain: sepolia, transport: http("https://ethereum-sepolia-rpc.publicnode.com") });
const walletClient = createWalletClient({ account, chain: sepolia, transport: http("https://ethereum-sepolia-rpc.publicnode.com") });
const files = fs.readdirSync("./artifacts/contracts").flatMap(d => {
  try { return fs.readdirSync("./artifacts/contracts/"+d).map(f => "./artifacts/contracts/"+d+"/"+f) } catch { return [] }
});
const artifactFile = files.find(f => f.endsWith(".json") && !f.includes(".dbg")) || "./artifacts/contracts/ZenithMall.sol/ZenithMall.json";
console.log("Using artifact:", artifactFile);
const artifact = JSON.parse(fs.readFileSync(artifactFile));
console.log("Deploying to Sepolia from", account.address, "Balance", await publicClient.getBalance({address: account.address}));
const hash = await walletClient.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode });
console.log("TX:", hash);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log("DEPLOYED! Contract:", receipt.contractAddress);
console.log("https://sepolia.etherscan.io/address/"+receipt.contractAddress);
