# Helix — Frontend

React + TypeScript + Vite dapp for the Helix Genome Protocol on OPNet.

## Setup

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
```

## Pages

| Route | Page |
|---|---|
| `/` | Explore — browse all Genomes |
| `/mine/:address` | Genome detail — wrap, unwrap, pool info |
| `/create` | Create a new Genome |
| `/my-genomes` | Manage your deployed Genomes |

## Key Libraries

- `@btc-vision/walletconnect` — OPWallet connection
- `opnet` — contract interaction, `JSONRpcProvider`
- `@btc-vision/transaction` — `Address` type
- `@btc-vision/bitcoin` — network config
