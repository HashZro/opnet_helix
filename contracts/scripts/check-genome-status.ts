import 'dotenv/config';
import { networks } from '@btc-vision/bitcoin';
import { ABIDataTypes, BitcoinAbiTypes, getContract, JSONRpcProvider } from 'opnet';
import { Address } from '@btc-vision/transaction';

const NETWORK   = networks.testnet;
const rpc       = new JSONRpcProvider('https://testnet.opnet.org', NETWORK);

const GENOME_PUBKEY     = process.env.GENOME_ADDRESS    ?? '0x8c8cacdec6bfc9af74161cd25ef1af7bcdefe99fc43f12a849f299c720c4c898';
const GENOME_FACTORY    = process.env.GENOME_FACTORY_ADDRESS ?? 'opt1sqpfg7r4n6jqen30xqtm5fak5gllpczhd3syzafv8';
const MOTOSWAP_FACTORY  = '0xa02aa5ca4c307107484d5fb690d811df1cf526f8de204d24528653dcae369a0f';

function toHex(v: unknown): string {
    if (v instanceof Uint8Array) return '0x' + Buffer.from(v).toString('hex');
    return String(v);
}

console.log('=== Check Genome Status ===');

// Check Factory v3 genome count
const FACTORY_ABI = [
    { name: 'getGenomeCount',   inputs: [],                                                              outputs: [{ name: 'count',   type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
    { name: 'getGenomeAtIndex', inputs: [{ name: 'index', type: ABIDataTypes.UINT256 }],                outputs: [{ name: 'genome',  type: ABIDataTypes.ADDRESS  }], type: BitcoinAbiTypes.Function },
    { name: 'getGenomeAddress', inputs: [{ name: 'underlying', type: ABIDataTypes.ADDRESS }],           outputs: [{ name: 'genome',  type: ABIDataTypes.ADDRESS  }], type: BitcoinAbiTypes.Function },
];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const factory  = getContract<any>(GENOME_FACTORY, FACTORY_ABI as any, rpc, NETWORK);
const countRes = await factory.getGenomeCount();
const count    = Number(countRes?.properties?.count ?? 0n);
console.log('\nGenome Factory v3:', GENOME_FACTORY);
console.log('Genome count     :', count);

for (let i = 0; i < count; i++) {
    const g = await factory.getGenomeAtIndex(BigInt(i));
    const addr = g?.properties?.genome?.toString() ?? g?.result?.toString() ?? '';
    console.log(`  Genome[${i}]: ${addr}`);
}

// Check if GENOME contract is accessible
console.log('\n--- Genome contract check ---');
console.log('GENOME_PUBKEY:', GENOME_PUBKEY);
try {
    // Query via getGenomeAddress(underlying)
    const MOTO_UNDERLYING = process.env.MOTO_UNDERLYING ?? '0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd';
    const addrRes = await factory.getGenomeAddress(Address.fromString(MOTO_UNDERLYING));
    const registeredGenome = addrRes?.properties?.genome?.toString() ?? addrRes?.result?.toString() ?? '';
    console.log('Factory.getGenomeAddress(moto):', registeredGenome);
    console.log('Matches GENOME_PUBKEY:', registeredGenome.toLowerCase() === GENOME_PUBKEY.toLowerCase() ? 'YES' : 'NO');
} catch (e) {
    console.log('getGenomeAddress failed:', (e as Error).message.slice(0, 80));
}

// Check MotoSwap factory - try all token orderings for getPool
console.log('\n--- MotoSwap pool check ---');
const UNDERLYING_PUBKEY = process.env.MOTO_UNDERLYING ?? '0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd';
const { MotoSwapFactoryAbi } = await import('opnet');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const motoFactory = getContract<any>(Address.fromString(MOTOSWAP_FACTORY), MotoSwapFactoryAbi as any, rpc, NETWORK);

// Attempt getPool with both orderings
const orders: Array<[string, string, string]> = [
    ['(genome, underlying)', GENOME_PUBKEY,     UNDERLYING_PUBKEY],
    ['(underlying, genome)', UNDERLYING_PUBKEY, GENOME_PUBKEY],
];
for (const [label, a, b] of orders) {
    const r = await motoFactory.getPool(Address.fromString(a), Address.fromString(b));
    const p = toHex(r?.properties?.pool ?? r?.result ?? '0x0');
    const isZero = !p || /^0x0+$/.test(p) || p === '0x';
    console.log(`getPool${label}: ${isZero ? 'ZERO (no pool)' : p}`);
}
