import { Link } from 'react-router-dom';
import { formatBalance, truncateAddress } from '../lib/helpers';

export interface MineCardProps {
    address: string;
    name: string;
    symbol: string;
    ratio: number;
    wrapFee: bigint;
    unwrapFee: bigint;
    underlyingBalance: bigint;
}

export function MineCard({ address, name, symbol, ratio, wrapFee, unwrapFee, underlyingBalance }: MineCardProps) {
    const wrapFeePercent = (Number(wrapFee) / 10).toFixed(1);
    const unwrapFeePercent = (Number(unwrapFee) / 10).toFixed(1);

    return (
        <Link
            to={`/mine/${address}`}
            className="block bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 hover:bg-gray-800 transition-colors duration-200 cursor-pointer"
        >
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-white">{name}</h3>
                    <span className="text-sm text-gray-400">{symbol}</span>
                </div>
                <span className="text-xs text-gray-500 font-mono">{truncateAddress(address)}</span>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Ratio</span>
                    <span className="text-white font-mono">{ratio.toFixed(4)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Underlying Balance</span>
                    <span className="text-white font-mono">{formatBalance(underlyingBalance, 18)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Wrap Fee</span>
                    <span className="text-purple-400">{wrapFeePercent}%</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Unwrap Fee</span>
                    <span className="text-blue-400">{unwrapFeePercent}%</span>
                </div>
            </div>
        </Link>
    );
}
