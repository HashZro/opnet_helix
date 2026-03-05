import { Address, AddressMap, ExtendedAddressMap, SchnorrSignature } from '@btc-vision/transaction';
import { CallResult, OPNetEvent, IOP_NETContract } from 'opnet';

// ------------------------------------------------------------------
// Event Definitions
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Call Results
// ------------------------------------------------------------------

/**
 * @description Represents the result of the registerMine function call.
 */
export type RegisterMine = CallResult<
    {
        count: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getMineAddress function call.
 */
export type GetMineAddress = CallResult<
    {
        mineAddress: Address;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getMineCount function call.
 */
export type GetMineCount = CallResult<
    {
        count: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getMineAtIndex function call.
 */
export type GetMineAtIndex = CallResult<
    {
        mineAddress: Address;
    },
    OPNetEvent<never>[]
>;

// ------------------------------------------------------------------
// IFactory
// ------------------------------------------------------------------
export interface IFactory extends IOP_NETContract {
    registerMine(): Promise<RegisterMine>;
    getMineAddress(): Promise<GetMineAddress>;
    getMineCount(): Promise<GetMineCount>;
    getMineAtIndex(): Promise<GetMineAtIndex>;
}
