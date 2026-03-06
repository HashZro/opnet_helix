import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMines } from '../hooks/useMines';
import type { MineInfo } from '../hooks/useMines';
import { MineCard } from '../components/MineCard';
import { HIDDEN_MINE_PUBKEYS } from '../config';
import { formatBalance } from '../lib/helpers';

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

function CreateBtn() {
    const navigate = useNavigate();
    const [hovered, setHovered] = useState(false);
    return (
        <button
            onClick={() => navigate('/create')}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                border: '1px solid #000',
                background: hovered ? '#000' : '#fff',
                color: hovered ? '#fff' : '#000',
                padding: '8px 18px',
                fontFamily: 'Sometype Mono',
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'background 0.1s, color 0.1s',
                whiteSpace: 'nowrap',
            }}
        >
            + Create
        </button>
    );
}

const STAT_LABEL: React.CSSProperties = {
    fontSize: '0.6rem',
    color: '#888',
    fontFamily: 'Sometype Mono',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '6px',
};

const STAT_VALUE: React.CSSProperties = {
    fontSize: '1rem',
    fontFamily: 'Sometype Mono',
    fontWeight: 700,
    color: '#000',
    wordBreak: 'break-all',
    lineHeight: 1.2,
};

function StatCell({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ padding: '14px 18px', borderRight: '1px solid #000', borderBottom: '1px solid #000' }}>
            <div style={STAT_LABEL}>{label}</div>
            <div style={STAT_VALUE}>{value}</div>
        </div>
    );
}

function StatSkeleton() {
    return (
        <div style={{ padding: '14px 18px', borderRight: '1px solid #000', borderBottom: '1px solid #000' }}>
            <div style={{ background: '#eee', height: '9px', width: '55%', marginBottom: '8px' }} />
            <div style={{ background: '#eee', height: '18px', width: '75%' }} />
        </div>
    );
}

function ProtocolStats({ mines, loading }: { mines: MineInfo[]; loading: boolean }) {
    const SECTION_LABEL: React.CSSProperties = {
        fontSize: '0.65rem',
        color: '#888',
        fontFamily: 'Sometype Mono',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        marginBottom: '12px',
    };

    const grid = (children: React.ReactNode) => (
        <div style={{ marginBottom: '32px' }}>
            <div style={SECTION_LABEL}>Protocol Stats</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', border: '1px solid #000' }}>
                {children}
            </div>
        </div>
    );

    if (loading) {
        return grid(
            <>{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(i => <StatSkeleton key={i} />)}</>
        );
    }

    if (mines.length === 0) return null;

    const ratios = mines.map(m =>
        m.totalSupply > 0n ? Number(m.underlyingBalance) / Number(m.totalSupply) : 1.0
    );
    const totalWrapped = mines.reduce((acc, m) => acc + m.underlyingBalance, 0n);
    const totalXSupply = mines.reduce((acc, m) => acc + m.totalSupply, 0n);
    const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    const highestRatio = Math.max(...ratios);
    const lowestRatio = Math.min(...ratios);
    const avgWrapFee = mines.reduce((acc, m) => acc + Number(m.wrapFee), 0) / mines.length / 10;
    const avgUnwrapFee = mines.reduce((acc, m) => acc + Number(m.unwrapFee), 0) / mines.length / 10;
    const lowestWrapFee = Math.min(...mines.map(m => Number(m.wrapFee))) / 10;
    const lowestUnwrapFee = Math.min(...mines.map(m => Number(m.unwrapFee))) / 10;
    const uniqueUnderlying = new Set(mines.map(m => m.underlyingAddress).filter(Boolean)).size;
    const highestTVLMine = mines.reduce((best, m) =>
        m.underlyingBalance > best.underlyingBalance ? m : best, mines[0]
    );
    const mostMintedMine = mines.reduce((best, m) =>
        m.totalSupply > best.totalSupply ? m : best, mines[0]
    );
    const highestRatioMine = mines[ratios.indexOf(highestRatio)];

    return grid(
        <>
            <StatCell label="Total Genomes" value={String(mines.length)} />
            <StatCell label="Unique Tokens" value={String(uniqueUnderlying)} />
            <StatCell label="Total Deposited" value={formatBalance(totalWrapped, 18)} />
            <StatCell label="Total xToken Supply" value={formatBalance(totalXSupply, 18)} />
            <StatCell label="Avg Ratio" value={avgRatio.toFixed(6)} />
            <StatCell label="Highest Ratio" value={`${highestRatio.toFixed(6)}`} />
            <StatCell label="Best Ratio Genome" value={highestRatioMine.symbol} />
            <StatCell label="Lowest Ratio" value={lowestRatio.toFixed(6)} />
            <StatCell label="Avg Wrap Fee" value={`${avgWrapFee.toFixed(1)}%`} />
            <StatCell label="Avg Unwrap Fee" value={`${avgUnwrapFee.toFixed(1)}%`} />
            <StatCell label="Min Wrap Fee" value={`${lowestWrapFee.toFixed(1)}%`} />
            <StatCell label="Min Unwrap Fee" value={`${lowestUnwrapFee.toFixed(1)}%`} />
            <StatCell label="Highest TVL" value={highestTVLMine.symbol} />
            <StatCell label="Most Minted" value={mostMintedMine.symbol} />
        </>
    );
}

export function HomePage() {
    const { mines: allMines, loading, error } = useMines();
    const mines = allMines.filter(m => !HIDDEN_MINE_PUBKEYS.includes(m.pubkey));

    return (
        <div style={{ padding: '48px 0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'Mulish', fontWeight: 700, fontSize: '1.5rem', color: '#000', lineHeight: 1.1 }}>
                        <span style={{ fontFamily: 'Sometype Mono', fontSize: '1rem', fontWeight: 400 }}>&#8801;</span>Helix <strong>Genomes</strong>
                    </h1>
                    <p style={{ fontFamily: 'Sometype Mono', fontSize: '0.8rem', color: '#888', marginTop: '8px' }}>Wrap OP-20 tokens into yield-bearing xTokens on Bitcoin L1.</p>
                </div>
                <CreateBtn />
            </div>

            {error && (
                <div style={{ border: '1px solid #000', padding: '16px', marginBottom: '24px', fontFamily: 'Sometype Mono', fontSize: '0.8rem', color: '#000' }}>
                    [!] {error}
                </div>
            )}

            <div style={{ backgroundImage: 'repeating-linear-gradient(to right, #000 0px, #000 1px, transparent 1px, transparent 6px)', height: '16px', width: '100%', margin: '32px 0' }} />

            <ProtocolStats mines={mines} loading={loading} />

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
                </div>
            ) : mines.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#888', fontFamily: 'Sometype Mono' }}>
                    <p>No genomes found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mines.map((mine) => <MineCard key={mine.address} mine={mine} />)}
                </div>
            )}
        </div>
    );
}
