# Connecting Your Wallet

## Steps

1. **Install OPWallet** — Download the OPWallet browser extension and set it up with a new or existing wallet. Make sure you are on the testnet network inside OPWallet settings.

2. **Create or import your wallet** — Follow the OPWallet onboarding flow to create a new wallet (save your seed phrase securely) or import an existing one.

3. **Open the Helix app** — Navigate to the Helix app. You will see a "Connect" button in the top-right corner of the navigation bar.

4. **Click Connect** — Click the Connect button. OPWallet will open a popup asking you to approve the connection request.

5. **Approve in OPWallet** — Review the connection request in the OPWallet popup and click Approve. The popup will close automatically.

6. **Confirm connection** — Your BTC balance will appear in the navigation bar, and the "My Genomes" tab will become visible. You are now connected.

## The Identity Key

::: tip Note on How OPNet Identifies You
OPWallet gives you two keys: a visible Bitcoin address (the tweaked public key, shown as a `bc1p...` or `opt1...` address) and an **identity key** — an internal ML-DSA key derived from your wallet.

On OPNet, **the identity key is your on-chain identity** — it is what smart contracts see as `msg.sender`. This is handled entirely automatically by the Helix app and OPWallet. You do not need to manage or think about this distinction; it is resolved behind the scenes on every transaction.
:::

## Disconnecting

To disconnect your wallet, use the OPWallet extension popup and revoke the site's connection. The Helix app will return to its unauthenticated state (no "My Genomes" tab, no balance display).
