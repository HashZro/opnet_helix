/**
 * create-pool-moto.ts
 * Creates the MotoSwap liquidity pool for the gMOTO Genome contract.
 * Uses signInteraction directly (same pattern as register-genome-test.ts).
 *
 * MotoSwap factory bech32: opt1sqzs3e6qrtkgyfu0x592x6rdfe4r9dpjxqycyhr7w
 * (resolved from getPool `to` field)
 */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { Wallet, TransactionFactory, OPNetLimitedProvider, MLDSASecurityLevel, BinaryWriter, Address } from '@btc-vision/transaction';
import { networks, payments, toXOnly, type PublicKey, type XOnlyPublicKey } from '@btc-vision/bitcoin';
import { MotoSwapFactoryAbi, JSONRpcProvider } from 'opnet';

const NODE_URL = 'https://testnet.opnet.org';
const NETWORK  = networks.testnet;
const OPNET_NETWORK = { ...NETWORK, bech32: NETWORK.bech32Opnet! };
const FEE_RATE     = 50;
const PRIORITY_FEE = 0n;
const GAS_SAT_FEE  = 10_000n;

// gMOTO Genome
const GENOME_PUBKEY     = process.env.GENOME_ADDRESS    ?? '0x8c8cacdec6bfc9af74161cd25ef1af7bcdefe99fc43f12a849f299c720c4c898';
const UNDERLYING_PUBKEY = process.env.MOTO_UNDERLYING   ?? '0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd';

// MotoSwap factory — bech32 discovered from getPool `to` field in verify-pool-creation.ts
const MOTOSWAP_FACTORY_BECH32 = 'opt1sqzs3e6qrtkgyfu0x592x6rdfe4r9dpjxqycyhr7w';

const EC_PK    = process.env.EC_PRIVATE_KEY;
const MLDSA_PK = process.env.MLDSA_PRIVATE_KEY;
if (!EC_PK)    throw new Error('EC_PRIVATE_KEY not set');
if (!MLDSA_PK) throw new Error('MLDSA_PRIVATE_KEY not set');

const wallet = Wallet.fromPrivateKeys(EC_PK, MLDSA_PK, NETWORK, MLDSASecurityLevel.LEVEL2);
const { address: opnetP2TR }   = payments.p2tr({ internalPubkey: toXOnly(wallet.publicKey as PublicKey) as XOnlyPublicKey, network: OPNET_NETWORK });
const { address: opnetP2WPKH } = payments.p2wpkh({ pubkey: wallet.publicKey as PublicKey, network: OPNET_NETWORK });

console.log('=== Create MotoSwap Pool for gMOTO Genome ===');
console.log('Genome pubkey    :', GENOME_PUBKEY);
console.log('Underlying pubkey:', UNDERLYING_PUBKEY);
console.log('MotoSwap factory :', MOTOSWAP_FACTORY_BECH32);
console.log('Wallet p2tr      :', opnetP2TR);

const rpcProvider  = new JSONRpcProvider(NODE_URL, NETWORK);
const utxoProvider = new OPNetLimitedProvider(NODE_URL);

// Resolve factory pubkey for signInteraction `contract` param
const factoryCode   = await rpcProvider.getCode(MOTOSWAP_FACTORY_BECH32);
const factoryPubkey = (factoryCode as unknown as { contractPublicKey: unknown }).contractPublicKey;
if (!factoryPubkey) throw new Error('Could not fetch MotoSwap factory contractPublicKey');
const factoryPubkeyHex = factoryPubkey instanceof Uint8Array
    ? '0x' + Buffer.from(factoryPubkey).toString('hex')
    : String(factoryPubkey);
console.log('Factory pubkey   :', factoryPubkeyHex);

// Determine createPool selector from MotoSwapFactoryAbi
// Log the available methods to find the right signature
const abi = MotoSwapFactoryAbi as Array<{ name?: string; type?: string }>;
const cpEntry = abi.find(e => e.name === 'createPool');
console.log('\ncreatePool ABI entry:', JSON.stringify(cpEntry, null, 2));

// Compute SHA256-based selector for 'createPool()' — OPNet transform convention
function sel(sig: string): number {
    return createHash('sha256').update(sig).digest().readUInt32BE(0);
}
// Try common signatures
const sigs = ['createPool()', 'createPool(address)', 'createPool(address,address)'];
for (const s of sigs) {
    console.log(`  sel('${s}') = 0x${sel(s).toString(16).padStart(8, '0')}`);
}

// Build calldata: createPool(underlying, genome)
// MotoSwap factory: token0 < token1 ordering may apply, but try (underlying, genome) order matching getPool call
const writer = new BinaryWriter();
writer.writeSelector(sel('createPool(address,address)'));  // confirmed from simulation calldata: 0x3c56793f
writer.writeAddress(Address.fromString(UNDERLYING_PUBKEY));
writer.writeAddress(Address.fromString(GENOME_PUBKEY));
const calldata = new Uint8Array(writer.getBuffer());

console.log('\nCalldata (hex):', Buffer.from(calldata).toString('hex'));

// Fetch UTXOs
const utxos = await utxoProvider.fetchUTXOMultiAddr({
    addresses: [opnetP2TR!, opnetP2WPKH!],
    minAmount: 330n,
    requestedAmount: 100_000_000n,
    optimized: true,
    usePendingUTXO: true,
});
if (!utxos.length) throw new Error(`No UTXOs. Fund: ${opnetP2TR}`);

const challenge = await rpcProvider.getChallenge();
const txFactory = new TransactionFactory();

const result = await txFactory.signInteraction({
    to:       MOTOSWAP_FACTORY_BECH32,
    from:     opnetP2TR!,
    contract: factoryPubkeyHex,
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
    throw new Error('Missing transactions from signInteraction');
}

console.log('\nBroadcasting funding transaction...');
const fundingResp = await utxoProvider.broadcastTransaction(result.fundingTransaction, false);
if (!fundingResp?.success) throw new Error(`Funding tx failed: ${fundingResp?.error}`);
console.log('Funding tx  :', fundingResp.result);

console.log('Broadcasting interaction transaction...');
const interactionResp = await utxoProvider.broadcastTransaction(result.interactionTransaction, false);
if (!interactionResp?.success) throw new Error(`Interaction tx failed: ${interactionResp?.error}`);
console.log('createPool tx:', interactionResp.result);

console.log('\n=== Pool creation broadcast successful ===');
console.log('Verify with: npx ts-node --esm scripts/check-pool-moto.ts');
console.log('(wait a few minutes for block confirmation)');
