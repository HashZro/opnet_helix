import {
    Blockchain,
    BytesWriter,
    BytesReader,
    Calldata,
    OP20,
    OP20InitParameters,
    Revert,
    SafeMath,
    TransferHelper,
    Address,
} from '@btc-vision/btc-runtime/runtime';
import { u256 } from '@btc-vision/as-bignum/assembly';

// Result container for _calcWrap (AssemblyScript has no tuple returns)
class WrapResult {
    xAmount: u256;
    feeAmount: u256;

    constructor(xAmount: u256, feeAmount: u256) {
        this.xAmount = xAmount;
        this.feeAmount = feeAmount;
    }
}


// Fee limits (basis points out of 1000)
const MAX_DEPOSIT_WITHDRAW_FEE: u256 = u256.fromU32(200);
const FEE_DENOMINATOR: u256 = u256.fromU32(1000);
const ZERO: u256 = u256.fromU32(0);

@final
export class Genome extends OP20 {
    // ── Storage pointers (each gets a unique u16 via Blockchain.nextPointer) ──
    private readonly _underlying: u16 = Blockchain.nextPointer;          // Address of wrapped token
    private readonly _owner: u16 = Blockchain.nextPointer;               // Controller address
    private readonly _factoryAddr: u16 = Blockchain.nextPointer;         // Factory/deployer address
    private readonly _wrapFee: u16 = Blockchain.nextPointer;             // Wrap fee (basis points / 1000)
    private readonly _unwrapFee: u16 = Blockchain.nextPointer;           // Unwrap fee (basis points / 1000)
    private readonly _underlyingHeld: u16 = Blockchain.nextPointer;      // Self-tracked underlying balance
    private readonly _ammPool: u16 = Blockchain.nextPointer;             // Whitelisted AMM pool address
    private readonly _ammBuyFee: u16 = Blockchain.nextPointer;           // AMM buy fee (basis points / 1000)
    private readonly _ammSellFee: u16 = Blockchain.nextPointer;          // AMM sell fee (basis points / 1000)

    // ── Storage key helpers ──

    // Simple field key: [ptr_hi, ptr_lo, 0...0]
    @inline
    private fieldKeySimple(ptr: u16): Uint8Array {
        const k = new Uint8Array(32);
        k[0] = u8((ptr >> 8) & 0xff);
        k[1] = u8(ptr & 0xff);
        return k;
    }

    // ── Raw storage read/write ──

    @inline
    private su(key: Uint8Array, val: u256): void {
        Blockchain.setStorageAt(key, val.toUint8Array(true));
    }

    @inline
    private lu(key: Uint8Array): u256 {
        return u256.fromUint8ArrayBE(Blockchain.getStorageAt(key));
    }

    @inline
    private sa(key: Uint8Array, addr: Address): void {
        const w = new BytesWriter(32);
        w.writeAddress(addr);
        Blockchain.setStorageAt(key, w.getBuffer());
    }

    @inline
    private la(key: Uint8Array): Address {
        return new BytesReader(Blockchain.getStorageAt(key)).readAddress();
    }

    // ── Access control ──

    private requireOwner(): void {
        const owner = this.la(this.fieldKeySimple(this._owner));
        if (Blockchain.tx.sender != owner) throw new Revert('not owner');
    }

    private requireAmmPool(): void {
        const pool = this.la(this.fieldKeySimple(this._ammPool));
        if (Blockchain.tx.sender != pool) throw new Revert('not amm pool');
    }

    private requireFactoryOwner(): void {
        const factory = this.la(this.fieldKeySimple(this._factoryAddr));
        if (Blockchain.tx.sender != factory) throw new Revert('not factory owner');
    }

    private requireOwnerOrFactory(): void {
        const owner = this.la(this.fieldKeySimple(this._owner));
        const factory = this.la(this.fieldKeySimple(this._factoryAddr));
        if (Blockchain.tx.sender != owner && Blockchain.tx.sender != factory) {
            throw new Revert('not authorized');
        }
    }

    // ── Internal balance ──

    private _underlyingBalance(): u256 {
        return this.lu(this.fieldKeySimple(this._underlyingHeld));
    }

    // ── Conversion helpers ──

    private _getUnderlyingAmount(xAmount: u256): u256 {
        const supply: u256 = this._totalSupply.value;
        if (supply == ZERO) return xAmount;
        return SafeMath.div(SafeMath.mul(xAmount, this._underlyingBalance()), supply);
    }

