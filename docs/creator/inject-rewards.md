# Injecting Rewards

## What Is Reward Injection

Injecting rewards means depositing underlying tokens directly into the Genome contract to increase the redemption ratio for all gToken holders, without minting any new gTokens.

**Effect**: `underlyingBalance` increases, `gTokenSupply` stays the same → ratio goes up → every gToken is worth more underlying.

Only the Genome owner can call `injectRewards`. It is not available to regular users.

## Common Use Case: Recycling LP Fees

A Genome creator typically also provides liquidity on MotoSwap for the gToken/underlying pair. As traders buy and sell gTokens on the secondary market, the LP earns trading fees.

The workflow for recycling those fees back to gToken holders:

1. Collect accumulated LP trading fees from MotoSwap (via the "Remove Liquidity" or fee-claim interface)
2. Convert the fee tokens to the underlying token (if received in mixed form)
3. Use the "Inject LP Rewards" button on your Genome card to deposit the underlying into the Genome

This passes the LP earnings through to gToken holders as ratio growth — a compounding effect on top of the Genome's native wrap/unwrap fee yield.

## Steps

1. **Go to "My Genomes"** — Navigate to your Genome card.

2. **Click "Inject LP Rewards"** — Opens the reward injection modal.

3. **Enter the amount to inject** — Enter how many underlying tokens to deposit. The preview shows:
   - Current ratio (before injection)
   - New ratio (after injection)
   - Reward per gToken (ratio increase × 1 gToken)

4. **Approve the underlying token if needed** — First-time injection may require an OPWallet approval transaction for the underlying token.

5. **Confirm the inject transaction** — Sign the `injectRewards` transaction in OPWallet.

6. **Ratio updates on-chain** — Once confirmed, the Genome's `underlyingBalance` increases and the ratio is immediately higher for all gToken holders.

## Preview Fields

| Field | Description |
|---|---|
| Current Ratio | Ratio before injection |
| New Ratio | Ratio after your injection |
| Reward per gToken | How much extra underlying each gToken will now redeem for |

## Notes

::: tip Owner-only action
Only the wallet that deployed (owns) the Genome can inject rewards. This restriction is enforced at the contract level — any other address attempting to call `injectRewards` will have the transaction rejected.
:::

::: tip Injections are irreversible
Once you inject underlying tokens into the Genome, they belong to the gToken holders. There is no function to withdraw injected tokens. Inject only what you intend to distribute permanently.
:::
