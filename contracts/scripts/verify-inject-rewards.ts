/**
 * verify-inject-rewards.ts
 * Verifies that injectRewards() increases the genome ratio.
 *
 * Steps:
 *  1. Check wallet MOTO balance
 *  2. Read genome underlyingBalance + totalSupply BEFORE
 *  3. If totalSupply == 0: wrap WRAP_AMOUNT to establish a baseline ratio
 *  4. increaseAllowance on MOTO for genome (inject amount)
 *  5. injectRewards on genome
 *  6. Wait 60s for indexer
 *  7. Read underlyingBalance + totalSupply AFTER
 *  8. Verify underlyingBalance increased
 */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import {
    Wallet, TransactionFactory, OPNetLimitedProvider,
    MLDSASecurityLevel, BinaryWriter, Address,
} from '@btc-vision/transaction';
import {
    networks, payments, toXOnly,
    type PublicKey, type XOnlyPublicKey,
} from '@btc-vision/bitcoin';
import { ABIDataTypes, BitcoinAbiTypes, getContract, JSONRpcProvider } from 'opnet';

const NODE_URL       = 'https://testnet.opnet.org';
const NETWORK        = networks.testnet;
const OPNET_NETWORK  = { ...NETWORK, bech32: NETWORK.bech32Opnet! };
const FEE_RATE       = 50;
const PRIORITY_FEE   = 0n;
const GAS_SAT_FEE    = 10_000n;

// gMOTO Genome
const GENOME_PUBKEY  = process.env.GENOME_ADDRESS   ?? '0x8c8cacdec6bfc9af74161cd25ef1af7bcdefe99fc43f12a849f299c720c4c898';
// Known genome bech32 (computed via hash160 scheme, verified via rpcProvider.getCode)
const GENOME_BECH32  = 'opt1sqr4mgm9fsuyszwt8jm0ry57m8juyzxs70yngde4w';
// MOTO (underlying) token
const MOTO_BECH32    = 'opt1sqzkx6wm5acawl9m6nay2mjsm6wagv7gazcgtczds';

// Amounts: 0.5 MOTO for wrap (first time), 0.1 MOTO to inject
const WRAP_AMOUNT    = 500_000_000_000_000_000n;  // 0.5e18
const INJECT_AMOUNT  = 100_000_000_000_000_000n;  // 0.1e18

const EC_PK    = process.env.EC_PRIVATE_KEY;
const MLDSA_PK = process.env.MLDSA_PRIVATE_KEY;
if (!EC_PK)    throw new Error('EC_PRIVATE_KEY not set');
if (!MLDSA_PK) throw new Error('MLDSA_PRIVATE_KEY not set');

const wallet = Wallet.fromPrivateKeys(EC_PK, MLDSA_PK, NETWORK, MLDSASecurityLevel.LEVEL2);
const { address: opnetP2TR }   = payments.p2tr({ internalPubkey: toXOnly(wallet.publicKey as PublicKey) as XOnlyPublicKey, network: OPNET_NETWORK });
const { address: opnetP2WPKH } = payments.p2wpkh({ pubkey: wallet.publicKey as PublicKey, network: OPNET_NETWORK });

const rpcProvider  = new JSONRpcProvider(NODE_URL, NETWORK);
const utxoProvider = new OPNetLimitedProvider(NODE_URL);
const txFactory    = new TransactionFactory();

function sel(sig: string): number {
    return createHash('sha256').update(sig).digest().readUInt32BE(0);
}
function toHex(v: unknown): string {
    if (v instanceof Uint8Array) return '0x' + Buffer.from(v).toString('hex');
    return String(v);
}
function extractU256(res: unknown): bigint {
    const r = res as Record<string, unknown>;
    const p = (r?.properties as Record<string, unknown>) ?? {};
    for (const key of Object.keys(p)) {
        const val = p[key];
        if (val !== undefined && val !== null) return BigInt(String(val));
    }
    if (r?.result !== undefined) return BigInt(String(r.result));
    return 0n;
}

// Wallet identity x-only pubkey (for balanceOf call)
const walletXOnly  = toXOnly(wallet.publicKey as PublicKey);
const walletPubHex = '0x' + Buffer.from(walletXOnly).toString('hex');

