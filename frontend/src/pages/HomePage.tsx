import { useMines } from '../hooks/useMines';
import { MineCard } from '../components/MineCard';

function SkeletonCard() {
    return (
        <div style={{ border: '1px solid #eee', background: '#fff', padding: '20px' }} className="animate-pulse">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <div style={{ background: '#eee', height: '20px', marginBottom: '8px', borderRadius: 0 }} className="w-24" />
                    <div style={{ background: '#eee', height: '16px', borderRadius: 0 }} className="w-16" />
                </div>
                <div style={{ background: '#eee', height: '16px', borderRadius: 0 }} className="w-20" />
            </div>
            <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex justify-between">
                        <div style={{ background: '#eee', height: '16px', borderRadius: 0 }} className="w-28" />
                        <div style={{ background: '#eee', height: '16px', borderRadius: 0 }} className="w-16" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function HomePage() {
    const { mines, loading, error } = useMines();

    return (
        <div style={{ padding: '48px 0' }}>
            <div style={{ marginBottom: '16px' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'Mulish', fontWeight: 700, fontSize: '1.5rem', color: '#000', lineHeight: 1.1 }}>
                    <span style={{ fontFamily: 'Sometype Mono', fontSize: '1rem', fontWeight: 400 }}>&#8801;</span>Helix <strong>Genomes</strong>
                </h1>
                <p style={{ fontFamily: 'Sometype Mono', fontSize: '0.8rem', color: '#888', marginTop: '8px' }}>Wrap OP-20 tokens into yield-bearing xTokens on Bitcoin L1.</p>
            </div>

            {error && (
                <div style={{ border: '1px solid #000', padding: '16px', marginBottom: '24px', fontFamily: 'Sometype Mono', fontSize: '0.8rem', color: '#000' }}>
                    [!] {error}
                </div>
            )}

            <div style={{ backgroundImage: 'repeating-linear-gradient(to right, #000 0px, #000 1px, transparent 1px, transparent 6px)', height: '16px', width: '100%', margin: '32px 0' }} />

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            ) : mines.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#888', fontFamily: 'Sometype Mono' }}>
                    <p>No mines found</p>
                    <p style={{ marginTop: '8px', fontSize: '0.85rem' }}>No mines have been registered yet.</p>
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
