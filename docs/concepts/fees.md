# Fees

## Overview

Each Genome has two independent fees: a **wrap fee** and an **unwrap fee**. Both are set by the Genome creator (owner) and can be updated at any time.

Fees are measured in **basis points (bps)**: 1 basis point = 0.01%, so 100 bps = 1%.

| Fee Value | In Basis Points |
|---|---|
| 0% | 0 bps |
| 0.1% | 1 bps |
| 0.5% | 5 bps |
| 1% | 10 bps |
| 2% | 20 bps |
| 5% | 50 bps |
| 10% | 100 bps |
| 20% | 200 bps |

The maximum fee is **20% (200 bps)**. The minimum is **0% (0 bps)**.

## Where Fees Go

Fees do **not** go to the Genome owner. They are not sent to any external address. Fees stay inside the Genome contract as underlying token balance.

Because fees increase the underlying balance without creating new gTokens, they increase the redemption ratio — redistributing value from the transacting user to all current gToken holders proportionally.

**This means**: fees benefit you if you are already holding gTokens, and cost you only at the moment you wrap or unwrap.

## Wrap Fee Mechanics

The wrap fee is deducted from your deposit before calculating how many gTokens to mint.

**Example** (1% wrap fee, ratio = 1.0):

- You deposit 1000 MOTO
- Fee = 1000 × 0.01 = 10 MOTO (stays in contract)
- Effective deposit = 990 MOTO
- gTokens minted = 990 / 1.0 = **990 gMOTO**

You paid 1000 MOTO and received 990 gMOTO. The 10 MOTO fee increased the ratio for all existing holders.

## Unwrap Fee Mechanics

The unwrap fee is deducted from the underlying output after calculating the redemption value.

**Example** (1% unwrap fee, ratio = 1.05):

- You burn 100 gMOTO
- Gross underlying = 100 × 1.05 = 105 MOTO
- Fee = 105 × 0.01 = 1.05 MOTO (stays in contract)
- You receive = 105 - 1.05 = **103.95 MOTO**

The 1.05 MOTO fee increased the ratio for remaining holders.

## Fee Presets

The Helix UI offers common preset buttons when setting fees:

| Preset | Bps | Typical Use Case |
|---|---|---|
| 0% | 0 | No fee — ratio static unless rewards injected |
| 0.5% | 5 | Low-activity Genomes |
| 1% | 10 | Standard — most common choice |
| 2% | 20 | Higher yield target |
| 5% | 50 | High-demand or exclusive Genomes |
| 10% | 100 | Aggressive yield; expect less wrapping volume |

## Fee Changes

The owner can change fees at any time. Changes take effect immediately for all future transactions — they do not apply retroactively to existing positions. If you are holding gTokens and the fee increases, you are unaffected until you next wrap or unwrap.
