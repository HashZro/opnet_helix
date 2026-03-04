import { useMines } from '../hooks/useMines';
import { MineCard } from '../components/MineCard';

function SkeletonCard() {
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <div className="h-5 w-24 bg-gray-800 rounded mb-2" />
                    <div className="h-4 w-16 bg-gray-800 rounded" />
                </div>
                <div className="h-4 w-20 bg-gray-800 rounded" />
            </div>
            <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex justify-between">
                        <div className="h-4 w-28 bg-gray-800 rounded" />
                        <div className="h-4 w-16 bg-gray-800 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function HomePage() {
    const { mines, loading, error } = useMines();

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Mines</h1>
                <p className="text-gray-400">Wrap OP_20 tokens into yield-bearing xTokens on Bitcoin L1.</p>
            </div>

            {error && (
                <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-4 mb-6">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            ) : mines.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                    <p className="text-xl">No mines found</p>
                    <p className="text-sm mt-2">No mines have been registered yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mines.map((mine) => {
                        const ratio =
                            mine.totalSupply > BigInt(0)
                                ? Number(mine.underlyingBalance) / Number(mine.totalSupply)
                                : 1.0;
                        return (
                            <MineCard
                                key={mine.address}
                                address={mine.address}
                                name={mine.name}
                                symbol={mine.symbol}
                                ratio={ratio}
                                wrapFee={mine.wrapFee}
                                unwrapFee={mine.unwrapFee}
                                underlyingBalance={mine.underlyingBalance}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
