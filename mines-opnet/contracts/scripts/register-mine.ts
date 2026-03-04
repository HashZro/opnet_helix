/**
 * Register Mine in Factory contract on OPNet testnet
 *
 * Run: npm run register:mine
 *
 * Prerequisites:
 *  - .env with EC_PRIVATE_KEY (64 hex) and MLDSA_PRIVATE_KEY (5120 hex) set
 *  - Factory and Mine contracts must be deployed
 *  - UNDERLYING_ADDRESS (MinerToken pubkey) and MINE_ADDRESS (Mine pubkey) in .env
 *  - FACTORY_ADDRESS (Factory bech32) in .env
 */
import 'dotenv/config';
import { createHash } from 'node:crypto';

import {
    Wallet,
    TransactionFactory,
    OPNetLimitedProvider,
    MLDSASecurityLevel,
    BinaryWriter,
    Address,
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

// Contract addresses
const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS;
if (!FACTORY_ADDRESS) throw new Error('FACTORY_ADDRESS not set in .env');

const UNDERLYING_ADDRESS = process.env.UNDERLYING_ADDRESS;
if (!UNDERLYING_ADDRESS) throw new Error('UNDERLYING_ADDRESS not set in .env');

const MINE_ADDRESS = process.env.MINE_ADDRESS;
if (!MINE_ADDRESS) throw new Error('MINE_ADDRESS not set in .env');

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

console.log('=== Register Mine in Factory ===');
console.log('Network         :', 'testnet (OPNet)');
console.log('Deployer p2tr   :', opnetP2TR);
console.log('Factory         :', FACTORY_ADDRESS);
console.log('Underlying      :', UNDERLYING_ADDRESS);
console.log('Mine            :', MINE_ADDRESS);

// ---------------------------------------------------------------------------
// Compute selector: SHA256("registerMine") first 4 bytes
// ---------------------------------------------------------------------------
function sel(sig: string): number {
    return createHash('sha256').update(sig).digest().readUInt32BE(0);
}

// ---------------------------------------------------------------------------
// Build calldata: selector + underlying (Address) + mineAddress (Address)
// ---------------------------------------------------------------------------
const writer = new BinaryWriter();
writer.writeSelector(sel('registerMine'));
writer.writeAddress(Address.fromString(UNDERLYING_ADDRESS));
writer.writeAddress(Address.fromString(MINE_ADDRESS));
const calldata = new Uint8Array(writer.getBuffer());
console.log(`Calldata        : ${calldata.length} bytes`);

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------
const utxoProvider = new OPNetLimitedProvider(NODE_URL);
const rpcProvider  = new JSONRpcProvider(NODE_URL, NETWORK);

// ---------------------------------------------------------------------------
// Fetch contract pubkey for Factory
// ---------------------------------------------------------------------------
console.log('\nFetching Factory contract pubkey...');
const factoryCode = await rpcProvider.getCode(FACTORY_ADDRESS);
const factoryPubkey = (factoryCode as any).contractPublicKey;
if (!factoryPubkey) throw new Error('Could not fetch Factory contractPublicKey');
const factoryPubkeyHex = factoryPubkey instanceof Uint8Array
    ? '0x' + Buffer.from(factoryPubkey).toString('hex')
    : factoryPubkey.toString();
console.log('Factory pubkey  :', factoryPubkeyHex);

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
        'Fund the deployer addresses with testnet BTC before interacting:\n' +
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
// Sign interaction
// ---------------------------------------------------------------------------
console.log('Signing interaction...');
const factory = new TransactionFactory();
const result  = await factory.signInteraction({
    to:           FACTORY_ADDRESS,
    from:         opnetP2TR!,
    contract:     factoryPubkeyHex,
    calldata,
    challenge,
    signer:       wallet.keypair,
    mldsaSigner:  wallet.mldsaKeypair,
    network:      NETWORK,
    utxos,
    feeRate:      FEE_RATE,
    priorityFee:  PRIORITY_FEE,
    gasSatFee:    GAS_SAT_FEE,
});

if (!result.fundingTransaction || !result.interactionTransaction) {
    throw new Error('Missing funding or interaction transaction');
}

// ---------------------------------------------------------------------------
// Broadcast: funding FIRST, then interaction
// ---------------------------------------------------------------------------
console.log('\nBroadcasting funding tx...');
const fundingResp = await utxoProvider.broadcastTransaction(result.fundingTransaction, false);
if (!fundingResp?.success) {
    throw new Error(`Funding tx broadcast failed: ${fundingResp?.error ?? 'unknown error'}`);
}
console.log('Funding tx  :', fundingResp.result);

console.log('Broadcasting interaction tx...');
const interactionResp = await utxoProvider.broadcastTransaction(result.interactionTransaction, false);
if (!interactionResp?.success) {
    throw new Error(`Interaction tx broadcast failed: ${interactionResp?.error ?? 'unknown error'}`);
}
console.log('Register tx :', interactionResp.result);

// ---------------------------------------------------------------------------
// Done
// ---------------------------------------------------------------------------
console.log('\n=== Registration complete ===');
console.log('Mine registered in Factory successfully.');
console.log('Underlying (MinerToken) →', UNDERLYING_ADDRESS);
console.log('Mine (xMINER)           →', MINE_ADDRESS);