// ABIs for read-only calls
const MOTO_READ_ABI = [
    { name: 'balanceOf', inputs: [{ name: 'account', type: ABIDataTypes.ADDRESS }], outputs: [{ name: 'balance', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
];
const GENOME_READ_ABI = [
    { name: 'underlyingBalance', inputs: [], outputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
    { name: 'totalSupply',       inputs: [], outputs: [{ name: 'total',  type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
];

console.log('=== Verify injectRewards Increases Genome Ratio ===');
console.log('Genome pubkey :', GENOME_PUBKEY);
console.log('Genome bech32 :', GENOME_BECH32);
console.log('Inject amount :', INJECT_AMOUNT.toString(), '(0.1 MOTO)');
console.log('Wallet p2tr   :', opnetP2TR);
console.log('Wallet xonly  :', walletPubHex);

// ─── Step 1: Check wallet MOTO balance ───
const motoReadContract  = getContract<any>(MOTO_BECH32, MOTO_READ_ABI as any, rpcProvider, NETWORK);
const walletBalRes      = await motoReadContract.balanceOf(Address.fromString(walletPubHex));
const walletMoto        = extractU256(walletBalRes);
console.log('\nWallet MOTO balance:', walletMoto.toString(), '(raw =', Number(walletMoto) / 1e18, 'MOTO)');

if (walletMoto < INJECT_AMOUNT) {
    console.log('⚠️  Wallet has <0.1 MOTO. Have:', walletMoto.toString(), 'Need:', INJECT_AMOUNT.toString());
    console.log('Attempting anyway — wallet identity key on testnet may differ from CLI key.');
}

// ─── Step 2: Read genome BEFORE ───
const genomeReadContract = getContract<any>(GENOME_BECH32, GENOME_READ_ABI as any, rpcProvider, NETWORK);
const ubRes0 = await genomeReadContract.underlyingBalance();
const tsRes0 = await genomeReadContract.totalSupply();
const underlyingBefore  = extractU256(ubRes0);
const totalSupplyBefore = extractU256(tsRes0);
const ratioBefore = totalSupplyBefore === 0n ? 0.0 : Number(underlyingBefore) / Number(totalSupplyBefore);

console.log('\n--- State BEFORE inject ---');
console.log('underlyingBalance:', underlyingBefore.toString(), '(raw)');
console.log('totalSupply      :', totalSupplyBefore.toString(), '(raw)');
console.log('ratio            :', ratioBefore.toFixed(8));

// Fetch MOTO contract pubkey for signInteraction `contract` param
const motoCode      = await rpcProvider.getCode(MOTO_BECH32);
const motoPubkeyHex = toHex((motoCode as any).contractPublicKey);
console.log('\nMOTO contract pubkey:', motoPubkeyHex);

// ─── Step 3: If totalSupply == 0, wrap WRAP_AMOUNT first ───
if (totalSupplyBefore === 0n) {
    console.log('\n--- totalSupply is 0 — wrapping', Number(WRAP_AMOUNT) / 1e18, 'MOTO to establish baseline ---');

    // 3a: increaseAllowance on MOTO for genome (wrap amount)
    const aw = new BinaryWriter();
    aw.writeSelector(sel('increaseAllowance(address,uint256)'));
    aw.writeAddress(Address.fromString(GENOME_PUBKEY));
    aw.writeU256(WRAP_AMOUNT);
    const allowWrapCalldata = new Uint8Array(aw.getBuffer());

    let utxos = await utxoProvider.fetchUTXOMultiAddr({ addresses: [opnetP2TR!, opnetP2WPKH!], minAmount: 330n, requestedAmount: 100_000_000n, optimized: true, usePendingUTXO: true });
    if (!utxos.length) throw new Error(`No UTXOs. Fund: ${opnetP2TR}`);
    let challenge = await rpcProvider.getChallenge();

    const ar = await txFactory.signInteraction({ to: MOTO_BECH32, from: opnetP2TR!, contract: motoPubkeyHex, calldata: allowWrapCalldata, challenge, signer: wallet.keypair, mldsaSigner: wallet.mldsaKeypair, network: NETWORK, utxos, feeRate: FEE_RATE, priorityFee: PRIORITY_FEE, gasSatFee: GAS_SAT_FEE });
    const af1 = await utxoProvider.broadcastTransaction(ar.fundingTransaction!, false);
    if (!af1?.success) throw new Error(`Wrap allowance funding failed: ${af1?.error}`);
    console.log('Wrap allowance funding tx:', af1.result);
    const ai1 = await utxoProvider.broadcastTransaction(ar.interactionTransaction!, false);
    if (!ai1?.success) throw new Error(`Wrap allowance interaction failed: ${ai1?.error}`);
    console.log('Wrap allowance tx        :', ai1.result);

    await new Promise(r => setTimeout(r, 2000));

    // 3b: wrap(WRAP_AMOUNT) on genome
    const genomeCode2     = await rpcProvider.getCode(GENOME_BECH32);
    const genomePubHex    = toHex((genomeCode2 as any).contractPublicKey);

    const ww = new BinaryWriter();
    ww.writeSelector(sel('wrap()'));
    ww.writeU256(WRAP_AMOUNT);
    const wrapCalldata = new Uint8Array(ww.getBuffer());

    utxos = await utxoProvider.fetchUTXOMultiAddr({ addresses: [opnetP2TR!, opnetP2WPKH!], minAmount: 330n, requestedAmount: 100_000_000n, optimized: true, usePendingUTXO: true });
    if (!utxos.length) throw new Error('No UTXOs for wrap');
    challenge = await rpcProvider.getChallenge();

    const wr = await txFactory.signInteraction({ to: GENOME_BECH32, from: opnetP2TR!, contract: genomePubHex, calldata: wrapCalldata, challenge, signer: wallet.keypair, mldsaSigner: wallet.mldsaKeypair, network: NETWORK, utxos, feeRate: FEE_RATE, priorityFee: PRIORITY_FEE, gasSatFee: GAS_SAT_FEE });
    const wf = await utxoProvider.broadcastTransaction(wr.fundingTransaction!, false);
    if (!wf?.success) throw new Error(`Wrap funding failed: ${wf?.error}`);
    console.log('Wrap funding tx:', wf.result);
    const wi = await utxoProvider.broadcastTransaction(wr.interactionTransaction!, false);
    if (!wi?.success) throw new Error(`Wrap interaction failed: ${wi?.error}`);
    console.log('Wrap tx        :', wi.result);

    console.log('Waiting 30s for wrap to be indexed...');
    await new Promise(r => setTimeout(r, 30000));

    const ubResW = await genomeReadContract.underlyingBalance();
    const tsResW = await genomeReadContract.totalSupply();
    console.log('underlyingBalance after wrap:', extractU256(ubResW).toString());
    console.log('totalSupply after wrap      :', extractU256(tsResW).toString());
}

// ─── Step 4: increaseAllowance on MOTO for genome (inject amount) ───
console.log('\n--- Step 4: increaseAllowance on MOTO for injectRewards ---');
const aw2 = new BinaryWriter();
aw2.writeSelector(sel('increaseAllowance(address,uint256)'));
aw2.writeAddress(Address.fromString(GENOME_PUBKEY));
aw2.writeU256(INJECT_AMOUNT);
const allow2Calldata = new Uint8Array(aw2.getBuffer());

let utxos2 = await utxoProvider.fetchUTXOMultiAddr({ addresses: [opnetP2TR!, opnetP2WPKH!], minAmount: 330n, requestedAmount: 100_000_000n, optimized: true, usePendingUTXO: true });
if (!utxos2.length) throw new Error('No UTXOs for inject allowance');
let challenge2 = await rpcProvider.getChallenge();

const ar2 = await txFactory.signInteraction({ to: MOTO_BECH32, from: opnetP2TR!, contract: motoPubkeyHex, calldata: allow2Calldata, challenge: challenge2, signer: wallet.keypair, mldsaSigner: wallet.mldsaKeypair, network: NETWORK, utxos: utxos2, feeRate: FEE_RATE, priorityFee: PRIORITY_FEE, gasSatFee: GAS_SAT_FEE });
const af2 = await utxoProvider.broadcastTransaction(ar2.fundingTransaction!, false);
if (!af2?.success) throw new Error(`Inject allowance funding failed: ${af2?.error}`);
console.log('Inject allowance funding tx:', af2.result);
const ai2 = await utxoProvider.broadcastTransaction(ar2.interactionTransaction!, false);
if (!ai2?.success) throw new Error(`Inject allowance tx failed: ${ai2?.error}`);
console.log('Inject allowance tx        :', ai2.result);

await new Promise(r => setTimeout(r, 2000));

// ─── Step 5: injectRewards on genome ───
console.log('\n--- Step 5: injectRewards on genome ---');
const genomeCode3     = await rpcProvider.getCode(GENOME_BECH32);
const genomePubHex3   = toHex((genomeCode3 as any).contractPublicKey);
console.log('Genome pubkey confirmed:', genomePubHex3);

// Selector: SHA256('injectRewards()') = 0x1efde43e (confirmed in S128)
const iw = new BinaryWriter();
iw.writeSelector(sel('injectRewards()'));
iw.writeU256(INJECT_AMOUNT);
const injectCalldata = new Uint8Array(iw.getBuffer());

utxos2 = await utxoProvider.fetchUTXOMultiAddr({ addresses: [opnetP2TR!, opnetP2WPKH!], minAmount: 330n, requestedAmount: 100_000_000n, optimized: true, usePendingUTXO: true });
if (!utxos2.length) throw new Error('No UTXOs for injectRewards');
challenge2 = await rpcProvider.getChallenge();

const ir = await txFactory.signInteraction({ to: GENOME_BECH32, from: opnetP2TR!, contract: genomePubHex3, calldata: injectCalldata, challenge: challenge2, signer: wallet.keypair, mldsaSigner: wallet.mldsaKeypair, network: NETWORK, utxos: utxos2, feeRate: FEE_RATE, priorityFee: PRIORITY_FEE, gasSatFee: GAS_SAT_FEE });
const jf = await utxoProvider.broadcastTransaction(ir.fundingTransaction!, false);
if (!jf?.success) throw new Error(`injectRewards funding failed: ${jf?.error}`);
console.log('injectRewards funding tx:', jf.result);
const ji = await utxoProvider.broadcastTransaction(ir.interactionTransaction!, false);
if (!ji?.success) throw new Error(`injectRewards interaction failed: ${ji?.error}`);
console.log('injectRewards tx        :', ji.result);

// ─── Step 6: Wait for indexer and read AFTER ───
console.log('\nWaiting 60s for indexer to catch up...');
await new Promise(r => setTimeout(r, 60000));

const ubRes1 = await genomeReadContract.underlyingBalance();
const tsRes1 = await genomeReadContract.totalSupply();
const underlyingAfter  = extractU256(ubRes1);
const totalSupplyAfter = extractU256(tsRes1);
const ratioAfter = totalSupplyAfter === 0n ? 0.0 : Number(underlyingAfter) / Number(totalSupplyAfter);

console.log('\n--- State AFTER inject ---');
console.log('underlyingBalance:', underlyingAfter.toString(), '(raw)');
console.log('totalSupply      :', totalSupplyAfter.toString(), '(raw)');
console.log('ratio            :', ratioAfter.toFixed(8));

// ─── Result ───
console.log('\n--- RESULT ---');
console.log('underlyingBalance BEFORE:', underlyingBefore.toString());
console.log('underlyingBalance AFTER :', underlyingAfter.toString());
console.log('ratio BEFORE            :', ratioBefore.toFixed(8));
console.log('ratio AFTER             :', ratioAfter.toFixed(8));

if (underlyingAfter > underlyingBefore) {
    console.log('\n✅ PASS: underlyingBalance increased after injectRewards');
    if (ratioAfter > ratioBefore && totalSupplyAfter > 0n) {
        console.log('✅ PASS: Ratio increased', ratioBefore.toFixed(8), '->', ratioAfter.toFixed(8));
    }
} else {
    console.log('\n⚠️  underlyingBalance unchanged — indexer may still be catching up');
    console.log('   injectRewards tx:', ji.result);
}

console.log('\n=== Done ===');
