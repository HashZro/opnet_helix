import {
    Blockchain,
    Calldata,
    OP20,
    OP20InitParameters,
} from '@btc-vision/btc-runtime/runtime';
import { u256 } from '@btc-vision/as-bignum/assembly';

@final
export class MinerToken extends OP20 {
    public override onDeployment(_calldata: Calldata): void {
        super.onDeployment(_calldata);

        // 1,000,000,000 MINER with 18 decimals = 10^27
        const maxSupply: u256 = u256.fromString('1000000000000000000000000000');
        const decimals: u8 = 18;
        const name: string = 'Miner';
        const symbol: string = 'MINER';

        this.instantiate(new OP20InitParameters(maxSupply, decimals, name, symbol));

        // Pre-mint 10,000,000 MINER to deployer
        const deployerAlloc: u256 = u256.fromString('10000000000000000000000000');
        this._mint(Blockchain.tx.origin, deployerAlloc);
    }

}
