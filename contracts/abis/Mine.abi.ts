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
    {
        name: 'getWrappedAmount',
        inputs: [],
        outputs: [{ name: 'xAmount', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getUnwrappedAmount',
        inputs: [],
        outputs: [{ name: 'netUnderlying', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'underlyingBalance',
        inputs: [],
        outputs: [{ name: 'balance', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getUnderlyingAmount',
        inputs: [],
        outputs: [{ name: 'underlyingAmount', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getWrapFee',
        inputs: [],
        outputs: [{ name: 'wrapFee', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getUnwrapFee',
        inputs: [],
        outputs: [{ name: 'unwrapFee', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getUnderlying',
        inputs: [],
        outputs: [{ name: 'underlying', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getOwner',
        inputs: [],
        outputs: [{ name: 'owner', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setWrapFee',
        inputs: [],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setUnwrapFee',
        inputs: [],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setAmmPool',
        inputs: [],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getAmmPool',
        inputs: [],
        outputs: [{ name: 'pool', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setAmmBuyFee',
        inputs: [],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setAmmSellFee',
        inputs: [],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getAmmBuyFee',
        inputs: [],
        outputs: [{ name: 'ammBuyFee', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getAmmSellFee',
        inputs: [],
        outputs: [{ name: 'ammSellFee', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'notifyAmmFee',
        inputs: [],
        outputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    ...MineEvents,
    ...OP_NET_ABI,
];

export default MineAbi;
