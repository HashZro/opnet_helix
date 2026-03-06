# The Ratio Mechanism

## The Formula

The Genome ratio is defined as:

```
ratio = underlyingBalance / gTokenSupply
```

Where:
- `underlyingBalance` = total underlying tokens held by the Genome contract
- `gTokenSupply` = total circulating supply of the gToken

The ratio represents how much underlying one gToken can redeem for at any given moment. A ratio of `1.1` means 1 gMOTO redeems for 1.1 MOTO.

## Starting State

At genesis, before anyone has wrapped, both `underlyingBalance` and `gTokenSupply` are zero and the ratio is treated as `1.0`. The first wrap sets both values simultaneously, keeping the ratio at exactly `1.0` (assuming no fee is set).

## Worked Example

Suppose the gMOTO Genome has a 1% wrap fee and starts fresh:

**Step 1: Alice wraps 100 MOTO**

- 1% fee = 1 MOTO stays in the pool, not converted to gTokens
- 99 MOTO used to mint gMOTO
- `underlyingBalance` = 100 MOTO (all 100 stay in contract)
- `gTokenSupply` = 99 gMOTO
- `ratio` = 100 / 99 ≈ **1.0101**

**Step 2: Bob wraps another 100 MOTO**

- 1% fee = 1 MOTO stays in pool again
- 99 MOTO / ratio(1.0101) ≈ 97.99 gMOTO minted
- `underlyingBalance` = 200 MOTO
- `gTokenSupply` = 99 + 97.99 ≈ 196.99 gMOTO
- `ratio` = 200 / 196.99 ≈ **1.0152**

**Step 3: Alice unwraps her 99 gMOTO at ratio 1.0152**

- Alice receives: 99 × 1.0152 ≈ 100.50 MOTO
- She deposited 100 MOTO and received ~100.50 MOTO back — net yield from fees

The yield came entirely from the fees Bob paid. Alice earned by holding while others transacted.

## Why the Ratio Only Increases

The ratio can only increase (or stay flat) because:

1. **Wrap fee**: Some underlying enters the contract but no gTokens are minted for that portion. Underlying goes up, supply stays lower → ratio increases.
2. **Unwrap fee**: Some underlying stays in the contract after a burn. Supply goes down, more underlying per remaining gToken → ratio increases.
3. **Reward injection**: Owner deposits underlying directly without minting any gTokens → ratio increases.

There is no mechanism to decrease the ratio. It is a monotonically non-decreasing value.

## Preview Functions

The Genome contract exposes two view methods to preview operations before executing:

- `getWrappedAmount(underlyingIn)` — given X underlying tokens, returns how many gTokens you will receive (after fees)
- `getUnwrappedAmount(gTokenIn)` — given X gTokens, returns how much underlying you will receive (after fees)

The Helix UI calls these automatically to show you the expected output before you confirm a transaction.
