import 'dotenv/config';
import { Address } from '@btc-vision/transaction';
import { networks } from '@btc-vision/bitcoin';
import { getContract, MotoSwapFactoryAbi, JSONRpcProvider } from 'opnet';

const NETWORK           = networks.testnet;
const GENOME_PUBKEY     = process.env.GENOME_ADDRESS    ?? '0x8c8cacdec6bfc9af74161cd25ef1af7bcdefe99fc43f12a849f299c720c4c898';
const UNDERLYING_PUBKEY = process.env.MOTO_UNDERLYING   ?? '0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd';
const MOTOSWAP_FACTORY  = '0xa02aa5ca4c307107484d5fb690d811df1cf526f8de204d24528653dcae369a0f';

const rpc = new JSONRpcProvider('https://testnet.opnet.org', NETWORK);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const factory = getContract<any>(Address.fromString(MOTOSWAP_FACTORY), MotoSwapFactoryAbi as any, rpc, NETWORK);

console.log('Checking pool for gMOTO genome...');
console.log('  genome    :', GENOME_PUBKEY);
console.log('  underlying:', UNDERLYING_PUBKEY);

// Try both orderings — MotoSwap sorts tokens by address
// From simulation events: token0=GENOME(0x8c8c..) token1=UNDERLYING(0xfd44..) because 0x8c < 0xfd
const res1 = await factory.getPool(Address.fromString(UNDERLYING_PUBKEY), Address.fromString(GENOME_PUBKEY));
const res2 = await factory.getPool(Address.fromString(GENOME_PUBKEY), Address.fromString(UNDERLYING_PUBKEY));

const pool1 = res1?.properties?.pool?.toString() ?? res1?.result?.toString() ?? '';
const pool2 = res2?.properties?.pool?.toString() ?? res2?.result?.toString() ?? '';
console.log('\ngetPool(underlying, genome):', pool1);
console.log('getPool(genome, underlying):', pool2);

const isZero1 = !pool1 || /^0x0+$/.test(pool1) || pool1 === '0x';
const isZero2 = !pool2 || /^0x0+$/.test(pool2) || pool2 === '0x';
const pool = isZero1 ? pool2 : pool1;
const isZero = isZero1 && isZero2;

if (isZero) {
    console.log('\nPool: NOT yet confirmed (tx may still be pending)');
} else {
    console.log('\nPool address confirmed:', pool);
}
