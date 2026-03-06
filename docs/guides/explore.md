# Exploring Genomes

## The Explore Page

The Helix homepage (`/`) is the Explore page. It shows every Genome registered in the Helix Factory contract as a card. New Genomes appear automatically as they are deployed and registered.

## Genome Card Fields

Each card on the Explore page displays the following information:

| Field | What It Shows |
|---|---|
| **Name / Symbol** | The gToken name and symbol (e.g., `gMOTO`) |
| **Underlying** | The token this Genome wraps (e.g., `MOTO`) |
| **Ratio** | Current redemption ratio (underlying per gToken). Starts at 1.0, increases over time. |
| **Est. APY** | Estimated annualized yield based on ratio growth rate |
| **Wrap Fee** | Fee deducted when depositing underlying tokens |
| **Unwrap Fee** | Fee deducted when redeeming gTokens for underlying |
| **Total Wrapped (TVL)** | Total underlying tokens locked in the Genome contract |

## Understanding Estimated APY

The estimated APY is calculated from the Genome's current ratio relative to its starting ratio, annualized over the time since deployment.

::: warning APY is an estimate only
The displayed APY is a projection based on historical ratio growth. It is **not guaranteed**. Actual yield depends on future wrapping and unwrapping activity, fee rates, and any reward injections by the owner. A Genome with no activity will have 0% APY regardless of its fee settings.
:::

## Viewing a Genome's Detail Page

Click any Genome card to navigate to its detail page. The detail page shows:

- All card fields in expanded form
- Your personal balances (underlying token balance, gToken balance) — requires wallet connection
- Liquidity pool reserves (Reserve A and Reserve B on MotoSwap)
- Your LP token balance
- Wrap and Unwrap action buttons
- A link to view the Genome on OPScan

## Pool Status

If a Genome has no active liquidity pool yet (reserves are zero), wrapping will be disabled. The detail page will indicate this with a notice. Unwrapping is still available if you already hold gTokens.
