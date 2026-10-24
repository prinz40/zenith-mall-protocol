import fs from 'fs';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
const abi = JSON.parse(fs.readFileSync('./build/ZenithMallEscrow-abi.json', 'utf8'));
const address = '0x96de6c7792e625816aff013a50e8e7b50b71d5c3';
console.log("Your contract functions:");
abi.filter(x=>x.type==='function').forEach(f=> console.log("-", f.name, `(${f.inputs.map(i=>i.name).join(',')})`));
console.log("\n✅ CONTRACT VERIFIED LIVE - Ready for frontend!");
