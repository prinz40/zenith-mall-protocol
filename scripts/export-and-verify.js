import fs from 'fs';
import solc from 'solc';

const source = fs.readFileSync('./contracts/ZenithEscrow.sol', 'utf8');
const input = {
  language: 'Solidity',
  sources: { 'ZenithEscrow.sol': { content: source } },
  settings: { outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } } }
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));
const contract = output.contracts['ZenithEscrow.sol']['ZenithMallEscrow'];

fs.mkdirSync('./build', { recursive: true });
fs.writeFileSync('./build/ZenithMallEscrow-abi.json', JSON.stringify(contract.abi, null, 2));
fs.writeFileSync('./build/ZenithMallEscrow-bytecode.txt', '0x' + contract.evm.bytecode.object);

console.log("✅ ABI exported to build/ZenithMallEscrow-abi.json");
console.log("✅ Bytecode exported");
console.log("\nContract Address: 0x96de6c7792e625816aff013a50e8e7b50b71d5c3");
console.log("\nFor Etherscan verification, go to:");
console.log("https://sepolia.etherscan.io/verifyContract?a=0x96de6c7792e625816aff013a50e8e7b50b71d5c3");
console.log("Select: Solidity Single File, 0.8.20, MIT license, No optimization");
console.log("Paste contracts/ZenithEscrow.sol content + constructor arg: 0000000000000000000000001c7d4b196cb0c7b01d743fbc6116a902379c7238");
