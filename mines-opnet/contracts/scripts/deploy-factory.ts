/**
 * Deploy Factory to OPNet testnet
 *
 * Run: npm run deploy:factory
 *
 * Prerequisites:
 *  - .env with EC_PRIVATE_KEY (64 hex) and MLDSA_PRIVATE_KEY (5120 hex) set
 *  - build/Factory.wasm must exist (run: npm run build:factory)
 *  - Deployer wallet must have testnet BTC for fees
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    Wallet,
    TransactionFactory,
    OPNetLimitedProvider,
    MLDSASecurityLevel,
} from '@btc-vision/transaction';
import { networks, payments, toXOnly, type PublicKey, type XOnlyPublicKey } from '@btc-vision/bitcoin';
import { JSONRpcProvider } from 'opnet';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const NODE_URL = 'https://testnet.opnet.org';
const NETWORK  = networks.testnet;

const OPNET_NETWORK = { ...NETWORK, bech32: NETWORK.bech32Opnet! };
const FEE_RATE    = 50;
const PRIORITY_FEE = 0n;
const GAS_SAT_FEE  = 10_000n;

// ---------------------------------------------------------------------------
// Load wallet from EC_PRIVATE_KEY + MLDSA_PRIVATE_KEY
// ---------------------------------------------------------------------------
const EC_PK = process.env.EC_PRIVATE_KEY;
if (!EC_PK) throw new Error('EC_PRIVATE_KEY not set in .env');
if (EC_PK.replace(/^0x/, '').length !== 64) {
    throw new Error(`Expected 64 hex chars in EC_PRIVATE_KEY, got ${EC_PK.replace(/^0x/, '').length}.`);
}

const MLDSA_PK = process.env.MLDSA_PRIVATE_KEY;
if (!MLDSA_PK) throw new Error('MLDSA_PRIVATE_KEY not set in .env');
if (MLDSA_PK.replace(/^0x/, '').length !== 5120) {
    throw new Error(`Expected 5120 hex chars in MLDSA_PRIVATE_KEY, got ${MLDSA_PK.replace(/^0x/, '').length}.`);
}

const wallet = Wallet.fromPrivateKeys(
    EC_PK,
    MLDSA_PK,
    NETWORK,
    MLDSASecurityLevel.LEVEL2,
);

const { address: opnetP2TR }   = payments.p2tr({ internalPubkey: toXOnly(wallet.publicKey as PublicKey) as XOnlyPublicKey, network: OPNET_NETWORK });
const { address: opnetP2WPKH } = payments.p2wpkh({ pubkey: wallet.publicKey as PublicKey, network: OPNET_NETWORK });

console.log('=== Factory Deployment ===');
console.log('Network         :', 'testnet (OPNet)');
console.log('Deployer p2tr   :', opnetP2TR);
console.log('Deployer p2wpkh :', opnetP2WPKH);

// ---------------------------------------------------------------------------
// Load compiled WASM binary
// ---------------------------------------------------------------------------
const __dirname  = dirname(fileURLToPath(import.meta.url));
const wasmPath   = join(__dirname, '..', 'build', 'Factory.wasm');
const bytecode   = new Uint8Array(readFileSync(wasmPath));
console.log(`WASM loaded     : ${bytecode.length} bytes  (${wasmPath})`);

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------
const utxoProvider = new OPNetLimitedProvider(NODE_URL);
const rpcProvider  = new JSONRpcProvider(NODE_URL, NETWORK);

// ---------------------------------------------------------------------------
// Fetch UTXOs
// ---------------------------------------------------------------------------
console.log('\nFetching UTXOs...');
const utxos = await utxoProvider.fetchUTXOMultiAddr({
    addresses:       [opnetP2TR!, opnetP2WPKH!],
    minAmount:       330n,
    requestedAmount: 100_000_000n,
    optimized:       true,
    usePendingUTXO:  true,
});

if (!utxos.length) {
    throw new Error(
        'No UTXOs found.\n' +
        'Fund the deployer addresses with testnet BTC before deploying:\n' +
        `  p2tr  : ${opnetP2TR}\n` +
        `  p2wpkh: ${opnetP2WPKH}`
    );
}
console.log(`Found ${utxos.length} UTXO(s)`);

// ---------------------------------------------------------------------------
// Fetch epoch challenge
// ---------------------------------------------------------------------------
console.log('Fetching epoch challenge...');
const challenge = await rpcProvider.getChallenge();

// ---------------------------------------------------------------------------
// Sign deployment (no calldata — Factory.onDeployment only reads tx.sender)
// ---------------------------------------------------------------------------
console.log('Signing deployment...');
const factory = new TransactionFactory();
const result  = await factory.signDeployment({
    bytecode,
    challenge,
    signer:       wallet.keypair,
    mldsaSigner:  wallet.mldsaKeypair,
    network:      NETWORK,
    utxos,
    from:         opnetP2TR!,
    feeRate:      FEE_RATE,
    priorityFee:  PRIORITY_FEE,
    gasSatFee:    GAS_SAT_FEE,
});

console.log('\n--- Deployment signed ---');
console.log('Contract address:', result.contractAddress);
console.log('Contract pubkey :', result.contractPubKey);

const [fundingTxHex, deployTxHex] = result.transaction;

// ---------------------------------------------------------------------------
// Broadcast: funding FIRST, then deployment
// ---------------------------------------------------------------------------
console.log('\nBroadcasting funding tx...');
const fundingResp = await utxoProvider.broadcastTransaction(fundingTxHex, false);
if (!fundingResp?.success) {
    throw new Error(`Funding tx broadcast failed: ${fundingResp?.error ?? 'unknown error'}`);
}
console.log('Funding tx  :', fundingResp.result);

console.log('Broadcasting deployment tx...');
const deployResp = await utxoProvider.broadcastTransaction(deployTxHex, false);
if (!deployResp?.success) {
    throw new Error(`Deployment tx broadcast failed: ${deployResp?.error ?? 'unknown error'}`);
}
console.log('Deploy tx   :', deployResp.result);

// ---------------------------------------------------------------------------
// Done
// ---------------------------------------------------------------------------
console.log('\n=== Deployment complete ===');
console.log('Contract address:', result.contractAddress);
console.log('Contract pubkey :', result.contractPubKey);
console.log('\nSave the contract address — you will need it for frontend integration.');
