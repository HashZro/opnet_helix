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

// Fee limits (basis points out of 1000)
const MAX_DEPOSIT_WITHDRAW_FEE: u256 = u256.fromU32(200);
const MAX_CONTROLLER_PROTOCOL_FEE: u256 = u256.fromU32(100);
const FEE_DENOMINATOR: u256 = u256.fromU32(1000);
const ZERO: u256 = u256.fromU32(0);

@final
export class Mine extends OP20 {
}
