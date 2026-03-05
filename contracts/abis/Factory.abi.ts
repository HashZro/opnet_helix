import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';

export const FactoryEvents = [];

export const FactoryAbi = [
    {
        name: 'registerMine',
        inputs: [],
        outputs: [{ name: 'count', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getMineAddress',
        inputs: [],
        outputs: [{ name: 'mineAddress', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getMineCount',
        inputs: [],
        outputs: [{ name: 'count', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getMineAtIndex',
        inputs: [],
        outputs: [{ name: 'mineAddress', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    ...FactoryEvents,
    ...OP_NET_ABI,
];

export default FactoryAbi;
