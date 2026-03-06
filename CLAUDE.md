# CLAUDE.md — Mines Protocol OPNet Build Instructions

## What This Is

Token-wrapping yield protocol on OPNet (Bitcoin L1). Port of Ethereum Mines protocol to AssemblyScript smart contracts + React frontend for the Vibecoding Challenge.

## Critical Rules

### Package Versions (EXACT — do not guess)
```json
{
  "@btc-vision/btc-runtime": "^1.11.0-rc.10",
  "@btc-vision/transaction": "1.8.0-beta.10",
  "@btc-vision/bitcoin": "7.0.0-alpha.11",
  "@btc-vision/walletconnect": "^1.9.12",
  "@btc-vision/opnet-transform": "1.2.0",
  "opnet": "1.8.1-beta.13",
  "assemblyscript": "0.27.36"
}
```

### Smart Contract Rules (AssemblyScript)
- Extend `OP_20` for token contracts, `OP_NET` for non-token contracts
- **No OP_404 contracts** — strictly OP_20 and OP_NET base classes
- **SafeMath** for ALL u256 operations: `SafeMath.add()`, `.sub()`, `.mul()`, `.div()`
- **No raw arithmetic** on u256: never use `+`, `-`, `*`, `/`
- **No while loops** — bounded `for` loops only
- **Unique storage pointers** via `Blockchain.nextPointer` — collision = data corruption
- **Constructor runs every call** — one-time init in `onDeployment()` only
- **`super.onDeployment(_calldata)` MUST be first** in your onDeployment
- **`this.instantiate()`** called in onDeployment for OP_20 tokens
- Method selectors are **SHA256** first 4 bytes (not Keccak256)
- `StoredU256(pointer, EMPTY_SUB)` — second param is `new Uint8Array(30)`, not u256
- `ABIDataTypes` is globally available via decorators, NOT importable
- Big number literals: `u256.fromString('...')` — never `u256.fromU64()` for large values
- **CEI pattern**: Checks → Effects → Interactions (always)
- OP_20 uses `increaseAllowance()`/`decreaseAllowance()`, NOT `approve()`

### Frontend Rules (React + TypeScript)
- **@btc-vision/walletconnect** for wallet connection (OPWallet)
- **opnet** package for contract interaction via `getContract()`
- `getContract<T>(address, ABI, provider, network, sender)` — 5 params for writes
- `signer: null, mldsaSigner: null` in `sendTransaction()` — wallet extension signs
- Create **own JSONRpcProvider** for reads — never reuse walletconnect provider
- **NEVER import** `Address` or `ABIDataTypes` from `@btc-vision/bitcoin` on frontend
- Import `Address` from `@btc-vision/transaction` instead
- **ALWAYS simulate** before sending: `const sim = await contract.method(args)`
- IPFS deployment: `base: './'` in vite.config.ts, use `HashRouter`
- Fix WalletConnect popup CSS (position:fixed, centered, z-index:99999)
- **Identity key** ≠ tweaked pubkey — resolve via `provider.getPublicKeyInfo(tweakedHex, false)`
- Use identity key as sender for ALL contract interactions

### Backend Rules
- **hyper-express ONLY** — Express/Fastify/Koa are FORBIDDEN

### Forbidden Libraries
- NEVER use `bitcoinjs-lib` — use `@btc-vision/bitcoin`
- NEVER use `ecpair` — use `@btc-vision/ecpair`
- NEVER use `tiny-secp256k1` — use `@noble/curves`
- NEVER use mempool.space or blockstream API — use `opnet` package

### RPC Endpoints
- Testnet: `https://testnet.opnet.org`
- Regtest: `https://regtest.opnet.org`

## Workflow

1. Read `progress.txt` before starting any work
2. Read `prd.json` to find the next story (highest priority, passes=false)
3. Read `AGENTS.md` for established patterns
4. Implement ONE story at a time
5. Use Bob MCP for contract/chain research
6. Verify: contracts compile, frontend builds, no TypeScript errors
7. Update `prd.json` (passes: true), `progress.txt`, `AGENTS.md`
8. Git commit: `feat(STORY_ID): brief description`

## Reference Files

- `mines-contracts-main/src/Mine.sol` — Original fee algorithm
- `mines-contracts-main/src/Staking.sol` — Original staking logic
- `../monorepo/contracts/src/vault/MultSigVault.ts` — OPNet contract patterns
- `../monorepo/contracts/src/alpha/AlphaToken.ts` — OP_20 token pattern
- `../monorepo/contracts/asconfig.json` — Build configuration
- `../monorepo/contracts/scripts/deploy-vault.ts` — Deploy script pattern
- `../opnet_dev_guide.md` — Frontend integration patterns (replaces optnet_tricks.md)

## Session Efficiency
- ONE story per iteration
- Read specific reference files, don't dump directories
- If compilation fails, fix the error, don't restart from scratch
- Paste only error lines, not full logs
- For frontend function call on contracts, always fill it up with console logs, specifying the function name and values
