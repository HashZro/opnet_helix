import 'dotenv/config';
import { networks } from '@btc-vision/bitcoin';
import { JSONRpcProvider } from 'opnet';

const NODE_URL = 'https://testnet.opnet.org';
const NETWORK  = networks.testnet;

const rpc = new JSONRpcProvider(NODE_URL, NETWORK);

function toHex(val: unknown): string {
    if (val instanceof Uint8Array) return '0x' + Buffer.from(val).toString('hex');
    return String(val);
}

console.log('=== Resolving Moto token and existing xMotoMine ===\n');

// 1. Resolve user's Moto token
const MOTO_BECH32 = 'opt1sqzkx6wm5acawl9m6nay2mjsm6wagv7gazcgtczds';
const motoCode = await (rpc as any).getCode(MOTO_BECH32);
const motoPubkey = toHex(motoCode?.contractPublicKey);
console.log('Moto token bech32 :', MOTO_BECH32);
console.log('Moto token pubkey  :', motoPubkey);

// 2. Resolve existing xMotoMine
const MINE_BECH32 = 'opt1sqzet9gfcfyvh50qvlw5d2p0cdzndg9spa5zgr238';
const mineCode = await (rpc as any).getCode(MINE_BECH32);
const minePubkey = toHex(mineCode?.contractPublicKey);
console.log('\nxMotoMine bech32   :', MINE_BECH32);
console.log('xMotoMine pubkey   :', minePubkey);

// 3. Compare with .env
const envUnderlying = process.env.MOTO_UNDERLYING ?? '(not set)';
const envMineAddr   = process.env.MOTO_MINE_ADDRESS ?? '(not set)';
console.log('\n.env MOTO_UNDERLYING  :', envUnderlying);
console.log('.env MOTO_MINE_ADDRESS :', envMineAddr);

// 4. Verdict
const underlyingMatch = motoPubkey.toLowerCase() === envUnderlying.toLowerCase();
const mineMatch       = minePubkey.toLowerCase() === envMineAddr.toLowerCase();

console.log('\n=== Verdict ===');
console.log('Moto pubkey matches .env MOTO_UNDERLYING :', underlyingMatch ? 'YES - existing mine is correct' : 'NO - need new mine deployment');
console.log('Mine pubkey matches .env MOTO_MINE_ADDRESS:', mineMatch ? 'YES' : 'NO - .env mine address mismatch');

if (!underlyingMatch) {
    console.log('\nACTION REQUIRED: Update .env MOTO_UNDERLYING to:', motoPubkey);
}
