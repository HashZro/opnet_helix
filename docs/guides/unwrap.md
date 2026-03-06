# Unwrapping Tokens

Unwrapping burns your gTokens and returns the underlying token to your wallet. The amount you receive is determined by the current redemption ratio — if the ratio has grown since you wrapped, you will receive more underlying than you originally deposited.

## Steps

1. **Navigate to the Genome detail page** — From the Explore page, click the Genome whose gTokens you want to redeem.

2. **Click "Unwrap → underlying"** — The Unwrap button opens the unwrap modal. Unwrapping is always available as long as you hold gTokens (it is not gated on pool activity).

3. **Enter the amount of gTokens to burn** — Type the number of gTokens you want to redeem. Use the "Max" button to redeem your full balance.

4. **Review the preview** — The modal shows:
   - Amount of underlying tokens you will receive
   - Current exchange rate (ratio)
   - Unwrap fee amount deducted
   - Net underlying output after fee

5. **Confirm the transaction in OPWallet** — OPWallet will prompt you to sign the unwrap transaction. Review and confirm. No separate approval is required for unwrapping.

6. **Underlying tokens appear in your wallet** — Once confirmed, your gToken balance decreases (tokens are burned) and your underlying balance increases by the net received amount.

## How Ratio Affects Your Output

The unwrap output is calculated as:

```
gross = gTokenAmount × ratio
net   = gross × (1 - unwrapFee)
```

**Example** (ratio = 1.08, unwrap fee = 1%):

| Input | Calculation | Result |
|---|---|---|
| Burn 100 gMOTO | 100 × 1.08 = 108 MOTO gross | — |
| 1% fee on 108 | 108 × 0.01 = 1.08 MOTO fee | stays in pool |
| Net received | 108 - 1.08 = **106.92 MOTO** | to your wallet |

If you originally deposited 100 MOTO to receive those gTokens, you have earned approximately 6.92 MOTO in yield — purely from the ratio growing while you held.

::: tip Unwrapping when ratio > 1.0
Any ratio above 1.0 means you receive more underlying than the face value of your gTokens. The longer you hold and the more activity the Genome sees, the higher the ratio can grow.
:::

::: tip Unwrapping is not gated on pool activity
Unlike wrapping, unwrapping does not require an active liquidity pool. If you already hold gTokens and the pool is empty or inactive, you can still unwrap at any time.
:::
