import 'dotenv/config';
import { createHash } from 'node:crypto';
import { Wallet, TransactionFactory, OPNetLimitedProvider, MLDSASecurityLevel, BinaryWriter, Address } from '@btc-vision/transaction';
import { networks, payments, toXOnly, type PublicKey, type XOnlyPublicKey } from '@btc-vision/bitcoin';
import { JSONRpcProvider } from 'opnet';

const NODE_URL = 'https://testnet.opnet.org';
const NETWORK  = networks.testnet;
const OPNET_NETWORK = { ...NETWORK, bech32: NETWORK.bech32Opnet! };
const FEE_RATE = 50, PRIORITY_FEE = 0n, GAS_SAT_FEE = 10_000n;

const FACTORY_ADDRESS    = process.env.FACTORY_ADDRESS;
const UNDERLYING_ADDRESS = process.env.LAVA_UNDERLYING;
const MINE_ADDRESS       = process.env.LAVA_MINE_ADDRESS;

if (!FACTORY_ADDRESS)    throw new Error('FACTORY_ADDRESS not set');
if (!UNDERLYING_ADDRESS) throw new Error('LAVA_UNDERLYING not set');
if (!MINE_ADDRESS)       throw new Error('LAVA_MINE_ADDRESS not set');

const EC_PK = process.env.EC_PRIVATE_KEY;
if (!EC_PK) throw new Error('EC_PRIVATE_KEY not set');
const MLDSA_PK = process.env.MLDSA_PRIVATE_KEY;
if (!MLDSA_PK) throw new Error('MLDSA_PRIVATE_KEY not set');

const wallet = Wallet.fromPrivateKeys(EC_PK, MLDSA_PK, NETWORK, MLDSASecurityLevel.LEVEL2);
const { address: opnetP2TR }   = payments.p2tr({ internalPubkey: toXOnly(wallet.publicKey as PublicKey) as XOnlyPublicKey, network: OPNET_NETWORK });
const { address: opnetP2WPKH } = payments.p2wpkh({ pubkey: wallet.publicKey as PublicKey, network: OPNET_NETWORK });

console.log('=== Register xLava Mine in Factory ===');
console.log('Factory    :', FACTORY_ADDRESS);
console.log('Underlying :', UNDERLYING_ADDRESS);
console.log('Mine       :', MINE_ADDRESS);

function sel(sig: string): number {
    return createHash('sha256').update(sig).digest().readUInt32BE(0);
}

const writer = new BinaryWriter();
writer.writeSelector(sel('registerMine()'));  // full signature with parens
writer.writeAddress(Address.fromString(UNDERLYING_ADDRESS));
writer.writeAddress(Address.fromString(MINE_ADDRESS));
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
const factory   = new TransactionFactory();
const result    = await factory.signInteraction({ to: FACTORY_ADDRESS, from: opnetP2TR!, contract: factoryPubkeyHex, calldata, challenge, signer: wallet.keypair, mldsaSigner: wallet.mldsaKeypair, network: NETWORK, utxos, feeRate: FEE_RATE, priorityFee: PRIORITY_FEE, gasSatFee: GAS_SAT_FEE });

if (!result.fundingTransaction || !result.interactionTransaction) throw new Error('Missing transactions');

const fundingResp = await utxoProvider.broadcastTransaction(result.fundingTransaction, false);
if (!fundingResp?.success) throw new Error(`Funding failed: ${fundingResp?.error}`);
console.log('Funding tx  :', fundingResp.result);

const interactionResp = await utxoProvider.broadcastTransaction(result.interactionTransaction, false);
if (!interactionResp?.success) throw new Error(`Interaction failed: ${interactionResp?.error}`);
console.log('Register tx :', interactionResp.result);

console.log('\n=== xLava Mine registered in Factory ===');
