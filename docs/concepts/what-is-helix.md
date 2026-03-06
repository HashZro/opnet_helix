# What is Helix

## Overview

HELIX is the first permissionless, modular decentralized finance (DeFi) protocol on Bitcoin L1 that allows any OP-20 asset to become the foundation of a self-sustaining financial system through **Volatility Farming**.

Volatility Farming (VF) is the core yield-generation mechanism within the Helix protocol, designed to monetize volatility. It enables liquidity providers (LPs) to earn yield from real economic activity — arbitrage flows, trading activity, and gToken interactions — rather than relying on token emissions or inflationary incentives.

## Bitcoin L1 via OPNet

OPNet is a consensus layer that brings trustless smart contracts to Bitcoin Layer 1. It is not a sidechain, not an L2 rollup, not a metaprotocol. Smart contracts are written in AssemblyScript, compiled to WebAssembly, and executed deterministically by Bitcoin nodes — enforced by Bitcoin consensus itself.

Your funds are secured by Bitcoin's proof-of-work. There are no bridge risks, no validator sets to trust, and no off-chain execution.

## What is Helix

Helix is a yield-wrapping protocol deployed on OPNet. It allows anyone to wrap any OP-20 token — OPNet's native fungible token standard — into a **gToken** (Genome token) that automatically accrues value over time.

Think of it as a vault share token. You deposit an underlying token and receive a gToken that represents your claim on a growing pool of that underlying token. The more activity the Genome sees (wraps, unwraps, reward injections), the more underlying each gToken can redeem for.

Volatility Farming transforms liquidity provision into a strategy that benefits from price volatility, rewarding participants for enabling deep, arbitrageable markets.

## The Three Parties

**Users** wrap their tokens to earn yield passively. They deposit an underlying OP-20 token into a Genome contract, receive gTokens in return, and hold them. As the redemption ratio increases over time, their gTokens become redeemable for more underlying than they deposited.

**Creators** deploy Genome contracts. A creator chooses an underlying OP-20 token, deploys the Genome smart contract, registers it in the Helix Factory, creates a liquidity pool on MotoSwap, and sets the wrap and unwrap fee rates. Creators are the owners of their Genome — they can update fees and inject rewards, but they cannot withdraw funds that belong to users.

**Liquidity providers** supply gToken/underlying liquidity on MotoSwap, enabling the secondary market for gTokens and earning trading fees. LP provision is a core pillar of the protocol — deeper liquidity means more arbitrage flow, more fees, and higher yield for all participants.

## Why Bitcoin

Running a volatility farming protocol on Bitcoin L1 offers properties no other chain can match: the deepest liquidity, the longest security history, and the most credibly neutral base layer. Helix brings sustainable, activity-driven DeFi yield to Bitcoin without compromising on trust assumptions.