    // ── Fee calculation ──

    // _calcWrap: fee stays in pool, grows the xToken ratio over time
    private _calcWrap(amount: u256): WrapResult {
        const supply: u256 = this._totalSupply.value;

        if (supply == ZERO) {
            // First wrap: 1:1 ratio, no fee
            return new WrapResult(amount, ZERO);
        }

        // feeAmount = amount * wrapFee / 1000
        const wrapFee: u256 = this.lu(this.fieldKeySimple(this._wrapFee));
        const feeAmount: u256 = SafeMath.div(SafeMath.mul(amount, wrapFee), FEE_DENOMINATOR);

        // netAmount = amount - feeAmount
        const netAmount: u256 = SafeMath.sub(amount, feeAmount);

        // xAmount = supply * netAmount / underlyingBalance
        const xAmount: u256 = SafeMath.div(
            SafeMath.mul(supply, netAmount),
            this._underlyingBalance(),
        );

        return new WrapResult(xAmount, feeAmount);
    }

    // ── Public methods ──

    @method()
    @returns({ name: 'xAmount', type: ABIDataTypes.UINT256 })
    public wrap(_calldata: Calldata): BytesWriter {
        const amount: u256 = _calldata.readU256();

        // CHECKS
        if (amount == ZERO) throw new Revert('zero amount');

        // EFFECTS — calculate xTokens to mint (fee stays in pool)
        const result: WrapResult = this._calcWrap(amount);

        // INTERACTIONS — transfer underlying in, update held balance, mint xTokens
        const underlying: Address = this.la(this.fieldKeySimple(this._underlying));
        TransferHelper.transferFrom(underlying, Blockchain.tx.sender, Blockchain.contractAddress, amount);

        const heldKey: Uint8Array = this.fieldKeySimple(this._underlyingHeld);
        this.su(heldKey, SafeMath.add(this.lu(heldKey), amount));

        this._mint(Blockchain.tx.sender, result.xAmount);

        const response = new BytesWriter(32);
        response.writeU256(result.xAmount);
        return response;
    }

    @method()
    @returns({ name: 'netUnderlying', type: ABIDataTypes.UINT256 })
    public unwrap(_calldata: Calldata): BytesWriter {
        const xAmount: u256 = _calldata.readU256();

        // CHECKS
        if (xAmount == ZERO) throw new Revert('zero amount');

        // EFFECTS — convert xTokens to underlying, calculate fee, burn xTokens
        const underlyingAmount: u256 = this._getUnderlyingAmount(xAmount);

        const unwrapFeeRate: u256 = this.lu(this.fieldKeySimple(this._unwrapFee));
        const feeAmount: u256 = SafeMath.div(
            SafeMath.mul(underlyingAmount, unwrapFeeRate),
            FEE_DENOMINATOR,
        );

        // Net underlying to send (feeAmount stays in pool, growing the ratio)
        const netUnderlying: u256 = SafeMath.sub(underlyingAmount, feeAmount);

        // Burn xTokens from sender
        this._burn(Blockchain.tx.sender, xAmount);

        // Decrement self-tracked balance
        const heldKey: Uint8Array = this.fieldKeySimple(this._underlyingHeld);
        this.su(heldKey, SafeMath.sub(this.lu(heldKey), netUnderlying));

        // INTERACTIONS — transfer underlying out to sender
        const underlying: Address = this.la(this.fieldKeySimple(this._underlying));
        TransferHelper.transfer(underlying, Blockchain.tx.sender, netUnderlying);

        const response = new BytesWriter(32);
        response.writeU256(netUnderlying);
        return response;
    }

    @method()
    @returns({ name: 'xAmount', type: ABIDataTypes.UINT256 })
    public getWrappedAmount(_calldata: Calldata): BytesWriter {
        const amount: u256 = _calldata.readU256();
        const result: WrapResult = this._calcWrap(amount);
        const response = new BytesWriter(32);
        response.writeU256(result.xAmount);
        return response;
    }

