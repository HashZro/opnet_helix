import { Address, AddressMap, ExtendedAddressMap, SchnorrSignature } from '@btc-vision/transaction';
import { CallResult, OPNetEvent, IOP_NETContract } from 'opnet';

// ------------------------------------------------------------------
// Event Definitions
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Call Results
// ------------------------------------------------------------------

/**
 * @description Represents the result of the registerGenome function call.
 */
export type RegisterGenome = CallResult<
    {
        count: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getGenomeAddress function call.
 */
export type GetGenomeAddress = CallResult<
    {
        genomeAddress: Address;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getGenomeCount function call.
 */
export type GetGenomeCount = CallResult<
    {
        count: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getGenomeAtIndex function call.
 */
export type GetGenomeAtIndex = CallResult<
    {
        genomeAddress: Address;
    },
    OPNetEvent<never>[]
>;

// ------------------------------------------------------------------
// IFactory
// ------------------------------------------------------------------
export interface IFactory extends IOP_NETContract {
    registerGenome(): Promise<RegisterGenome>;
    getGenomeAddress(): Promise<GetGenomeAddress>;
    getGenomeCount(): Promise<GetGenomeCount>;
    getGenomeAtIndex(): Promise<GetGenomeAtIndex>;
}
