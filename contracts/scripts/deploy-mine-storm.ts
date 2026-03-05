import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Wallet, TransactionFactory, OPNetLimitedProvider, MLDSASecurityLevel, BinaryWriter, Address } from '@btc-vision/transaction';
import { networks, payments, toXOnly, type PublicKey, type XOnlyPublicKey } from '@btc-vision/bitcoin';
import { JSONRpcProvider } from 'opnet';

const NODE_URL = 'https://testnet.opnet.org';
const NETWORK  = networks.testnet;
const OPNET_NETWORK = { ...NETWORK, bech32: NETWORK.bech32Opnet! };
const FEE_RATE = 50, PRIORITY_FEE = 0n, GAS_SAT_FEE = 10_000n;

const UNDERLYING_ADDRESS = process.env.STORM_UNDERLYING ?? '';
if (!UNDERLYING_ADDRESS) throw new Error('STORM_UNDERLYING not set in .env');

const MINE_DECIMALS = 18;
const MINE_NAME     = 'xStorm';
const MINE_SYMBOL   = 'xSTRM';
const WRAP_FEE = 50n, UNWRAP_FEE = 50n, AMM_BUY_FEE = 50n, AMM_SELL_FEE = 50n;

const EC_PK = process.env.EC_PRIVATE_KEY;
if (!EC_PK) throw new Error('EC_PRIVATE_KEY not set');
const MLDSA_PK = process.env.MLDSA_PRIVATE_KEY;
if (!MLDSA_PK) throw new Error('MLDSA_PRIVATE_KEY not set');

const wallet = Wallet.fromPrivateKeys(EC_PK, MLDSA_PK, NETWORK, MLDSASecurityLevel.LEVEL2);
const { address: opnetP2TR }   = payments.p2tr({ internalPubkey: toXOnly(wallet.publicKey as PublicKey) as XOnlyPublicKey, network: OPNET_NETWORK });
const { address: opnetP2WPKH } = payments.p2wpkh({ pubkey: wallet.publicKey as PublicKey, network: OPNET_NETWORK });

console.log('=== xStorm Mine Deployment ===');
console.log('Underlying:', UNDERLYING_ADDRESS);

const writer = new BinaryWriter();
writer.writeAddress(Address.fromString(UNDERLYING_ADDRESS));
writer.writeU8(MINE_DECIMALS);
writer.writeStringWithLength(MINE_NAME);
writer.writeStringWithLength(MINE_SYMBOL);
writer.writeU256(WRAP_FEE);
writer.writeU256(UNWRAP_FEE);
writer.writeU256(AMM_BUY_FEE);
writer.writeU256(AMM_SELL_FEE);
const calldata = writer.getBuffer();

const __dirname = dirname(fileURLToPath(import.meta.url));
const bytecode  = new Uint8Array(readFileSync(join(__dirname, '..', 'build', 'Mine.wasm')));

const utxoProvider = new OPNetLimitedProvider(NODE_URL);
const rpcProvider  = new JSONRpcProvider(NODE_URL, NETWORK);

const utxos = await utxoProvider.fetchUTXOMultiAddr({ addresses: [opnetP2TR!, opnetP2WPKH!], minAmount: 330n, requestedAmount: 100_000_000n, optimized: true, usePendingUTXO: true });
if (!utxos.length) throw new Error(`No UTXOs. Fund: ${opnetP2TR}`);

const challenge = await rpcProvider.getChallenge();
const factory   = new TransactionFactory();
const result    = await factory.signDeployment({ bytecode, calldata, challenge, signer: wallet.keypair, mldsaSigner: wallet.mldsaKeypair, network: NETWORK, utxos, from: opnetP2TR!, feeRate: FEE_RATE, priorityFee: PRIORITY_FEE, gasSatFee: GAS_SAT_FEE });

console.log('Contract address:', result.contractAddress);
console.log('Contract pubkey :', result.contractPubKey);

const [fundingTxHex, deployTxHex] = result.transaction;
const fundingResp = await utxoProvider.broadcastTransaction(fundingTxHex, false);
if (!fundingResp?.success) throw new Error(`Funding failed: ${fundingResp?.error}`);
console.log('Funding tx  :', fundingResp.result);

const deployResp = await utxoProvider.broadcastTransaction(deployTxHex, false);
if (!deployResp?.success) throw new Error(`Deploy failed: ${deployResp?.error}`);
console.log('Deploy tx   :', deployResp.result);

console.log('\n=== Done ===');
console.log('xStorm Mine address:', result.contractAddress);
console.log('xStorm Mine pubkey :', result.contractPubKey);
