import 'dotenv/config';
import { networks } from '@btc-vision/bitcoin';
import { ABIDataTypes, BitcoinAbiTypes, getContract, JSONRpcProvider } from 'opnet';

const rpc = new JSONRpcProvider('https://testnet.opnet.org', networks.testnet);
const NEW_FACTORY = 'opt1sqp0hga3emwtytfz3mr7azu0a6rvrfk488u3sfw9j';

try {
    const code = await (rpc as any).getCode(NEW_FACTORY);
    const pk = code?.contractPublicKey instanceof Uint8Array
        ? '0x' + Buffer.from(code.contractPublicKey as Uint8Array).toString('hex')
        : String(code?.contractPublicKey);
    console.log('Factory v2 confirmed! Pubkey:', pk);

    const ABI = [
        { name: 'getMineCount', inputs: [], outputs: [{ name: 'count', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
        { name: 'getMineAtIndex', inputs: [{ name: 'index', type: ABIDataTypes.UINT256 }], outputs: [{ name: 'mineAddress', type: ABIDataTypes.ADDRESS }], type: BitcoinAbiTypes.Function },
    ];
    const factory = getContract(NEW_FACTORY, ABI as any, rpc, networks.testnet);
    const res = await (factory as any).getMineCount();
    const count = Number(res?.properties?.count ?? 0n);
    console.log('Mine count:', count);

    for (let i = 0; i < count; i++) {
        const mineRes = await (factory as any).getMineAtIndex(BigInt(i));
        console.log(`Mine[${i}]:`, mineRes?.properties?.mineAddress?.toString());
    }
} catch (e) {
    console.log('Factory v2 NOT yet confirmed:', (e as Error).message.slice(0, 100));
}
