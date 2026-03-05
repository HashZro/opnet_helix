# Mines Protocol — Frontend

React + TypeScript + Vite frontend for the Mines Protocol OPNet application.

## Setup

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build to dist/
```

## Environment

Copy `.env.example` to `.env` and fill in contract addresses:

```
VITE_MINER_TOKEN_ADDRESS=...
VITE_FACTORY_ADDRESS=...
VITE_STAKING_ADDRESS=...
VITE_MINE_ADDRESS=...
VITE_NETWORK=testnet
VITE_RPC_URL=https://testnet.opnet.org
```

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | HomePage | Mine list, faucet button |
| `/mine/:address` | MineDetailPage | Stats: ratio, fees, balances |
| `/wrap` | WrapPage | Wrap underlying → xToken |
| `/unwrap` | UnwrapPage | Burn xToken → underlying |
| `/staking` | StakingPage | Stake/unstake/claim rewards |

## Key Libraries

- `@btc-vision/walletconnect` — OPWallet connection
- `opnet` — Contract interaction, JSONRpcProvider
- `@btc-vision/transaction` — Address type
- `@btc-vision/bitcoin` — Network config, toOutputScript
