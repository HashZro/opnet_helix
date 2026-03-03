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
    stakersFee: u256;
    controllerFeeAmount: u256;
    protocolFeeAmount: u256;

    constructor(
        xAmount: u256,
        stakersFee: u256,
        controllerFeeAmount: u256,
        protocolFeeAmount: u256,
    ) {
        this.xAmount = xAmount;
        this.stakersFee = stakersFee;
        this.controllerFeeAmount = controllerFeeAmount;
        this.protocolFeeAmount = protocolFeeAmount;
    }
}

// Fee limits (basis points out of 1000)
const MAX_DEPOSIT_WITHDRAW_FEE: u256 = u256.fromU32(200);
const MAX_CONTROLLER_PROTOCOL_FEE: u256 = u256.fromU32(100);
const FEE_DENOMINATOR: u256 = u256.fromU32(1000);
const ZERO: u256 = u256.fromU32(0);

@final
export class Mine extends OP20 {
    // ── Storage pointers (each gets a unique u16 via Blockchain.nextPointer) ──
    private readonly _underlying: u16 = Blockchain.nextPointer;          // Address of wrapped token
    private readonly _owner: u16 = Blockchain.nextPointer;               // Controller address
    private readonly _factoryAddr: u16 = Blockchain.nextPointer;         // Factory/deployer address
    private readonly _wrapFee: u16 = Blockchain.nextPointer;             // Wrap fee (basis points / 1000)
    private readonly _unwrapFee: u16 = Blockchain.nextPointer;           // Unwrap fee (basis points / 1000)
    private readonly _controllerFee: u16 = Blockchain.nextPointer;       // Controller fee share (basis points / 1000)
    private readonly _protocolFee: u16 = Blockchain.nextPointer;         // Protocol fee share (basis points / 1000)
    private readonly _controllerFeeAccrued: u16 = Blockchain.nextPointer; // Accumulated controller fees
    private readonly _protocolFeeAccrued: u16 = Blockchain.nextPointer;  // Accumulated protocol fees
    private readonly _underlyingHeld: u16 = Blockchain.nextPointer;      // Self-tracked underlying balance

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
        const held = this.lu(this.fieldKeySimple(this._underlyingHeld));
        const ctrlAccrued = this.lu(this.fieldKeySimple(this._controllerFeeAccrued));
        const protoAccrued = this.lu(this.fieldKeySimple(this._protocolFeeAccrued));
        return SafeMath.sub(SafeMath.sub(held, ctrlAccrued), protoAccrued);
    }

    // ── Conversion helpers ──

    private _getUnderlyingAmount(xAmount: u256): u256 {
        const supply: u256 = this._totalSupply.value;
        if (supply == ZERO) return xAmount;
        return SafeMath.div(SafeMath.mul(xAmount, this._underlyingBalance()), supply);
    }

    // ── Fee calculation ──

    // Port of Mine.sol _calcWrap (lines 479-502)
    private _calcWrap(amount: u256): WrapResult {
        const supply: u256 = this._totalSupply.value;

        if (supply == ZERO) {
            // First wrap: 1:1 ratio, no fees
            return new WrapResult(amount, ZERO, ZERO, ZERO);
        }

        // feeAmount = amount * wrapFee / 1000
        const wrapFee: u256 = this.lu(this.fieldKeySimple(this._wrapFee));
        const feeAmount: u256 = SafeMath.div(SafeMath.mul(amount, wrapFee), FEE_DENOMINATOR);

        // controllerFeeAmount = feeAmount * controllerFee / 1000
        const ctrlFeeRate: u256 = this.lu(this.fieldKeySimple(this._controllerFee));
        const controllerFeeAmount: u256 = SafeMath.div(
            SafeMath.mul(feeAmount, ctrlFeeRate),
            FEE_DENOMINATOR,
        );

        // protocolFeeAmount = feeAmount * protocolFee / 1000
        const protoFeeRate: u256 = this.lu(this.fieldKeySimple(this._protocolFee));
        const protocolFeeAmount: u256 = SafeMath.div(
            SafeMath.mul(feeAmount, protoFeeRate),
            FEE_DENOMINATOR,
        );

        // stakersFee = feeAmount - controllerFeeAmount - protocolFeeAmount
        const stakersFee: u256 = SafeMath.sub(
            SafeMath.sub(feeAmount, controllerFeeAmount),
            protocolFeeAmount,
        );

        // xAmount = totalSupply * (amount - feeAmount) / (underlyingBalance + stakersFee)
        const netAmount: u256 = SafeMath.sub(amount, feeAmount);
        const denominator: u256 = SafeMath.add(this._underlyingBalance(), stakersFee);
        const xAmount: u256 = SafeMath.div(SafeMath.mul(supply, netAmount), denominator);

        return new WrapResult(xAmount, stakersFee, controllerFeeAmount, protocolFeeAmount);
    }

    // ── Public methods ──

    @method()
    @returns({ name: 'xAmount', type: ABIDataTypes.UINT256 })
    public wrap(_calldata: Calldata): BytesWriter {
        const amount: u256 = _calldata.readU256();

        // CHECKS
        if (amount == ZERO) throw new Revert('zero amount');

        // EFFECTS — calculate fees, update accumulators
        const result: WrapResult = this._calcWrap(amount);

        const ctrlKey: Uint8Array = this.fieldKeySimple(this._controllerFeeAccrued);
        const protoKey: Uint8Array = this.fieldKeySimple(this._protocolFeeAccrued);
        this.su(ctrlKey, SafeMath.add(this.lu(ctrlKey), result.controllerFeeAmount));
        this.su(protoKey, SafeMath.add(this.lu(protoKey), result.protocolFeeAmount));

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

        // EFFECTS — convert xTokens to underlying, calculate fees, burn xTokens
        const underlyingAmount: u256 = this._getUnderlyingAmount(xAmount);

        const unwrapFeeRate: u256 = this.lu(this.fieldKeySimple(this._unwrapFee));
        const feeAmount: u256 = SafeMath.div(
            SafeMath.mul(underlyingAmount, unwrapFeeRate),
            FEE_DENOMINATOR,
        );

        // Controller/protocol portions of fee
        const ctrlFeeRate: u256 = this.lu(this.fieldKeySimple(this._controllerFee));
        const controllerFeeAmount: u256 = SafeMath.div(
            SafeMath.mul(feeAmount, ctrlFeeRate),
            FEE_DENOMINATOR,
        );

        const protoFeeRate: u256 = this.lu(this.fieldKeySimple(this._protocolFee));
        const protocolFeeAmount: u256 = SafeMath.div(
            SafeMath.mul(feeAmount, protoFeeRate),
            FEE_DENOMINATOR,
        );

        // Burn xTokens from sender
        this._burn(Blockchain.tx.sender, xAmount);

        // Update fee accumulators
        const ctrlKey: Uint8Array = this.fieldKeySimple(this._controllerFeeAccrued);
        const protoKey: Uint8Array = this.fieldKeySimple(this._protocolFeeAccrued);
        this.su(ctrlKey, SafeMath.add(this.lu(ctrlKey), controllerFeeAmount));
        this.su(protoKey, SafeMath.add(this.lu(protoKey), protocolFeeAmount));

        // Net underlying to send
        const netUnderlying: u256 = SafeMath.sub(underlyingAmount, feeAmount);

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

    @method()
    @returns({ name: 'controllerFee', type: ABIDataTypes.UINT256 })
    public getControllerFee(_calldata: Calldata): BytesWriter {
        const response = new BytesWriter(32);
        response.writeU256(this.lu(this.fieldKeySimple(this._controllerFee)));
        return response;
    }

    @method()
    @returns({ name: 'protocolFee', type: ABIDataTypes.UINT256 })
    public getProtocolFee(_calldata: Calldata): BytesWriter {
        const response = new BytesWriter(32);
        response.writeU256(this.lu(this.fieldKeySimple(this._protocolFee)));
        return response;
    }

    @method()
    @returns({ name: 'protocolFeeAccrued', type: ABIDataTypes.UINT256 })
    public getProtocolFeeAccrued(_calldata: Calldata): BytesWriter {
        const response = new BytesWriter(32);
        response.writeU256(this.lu(this.fieldKeySimple(this._protocolFeeAccrued)));
        return response;
    }

    @method()
    @returns({ name: 'controllerFeeAccrued', type: ABIDataTypes.UINT256 })
    public getControllerFeeAccrued(_calldata: Calldata): BytesWriter {
        const response = new BytesWriter(32);
        response.writeU256(this.lu(this.fieldKeySimple(this._controllerFeeAccrued)));
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
        const controllerFee: u256 = _calldata.readU256();
        const protocolFee: u256 = _calldata.readU256();

        // Unlimited supply — minting is driven by wrap deposits
        const maxSupply: u256 = u256.Max;
        this.instantiate(new OP20InitParameters(maxSupply, decimals, name, symbol));

        // Store config
        this.sa(this.fieldKeySimple(this._underlying), underlying);
        this.sa(this.fieldKeySimple(this._owner), Blockchain.tx.sender);
        this.sa(this.fieldKeySimple(this._factoryAddr), Blockchain.tx.sender);
        this.su(this.fieldKeySimple(this._wrapFee), wrapFee);
        this.su(this.fieldKeySimple(this._unwrapFee), unwrapFee);
        this.su(this.fieldKeySimple(this._controllerFee), controllerFee);
        this.su(this.fieldKeySimple(this._protocolFee), protocolFee);
    }
}
