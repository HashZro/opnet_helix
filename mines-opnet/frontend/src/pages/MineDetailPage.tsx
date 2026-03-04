import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useMine } from '../hooks/useMine';
import { useWallet } from '../hooks/useWallet';
import { formatBalance, truncateAddress } from '../lib/helpers';

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-lg font-semibold ${accent ?? 'text-white'}`}>{value}</p>
        </div>
    );
}

function SkeletonCard() {
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 animate-pulse">
            <div className="h-3 bg-gray-700 rounded w-1/3 mb-2" />
            <div className="h-5 bg-gray-700 rounded w-2/3" />
        </div>
    );
}

export function MineDetailPage() {
    const { address } = useParams<{ address: string }>();
    const { data: mine, loading, error } = useMine(address ?? null);
    const { isConnected } = useWallet();

    const underlyingSymbol = mine
        ? mine.symbol.startsWith('x') ? mine.symbol.slice(1) : mine.symbol
        : 'TOKEN';

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Header */}
            {loading ? (
                <div className="mb-8 animate-pulse">
                    <div className="h-8 bg-gray-700 rounded w-48 mb-2" />
                    <div className="h-4 bg-gray-800 rounded w-64" />
                </div>
            ) : mine ? (
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-1">
                        {mine.name}{' '}
                        <span className="text-gray-400 text-xl font-normal">({mine.symbol})</span>
                    </h1>
                    <p className="text-gray-500 text-sm font-mono">{truncateAddress(address ?? '')}</p>
                </div>
            ) : (
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white">Mine Detail</h1>
                    <p className="text-gray-500 text-sm font-mono">{truncateAddress(address ?? '')}</p>
                </div>
            )}

            {/* Error banner */}
            {error && (
                <div className="mb-6 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Protocol stats grid */}
            <div className="mb-8">
                <h2 className="text-sm text-gray-500 uppercase tracking-wide mb-3">Protocol Stats</h2>
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : mine ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <StatCard
                            label="Exchange Ratio"
                            value={mine.ratio.toFixed(4)}
                            accent="text-purple-400"
                        />
                        <StatCard
                            label={`Total ${underlyingSymbol} Locked`}
                            value={`${formatBalance(mine.underlyingBalance, 18)} ${underlyingSymbol}`}
                        />
                        <StatCard
                            label={`Total ${mine.symbol} Supply`}
                            value={`${formatBalance(mine.totalSupply, 18)} ${mine.symbol}`}
                        />
                        <StatCard
                            label="Wrap Fee"
                            value={`${(Number(mine.wrapFee) / 10).toFixed(1)}%`}
                            accent="text-purple-400"
                        />
                        <StatCard
                            label="Unwrap Fee"
                            value={`${(Number(mine.unwrapFee) / 10).toFixed(1)}%`}
                            accent="text-blue-400"
                        />
                        <StatCard
                            label="Controller Fee"
                            value={`${(Number(mine.controllerFee) / 10).toFixed(1)}%`}
                            accent="text-yellow-400"
                        />
                        <StatCard
                            label="Protocol Fee"
                            value={`${(Number(mine.protocolFee) / 10).toFixed(1)}%`}
                            accent="text-orange-400"
                        />
                        <StatCard
                            label="Underlying Token"
                            value={truncateAddress(mine.underlyingAddress)}
                        />
                        <StatCard
                            label="Owner"
                            value={truncateAddress(mine.ownerAddress)}
                        />
                    </div>
                ) : null}
            </div>

            {/* User balances — only when wallet connected */}
            {isConnected && (
                <div className="mb-8">
                    <h2 className="text-sm text-gray-500 uppercase tracking-wide mb-3">Your Position</h2>
                    {loading ? (
                        <div className="grid grid-cols-2 gap-3">
                            <SkeletonCard />
                            <SkeletonCard />
                        </div>
                    ) : mine ? (
                        <div className="grid grid-cols-2 gap-3">
                            <StatCard
                                label={`Your ${mine.symbol} Balance`}
                                value={
                                    mine.userXBalance !== null
                                        ? `${formatBalance(mine.userXBalance, 18)} ${mine.symbol}`
                                        : '—'
                                }
                                accent="text-green-400"
                            />
                            <StatCard
                                label={`Underlying Value (${underlyingSymbol})`}
                                value={
                                    mine.userUnderlyingValue !== null
                                        ? `${formatBalance(mine.userUnderlyingValue, 18)} ${underlyingSymbol}`
                                        : '—'
                                }
                                accent="text-green-300"
                            />
                        </div>
                    ) : null}
                </div>
            )}

            {/* Action buttons */}
            {mine && (
                <div className="flex gap-4">
                    <Link
                        to={`/wrap/${address}`}
                        className="flex-1 text-center py-3 px-6 rounded-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white transition-all duration-200"
                    >
                        Wrap {underlyingSymbol} → {mine.symbol}
                    </Link>
                    <Link
                        to={`/unwrap/${address}`}
                        className="flex-1 text-center py-3 px-6 rounded-lg font-semibold bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white transition-all duration-200"
                    >
                        Unwrap {mine.symbol} → {underlyingSymbol}
                    </Link>
                </div>
            )}
        </div>
    );
}
