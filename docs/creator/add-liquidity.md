# Adding Liquidity

## Why Liquidity Is Required

Wrapping is locked until your Genome has an active MotoSwap liquidity pool with reserves on **both sides**. This protects users from a price manipulation attack: if someone wraps tokens before a pool exists, they could then add liquidity at an arbitrary ratio, distorting the gToken price for all future wrappers.

By requiring an active pool before wrapping opens, Helix ensures the market price of gTokens reflects the actual underlying redemption ratio.

## The 1:1 Requirement

The MotoSwap pool for a Genome expects equal amounts of gToken and underlying token when adding liquidity. This is because gTokens start at a 1:1 ratio with the underlying — depositing at a different ratio would immediately create an arbitrage imbalance.

::: warning Pool must be 1:1
When you add liquidity, you must deposit equal amounts of gToken and underlying token. The Helix app enforces this automatically — the input is capped at the minimum of your two token balances, so both sides are always equal.
:::

## You Need gTokens First

Before you can add liquidity, you need gTokens. gTokens are obtained by wrapping the underlying token via the Wrap modal.

**Sequence**:
1. Wrap some underlying tokens → receive gTokens
2. Add Liquidity using equal amounts of gTokens + underlying

Make sure you hold enough of both tokens before proceeding.

## Steps

1. **Go to "My Genomes"** — Click the "My Genomes" nav tab (only visible when connected).

2. **Find your Genome card** — Your deployed Genome appears here with its pool status.

3. **Click "+ Add Liquidity"** — This opens the Add Liquidity modal.

4. **Enter the amount to deposit** — A single slider and input controls both sides simultaneously. The maximum is automatically set to the minimum of your gToken balance and your underlying token balance.

5. **Review the summary** — The modal shows:
   - Amount of gToken to deposit
   - Amount of underlying to deposit (equal to gToken amount)
   - Both are deposited at a 1:1 ratio

6. **Approve tokens if needed** — OPWallet may prompt you to approve both tokens before the liquidity transaction. Confirm each approval.

7. **Confirm the Add Liquidity transaction** — OPWallet prompts for the final transaction. A 40% slippage tolerance is set automatically to account for the bootstrapping phase.

8. **Pool is now active** — Once confirmed, the pool has reserves on both sides. The Wrap button becomes available to all users on the Explore page.

## Slippage Tolerance

The Add Liquidity modal uses a 40% slippage tolerance automatically. This is intentionally high for the initial liquidity provision because the pool is new and pricing can be volatile before sufficient liquidity is established. For subsequent liquidity additions, you may want to adjust this.
