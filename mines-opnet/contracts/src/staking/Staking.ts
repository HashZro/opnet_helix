import {
    Blockchain,
    BytesWriter,
    BytesReader,
    Calldata,
    OP_NET,
    Revert,
    SafeMath,
    StoredU256,
    TransferHelper,
    Address,
} from '@btc-vision/btc-runtime/runtime';
import { u256 } from '@btc-vision/as-bignum/assembly';

const ZERO: u256 = u256.fromU32(0);
const ONE: u256 = u256.fromU32(1);
const EMPTY_SUB: Uint8Array = new Uint8Array(30);
const POINT_MULTIPLIER: u256 = u256.fromString('1000000000000000000');

@final
export class Staking extends OP_NET {
    // Storage pointers — simple fields
    private readonly _xMiner: u16 = Blockchain.nextPointer;
    private readonly _owner: u16 = Blockchain.nextPointer;

    // Per-mine pointers (keyed by mine address)
    private readonly pMineSupply: u16 = Blockchain.nextPointer;
    private readonly pMineTotalPoints: u16 = Blockchain.nextPointer;

    // Per-user-per-mine pointers (keyed by mine + user address)
    private readonly pRecordBalance: u16 = Blockchain.nextPointer;
    private readonly pRecordReward: u16 = Blockchain.nextPointer;
    private readonly pRecordLastPoints: u16 = Blockchain.nextPointer;

    public override onDeployment(_calldata: Calldata): void {
        super.onDeployment(_calldata);

        const xMiner: Address = _calldata.readAddress();

        this.sa(this.fieldKeySimple(this._xMiner), xMiner);
        this.sa(this.fieldKeySimple(this._owner), Blockchain.tx.sender);
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
    private mineKey(ptr: u16, mine: Address): Uint8Array {
        const k = new Uint8Array(32);
        k[0] = u8((ptr >> 8) & 0xff);
        k[1] = u8(ptr & 0xff);
        for (let i: i32 = 0; i < 30; i++) {
            k[i + 2] = mine[i];
        }
        return k;
    }

    @inline
    private userMineKey(ptr: u16, mine: Address, user: Address): Uint8Array {
        const k = new Uint8Array(32);
        k[0] = u8((ptr >> 8) & 0xff);
        k[1] = u8(ptr & 0xff);
        for (let i: i32 = 0; i < 15; i++) {
            k[i + 2] = mine[i];
        }
        for (let i: i32 = 0; i < 15; i++) {
            k[i + 17] = user[i];
        }
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

    // --- Rewards internals ---

    private _newRewards(mineAddr: Address, user: Address, totalPoints: u256): u256 {
        const lastPoints: u256 = this.lu(this.userMineKey(this.pRecordLastPoints, mineAddr, user));
        const points: u256 = SafeMath.sub(totalPoints, lastPoints);
        const balance: u256 = this.lu(this.userMineKey(this.pRecordBalance, mineAddr, user));
        return SafeMath.div(SafeMath.mul(points, balance), POINT_MULTIPLIER);
    }

    private _updateRewards(mineAddr: Address, user: Address, totalPoints: u256): void {
        const owing: u256 = this._newRewards(mineAddr, user, totalPoints);
        if (owing > ZERO) {
            const rewardKey: Uint8Array = this.userMineKey(this.pRecordReward, mineAddr, user);
            const current: u256 = this.lu(rewardKey);
            this.su(rewardKey, SafeMath.add(current, owing));
        }
        this.su(this.userMineKey(this.pRecordLastPoints, mineAddr, user), totalPoints);
    }
}
