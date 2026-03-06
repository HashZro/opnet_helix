# What is Helix

## Bitcoin L1 Smart Contracts with OPNet

OPNet is a consensus layer that brings trustless smart contracts to Bitcoin Layer 1. It is not a sidechain. It is not an L2 rollup. It is not a metaprotocol. Smart contracts on OPNet are written in AssemblyScript, compiled to WebAssembly, and executed deterministically by Bitcoin nodes — enforced by Bitcoin consensus itself.

This distinction matters: your funds are secured by Bitcoin's proof-of-work, the most battle-tested security model in existence. There are no bridge risks, no validator sets to trust, and no off-chain execution.

## What is Helix

Helix is a yield-wrapping protocol deployed on OPNet. It allows anyone to wrap an OP-20 token — OPNet's native fungible token standard — into a **gToken** (a "Genome token") that automatically accrues value over time.

Think of it as a vault share token. You deposit an underlying token and receive a gToken that represents your claim on a growing pool of that underlying token. The more activity the Genome sees (wraps, unwraps, reward injections), the more underlying each gToken can redeem for.

## The Three Parties

The Helix protocol has three classes of participants:

**Users** wrap their tokens to earn yield passively. They deposit an underlying OP-20 token into a Genome contract, receive gTokens in return, and hold them. As the redemption ratio increases over time, their gTokens become redeemable for more underlying than they deposited. When they are ready, they unwrap to retrieve their underlying plus accumulated yield.

**Creators** deploy Genome contracts. A creator chooses an underlying OP-20 token, deploys the Genome smart contract, registers it in the Helix Factory, creates a liquidity pool on MotoSwap, and sets the wrap and unwrap fee rates. Creators are the owners of their Genome — they can update fees and inject rewards, but they cannot withdraw funds that belong to users.

**Liquidity providers** supply gToken/underlying liquidity on MotoSwap, enabling the secondary market for gTokens. This allows users to buy and sell gToken exposure without wrapping or unwrapping directly. Liquidity providers earn trading fees from MotoSwap on top of the underlying yield from the Genome.

## Why Bitcoin

Running yield-bearing token wrappers on Bitcoin L1 offers properties no other chain can match: the deepest liquidity, the longest security history, and the most credibly neutral base layer. Helix brings DeFi-style yield mechanics to Bitcoin without compromising on trust assumptions.