    @method()
    @returns({ name: 'netUnderlying', type: ABIDataTypes.UINT256 })
    public getUnwrappedAmount(_calldata: Calldata): BytesWriter {
        const xAmount: u256 = _calldata.readU256();
        const underlyingAmount: u256 = this._getUnderlyingAmount(xAmount);
        const unwrapFeeRate: u256 = this.lu(this.fieldKeySimple(this._unwrapFee));
        const feeAmount: u256 = SafeMath.div(
            SafeMath.mul(underlyingAmount, unwrapFeeRate),
            FEE_DENOMINATOR,
        );
        const netUnderlying: u256 = SafeMath.sub(underlyingAmount, feeAmount);
        const response = new BytesWriter(32);
        response.writeU256(netUnderlying);
        return response;
    }

    @method()
    @returns({ name: 'balance', type: ABIDataTypes.UINT256 })
    public underlyingBalance(_calldata: Calldata): BytesWriter {
        const response = new BytesWriter(32);
        response.writeU256(this._underlyingBalance());
        return response;
    }

    @method()
    @returns({ name: 'underlyingAmount', type: ABIDataTypes.UINT256 })
    public getUnderlyingAmount(_calldata: Calldata): BytesWriter {
        const xAmount: u256 = _calldata.readU256();
        const response = new BytesWriter(32);
        response.writeU256(this._getUnderlyingAmount(xAmount));
        return response;
    }

    // ── Fee getter views ──

    @method()
    @returns({ name: 'wrapFee', type: ABIDataTypes.UINT256 })
    public getWrapFee(_calldata: Calldata): BytesWriter {
        const response = new BytesWriter(32);
        response.writeU256(this.lu(this.fieldKeySimple(this._wrapFee)));
        return response;
    }

    @method()
    @returns({ name: 'unwrapFee', type: ABIDataTypes.UINT256 })
    public getUnwrapFee(_calldata: Calldata): BytesWriter {
        const response = new BytesWriter(32);
        response.writeU256(this.lu(this.fieldKeySimple(this._unwrapFee)));
        return response;
    }

    // ── Address getter views ──

    @method()
    @returns({ name: 'underlying', type: ABIDataTypes.ADDRESS })
    public getUnderlying(_calldata: Calldata): BytesWriter {
        const response = new BytesWriter(32);
        response.writeAddress(this.la(this.fieldKeySimple(this._underlying)));
        return response;
    }

    @method()
    @returns({ name: 'owner', type: ABIDataTypes.ADDRESS })
    public getOwner(_calldata: Calldata): BytesWriter {
        const response = new BytesWriter(32);
        response.writeAddress(this.la(this.fieldKeySimple(this._owner)));
        return response;
    }

    // ── Fee setters ──

    @method()
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    public setWrapFee(_calldata: Calldata): BytesWriter {
        this.requireOwnerOrFactory();
        const fee: u256 = _calldata.readU256();
        if (u256.gt(fee, MAX_DEPOSIT_WITHDRAW_FEE)) throw new Revert('fee too high');
        this.su(this.fieldKeySimple(this._wrapFee), fee);
        const response = new BytesWriter(1);
        response.writeBoolean(true);
        return response;
    }

    @method()
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    public setUnwrapFee(_calldata: Calldata): BytesWriter {
        this.requireOwnerOrFactory();
        const fee: u256 = _calldata.readU256();
        if (u256.gt(fee, MAX_DEPOSIT_WITHDRAW_FEE)) throw new Revert('fee too high');
        this.su(this.fieldKeySimple(this._unwrapFee), fee);
        const response = new BytesWriter(1);
        response.writeBoolean(true);
        return response;
    }

    // ── AMM pool whitelist ──

    @method()
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    public setAmmPool(_calldata: Calldata): BytesWriter {
        this.requireOwner();
        const addr: Address = _calldata.readAddress();
        this.sa(this.fieldKeySimple(this._ammPool), addr);
        const response = new BytesWriter(1);
        response.writeBoolean(true);
        return response;
    }

    @method()
    @returns({ name: 'pool', type: ABIDataTypes.ADDRESS })
    public getAmmPool(_calldata: Calldata): BytesWriter {
        const response = new BytesWriter(32);
        response.writeAddress(this.la(this.fieldKeySimple(this._ammPool)));
        return response;
    }

    // ── AMM fee setters/getters ──

    @method()
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    public setAmmBuyFee(_calldata: Calldata): BytesWriter {
        this.requireOwner();
        const fee: u256 = _calldata.readU256();
        if (u256.gt(fee, MAX_DEPOSIT_WITHDRAW_FEE)) throw new Revert('fee too high');
        this.su(this.fieldKeySimple(this._ammBuyFee), fee);
        const response = new BytesWriter(1);
        response.writeBoolean(true);
        return response;
    }

