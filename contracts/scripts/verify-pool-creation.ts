/**
 * S161 — Verify createPool auto-creation for the gMOTO Genome
 *
 * 1. Query MotoSwap factory.getPool(underlying, genome)
 * 2. If pool exists — log address and exit (pass)
 * 3. If no pool — call factory.createPool(underlying, genome) using wallet signers
 * 4. Confirm pool creation and log pool address
 */
import 'dotenv/config';
import { Wallet, OPNetLimitedProvider, MLDSASecurityLevel, Address, BinaryWriter } from '@btc-vision/transaction';
import { networks, payments, toXOnly, type PublicKey, type XOnlyPublicKey } from '@btc-vision/bitcoin';
import { getContract, MotoSwapFactoryAbi, JSONRpcProvider } from 'opnet';
import { createHash } from 'node:crypto';

const NODE_URL = 'https://testnet.opnet.org';
const NETWORK  = networks.testnet;
const OPNET_NETWORK = { ...NETWORK, bech32: NETWORK.bech32Opnet! };
const FEE_RATE     = 50;
const PRIORITY_FEE = 0n;
const GAS_SAT_FEE  = 10_000n;

// gMOTO Genome (deployed via deploy-genome-moto.ts, registered in S160)
const GENOME_PUBKEY    = process.env.GENOME_ADDRESS    ?? '0x8c8cacdec6bfc9af74161cd25ef1af7bcdefe99fc43f12a849f299c720c4c898';
const UNDERLYING_PUBKEY = process.env.MOTO_UNDERLYING ?? '0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd';

// MotoSwap factory — stored as pubkey in config.ts
const MOTOSWAP_FACTORY_PUBKEY = '0xa02aa5ca4c307107484d5fb690d811df1cf526f8de204d24528653dcae369a0f';

const EC_PK    = process.env.EC_PRIVATE_KEY;
const MLDSA_PK = process.env.MLDSA_PRIVATE_KEY;
if (!EC_PK)    throw new Error('EC_PRIVATE_KEY not set');
if (!MLDSA_PK) throw new Error('MLDSA_PRIVATE_KEY not set');

const wallet = Wallet.fromPrivateKeys(EC_PK, MLDSA_PK, NETWORK, MLDSASecurityLevel.LEVEL2);
const { address: opnetP2TR } = payments.p2tr({
    internalPubkey: toXOnly(wallet.publicKey as PublicKey) as XOnlyPublicKey,
    network: OPNET_NETWORK,
});
const { address: opnetP2WPKH } = payments.p2wpkh({
    pubkey: wallet.publicKey as PublicKey,
    network: OPNET_NETWORK,
});

console.log('=== S161 — Verify Pool Creation for gMOTO Genome ===');
console.log('Genome pubkey    :', GENOME_PUBKEY);
console.log('Underlying pubkey:', UNDERLYING_PUBKEY);
console.log('MotoSwap factory :', MOTOSWAP_FACTORY_PUBKEY);
console.log('Wallet p2tr      :', opnetP2TR);
console.log('');

const rpcProvider  = new JSONRpcProvider(NODE_URL, NETWORK);
const utxoProvider = new OPNetLimitedProvider(NODE_URL);

const factoryAddr    = Address.fromString(MOTOSWAP_FACTORY_PUBKEY);
const genomeAddr     = Address.fromString(GENOME_PUBKEY);
const underlyingAddr = Address.fromString(UNDERLYING_PUBKEY);

// --- Step 1: Check if pool already exists ---
console.log('Step 1: Querying MotoSwap factory.getPool(underlying, genome)...');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const factoryRO = getContract<any>(factoryAddr, MotoSwapFactoryAbi as any, rpcProvider, NETWORK);
const poolRes   = await factoryRO.getPool(underlyingAddr, genomeAddr);
console.log('[getPool] raw result:', JSON.stringify(poolRes, null, 2));

function extractPoolAddress(res: unknown): string {
    const r = res as Record<string, unknown> | null;
    const val = (r?.properties as Record<string, unknown> | undefined)?.['pool'];
    if (val !== null && val !== undefined) {
        const s = (val as { toString(): string }).toString?.();
        if (s) return s;
    }
    const decoded = (r?.decoded as unknown[] | undefined)?.[0];
    if (decoded !== null && decoded !== undefined) return String(decoded);
    const result = (r as Record<string, unknown> | null)?.result;
    if (result) return String(result);
    return '';
}

function isZeroAddress(addr: string): boolean {
    return !addr || addr === '' || /^0x0+$/.test(addr) || addr === '0x';
}

const poolAddress = extractPoolAddress(poolRes);
console.log('[getPool] extracted pool address:', poolAddress);

