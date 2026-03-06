# Wrap Lock Until Liquidity Pool Is Active

## Problem

Users can wrap tokens immediately after a Genome is deployed, before any liquidity pool exists on MotoSwap. This is dangerous because:

- The first person to add liquidity sets the price ratio
- If someone wraps tokens (getting gTokens) before a pool exists at 1:1, they can then add liquidity at an arbitrary ratio, breaking the peg for all future wrappers
- The Genome protocol assumes the pool ratio reflects the underlying wrap ratio — a skewed pool distorts this

## Goal

Prevent the Wrap action on a Genome until its MotoSwap liquidity pool has been created **and has active reserves (> 0 on both sides)**.

## Current State

The pool check already exists in `useGenomePoolInfo` hook which fetches `poolAddress`, `reserve0`, `reserve1` for each genome. The `MineDetailPage` already has access to this data via the pool hook.

## Proposed Solution (Frontend Gate)

### Short-term: Frontend-only block

In `MineDetailPage.tsx`, check pool status before allowing the Wrap modal to open:

```tsx
// pool is "active" when address is non-zero AND both reserves > 0
const poolActive = !isZeroPool(poolInfo.poolAddress)
    && poolInfo.reserve0 > 0n
    && poolInfo.reserve1 > 0n;
```

- Disable the "Wrap" button when `!poolActive`
- Show a message: "Wrapping is disabled until a liquidity pool with reserves is active on MotoSwap"
- The Unwrap action is NOT gated (unwrapping when pool is empty is fine — user already holds gTokens)

### Long-term: Contract-level enforcement

Add a check inside the `wrap()` method on the Genome contract that reads the MotoSwap factory to verify a pool with non-zero reserves exists before allowing wraps. This is trustless and cannot be bypassed.

Considerations:
- Requires cross-contract call to MotoSwap factory during wrap
- Need to determine the "active" threshold (any reserves, or minimum liquidity)
- Gas cost increases slightly

## Files to Touch (frontend gate)

- `frontend/src/pages/MineDetailPage.tsx` — disable wrap button, show notice
- `frontend/src/hooks/useGenomePoolInfo.ts` — already fetches reserve data, no changes needed

## Notes

- The `useGenomePoolInfo` hook already polls `reserve0` and `reserve1` — no new RPC calls needed
- The pool address for a genome is derived from the genome pubkey + underlying pubkey via MotoSwap factory
- Owner (My Genomes page) should still be able to add liquidity even when pool is inactive — the gate only affects public wrapping
