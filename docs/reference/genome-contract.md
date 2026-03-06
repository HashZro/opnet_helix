# Genome Contract Methods

The Genome contract is an OP-20 token (ERC-20 equivalent on OPNet) that implements the Helix wrapping protocol. It inherits all standard OP-20 methods plus the following Genome-specific interface.

## Fee Note

Fees are specified in **basis points (bps)**. The valid range is 0–200 bps (0%–20%).

```
1 bps = 0.01%
10 bps = 0.1%
100 bps = 1%
200 bps = 2%  ← wait, 200 bps = 2%? Yes. Max fee is 20% = 2000 bps.
```

Wait — clarification: the Helix Genome contract stores fees as **basis points where 200 = 20%** (i.e., the range is 0–200 and maps directly to 0%–20%, not the traditional 0–10000 bps scale). In Helix, `1 unit = 0.1%`.

## Method Reference

| Method | Parameters | Returns | Who Can Call | Description |
|---|---|---|---|---|
| `wrap` | `amount: u256` | `bool` | Anyone | Deposits `amount` underlying tokens, mints gTokens to caller. Wrap fee deducted before minting. |
| `unwrap` | `amount: u256` | `bool` | Anyone | Burns `amount` gTokens, returns underlying to caller. Unwrap fee deducted from output. |
| `injectRewards` | `amount: u256` | `bool` | Owner only | Deposits `amount` underlying into the contract without minting gTokens. Increases ratio for all holders. |
| `setWrapFee` | `fee: u256` | `bool` | Owner only | Sets the wrap fee (0–200 units, where 200 = 20%). Takes effect immediately. |
| `setUnwrapFee` | `fee: u256` | `bool` | Owner only | Sets the unwrap fee (0–200 units, where 200 = 20%). Takes effect immediately. |
| `getWrapFee` | — | `u256` | Anyone | Returns the current wrap fee setting. |
| `getUnwrapFee` | — | `u256` | Anyone | Returns the current unwrap fee setting. |
| `getWrappedAmount` | `underlyingIn: u256` | `u256` | Anyone | Preview: returns how many gTokens you would receive for `underlyingIn` (after fee). |
| `getUnwrappedAmount` | `gTokenIn: u256` | `u256` | Anyone | Preview: returns how much underlying you would receive for burning `gTokenIn` (after fee). |
| `underlyingBalance` | — | `u256` | Anyone | Returns the total underlying tokens currently held by the Genome contract. |
| `getUnderlying` | — | `Address` | Anyone | Returns the contract address of the underlying OP-20 token. |
| `getOwner` | — | `Address` | Anyone | Returns the address of the Genome owner. |
| `totalSupply` | — | `u256` | Anyone | Returns the total circulating supply of gTokens. Inherited from OP-20. |
| `balanceOf` | `account: Address` | `u256` | Anyone | Returns the gToken balance of `account`. Inherited from OP-20. |

## Deriving the Ratio

The ratio is not stored directly as a contract field — it is computed from two values:

```
ratio = underlyingBalance() / totalSupply()
```

The Helix frontend computes and displays this ratio in real time using the two view methods above.

## Events

The Genome contract emits standard OP-20 `Transfer` events for wrap (mint) and unwrap (burn) operations. It also emits events for `injectRewards`, `setWrapFee`, and `setUnwrapFee` which the Helix indexer listens to for UI updates.
