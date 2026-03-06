import { useState } from 'react';
import { useMines } from '../hooks/useMines';
import { useWallet } from '../hooks/useWallet';
import { formatBalance, truncateAddress } from '../lib/helpers';
import { HIDDEN_MINE_PUBKEYS } from '../config';
import type { MineInfo } from '../hooks/useMines';

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

interface GenomeOwnerCardProps {
    mine: MineInfo;
}

function GenomeOwnerCard({ mine }: GenomeOwnerCardProps) {
    const { address, name, symbol, underlyingBalance, totalSupply, wrapFee, unwrapFee } = mine;
    const ratio = totalSupply > 0n ? Number(underlyingBalance) / Number(totalSupply) : 1.0;
    const wrapFeePercent = (Number(wrapFee) / 10).toFixed(1);
    const unwrapFeePercent = (Number(unwrapFee) / 10).toFixed(1);
    const underlyingSymbol = mine.underlyingSymbol || (symbol.startsWith('g') ? symbol.slice(1) : symbol);
    const [hovered, setHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                position: 'relative',
                border: '1px solid #000',
                background: hovered ? '#000' : '#fff',
                padding: '20px',
                transition: 'background 0s',
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                    <h3 style={{ fontFamily: 'Mulish', fontWeight: 700, fontSize: '1rem', color: hovered ? '#fff' : '#000', marginBottom: '2px' }}>{name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'Sometype Mono', color: hovered ? '#aaa' : '#888' }}>{symbol}</span>
                        <span style={{ fontSize: '0.65rem', color: hovered ? '#666' : '#ccc' }}>▸</span>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'Sometype Mono', color: hovered ? '#bbb' : '#555' }}>{underlyingSymbol}</span>
                    </div>
                </div>
                <span style={{ fontSize: '0.7rem', color: hovered ? '#aaa' : '#888', fontFamily: 'Sometype Mono', marginTop: '2px' }}>{truncateAddress(address)}</span>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '12px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: hovered ? '#aaa' : '#888', fontSize: '0.8rem' }}>Ratio</span>
                    <span style={{ color: hovered ? '#fff' : '#000', fontSize: '0.8rem' }}>{ratio.toFixed(6)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: hovered ? '#aaa' : '#888', fontSize: '0.8rem' }}>Total Wrapped</span>
                    <span style={{ color: hovered ? '#fff' : '#000', fontSize: '0.8rem' }}>{formatBalance(underlyingBalance, 18)} {underlyingSymbol}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: hovered ? '#aaa' : '#888', fontSize: '0.8rem' }}>Wrap Fee</span>
                    <span style={{ color: hovered ? '#fff' : '#000', fontSize: '0.8rem' }}>{wrapFeePercent}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: hovered ? '#aaa' : '#888', fontSize: '0.8rem' }}>Unwrap Fee</span>
                    <span style={{ color: hovered ? '#fff' : '#000', fontSize: '0.8rem' }}>{unwrapFeePercent}%</span>
                </div>
            </div>

            {/* Pool info placeholder */}
            <div style={{
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: `1px solid ${hovered ? '#333' : '#eee'}`,
            }}>
                <span style={{ fontFamily: 'Sometype Mono', fontSize: '0.7rem', color: hovered ? '#666' : '#aaa', letterSpacing: '0.05em' }}>
                    Loading pool...
                </span>
            </div>
        </div>
    );
}

export function MyGenomesPage() {
    const { mines: allMines, loading, error } = useMines();
    const { identityKey, isConnected } = useWallet();

    const mines = allMines
        .filter(m => !HIDDEN_MINE_PUBKEYS.includes(m.pubkey))
        .filter(m => identityKey && m.ownerAddress.toLowerCase() === identityKey.toLowerCase());

    return (
        <div style={{ padding: '48px 0' }}>
            <div style={{ marginBottom: '16px' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'Mulish', fontWeight: 700, fontSize: '1.5rem', color: '#000', lineHeight: 1.1 }}>
                    <span style={{ fontFamily: 'Sometype Mono', fontSize: '1rem', fontWeight: 400 }}>&#8801;</span>My <strong>Genomes</strong>
                </h1>
                <p style={{ fontFamily: 'Sometype Mono', fontSize: '0.8rem', color: '#888', marginTop: '8px' }}>Genomes you have deployed.</p>
            </div>

            {error && (
                <div style={{ border: '1px solid #000', padding: '16px', marginBottom: '24px', fontFamily: 'Sometype Mono', fontSize: '0.8rem', color: '#000' }}>
                    [!] {error}
                </div>
            )}

            <div style={{ backgroundImage: 'repeating-linear-gradient(to right, #000 0px, #000 1px, transparent 1px, transparent 6px)', height: '16px', width: '100%', margin: '32px 0' }} />

            {!isConnected ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#888', fontFamily: 'Sometype Mono' }}>
                    <p>Connect your wallet to see your Genomes.</p>
                </div>
            ) : loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
                </div>
            ) : mines.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#888', fontFamily: 'Sometype Mono' }}>
                    <p>You have not created any Genomes yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mines.map((mine) => <GenomeOwnerCard key={mine.address} mine={mine} />)}
                </div>
            )}
        </div>
    );
}
