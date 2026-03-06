import 'dotenv/config';
import { createHash } from 'node:crypto';
import { Wallet, TransactionFactory, OPNetLimitedProvider, MLDSASecurityLevel, BinaryWriter, Address } from '@btc-vision/transaction';
import { networks, payments, toXOnly, type PublicKey, type XOnlyPublicKey } from '@btc-vision/bitcoin';
import { ABIDataTypes, BitcoinAbiTypes, getContract, JSONRpcProvider } from 'opnet';

const NODE_URL = 'https://testnet.opnet.org';
const NETWORK  = networks.testnet;
const OPNET_NETWORK = { ...NETWORK, bech32: NETWORK.bech32Opnet! };
const FEE_RATE = 50, PRIORITY_FEE = 0n, GAS_SAT_FEE = 10_000n;

// New Factory v3 (Genome Protocol) — deployed 2026-03-05
const FACTORY_ADDRESS    = process.env.GENOME_FACTORY_ADDRESS ?? 'opt1sqpfg7r4n6jqen30xqtm5fak5gllpczhd3syzafv8';
// Moto token pubkey as underlying
const UNDERLYING_PUBKEY  = process.env.MOTO_UNDERLYING ?? '0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd';
// The deployed Genome contract pubkey to register (set GENOME_ADDRESS in .env)
const GENOME_PUBKEY      = process.env.GENOME_ADDRESS;

if (!GENOME_PUBKEY) throw new Error('GENOME_ADDRESS not set in .env — set it to the deployed Genome contract pubkey');

const EC_PK = process.env.EC_PRIVATE_KEY;
if (!EC_PK) throw new Error('EC_PRIVATE_KEY not set');
const MLDSA_PK = process.env.MLDSA_PRIVATE_KEY;
if (!MLDSA_PK) throw new Error('MLDSA_PRIVATE_KEY not set');

const wallet = Wallet.fromPrivateKeys(EC_PK, MLDSA_PK, NETWORK, MLDSASecurityLevel.LEVEL2);
const { address: opnetP2TR }   = payments.p2tr({ internalPubkey: toXOnly(wallet.publicKey as PublicKey) as XOnlyPublicKey, network: OPNET_NETWORK });
const { address: opnetP2WPKH } = payments.p2wpkh({ pubkey: wallet.publicKey as PublicKey, network: OPNET_NETWORK });

console.log('=== Register Genome Test (gMOTO) in Factory v3 ===');
console.log('Factory    :', FACTORY_ADDRESS);
console.log('Underlying :', UNDERLYING_PUBKEY);
console.log('Genome     :', GENOME_PUBKEY);

function sel(sig: string): number {
    return createHash('sha256').update(sig).digest().readUInt32BE(0);
}

const writer = new BinaryWriter();
writer.writeSelector(sel('registerGenome()'));  // SHA256('registerGenome()') first 4 bytes
writer.writeAddress(Address.fromString(UNDERLYING_PUBKEY));
writer.writeAddress(Address.fromString(GENOME_PUBKEY));
const calldata = new Uint8Array(writer.getBuffer());

const utxoProvider = new OPNetLimitedProvider(NODE_URL);
const rpcProvider  = new JSONRpcProvider(NODE_URL, NETWORK);

const factoryCode   = await rpcProvider.getCode(FACTORY_ADDRESS);
const factoryPubkey = (factoryCode as any).contractPublicKey;
if (!factoryPubkey) throw new Error('Could not fetch Factory contractPublicKey');
const factoryPubkeyHex = factoryPubkey instanceof Uint8Array ? '0x' + Buffer.from(factoryPubkey).toString('hex') : factoryPubkey.toString();

const utxos = await utxoProvider.fetchUTXOMultiAddr({ addresses: [opnetP2TR!, opnetP2WPKH!], minAmount: 330n, requestedAmount: 100_000_000n, optimized: true, usePendingUTXO: true });
if (!utxos.length) throw new Error(`No UTXOs. Fund: ${opnetP2TR}`);

const challenge = await rpcProvider.getChallenge();
const txFactory = new TransactionFactory();
const result    = await txFactory.signInteraction({ to: FACTORY_ADDRESS, from: opnetP2TR!, contract: factoryPubkeyHex, calldata, challenge, signer: wallet.keypair, mldsaSigner: wallet.mldsaKeypair, network: NETWORK, utxos, feeRate: FEE_RATE, priorityFee: PRIORITY_FEE, gasSatFee: GAS_SAT_FEE });

if (!result.fundingTransaction || !result.interactionTransaction) throw new Error('Missing transactions');

const fundingResp = await utxoProvider.broadcastTransaction(result.fundingTransaction, false);
if (!fundingResp?.success) throw new Error(`Funding failed: ${fundingResp?.error}`);
console.log('Funding tx  :', fundingResp.result);

const interactionResp = await utxoProvider.broadcastTransaction(result.interactionTransaction, false);
if (!interactionResp?.success) throw new Error(`Interaction failed: ${interactionResp?.error}`);
console.log('Register tx :', interactionResp.result);

console.log('\n=== Genome registered in Factory v3 ===');

// Verify: check genome count
const FACTORY_ABI = [
    { name: 'getGenomeCount', inputs: [], outputs: [{ name: 'count', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
    { name: 'getGenomeAtIndex', inputs: [{ name: 'index', type: ABIDataTypes.UINT256 }], outputs: [{ name: 'genomeAddress', type: ABIDataTypes.ADDRESS }], type: BitcoinAbiTypes.Function },
];

console.log('\nVerifying registration — waiting 3s for indexer...');
await new Promise(r => setTimeout(r, 3000));

const factory = getContract(FACTORY_ADDRESS, FACTORY_ABI as any, rpcProvider, NETWORK);
const countRes = await (factory as any).getGenomeCount();
const count = Number(countRes?.properties?.count ?? countRes?.result ?? 0n);
console.log('Genome count:', count);

for (let i = 0; i < count; i++) {
    const genomeRes = await (factory as any).getGenomeAtIndex(BigInt(i));
    console.log(`Genome[${i}]:`, genomeRes?.properties?.genomeAddress?.toString() ?? genomeRes?.result?.toString());
}
