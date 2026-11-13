// Zenith Mall Escrow v2 - REAL TEST - 90/10 + Dispute + Refund
// Run: npx hardhat run scripts/test-escrow.js --network sepolia
// Needs .env: PRIVATE_KEY, SEPOLIA_RPC_URL, USDC_SEPOLIA_ADDRESS, ESCROW_V2_ADDRESS

import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const ESCROW_ADDRESS = process.env.ESCROW_V2_ADDRESS; // NEW v2 address after redeploy - NOT 0x96de... v1!
const USDC_ADDRESS = process.env.USDC_SEPOLIA_ADDRESS;
const RPC = process.env.SEPOLIA_RPC_URL;

if (!process.env.PRIVATE_KEY || !ESCROW_ADDRESS || !USDC_ADDRESS) {
  console.log("❌ Missing .env - Set PRIVATE_KEY, ESCROW_V2_ADDRESS, USDC_SEPOLIA_ADDRESS");
  process.exit(1);
}

const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) });
const walletClient = createWalletClient({ chain: sepolia, transport: http(RPC), account });

// Minimal ABI - v2 functions only
const escrowAbi = [
  { type: 'function', name: 'lockPayment', inputs: [{ name: '_orderId', type: 'uint256' }, { name: '_vendor', type: 'address' }, { name: '_amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'confirmDelivery', inputs: [{ name: '_orderId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'raiseDispute', inputs: [{ name: '_orderId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'resolveDispute', inputs: [{ name: '_orderId', type: 'uint256' }, { name: '_refundBuyer', type: 'bool' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'getOrderDetails', inputs: [{ name: '_orderId', type: 'uint256' }], outputs: [{ name: 'order', type: 'tuple', components: [{ name: 'orderId', type: 'uint256' }, { name: 'buyer', type: 'address' }, { name: 'vendor', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'state', type: 'uint8' }, { name: 'isValueDeposited', type: 'bool' }, { name: 'createdAt', type: 'uint256' }, { name: 'disputeDeadline', type: 'uint256' }] }, { name: 'vendorShare', type: 'uint256' }, { name: 'platformFee', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'PLATFORM_FEE_PERCENT', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
];

const erc20Abi = [
  { type: 'function', name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'balanceOf', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'decimals', inputs: [], outputs: [{ type: 'uint8' }], stateMutability: 'view' },
];

const STATE = ['AWAITING_DELIVERY', 'DISPUTED', 'COMPLETED', 'REFUNDED', 'CANCELLED'];

async function main() {
  console.log("=== ZENITH ESCROW v2 TEST ===");
  console.log("Escrow:", ESCROW_ADDRESS);
  console.log("Tester (Buyer+Admin):", account.address);

  // 1. Check fee = 10%
  const fee = await publicClient.readContract({ address: ESCROW_ADDRESS, abi: escrowAbi, functionName: 'PLATFORM_FEE_PERCENT' });
  console.log("\n1. PLATFORM_FEE_PERCENT =", fee.toString(), fee === 10n ? "✅ PASS 90/10" : "❌ FAIL - Not 10%!");

  // 2. TEST 1 - Lock 10 USDC, Confirm, Check 90/10 split
  const orderId1 = BigInt(Date.now() % 1000000);
  const amount = parseUnits('10', 6); // Sepolia USDC = 6 decimals
  const vendor = '0x0000000000000000000000000000000000000001'; // Replace with real vendor test wallet
  console.log(`\n2. TEST 1 - Order ${orderId1} - Lock 10 USDC -> Confirm`);
  console.log("   Approving USDC...");
  let hash = await walletClient.writeContract({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'approve', args: [ESCROW_ADDRESS, amount] });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log("   Locking...");
  hash = await walletClient.writeContract({ address: ESCROW_ADDRESS, abi: escrowAbi, functionName: 'lockPayment', args: [orderId1, vendor, amount] });
  await publicClient.waitForTransactionReceipt({ hash });

  const [order1, vendorShare1, fee1] = await publicClient.readContract({ address: ESCROW_ADDRESS, abi: escrowAbi, functionName: 'getOrderDetails', args: [orderId1] });
  console.log(`   Amount: ${formatUnits(order1.amount, 6)} USDC | VendorShare: ${formatUnits(vendorShare1, 6)} | Fee: ${formatUnits(fee1, 6)} | State: ${STATE[order1.state]}`);
  console.log(vendorShare1 === parseUnits('9', 6) && fee1 === parseUnits('1', 6) ? "   ✅ PASS - 90/10 split correct!" : "   ❌ FAIL - Split wrong!");

  console.log("   Confirming delivery...");
  hash = await walletClient.writeContract({ address: ESCROW_ADDRESS, abi: escrowAbi, functionName: 'confirmDelivery', args: [orderId1] });
  await publicClient.waitForTransactionReceipt({ hash });
  const [order1b] = await publicClient.readContract({ address: ESCROW_ADDRESS, abi: escrowAbi, functionName: 'getOrderDetails', args: [orderId1] });
  console.log("   State after confirm:", STATE[order1b.state], order1b.state === 2 ? "✅ PASS" : "❌ FAIL");

  // 3. TEST 2 - Lock, Dispute, Refund
  const orderId2 = orderId1 + 1n;
  console.log(`\n3. TEST 2 - Order ${orderId2} - Lock 10 USDC -> Dispute -> Refund`);
  hash = await walletClient.writeContract({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'approve', args: [ESCROW_ADDRESS, amount] });
  await publicClient.waitForTransactionReceipt({ hash });
  hash = await walletClient.writeContract({ address: ESCROW_ADDRESS, abi: escrowAbi, functionName: 'lockPayment', args: [orderId2, vendor, amount] });
  await publicClient.waitForTransactionReceipt({ hash });

  console.log("   Raising dispute (buyer)...");
  hash = await walletClient.writeContract({ address: ESCROW_ADDRESS, abi: escrowAbi, functionName: 'raiseDispute', args: [orderId2] });
  await publicClient.waitForTransactionReceipt({ hash });
  const [order2] = await publicClient.readContract({ address: ESCROW_ADDRESS, abi: escrowAbi, functionName: 'getOrderDetails', args: [orderId2] });
  console.log("   State after dispute:", STATE[order2.state], order2.state === 1 ? "✅ PASS - DISPUTED works!" : "❌ FAIL - Dispute broken!");

  console.log("   Resolving dispute - Refund buyer (admin)...");
  hash = await walletClient.writeContract({ address: ESCROW_ADDRESS, abi: escrowAbi, functionName: 'resolveDispute', args: [orderId2, true] });
  await publicClient.waitForTransactionReceipt({ hash });
  const [order2b] = await publicClient.readContract({ address: ESCROW_ADDRESS, abi: escrowAbi, functionName: 'getOrderDetails', args: [orderId2] });
  console.log("   State after refund:", STATE[order2b.state], order2b.state === 3 ? "✅ PASS - REFUNDED!" : "❌ FAIL");

  console.log("\n=== ALL TESTS DONE - If all ✅, Escrow v2 is PROVEN ===");
}

main().catch((e) => { console.error("❌ TEST FAILED:", e.message); process.exit(1); });
