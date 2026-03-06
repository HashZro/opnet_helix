# How Yield Works

Helix gTokens earn yield passively — you do not need to stake, vote, or take any action after wrapping. The yield mechanism works by increasing the ratio between gTokens and the underlying token over time.

There are three sources of yield in the Genome protocol.

## Source 1: Wrap Fees

When a user wraps underlying tokens, a percentage fee is deducted before gTokens are minted. The fee portion stays inside the Genome contract as underlying balance but no new gTokens are minted for it.

Result: `underlyingBalance` increases relative to `gTokenSupply` → ratio goes up → all existing gToken holders benefit.

**Example**: 1% wrap fee on a 1000 MOTO deposit. 10 MOTO stays in the contract. Only 990 MOTO worth of gTokens are minted. All existing gMOTO holders now have a higher redemption ratio.

## Source 2: Unwrap Fees

When a user unwraps gTokens, a percentage fee is deducted from the underlying output. The fee stays in the Genome contract.

Result: `gTokenSupply` decreases (tokens burned) but some underlying is retained → ratio goes up further.

**Example**: 1% unwrap fee. User burns 100 gMOTO at ratio 1.05, expecting 105 MOTO. Fee = 1.05 MOTO. User receives 103.95 MOTO. 1.05 MOTO stays in contract, ratio increases for remaining holders.

## Source 3: Inject Rewards

The Genome owner can manually deposit underlying tokens into the contract at any time using the `injectRewards` function. This increases the underlying balance without minting any gTokens.

This is typically used to recycle external income back into the Genome. For example, a creator who earns MotoSwap LP trading fees can convert those fees to the underlying token and inject them — effectively distributing those earnings to all gToken holders as ratio growth.

## Yield Timeline

The table below shows how the ratio grows over a sequence of operations for a hypothetical Genome with 1% wrap fee and 1% unwrap fee:

| Event | Underlying Balance | gToken Supply | Ratio |
|---|---|---|---|
| Genesis | 0 | 0 | 1.0000 |
| Alice wraps 1000 MOTO | 1000 | 990 | 1.0101 |
| Bob wraps 500 MOTO | 1500 | 1484.50 | 1.0104 |
| Owner injects 50 MOTO | 1550 | 1484.50 | 1.0441 |
| Carol unwraps 100 gMOTO | 1446.40 | 1384.50 | 1.0447 |
| Dave wraps 200 MOTO | 1646.40 | 1580.23 | 1.0419 |

> Note: slight ratio dip when Dave wraps at 1% fee is an artifact of rounding — in practice ratio monotonically increases or stays flat.

## Important Caveats

Yield is **not guaranteed**. It depends entirely on:

- How much wrapping and unwrapping activity the Genome sees
- Whether the owner injects rewards
- The fee rates set by the creator

A Genome with zero activity and no reward injections will have a static ratio of 1.0 forever. Before wrapping, check the Genome's fee rates and historical ratio growth on the Explore page.
