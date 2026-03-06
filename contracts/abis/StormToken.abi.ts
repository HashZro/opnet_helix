import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';

export const StormTokenEvents = [];

export const StormTokenAbi = [
    {
        name: 'mine',
        inputs: [],
        outputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    ...StormTokenEvents,
    ...OP_NET_ABI,
];

export default StormTokenAbi;
