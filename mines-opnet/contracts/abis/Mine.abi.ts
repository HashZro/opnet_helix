import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';

export const MineEvents = [];

export const MineAbi = [
    {
        name: 'wrap',
        inputs: [],
        outputs: [{ name: 'xAmount', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'unwrap',
        inputs: [],
        outputs: [{ name: 'netUnderlying', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    ...MineEvents,
    ...OP_NET_ABI,
];

export default MineAbi;
