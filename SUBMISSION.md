# OPNet Vibecoding Challenge — Submission Materials

## App Description (2-3 sentences)

Mines Protocol is a token-wrapping yield protocol built entirely on Bitcoin L1 via OPNet smart contracts. Users wrap OP_20 tokens into yield-bearing xTokens; wrap and unwrap fees compound inside the vault, making each xToken worth more underlying over time. Stakers earn a share of protocol fees by locking MINER tokens in the Staking contract, creating a self-reinforcing incentive loop — all without leaving Bitcoin.

---

## Tweet Text

```
Just shipped Mines Protocol for the @opnetbtc Vibecoding Challenge 🎉

A token-wrapping yield protocol on Bitcoin L1 — no sidechains, no L2s, pure OPNet smart contracts.

✅ Wrap OP20 tokens → yield-bearing xTokens
✅ Fees compound in the vault (ratio grows over time)
✅ Stake MINER to earn a share of all wrap/unwrap fees
✅ 4 AssemblyScript contracts → WASM on Bitcoin L1
✅ React frontend with OPWallet integration

#opnetvibecode #bitcoin #opnet
```

---

## Screenshots Needed (manual — run `npm run dev` and capture)

1. **HomePage** — Mine list grid showing the wMINER mine card with ratio, fee, and "Get Testnet MINER" faucet button
2. **WrapPage** — Amount field filled in (e.g. 100 MINER), showing preview of xTokens to receive
3. **MineDetailPage** — Stats panel with underlying balance, total supply, ratio, wrap/unwrap fees
4. **StakingPage** — Staked balance, pending rewards, stake/unstake/claim buttons

### Steps to capture screenshots:
```bash
cd frontend
npm run dev
# Open http://localhost:5173 in browser
# Connect OPWallet on testnet
# Navigate to each page and screenshot
```

---

## Deployed Contract Addresses (Testnet)

| Contract | Bech32 Address | Pubkey |
|---|---|---|
| Factory (v2, current) | `opt1sqp0hga3emwtytfz3mr7azu0a6rvrfk488u3sfw9j` | `0x044494c8c676b1969ba491f2b4eaac617d89de856231a192a321aecb7a9cb448` |
| Factory (v1, old — missing registerMine) | `opt1sqpaphjdgykdzrzkyc9lm2sqp4ruf7z7tgqv3wvx9` | `0x9c07eb1cf97be44831626f87967fa88b6238f733b9b865179c0c7a43a5270b9b` |
| Moto Token (underlying) | `opt1sqzkx6wm5acawl9m6nay2mjsm6wagv7gazcgtczds` | `0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd` |
| xMoto Mine | `opt1sqzet9gfcfyvh50qvlw5d2p0cdzndg9spa5zgr238` | `0x170bc1d3b2a07d0ec8dc37a7d31efebefd619dafc9609fc0cb806220e4869ae7` |

### Factory v2 Deployment TX
- Funding tx: `0a54eaf94ed7edfb41707207c811a57b872ff0efc77d1fd264aa3ce7fe033c35`
- Deploy tx: `5b8b019132bffe5f4755b950bcfcc8458f9d34c78ea281d85f05bf5216823acb`

### Registration TX (xMoto Mine → Factory v2) — CONFIRMED
- Funding tx: `d7ee5d6a6ab2600c2d10f11de43402bc87a546c375a17ae156d0f3a6aa507335`
- Register tx: `a3ce55cb7178c378f4a4da68fa379d80f1244483a8d64912a3736d9b4c8357ac`

---

## GitHub Checklist

- [ ] Repo is public
- [ ] README.md at root describes the project
- [ ] `contracts/` contains all 4 AssemblyScript contracts
- [ ] `frontend/` contains React frontend
- [ ] Contract ABIs in `contracts/abis/`
- [ ] `.env.example` present (no secrets committed)

---

## New Features (Phase 2) — Genome Protocol

### 1. gToken Naming Standard

All genome (wrapped) tokens must start with the `g` prefix (e.g. `gMOTO`, `gWBTC`). This is enforced in the Create Genome UI: the symbol field auto-prepends `g` on blur, and the Deploy button is disabled until the symbol starts with `g`. The underlying symbol is derived by stripping the `g` prefix for display (gMOTO → MOTO).

### 2. injectRewards

Genome owners can manually boost the gToken yield ratio by calling `injectRewards(amount)` on the Genome contract. This transfers the specified amount of underlying tokens from the caller into the genome's pool, increasing `_underlyingHeld` and therefore the ratio (`underlyingBalance / totalSupply`). The UI exposes this in:

- **My Genomes page** — Inject Rewards input + button in each GenomeOwnerCard
- **Genome Detail page** — Owner Actions section (only visible to the genome owner)

### 3. Automatic MotoSwap Pool Creation on Genome Deploy

When a user deploys a new genome via the Create Genome modal, the frontend automatically:

1. Deploys the Genome contract (WASM + calldata via `signDeployment`)
2. Registers it in Factory v3 via `registerGenome(underlying, genome)`
3. Creates a MotoSwap liquidity pool for the pair `(gToken, underlying)` via `motoFactory.createPool(genomePubkey, underlyingPubkey)`

This ensures every genome immediately has a trading pool on MotoSwap, enabling liquidity provision and LP fee accumulation.

### 4. LP Claim Flow (My Genomes page)

Genome owners who have provided liquidity to their genome's MotoSwap pool can claim accumulated LP fees and inject them directly into the genome to increase the ratio. The 3-step flow in `GenomeOwnerCard`:

1. **Approve LP tokens** — `increaseAllowance(router, lpBalance)` on the pool contract
2. **Remove liquidity** — `router.removeLiquidity(gToken, underlying, lpBalance, 0, 0, owner, deadline)`
3. **Inject rewards** — `increaseAllowance(genome, underlyingAmount)` on underlying → `genome.injectRewards(underlyingAmount)`

On success, the genome ratio increases immediately and the pool info refetches automatically.

### 5. New Factory Address (v3 — Genome Protocol)

The original Factory v2 used `registerMine` / `getMineCount` method names. Factory v3 uses genome terminology throughout:

| Method | Selector |
|---|---|
| `registerGenome()` | `0xce9c26cb` |
| `getGenomeCount()` | `0x955ba589` |
| `getGenomeAtIndex()` | `0xd64b436c` |
| `getGenomeAddress()` | `0x7f00213e` |

**Factory v3 (Genome Protocol):**

| Field | Value |
|---|---|
| Bech32 | `opt1sqpfg7r4n6jqen30xqtm5fak5gllpczhd3syzafv8` |
| Pubkey | `0x37df83dfbcca6447316f9e43a10009f81fc37171a9ad7d40d98a090b6806f67b` |
| Deploy tx | `6337574d24828b5716d2d92dfcda248ed7368c4baee04addeb777d9a9f655976` |

**gMOTO Genome (test genome — Moto token wrapped):**

| Field | Value |
|---|---|
| Bech32 | `opt1sqr4mgm9fsuyszwt8jm0ry57m8juyzxs70yngde4w` |
| Pubkey | `0x8c8cacdec6bfc9af74161cd25ef1af7bcdefe99fc43f12a849f299c720c4c898` |
| Ratio (verified) | `1.3395` (genome ratio > 1 confirms injectRewards working) |
