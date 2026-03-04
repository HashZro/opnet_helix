import { ABIDataTypes, BitcoinAbiTypes, OP_20_ABI, OP_NET_ABI } from 'opnet';

// Re-export standard OP_20 ABI for token interactions
export { OP_20_ABI };

// MinerToken ABI — OP_20 token with free mine() faucet method
export const MINER_TOKEN_ABI = [
    {
        name: 'mine',
        inputs: [],
        outputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    ...OP_20_ABI,
];

// Mine ABI — wrapping vault (underlying → xToken)
export const MINE_ABI = [
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
        name: 'setControllerFee',
        inputs: [],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setProtocolFee',
        inputs: [],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'claimControllerFee',
        inputs: [],
        outputs: [{ name: 'accrued', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'claimProtocolFee',
        inputs: [],
        outputs: [{ name: 'accrued', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'disburseProtocolFee',
        inputs: [],
        outputs: [{ name: 'accrued', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    ...OP_20_ABI,
];

// Factory ABI — mine registry
export const FACTORY_ABI = [
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
    ...OP_NET_ABI,
];

// Staking ABI — stake xTokens to earn underlying rewards
export const STAKING_ABI = [
    {
        name: 'stake',
        inputs: [],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'unstake',
        inputs: [],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'claim',
        inputs: [],
        outputs: [{ name: 'reward', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getRewards',
        inputs: [],
        outputs: [{ name: 'pending', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getStakeBalance',
        inputs: [],
        outputs: [{ name: 'balance', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    ...OP_NET_ABI,
];
