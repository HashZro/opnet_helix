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
}
