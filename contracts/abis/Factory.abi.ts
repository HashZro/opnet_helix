import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';

export const FactoryEvents = [];

export const FactoryAbi = [
    {
        name: 'registerGenome',
        inputs: [],
        outputs: [{ name: 'count', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getGenomeAddress',
        inputs: [],
        outputs: [{ name: 'genomeAddress', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getGenomeCount',
        inputs: [],
        outputs: [{ name: 'count', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getGenomeAtIndex',
        inputs: [],
        outputs: [{ name: 'genomeAddress', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    ...FactoryEvents,
    ...OP_NET_ABI,
];

export default FactoryAbi;
