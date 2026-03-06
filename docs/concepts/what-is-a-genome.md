# What is a Genome

## Genomes (Vaults)

The Helix protocol enables the creation of Vaults called **Genomes**. A Genome provides depositors with a synthetic OP-20 wrapped version of the deposited asset — the gToken (e.g. gMOTO for MOTO).

The protocol captures arbitrage flows, trading activity, and gToken interactions to provide sustainable returns for liquidity providers. Volatility Farming transforms liquidity provision into a strategy that benefits from price volatility, rewarding participants for enabling deep, arbitrageable markets.

Each Genome is an autonomous smart contract. It holds all deposited collateral, mints and burns gTokens, and manages the redemption ratio — entirely on-chain, with no external custody.

## Core Actions

| Action | Description |
|---|---|
| **Wrap** | Put up collateral in exchange for gTokens with zero slippage |
| **Unwrap** | Exit your genome position and receive back the collateral, proportional to your holdings |
| **LP Provision** | Strengthen the Helix protocol by increasing TVL and perpetually earning |

## Naming Convention

Genome tokens follow a simple naming convention: `g` + the uppercase ticker of the underlying token.

| Underlying Token | gToken Name | gToken Symbol |
|---|---|---|
| MOTO | gMOTO | gMOTO |
| PILL | gPILL | gPILL |
| WBTC | gWBTC | gWBTC |

Both name and symbol are set to the same value, derived automatically from the underlying token's ticker when a creator deploys via the Helix app.

## What the Contract Holds

The Genome contract holds **all wrapped underlying tokens** in its own contract balance. When a user wraps 100 MOTO, those 100 MOTO move from the user's wallet into the Genome contract and stay there. No external custody, no relayer, no bridge — the smart contract itself is the vault.

In return, the user receives gMOTO tokens minted directly to their wallet.

## The Ratio at Genesis

When a Genome is first deployed, the ratio between gTokens and the underlying token starts at **1:1**. The first user to wrap 100 MOTO receives exactly 100 gMOTO.

This ratio only ever increases — it never decreases. Every time wrap or unwrap fees are collected, or the owner injects rewards, the ratio goes up. More underlying accumulates in the contract while the gToken supply grows more slowly, so each gToken becomes redeemable for more underlying over time.

## One Underlying Per Genome

Each Genome is registered in the Helix Factory with a mapping of `underlyingToken → genomeContract`. Only one Genome can exist per underlying token — the factory rejects duplicate registrations. This ensures a single canonical gToken for each underlying, preventing fragmented liquidity.

## Genome Lifecycle

1. Creator deploys the Genome contract (sets underlying token and fees)
2. Genome is registered in the Helix Factory
3. Creator creates a MotoSwap liquidity pool (gToken/underlying)
4. Creator adds initial liquidity (wraps some underlying, deposits equal gToken + underlying into the pool)
5. Wrapping opens for users (requires active pool reserves)
6. Users wrap, unwrap, trade — ratio grows over time from Volatility Farming
