import {
    Blockchain,
    BytesWriter,
    Calldata,
    OP20,
    OP20InitParameters,
} from '@btc-vision/btc-runtime/runtime';
import { u256 } from '@btc-vision/as-bignum/assembly';

@final
export class CrystalToken extends OP20 {
    public override onDeployment(_calldata: Calldata): void {
        super.onDeployment(_calldata);

        const maxSupply: u256 = u256.fromString('1000000000000000000000000000');
        const decimals: u8 = 18;
        const name: string = 'Crystal';
        const symbol: string = 'CRYS';

        this.instantiate(new OP20InitParameters(maxSupply, decimals, name, symbol));

        const deployerAlloc: u256 = u256.fromString('10000000000000000000000000');
        this._mint(Blockchain.tx.origin, deployerAlloc);
    }

    @method()
    @returns({ name: 'amount', type: ABIDataTypes.UINT256 })
    public mine(_calldata: Calldata): BytesWriter {
        const amount: u256 = u256.fromString('1000000000000000000000');
        this._mint(Blockchain.tx.sender, amount);

        const response = new BytesWriter(32);
        response.writeU256(amount);
        return response;
    }
}
