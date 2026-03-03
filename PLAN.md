# Mines Protocol — OPNet Architecture Plan

## Overview

Token-wrapping yield protocol on Bitcoin L1 via OPNet. Users wrap OP_20 tokens into xTokens (yield-bearing wrappers). Fees on wrap/unwrap accrue to controller, protocol, and stakers. Ratio (underlying/supply) grows as staker fees compound.

## Contract Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   MinerToken    │     │     Factory      │
│   (OP_20)       │     │    (OP_NET)      │
│                 │     │                  │
│ - MINER token   │     │ - Mine registry  │
│ - Free mint()   │     │ - registerMine() │
│ - 18 decimals   │     │ - getMineAddr()  │
└────────┬────────┘     └────────┬─────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│      Mine       │     │    Staking       │
│    (OP_20)      │     │   (OP_NET)       │
│                 │     │                  │
│ - IS the xToken │     │ - Stake MINER    │
│ - wrap/unwrap   │     │ - Points-based   │
│ - Fee mechanics │     │ - claim rewards  │
│ - Ratio growth  │◄────│ - disburse fees  │
└─────────────────┘     └─────────────────┘
```

## Fee Algorithm (from Mine.sol)

```
if totalSupply == 0:
    xAmount = amount                    // 1:1 first wrap
else:
    feeAmount = amount * wrapFee / 1000
    controllerFee = feeAmount * controllerFeeRate / 1000
    protocolFee = feeAmount * protocolFeeRate / 1000
    stakersFee = feeAmount - controllerFee - protocolFee
    xAmount = totalSupply * (amount - feeAmount) / (underlyingBalance + stakersFee)
```

## Self-Tracked Balance

Track `_underlyingHeld` internally instead of cross-contract `balanceOf`:
- `+= amount` on wrap
- `-= netAmount` on unwrap
- `-= feeAmount` on fee claims
- `underlyingBalance() = _underlyingHeld - controllerFeeAccrued - protocolFeeAccrued`

## Staking Points System

```
POINT_MULTIPLIER = 10^18
On disburse: totalPoints += disbursedAmount * POINT_MULTIPLIER / totalStaked
On claim:    reward = (totalPoints - lastPoints) * userBalance / POINT_MULTIPLIER
```

## Frontend Architecture

```
React + TypeScript + Vite + Tailwind (dark theme)
├── pages/
│   ├── HomePage        — Mine list grid
│   ├── MineDetailPage  — Stats, ratio, fees
│   ├── WrapPage        — Wrap underlying → xToken
│   ├── UnwrapPage      — Burn xToken → underlying
│   └── StakingPage     — Stake/unstake/claim
├── hooks/
│   ├── useWallet       — OPWallet + identity key
│   ├── useMines        — Factory registry reads
│   ├── useMine         — Single mine data
│   └── useStaking      — Staking balances/rewards
└── lib/
    ├── provider        — JSONRpcProvider singleton
    ├── contracts       — ABIs + addresses
    ├── wallet          — OPWallet helpers
    └── helpers         — formatBalance, utils
```

## Key OPNet Constraints

- AssemblyScript → WASM, extends OP_20 or OP_NET
- SafeMath for ALL u256 operations
- No while loops — bounded for loops only
- Unique storage pointers via Blockchain.nextPointer
- Constructor runs every call — onDeployment() for one-time init
- SHA256 method selectors (not Keccak256)
- CEI pattern: Checks → Effects → Interactions
- No OP_404 contracts

## Reference Files

| File | Purpose |
|------|---------|
| `../monorepo/contracts/src/vault/MultSigVault.ts` | OPNet contract patterns |
| `../monorepo/contracts/src/alpha/AlphaToken.ts` | OP_20 token pattern |
| `../monorepo/contracts/asconfig.json` | Build config |
| `../monorepo/contracts/scripts/deploy-vault.ts` | Deploy script |
| `../optnet_tricks.md` | Frontend integration patterns |
| `mines-contracts-main/src/Mine.sol` | Original fee algorithm |
| `mines-contracts-main/src/Staking.sol` | Original staking logic |
