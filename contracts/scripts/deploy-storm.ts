import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Wallet, TransactionFactory, OPNetLimitedProvider, MLDSASecurityLevel } from '@btc-vision/transaction';
import { networks, payments, toXOnly, type PublicKey, type XOnlyPublicKey } from '@btc-vision/bitcoin';
import { JSONRpcProvider } from 'opnet';

const NODE_URL = 'https://testnet.opnet.org';
const NETWORK  = networks.testnet;
const OPNET_NETWORK = { ...NETWORK, bech32: NETWORK.bech32Opnet! };
const FEE_RATE = 50, PRIORITY_FEE = 0n, GAS_SAT_FEE = 10_000n;

const EC_PK = process.env.EC_PRIVATE_KEY;
if (!EC_PK) throw new Error('EC_PRIVATE_KEY not set');
const MLDSA_PK = process.env.MLDSA_PRIVATE_KEY;
if (!MLDSA_PK) throw new Error('MLDSA_PRIVATE_KEY not set');

const wallet = Wallet.fromPrivateKeys(EC_PK, MLDSA_PK, NETWORK, MLDSASecurityLevel.LEVEL2);
const { address: opnetP2TR }   = payments.p2tr({ internalPubkey: toXOnly(wallet.publicKey as PublicKey) as XOnlyPublicKey, network: OPNET_NETWORK });
const { address: opnetP2WPKH } = payments.p2wpkh({ pubkey: wallet.publicKey as PublicKey, network: OPNET_NETWORK });

console.log('=== StormToken Deployment ===');
console.log('Deployer p2tr   :', opnetP2TR);

const __dirname = dirname(fileURLToPath(import.meta.url));
const bytecode  = new Uint8Array(readFileSync(join(__dirname, '..', 'build', 'StormToken.wasm')));
console.log(`WASM loaded     : ${bytecode.length} bytes`);

const utxoProvider = new OPNetLimitedProvider(NODE_URL);
const rpcProvider  = new JSONRpcProvider(NODE_URL, NETWORK);

console.log('Fetching UTXOs...');
const utxos = await utxoProvider.fetchUTXOMultiAddr({ addresses: [opnetP2TR!, opnetP2WPKH!], minAmount: 330n, requestedAmount: 100_000_000n, optimized: true, usePendingUTXO: true });
if (!utxos.length) throw new Error(`No UTXOs. Fund: ${opnetP2TR}`);
console.log(`Found ${utxos.length} UTXO(s)`);

const challenge = await rpcProvider.getChallenge();
const factory   = new TransactionFactory();
const result    = await factory.signDeployment({ bytecode, challenge, signer: wallet.keypair, mldsaSigner: wallet.mldsaKeypair, network: NETWORK, utxos, from: opnetP2TR!, feeRate: FEE_RATE, priorityFee: PRIORITY_FEE, gasSatFee: GAS_SAT_FEE });

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
console.log('StormToken address:', result.contractAddress);
console.log('StormToken pubkey :', result.contractPubKey);
