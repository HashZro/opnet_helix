# Prerequisites

Before using the Helix app, you need the following:

::: warning Testnet Notice
This documentation covers the **testnet deployment** of Helix on OPNet testnet. Real funds are not involved. All tokens used here are testnet tokens with no monetary value.
:::

## 1. OPWallet Browser Extension

OPWallet is the official Bitcoin wallet extension for OPNet. It manages your Bitcoin keys, signs transactions, and interacts with OPNet smart contracts directly from your browser.

- Install OPWallet from the browser extension store for your browser
- Create a new wallet or import an existing one using your seed phrase
- OPWallet handles both your Bitcoin (for gas) and your OP-20 tokens

OPWallet is required — no other wallet is compatible with OPNet smart contract interactions.

## 2. Testnet BTC (for gas)

All OPNet transactions require a small amount of Bitcoin to pay for transaction fees (gas). On testnet, you need testnet BTC.

To get testnet BTC:
- Use an OPNet testnet faucet to claim free testnet BTC
- Testnet BTC has no real value and is only valid on the testnet network
- A small amount (0.001–0.01 tBTC) is enough for dozens of interactions

## 3. OP-20 Test Tokens

To wrap tokens in Helix, you need the underlying OP-20 tokens. On testnet, two tokens are available:

**MOTO** — The native token of MotoSwap, available on testnet.
- You can mint testnet MOTO by calling the `mine()` function on the MOTO contract
- The Helix app provides a direct link to the MOTO contract on OPScan

**PILL** — A secondary testnet token also available via `mine()`.

Both tokens are freely mintable on testnet for testing purposes. Use the OPScan interface or the Helix app's provided links to mint them before wrapping.

## Summary

| Requirement | Purpose |
|---|---|
| OPWallet extension | Sign transactions, manage keys |
| Testnet BTC | Pay gas fees on OPNet testnet |
| Testnet OP-20 tokens (MOTO/PILL) | Deposit into Genomes to receive gTokens |
