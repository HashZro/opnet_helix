# Mines Protocol — OPNet Bitcoin L1

> Token-wrapping yield protocol on Bitcoin L1 via OPNet smart contracts.

A port of the Ethereum Mines protocol to AssemblyScript smart contracts running on OPNet (Bitcoin L1 consensus layer). Users wrap OP_20 tokens into yield-bearing xTokens; wrap/unwrap fees accrue to stakers, making the xToken ratio grow over time.

Built for the **OPNet Vibecoding Challenge** — #opnetvibecode @opnetbtc

## What It Does

- **Wrap** any registered OP_20 token into an xToken (e.g. wMINER). The xToken/underlying ratio grows as fees compound.
- **Unwrap** xTokens back to the underlying token (minus a small fee).
- **Stake** MINER tokens in the Staking contract to earn a share of protocol fees disbursed by Mine contracts.
- **Claim** accumulated staking rewards at any time.

## Architecture

```
MinerToken (OP_20)   Factory (OP_NET)
  Free mint()          Mine registry
       │                    │
       ▼                    ▼
Mine (OP_20)          Staking (OP_NET)
  IS the xToken         Stake MINER
  wrap / unwrap         Points-based rewards
  Fee mechanics    ◄──  disburse fees
  Ratio growth
```

Four AssemblyScript smart contracts compiled to WebAssembly and deployed on Bitcoin L1 via OPNet:

| Contract | Type | Description |
|----------|------|-------------|
| `MinerToken` | OP_20 | Protocol token with free `mint()` faucet |
| `Factory` | OP_NET | Mine registry — maps underlying token → Mine address |
| `Mine` | OP_20 | xToken wrapper — handles wrap/unwrap/fee logic |
| `Staking` | OP_NET | Points-based staking for fee rewards |

## Fee Algorithm

```
if totalSupply == 0:
    xAmount = amount                    // 1:1 on first wrap
else:
    feeAmount = amount * wrapFee / 1000
    controllerFee = feeAmount * controllerFeeRate / 1000
    protocolFee   = feeAmount * protocolFeeRate / 1000
    stakersFee    = feeAmount - controllerFee - protocolFee
    xAmount = totalSupply * (amount - feeAmount) / (underlyingBalance + stakersFee)
```

## Tech Stack

- **Smart Contracts**: AssemblyScript → WASM, deployed on OPNet (Bitcoin L1)
- **Frontend**: React + TypeScript + Vite + Tailwind CSS (dark theme)
- **Wallet**: OPWallet via `@btc-vision/walletconnect`
- **Chain interaction**: `opnet` package, `JSONRpcProvider`
- **Network**: OPNet Testnet (`https://testnet.opnet.org`)

## Project Structure

```
├── contracts/          # AssemblyScript smart contracts
│   ├── src/
│   │   ├── miner-token/    MinerToken.ts
│   │   ├── mine/           Mine.ts
│   │   ├── factory/        Factory.ts
│   │   └── staking/        Staking.ts
│   ├── abis/           # Generated ABI files
│   └── asconfig.json
└── frontend/           # React frontend
    └── src/
        ├── pages/      HomePage, MineDetailPage, WrapPage, UnwrapPage, StakingPage
        ├── hooks/      useWallet, useMines, useMine, useStaking
        └── lib/        provider, contracts, wallet, helpers
```

## Deployed Contracts (Testnet)

| Contract | Address |
|----------|---------|
| MinerToken | See `.env` / `src/lib/contracts.ts` |
| Factory    | See `.env` / `src/lib/contracts.ts` |
| Mine       | Registered via Factory |
| Staking    | See `.env` / `src/lib/contracts.ts` |

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
npm run build:miner    # MinerToken.wasm
npm run build:factory  # Factory.wasm
npm run build:mine     # Mine.wasm
npm run build:staking  # Staking.wasm
```

## Key User Flows

1. **Get testnet MINER** — Click "Get Testnet MINER" on the Home page to mint free tokens via the faucet.
2. **Wrap** — Go to the Wrap page, enter an amount of MINER, approve allowance, then wrap to receive wMINER xTokens.
3. **Unwrap** — Go to the Unwrap page, enter wMINER amount to burn and receive MINER back (minus fee).
4. **Stake** — Go to the Staking page, stake MINER to earn a share of wrap/unwrap fees as staking rewards.
5. **Claim rewards** — On the Staking page, claim accumulated MINER rewards from staking.

## OPNet Key Concepts Used

- `SafeMath` for all u256 arithmetic — no overflow risk
- Bounded `for` loops only — no while loops
- Unique storage pointers via `Blockchain.nextPointer`
- `onDeployment()` for one-time initialization (constructor runs every call)
- SHA256 method selectors (not Keccak256)
- CEI pattern: Checks → Effects → Interactions
- Identity key resolution via `provider.getPublicKeyInfo()`

## License

MIT
