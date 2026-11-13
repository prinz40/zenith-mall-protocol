# Zenith Mall Escrow Protocol — v2

Decentralized USDC escrow for Zenith Mall (Imperial Vault).
Buyer locks USDC → Vendor delivers → Buyer confirms → Vendor gets 90%, Platform gets 10%.
If dispute — Admin resolves — Buyer gets full refund OR Vendor gets paid.

**Live Mall:** https://zenithmall.com (coming)
**Chain:** Sepolia (testnet) → Base Sepolia → Mainnet later

> ⚠️ v1 is DEAD — Old address `0x96de6c7792e625816aff013a50e8e7b50b71d5c3` was 2% fee, no dispute. DO NOT USE.
> v2 is 90/10 + Dispute + Refund. New address after redeploy in `deployments/sepolia-v2.json`.

## What v2 Fixes

| v1 (DEAD) | v2 (LIVE) |
| --- | --- |
| 2% fee — Wrong | **10% fee — 90 vendor / 10 platform** |
| No dispute | **`raiseDispute()` + `resolveDispute()`** |
| No cancel | **`cancelOrder()`** |
| No details | **`getOrderDetails()` returns vendorShare + platformFee** |
| Fake test (only listed functions) | **Real test: lock → confirm → dispute → refund** |

## Contract

**File:** `contracts/ZenithEscrow.sol`
**Contract:** `ZenithMallEscrow`
**Solidity:** `0.8.20`
**Token:** USDC (Sepolia)

### Functions

- `lockPayment(orderId, vendor, amount)` — Buyer locks USDC. Must `approve` escrow first.
- `confirmDelivery(orderId)` — Buyer confirms. Pays vendor 90% + platform 10%.
- `raiseDispute(orderId)` — Buyer or vendor raises dispute. State → `DISPUTED`.
- `resolveDispute(orderId, refundBuyer)` — Admin only. `true` = full refund to buyer. `false` = pay vendor.
- `cancelOrder(orderId)` — Buyer cancels before delivery. Full refund.
- `getOrderDetails(orderId)` — Returns order + `vendorShare` + `platformFee`.
- `transferAdmin(newAdmin)` — Admin only.

### States

`AWAITING_DELIVERY` → `COMPLETED` / `REFUNDED` / `CANCELLED`
`AWAITING_DELIVERY` → `DISPUTED` → `REFUNDED` / `COMPLETED`

### Fees — Example

Lock **100 USDC** → `vendorShare = 90 USDC`, `platformFee = 10 USDC`
Lock **10 USDC** → `vendorShare = 9 USDC`, `platformFee = 1 USDC`

## Quick Start

### 1. Install

```bash
npm install
