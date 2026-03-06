# What is a Genome

## Definition

A **Genome** is an OP-20 smart contract deployed on OPNet that wraps one specific underlying OP-20 token. It is the core building block of the Helix protocol. Each Genome is dedicated to a single token — you cannot mix tokens inside one Genome.

When a Genome is deployed, a new token contract is created on-chain. This new token is the **gToken** — the "Genome token" — that users receive when they wrap.

## Naming Convention

Genome tokens follow a simple naming convention: `g` + the uppercase ticker of the underlying token.

| Underlying Token | Underlying Symbol | gToken Name | gToken Symbol |
|---|---|---|---|
| MOTO | MOTO | gMOTO | gMOTO |
| PILL | PILL | gPILL | gPILL |
| WBTC | WBTC | gWBTC | gWBTC |

Both the name and the symbol are set to the same value (e.g., both are `gMOTO`). This is derived automatically from the underlying token's symbol when a creator deploys via the Helix app.

## What the Contract Holds

The Genome contract holds **all of the wrapped underlying tokens** in its own contract balance. When a user wraps 100 MOTO, those 100 MOTO move from the user's wallet into the Genome contract and stay there. No external custody, no relayer, no bridge — the smart contract itself is the vault.

In return, the user receives gMOTO tokens minted directly to their wallet.

## The Ratio at Genesis

When a Genome is first deployed, the ratio between gTokens and the underlying token starts at **1:1**. The first user to wrap 100 MOTO receives exactly 100 gMOTO.

This ratio only ever increases — it never decreases. Every time wrap or unwrap fees are collected, or the owner injects rewards, the ratio goes up. More underlying accumulates in the contract while the gToken supply grows more slowly (or stays the same during fee collection), so each gToken becomes redeemable for more underlying over time.

## One Underlying Per Genome

Each Genome is registered in the Helix Factory with a mapping of `underlyingToken → genomeContract`. Only one Genome can exist per underlying token. If a Genome already exists for MOTO, no one can deploy a second MOTO Genome — the factory will reject the registration.

This ensures there is a single canonical gToken for each underlying, preventing fragmented liquidity.

## Genome Lifecycle

1. Creator deploys the Genome contract (sets underlying token, fees)
2. Genome is registered in the Helix Factory
3. Creator creates a MotoSwap liquidity pool (gToken/underlying)
4. Creator adds initial liquidity (wraps some underlying, then deposits equal amounts of gToken + underlying into the pool)
5. Wrapping opens for users (requires active pool reserves)
6. Users wrap, unwrap, trade — ratio grows over time
