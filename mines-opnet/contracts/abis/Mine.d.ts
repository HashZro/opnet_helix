import { Address, AddressMap, ExtendedAddressMap, SchnorrSignature } from '@btc-vision/transaction';
import { CallResult, OPNetEvent, IOP_NETContract } from 'opnet';

// ------------------------------------------------------------------
// Event Definitions
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Call Results
// ------------------------------------------------------------------

/**
 * @description Represents the result of the wrap function call.
 */
export type Wrap = CallResult<
    {
        xAmount: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the unwrap function call.
 */
export type Unwrap = CallResult<
    {
        netUnderlying: bigint;
    },
    OPNetEvent<never>[]
>;

// ------------------------------------------------------------------
// IMine
// ------------------------------------------------------------------
export interface IMine extends IOP_NETContract {
    wrap(): Promise<Wrap>;
    unwrap(): Promise<Unwrap>;
}
