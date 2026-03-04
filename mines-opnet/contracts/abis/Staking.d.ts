import { Address, AddressMap, ExtendedAddressMap, SchnorrSignature } from '@btc-vision/transaction';
import { CallResult, OPNetEvent, IOP_NETContract } from 'opnet';

// ------------------------------------------------------------------
// Event Definitions
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Call Results
// ------------------------------------------------------------------

/**
 * @description Represents the result of the stake function call.
 */
export type Stake = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the unstake function call.
 */
export type Unstake = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getRewards function call.
 */
export type GetRewards = CallResult<
    {
        pending: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getStakeBalance function call.
 */
export type GetStakeBalance = CallResult<
    {
        balance: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the claim function call.
 */
export type Claim = CallResult<
    {
        reward: bigint;
    },
    OPNetEvent<never>[]
>;

// ------------------------------------------------------------------
// IStaking
// ------------------------------------------------------------------
export interface IStaking extends IOP_NETContract {
    stake(): Promise<Stake>;
    unstake(): Promise<Unstake>;
    getRewards(): Promise<GetRewards>;
    getStakeBalance(): Promise<GetStakeBalance>;
    claim(): Promise<Claim>;
}
