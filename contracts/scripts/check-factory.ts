import 'dotenv/config';
import { networks } from '@btc-vision/bitcoin';
import { JSONRpcProvider } from 'opnet';
import factoryAbiJson from '../abis/Factory.abi.json' assert { type: 'json' };

const rpc = new JSONRpcProvider('https://testnet.opnet.org', networks.testnet);
const FACTORY_BECH32 = 'opt1sqpaphjdgykdzrzkyc9lm2sqp4ruf7z7tgqv3wvx9';

// Use low-level call via getCode + manual simulate to avoid ABI type issues
// Just check the contract code to verify Factory is alive
const factoryCode = await (rpc as any).getCode(FACTORY_BECH32);
console.log('Factory contract exists:', !!factoryCode);
console.log('Factory pubkey:', factoryCode?.contractPublicKey instanceof Uint8Array
    ? '0x' + Buffer.from(factoryCode.contractPublicKey).toString('hex')
    : factoryCode?.contractPublicKey);

// Use the opnet simulate call with the correct ABI types
import { ABIDataTypes, BitcoinAbiTypes } from 'opnet';

const FACTORY_ABI = [
    {
        name: 'getMineCount',
        inputs: [],
        outputs: [{ name: 'count', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getMineAtIndex',
        inputs: [{ name: 'index', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'mineAddress', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
];

import { getContract } from 'opnet';

const factory = getContract(FACTORY_BECH32, FACTORY_ABI as any, rpc, networks.testnet);
const countRes = await (factory as any).getMineCount();
console.log('getMineCount result:', JSON.stringify(countRes));

const raw = countRes?.properties?.count ?? countRes?.result ?? countRes?.decoded?.[0] ?? '0';
const count = BigInt(raw.toString());
console.log('Registered mine count:', count.toString());

for (let i = 0n; i < count; i++) {
    const mineRes = await (factory as any).getMineAtIndex(i);
    const addr = mineRes?.properties?.mineAddress ?? mineRes?.result ?? mineRes?.decoded?.[0];
    console.log(`Mine[${i}]:`, addr?.toString());
}
