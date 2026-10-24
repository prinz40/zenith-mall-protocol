import { createPublicClient, http } from 'viem';
import { sepolia, baseSepolia } from 'viem/chains';
const addr = "0xcA8FfB3BAAc48d27ffC4E73a00bfa2EAE83CCb19";
const sepoliaClient = createPublicClient({ chain: sepolia, transport: http("https://ethereum-sepolia-rpc.publicnode.com") });
const baseClient = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });
const balSep = await sepoliaClient.getBalance({ address: addr });
const balBase = await baseClient.getBalance({ address: addr });
console.log("Sepolia ETH:", Number(balSep)/1e18);
console.log("Base Sepolia ETH:", Number(balBase)/1e18);