    @method()
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    public setAmmSellFee(_calldata: Calldata): BytesWriter {
        this.requireOwner();
        const fee: u256 = _calldata.readU256();
        if (u256.gt(fee, MAX_DEPOSIT_WITHDRAW_FEE)) throw new Revert('fee too high');
        this.su(this.fieldKeySimple(this._ammSellFee), fee);
        const response = new BytesWriter(1);
        response.writeBoolean(true);
        return response;
    }

    @method()
    @returns({ name: 'ammBuyFee', type: ABIDataTypes.UINT256 })
    public getAmmBuyFee(_calldata: Calldata): BytesWriter {
        const response = new BytesWriter(32);
        response.writeU256(this.lu(this.fieldKeySimple(this._ammBuyFee)));
        return response;
    }

    @method()
    @returns({ name: 'ammSellFee', type: ABIDataTypes.UINT256 })
    public getAmmSellFee(_calldata: Calldata): BytesWriter {
        const response = new BytesWriter(32);
        response.writeU256(this.lu(this.fieldKeySimple(this._ammSellFee)));
        return response;
    }

    // ── AMM fee notification ──

    @method()
    @returns({ name: 'amount', type: ABIDataTypes.UINT256 })
    public notifyAmmFee(_calldata: Calldata): BytesWriter {
        // CHECKS
        this.requireAmmPool();
        const amount: u256 = _calldata.readU256();
        if (amount == ZERO) throw new Revert('zero amount');

        // EFFECTS
        const heldKey: Uint8Array = this.fieldKeySimple(this._underlyingHeld);
        this.su(heldKey, SafeMath.add(this.lu(heldKey), amount));

        // INTERACTIONS
        const underlying: Address = this.la(this.fieldKeySimple(this._underlying));
        TransferHelper.transferFrom(underlying, Blockchain.tx.sender, Blockchain.contractAddress, amount);

        const response = new BytesWriter(32);
        response.writeU256(amount);
        return response;
    }

    // ── Reward injection ──

    @method()
    @returns({ name: 'amount', type: ABIDataTypes.UINT256 })
    public injectRewards(_calldata: Calldata): BytesWriter {
        this.requireOwner();
        const amount: u256 = _calldata.readU256();
        if (amount == ZERO) throw new Revert('zero amount');

        const heldKey = this.fieldKeySimple(this._underlyingHeld);
        this.su(heldKey, SafeMath.add(this.lu(heldKey), amount));

        const underlying: Address = this.la(this.fieldKeySimple(this._underlying));
        TransferHelper.transferFrom(underlying, Blockchain.tx.sender, Blockchain.contractAddress, amount);

        const response = new BytesWriter(32);
        response.writeU256(amount);
        return response;
    }

    // ── Lifecycle ──

    public override onDeployment(_calldata: Calldata): void {
        super.onDeployment(_calldata);

        // Read deployment params from calldata (order matters!)
        const underlying: Address = _calldata.readAddress();
        const decimals: u8 = _calldata.readU8();
        const name: string = _calldata.readStringWithLength();
        const symbol: string = _calldata.readStringWithLength();
        const wrapFee: u256 = _calldata.readU256();
        const unwrapFee: u256 = _calldata.readU256();
        const ammBuyFee: u256 = _calldata.readU256();
        const ammSellFee: u256 = _calldata.readU256();

        // Unlimited supply — minting is driven by wrap deposits
        const maxSupply: u256 = u256.Max;
        this.instantiate(new OP20InitParameters(maxSupply, decimals, name, symbol));

        // Store config
        this.sa(this.fieldKeySimple(this._underlying), underlying);
        this.sa(this.fieldKeySimple(this._owner), Blockchain.tx.sender);
        this.sa(this.fieldKeySimple(this._factoryAddr), Blockchain.tx.sender);
        this.su(this.fieldKeySimple(this._wrapFee), wrapFee);
        this.su(this.fieldKeySimple(this._unwrapFee), unwrapFee);
        this.su(this.fieldKeySimple(this._ammBuyFee), ammBuyFee);
        this.su(this.fieldKeySimple(this._ammSellFee), ammSellFee);
    }
}
