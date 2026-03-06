# FAQ

## 1. Can I lose tokens by wrapping?

No, not through normal usage. When you wrap tokens into a Genome, they are held by the smart contract and remain claimable at any time by burning your gTokens. The ratio only increases over time — you will always receive at least as much underlying as the ratio at your time of unwrapping allows.

The only risk is smart contract bugs. Helix is deployed on testnet — treat all tokens as having no real value during this phase.

## 2. Who controls my gTokens?

You do. gTokens are standard OP-20 tokens in your wallet. The Genome owner has no ability to seize, freeze, or transfer your gTokens. There is no admin key that controls user balances.

## 3. Why can't I wrap yet? The button is disabled.

Wrapping requires the Genome to have an active MotoSwap liquidity pool with reserves on both sides. If the pool has not been set up yet (or has zero reserves), wrapping is locked.

This protection exists to prevent price manipulation before a pool is established. The Genome detail page will show a notice explaining the reason. If you are the creator, see the [Add Liquidity](/creator/add-liquidity) guide to set up the pool.

## 4. What happens if the Genome owner changes the fees?

Fee changes take effect immediately for future transactions, but they do not affect existing positions. If you are already holding gTokens and the owner raises the unwrap fee, you will only pay the new fee when you actually unwrap. There is no retroactive penalty.

## 5. Is this audited?

Helix is currently in testnet. The smart contracts have not undergone a formal third-party security audit. Do not use real funds. Treat all testnet tokens as valueless test assets.

## 6. How is APY calculated?

The estimated APY shown on Genome cards is computed as:

```
APY ≈ ((currentRatio / initialRatio) - 1) × (365 / daysSinceDeployment) × 100
```

This is a simple annualized projection based on historical ratio growth. It is not a guaranteed rate — it depends entirely on future wrapping activity, fee levels, and reward injections.

## 7. What is the ratio and why does it matter?

The ratio is `underlyingBalance / gTokenSupply`. It tells you how much underlying token one gToken redeems for. A ratio of 1.08 means 1 gMOTO is worth 1.08 MOTO. The higher the ratio, the more yield has accumulated for gToken holders. Holding gTokens while the ratio grows is how you earn yield in Helix.

## 8. Can I create a Genome for any token?

Yes, as long as:
- The token is a valid OP-20 contract deployed on OPNet
- No Genome has already been registered for that token in the Helix Factory
- You have enough testnet BTC to pay deployment gas

The factory enforces the "one Genome per underlying" rule and will reject duplicate registrations.

## 9. What is OPNet?

OPNet is a Bitcoin Layer 1 consensus extension that enables trustless smart contracts. Smart contracts are written in AssemblyScript, compiled to WebAssembly, and executed deterministically by the Bitcoin network. It is not a sidechain, not an L2, and not a metaprotocol — it uses Bitcoin's existing proof-of-work consensus directly.

## 10. How do I get testnet BTC?

Use an OPNet testnet faucet to claim free testnet BTC. Search for "OPNet testnet faucet" or check the official OPNet documentation and Discord for current faucet links. A small amount (0.001–0.01 tBTC) is sufficient for extensive testing.
