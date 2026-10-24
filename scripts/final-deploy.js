import fs from 'fs';
import solc from 'solc';
import { createPublicClient, createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import 'dotenv/config';

const source = fs.readFileSync('./contracts/ZenithEscrow.sol', 'utf8');
console.log("Compiling...");

const input = {
  language: 'Solidity',
  sources: { 'ZenithEscrow.sol': { content: source } },
  settings: { outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } } }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
if (output.errors) {
  let hasError = false;
  output.errors.forEach(e => { 
    console.log(e.formattedMessage); 
    if (e.severity === 'error') hasError = true;
  });
  if (hasError) throw new Error("Compile failed");
}

// Contract name is ZenithMallEscrow
const contract = output.contracts['ZenithEscrow.sol']['ZenithMallEscrow'];
if (!contract) {
  console.log("Found contracts:", Object.keys(output.contracts['ZenithEscrow.sol']));
  throw new Error("Contract not found");
}

const abi = contract.abi;
const bytecode = '0x' + contract.evm.bytecode.object;
console.log("✅ Compiled! Size:", bytecode.length);

// Sepolia USDC - public test token
const USDC_SEPOLIA = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const publicClient = createPublicClient({ chain: sepolia, transport: http("https://ethereum-sepolia-rpc.publicnode.com") });
const walletClient = createWalletClient({ account, chain: sepolia, transport: http("https://ethereum-sepolia-rpc.publicnode.com") });

console.log("Deploying from", account.address);
const hash = await walletClient.deployContract({ abi, bytecode, args: [USDC_SEPOLIA] });
console.log("TX HASH:", hash);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log("\n✅✅✅ DEPLOYED!!! Contract:", receipt.contractAddress);
console.log("https://sepolia.etherscan.io/address/" + receipt.contractAddress);
