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

/**
 * @description Represents the result of the getWrappedAmount function call.
 */
export type GetWrappedAmount = CallResult<
    {
        xAmount: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getUnwrappedAmount function call.
 */
export type GetUnwrappedAmount = CallResult<
    {
        netUnderlying: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the underlyingBalance function call.
 */
export type UnderlyingBalance = CallResult<
    {
        balance: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getUnderlyingAmount function call.
 */
export type GetUnderlyingAmount = CallResult<
    {
        underlyingAmount: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getWrapFee function call.
 */
export type GetWrapFee = CallResult<
    {
        wrapFee: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getUnwrapFee function call.
 */
export type GetUnwrapFee = CallResult<
    {
        unwrapFee: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getControllerFee function call.
 */
export type GetControllerFee = CallResult<
    {
        controllerFee: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getProtocolFee function call.
 */
export type GetProtocolFee = CallResult<
    {
        protocolFee: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getProtocolFeeAccrued function call.
 */
export type GetProtocolFeeAccrued = CallResult<
    {
        protocolFeeAccrued: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getControllerFeeAccrued function call.
 */
export type GetControllerFeeAccrued = CallResult<
    {
        controllerFeeAccrued: bigint;
    },
    OPNetEvent<never>[]
>;

// ------------------------------------------------------------------
// IMine
// ------------------------------------------------------------------
export interface IMine extends IOP_NETContract {
    wrap(): Promise<Wrap>;
    unwrap(): Promise<Unwrap>;
    getWrappedAmount(): Promise<GetWrappedAmount>;
    getUnwrappedAmount(): Promise<GetUnwrappedAmount>;
    underlyingBalance(): Promise<UnderlyingBalance>;
    getUnderlyingAmount(): Promise<GetUnderlyingAmount>;
    getWrapFee(): Promise<GetWrapFee>;
    getUnwrapFee(): Promise<GetUnwrapFee>;
    getControllerFee(): Promise<GetControllerFee>;
    getProtocolFee(): Promise<GetProtocolFee>;
    getProtocolFeeAccrued(): Promise<GetProtocolFeeAccrued>;
    getControllerFeeAccrued(): Promise<GetControllerFeeAccrued>;
}
