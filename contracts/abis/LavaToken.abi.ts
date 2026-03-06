import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';

export const LavaTokenEvents = [];

export const LavaTokenAbi = [
    {
        name: 'mine',
        inputs: [],
        outputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    ...LavaTokenEvents,
    ...OP_NET_ABI,
];

export default LavaTokenAbi;
