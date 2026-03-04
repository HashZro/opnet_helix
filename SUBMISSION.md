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
cd mines-opnet/frontend
npm run dev
# Open http://localhost:5173 in browser
# Connect OPWallet on testnet
# Navigate to each page and screenshot
```

---

## GitHub Checklist

- [ ] Repo is public
- [ ] README.md at root describes the project
- [ ] `mines-opnet/contracts/` contains all 4 AssemblyScript contracts
- [ ] `mines-opnet/frontend/` contains React frontend
- [ ] Contract ABIs in `mines-opnet/contracts/abis/`
- [ ] `.env.example` present (no secrets committed)