if (!isZeroAddress(poolAddress)) {
    console.log('\n✅ Pool already exists!');
    console.log('Pool address:', poolAddress);
    console.log('\n>> VERIFICATION PASSED — pool is non-zero.');
    console.log('>> Document in progress.txt: Pool address =', poolAddress);
    process.exit(0);
}

// --- Step 2: No pool found — create it ---
console.log('\nNo pool found. Creating pool via MotoSwap factory.createPool...');

// Use signInteraction-style pattern via BinaryWriter + TransactionFactory
// createPool(address token0, address token1) selector
function sel(sig: string): number {
    return createHash('sha256').update(sig).digest().readUInt32BE(0);
}

// First, resolve MotoSwap factory bech32 via pubkey identity
// The factory address as an Address object — opnet resolves bech32 internally in getContract
// For signInteraction we need bech32. Try getCode by querying via contract interface.

// Alternative: use getContract with sender (write op), send with real signers
// This mimics the frontend createPool flow but with backend wallet signers

const { address: senderP2TR } = payments.p2tr({
    internalPubkey: toXOnly(wallet.publicKey as PublicKey) as XOnlyPublicKey,
    network: OPNET_NETWORK,
});

// Resolve wallet identity key (needed as senderAddress for getContract write ops)
const tweakedHex = '0x' + Buffer.from(
    toXOnly(wallet.publicKey as PublicKey)!,
).toString('hex');

let senderAddress: Address;
try {
    const pubKeyInfo = await (rpcProvider as unknown as { getPublicKeyInfo(hex: string, flag: boolean): Promise<unknown> })
        .getPublicKeyInfo(tweakedHex, false);
    const identityHex = String(pubKeyInfo);
    const compressedTweaked = '0x02' + tweakedHex.slice(2);
    senderAddress = Address.fromString(identityHex, compressedTweaked);
    console.log('Identity key resolved:', identityHex);
} catch (err) {
    console.error('Could not resolve identity key:', err);
    console.log('Falling back to direct calldata approach via signInteraction...');

    // Fallback: use BinaryWriter to encode createPool calldata
    // We need the bech32 address of MotoSwap factory for signInteraction.
    // Since we don't have it, we cannot proceed without the bech32 address.
    console.error('\n❌ Cannot create pool: MotoSwap factory bech32 address unknown.');
    console.log('To create the pool manually:');
    console.log('  1. Open the frontend dev server');
    console.log('  2. Navigate to /mine/<genome-bech32-address>');
    console.log('  3. Click "Create Pool" button in the Liquidity Pool section');
    console.log('\nOR: Deploy a new genome via the frontend UI (CreateGenomePage),');
    console.log('which auto-creates the pool in Step 3.');
    process.exit(1);
}

// Use getContract write op with sender
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const factoryWrite = getContract<any>(factoryAddr, MotoSwapFactoryAbi as any, rpcProvider, NETWORK, senderAddress);

console.log('\nCalling factory.createPool(underlying, genome)...');
const sim = await factoryWrite.createPool(underlyingAddr, genomeAddr);
console.log('[createPool] simulation result:', JSON.stringify(sim, null, 2));

if ('error' in sim) {
    throw new Error('createPool simulation failed: ' + (sim as { error: string }).error);
}

// Send transaction with actual wallet signers (backend mode)
const txResult = await (sim as unknown as {
    sendTransaction(opts: {
        signer: unknown;
        mldsaSigner: unknown;
        refundTo: string;
        maximumAllowedSatToSpend?: bigint;
        feeRate?: number;
        network: typeof NETWORK;
        minGas?: bigint;
    }): Promise<unknown>;
}).sendTransaction({
    signer:     wallet.keypair,
    mldsaSigner: wallet.mldsaKeypair,
    refundTo:   senderP2TR!,
    maximumAllowedSatToSpend: BigInt(100_000),
    feeRate:    FEE_RATE,
    network:    NETWORK,
    minGas:     BigInt(100_000),
});

console.log('[createPool] sendTransaction result:', JSON.stringify(txResult, null, 2));

// Verify pool was created
console.log('\nWaiting 3s for indexer...');
await new Promise(r => setTimeout(r, 3000));

const poolRes2   = await factoryRO.getPool(underlyingAddr, genomeAddr);
const poolAddress2 = extractPoolAddress(poolRes2);
console.log('[getPool after create] pool address:', poolAddress2);

if (!isZeroAddress(poolAddress2)) {
    console.log('\n✅ Pool created successfully!');
    console.log('Pool address:', poolAddress2);
    console.log('\n>> VERIFICATION PASSED — pool is non-zero.');
    console.log('>> Document in progress.txt: Pool address =', poolAddress2);
} else {
    console.log('\n⚠️  Pool address still zero after createPool. Transaction may be pending.');
    console.log('>> Check pool manually after a few blocks.');
}
