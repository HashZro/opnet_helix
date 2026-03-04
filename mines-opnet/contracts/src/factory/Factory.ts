import {
    Blockchain,
    BytesWriter,
    BytesReader,
    Calldata,
    OP_NET,
    Revert,
    SafeMath,
    StoredU256,
    Address,
} from '@btc-vision/btc-runtime/runtime';
import { u256 } from '@btc-vision/as-bignum/assembly';

const ZERO: u256 = u256.fromU32(0);
const ONE: u256 = u256.fromU32(1);
const EMPTY_SUB: Uint8Array = new Uint8Array(30);

@final
export class Factory extends OP_NET {
    // Storage pointers
    private readonly _owner: u16 = Blockchain.nextPointer;
    private readonly _mineCount: StoredU256 = new StoredU256(Blockchain.nextPointer, EMPTY_SUB);
    private readonly pMineByUnderlying: u16 = Blockchain.nextPointer;
    private readonly pMineByIndex: u16 = Blockchain.nextPointer;
    private readonly pUnderlyingByMine: u16 = Blockchain.nextPointer;

    public override onDeployment(_calldata: Calldata): void {
        super.onDeployment(_calldata);
        this.sa(this.fieldKeySimple(this._owner), Blockchain.tx.sender);
    }

    private requireOwner(): void {
        const owner = this.la(this.fieldKeySimple(this._owner));
        if (Blockchain.tx.sender != owner) throw new Revert('not owner');
    }

    @method()
    @returns({ name: 'count', type: ABIDataTypes.UINT256 })
    public registerMine(_calldata: Calldata): BytesWriter {
        this.requireOwner();

        const underlying: Address = _calldata.readAddress();
        const mineAddress: Address = _calldata.readAddress();

        // Store underlying -> mine mapping
        this.sa(this.addrKey(this.pMineByUnderlying, underlying), mineAddress);

        // Store mine -> underlying reverse mapping
        this.sa(this.addrKey(this.pUnderlyingByMine, mineAddress), underlying);

        // Store mine at current index
        const count: u256 = this._mineCount.value;
        this.sa(this.idxKey(this.pMineByIndex, count), mineAddress);

        // Increment mine count
        const newCount: u256 = SafeMath.add(count, ONE);
        this._mineCount.value = newCount;

        const response = new BytesWriter(32);
        response.writeU256(newCount);
        return response;
    }

    @method()
    @returns({ name: 'mineAddress', type: ABIDataTypes.ADDRESS })
    public getMineAddress(_calldata: Calldata): BytesWriter {
        const underlying: Address = _calldata.readAddress();
        const mine: Address = this.la(this.addrKey(this.pMineByUnderlying, underlying));
        const response = new BytesWriter(32);
        response.writeAddress(mine);
        return response;
    }

    @method()
    @returns({ name: 'count', type: ABIDataTypes.UINT256 })
    public getMineCount(_calldata: Calldata): BytesWriter {
        const response = new BytesWriter(32);
        response.writeU256(this._mineCount.value);
        return response;
    }

    @method()
    @returns({ name: 'mineAddress', type: ABIDataTypes.ADDRESS })
    public getMineAtIndex(_calldata: Calldata): BytesWriter {
        const idx: u256 = _calldata.readU256();
        const count: u256 = this._mineCount.value;
        if (!u256.lt(idx, count)) throw new Revert('index out of bounds');
        const mine: Address = this.la(this.idxKey(this.pMineByIndex, idx));
        const response = new BytesWriter(32);
        response.writeAddress(mine);
        return response;
    }

    // --- Storage key helpers ---

    @inline
    private fieldKeySimple(ptr: u16): Uint8Array {
        const k = new Uint8Array(32);
        k[0] = u8((ptr >> 8) & 0xff);
        k[1] = u8(ptr & 0xff);
        return k;
    }

    @inline
    private addrKey(ptr: u16, addr: Address): Uint8Array {
        const k = new Uint8Array(32);
        k[0] = u8((ptr >> 8) & 0xff);
        k[1] = u8(ptr & 0xff);
        const raw = addr.toBytes();
        for (let i: i32 = 0; i < 30; i++) {
            k[i + 2] = i < raw.length ? raw[i] : 0;
        }
        return k;
    }

    @inline
    private idxKey(ptr: u16, idx: u256): Uint8Array {
        const k = new Uint8Array(32);
        k[0] = u8((ptr >> 8) & 0xff);
        k[1] = u8(ptr & 0xff);
        const idVal: u32 = u32(idx.lo1);
        k[28] = u8((idVal >> 24) & 0xff);
        k[29] = u8((idVal >> 16) & 0xff);
        k[30] = u8((idVal >> 8) & 0xff);
        k[31] = u8(idVal & 0xff);
        return k;
    }

    // --- Raw storage read/write ---

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
}
