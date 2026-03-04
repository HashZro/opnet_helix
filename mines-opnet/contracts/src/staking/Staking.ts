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
    public override onDeployment(_calldata: Calldata): void {
        super.onDeployment(_calldata);
    }
}
