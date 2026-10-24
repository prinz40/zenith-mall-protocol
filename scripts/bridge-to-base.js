import { createWalletClient, http, parseEther, getAddress } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import 'dotenv/config';
const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const walletClient = createWalletClient({ 
  account, 
  chain: sepolia, 
  transport: http("https://sepolia.drpc.org", { timeout: 30_000 }) 
});
const L1_BRIDGE = getAddress("0xfd0bf71d32ccc58b27c373be35de04978f351f6d");
console.log("Bridging from", account.address);
const hash = await walletClient.sendTransaction({ 
  to: L1_BRIDGE, 
  value: parseEther("0.02"),
  gas: 150000n
});
console.log("BRIDGE TX SENT:", hash);
