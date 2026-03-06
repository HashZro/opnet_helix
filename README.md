# Helix — Genome Protocol on OPNet Bitcoin L1

> gToken yield-wrapping protocol on Bitcoin L1 via OPNet smart contracts.

Wrap any OP-20 token into a gToken (genome token) that appreciates over time as wrap/unwrap fees compound into the pool ratio. Genome owners can also inject LP rewards directly into their genome to boost the gToken/underlying ratio.

Built for the **OPNet Vibecoding Challenge** — #opnetvibecode @opnetbtc

## What It Does

- **Wrap** any registered OP-20 token into a gToken (e.g. gMOTO). The gToken/underlying ratio grows as fees compound — holders earn yield by simply holding.
- **Unwrap** gTokens back to the underlying token (minus a small fee that stays in the pool).
- **Create a Genome** — deploy a new Genome contract from the browser, auto-register with the Factory, and auto-create a MotoSwap liquidity pool.
- **Inject Rewards** — genome owners can inject underlying tokens directly into their genome, instantly boosting the gToken ratio for all holders.
- **Claim LP Fees** — genome owners remove liquidity from MotoSwap, receive the underlying fee tokens, and inject them into the genome in a single 3-step flow.

## Architecture

```
Factory (OP_NET)          Genome (OP_20)
  Genome registry    ──►    IS the gToken
  registerGenome()          wrap / unwrap
  getGenomeAddress()        injectRewards()
                            notifyAmmFee()
                            Fee → ratio growth

MotoSwap Pool  ──LP Fees──► injectRewards ──► gToken ratio increase
```

Two core AssemblyScript smart contracts compiled to WebAssembly and deployed on Bitcoin L1 via OPNet:

| Contract | Type | Description |
|----------|------|-------------|
| `Factory` | OP_NET | Genome registry — maps underlying token → Genome address |
| `Genome` | OP_20 | gToken wrapper — handles wrap/unwrap/injectRewards/fee logic |

## gToken Standard

All genome tokens follow the **gToken naming standard**:
- Symbol must start with lowercase `g` (e.g. `gMOTO`, `gPILL`, `gMINER`)
- The prefix signals a yield-bearing genome wrapper
- Enforced in the UI: auto-prepend on blur, deploy disabled without `g` prefix

## Fee Algorithm

```
if totalSupply == 0:
    gAmount = amount              // 1:1 on first wrap
else:
    feeAmount = amount * wrapFee / 1000
    netAmount = amount - feeAmount
    gAmount = totalSupply * netAmount / underlyingBalance
    // feeAmount stays locked in pool → ratio grows for all holders
```

## injectRewards

Genome owners can call `injectRewards(amount)` to deposit underlying tokens directly into the genome pool. This increases `underlyingBalance` without minting new gTokens, instantly boosting the ratio for all existing holders.

## LP Claim Flow (My Genomes page)

For genome owners who have added liquidity to MotoSwap:

1. Approve LP tokens to MotoSwap router
2. `removeLiquidity(gToken, underlying, lpBalance, ...)` — receive underlying tokens back
3. Approve underlying to genome contract
4. `injectRewards(underlyingAmount)` — inject received underlying into genome

Result: LP fees are recycled into the genome ratio rather than sitting idle.

## Tech Stack

- **Smart Contracts**: AssemblyScript → WASM, deployed on OPNet (Bitcoin L1)
- **Frontend**: React + TypeScript + Vite, industrial monochrome design (Mulish + Sometype Mono)
- **Wallet**: OPWallet via `@btc-vision/walletconnect`
- **Chain interaction**: `opnet` package, `JSONRpcProvider`
- **DEX**: MotoSwap (OP-20 AMM) for gToken liquidity pools
- **Network**: OPNet Testnet (`https://testnet.opnet.org`)

## Project Structure

```
├── contracts/          # AssemblyScript smart contracts
│   ├── src/
│   │   ├── genome/         Genome.ts (gToken wrapper)
│   │   ├── factory/        Factory.ts (genome registry)
│   │   └── miner-token/    MinerToken.ts (test token)
│   ├── abis/           # Generated ABI files
│   ├── build/          # Compiled WASM files
│   └── scripts/        # Deploy + registration scripts
└── frontend/           # React frontend
    └── src/
        ├── pages/      HomePage, MineDetailPage, WrapPage, UnwrapPage, CreateGenomePage, MyGenomesPage
        ├── hooks/      useWallet, useMines, useMine, useGenomePoolInfo
        └── lib/        provider, contracts, wallet, helpers
```

## Deployed Contracts (Testnet)

| Contract | Address |
|----------|---------|
| Factory v3 | `opt1sqpfg7r4n6jqen30xqtm5fak5gllpczhd3syzafv8` |
| gMOTO Genome (test) | `opt1sqr4mgm9fsuyszwt8jm0ry57m8juyzxs70yngde4w` |

## Running Locally

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` and connect OPWallet (testnet mode).

### Contracts (build only)

```bash
cd contracts
npm install
npm run build:genome   # Genome.wasm
npm run build:factory  # Factory.wasm
npm run build:miner    # MinerToken.wasm
```

## Key User Flows

1. **Wrap** — Go to Wrap page, select a genome, enter underlying token amount, approve allowance, wrap to receive gTokens.
2. **Unwrap** — Go to Unwrap page, enter gToken amount to burn and receive underlying back (minus fee).
3. **Create Genome** — Go to Create Genome page, enter underlying token address and gToken name/symbol, deploy genome, auto-register with Factory, auto-create MotoSwap pool.
4. **Inject Rewards** — On My Genomes page, enter amount and click Inject Rewards to boost your genome's ratio.
5. **Claim LP Fees** — On My Genomes page, if you have LP balance > 0, click "Claim LP Fees → Genome" to run the 3-step claim flow.

## OPNet Key Concepts Used

- `SafeMath` for all u256 arithmetic — no overflow risk
- Bounded `for` loops only — no while loops
- Unique storage pointers via `Blockchain.nextPointer`
- `onDeployment()` for one-time initialization (constructor runs every call)
- SHA256 method selectors (not Keccak256)
- CEI pattern: Checks → Effects → Interactions
- Identity key resolution via `provider.getPublicKeyInfo()`
- Cross-contract calls via `Blockchain.call(target, calldata)`

## License

MIT
