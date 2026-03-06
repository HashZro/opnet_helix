import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';

export const CrystalTokenEvents = [];

export const CrystalTokenAbi = [
    {
        name: 'mine',
        inputs: [],
        outputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    ...CrystalTokenEvents,
    ...OP_NET_ABI,
];

export default CrystalTokenAbi;
