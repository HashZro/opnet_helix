# Helix — Genome Protocol on OPNet

Yield-bearing token wrappers on Bitcoin L1. Wrap any OP-20 token into a gToken that accrues value as fees and rewards compound into the redemption ratio.

Built for the **OPNet Vibecoding Challenge** — #opnetvibecode

## How It Works

A **Genome** wraps one OP-20 token and issues a gToken (e.g. MOTO → gMOTO). The ratio starts at 1:1 and only ever increases — from wrap fees, unwrap fees, and owner reward injections. Holding gTokens while the ratio grows is how you earn yield.

## Repo Structure

```
helix/
├── contracts/   AssemblyScript smart contracts (compiled to WASM)
├── frontend/    React + TypeScript + Vite dapp
└── docs/        VitePress documentation site
```

## Quick Start

```bash
# Frontend
cd frontend && npm install && npm run dev

# Docs
cd docs && npm install && npm run docs:dev

# Contracts (build only)
cd contracts && npm install && npm run build:genome && npm run build:factory
```

## Deployed Contracts (OPNet Testnet)

| Contract | Address |
|---|---|
| Factory | `opt1sqr560qfrd9czkhtagkslclxaej2qxnryjvzjlws8` |
| MOTO Token | `opt1sqzkx6wm5acawl9m6nay2mjsm6wagv7gazcgtczds` |

## Tech Stack

- **Contracts** — AssemblyScript → WASM, OPNet Bitcoin L1
- **Frontend** — React, TypeScript, Vite, OPWallet
- **DEX** — MotoSwap AMM for gToken liquidity pools
- **Docs** — VitePress

## License

MIT
