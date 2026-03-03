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
        name: 'getControllerFee',
        inputs: [],
        outputs: [{ name: 'controllerFee', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getProtocolFee',
        inputs: [],
        outputs: [{ name: 'protocolFee', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getProtocolFeeAccrued',
        inputs: [],
        outputs: [{ name: 'protocolFeeAccrued', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getControllerFeeAccrued',
        inputs: [],
        outputs: [{ name: 'controllerFeeAccrued', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    ...MineEvents,
    ...OP_NET_ABI,
];

export default MineAbi;
