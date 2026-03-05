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
 * @description Represents the result of the getUnderlying function call.
 */
export type GetUnderlying = CallResult<
    {
        underlying: Address;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getOwner function call.
 */
export type GetOwner = CallResult<
    {
        owner: Address;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the setWrapFee function call.
 */
export type SetWrapFee = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the setUnwrapFee function call.
 */
export type SetUnwrapFee = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the setAmmPool function call.
 */
export type SetAmmPool = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getAmmPool function call.
 */
export type GetAmmPool = CallResult<
    {
        pool: Address;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the setAmmBuyFee function call.
 */
export type SetAmmBuyFee = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the setAmmSellFee function call.
 */
export type SetAmmSellFee = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getAmmBuyFee function call.
 */
export type GetAmmBuyFee = CallResult<
    {
        ammBuyFee: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getAmmSellFee function call.
 */
export type GetAmmSellFee = CallResult<
    {
        ammSellFee: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the notifyAmmFee function call.
 */
export type NotifyAmmFee = CallResult<
    {
        amount: bigint;
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
    getUnderlying(): Promise<GetUnderlying>;
    getOwner(): Promise<GetOwner>;
    setWrapFee(): Promise<SetWrapFee>;
    setUnwrapFee(): Promise<SetUnwrapFee>;
    setAmmPool(): Promise<SetAmmPool>;
    getAmmPool(): Promise<GetAmmPool>;
    setAmmBuyFee(): Promise<SetAmmBuyFee>;
    setAmmSellFee(): Promise<SetAmmSellFee>;
    getAmmBuyFee(): Promise<GetAmmBuyFee>;
    getAmmSellFee(): Promise<GetAmmSellFee>;
    notifyAmmFee(): Promise<NotifyAmmFee>;
}
