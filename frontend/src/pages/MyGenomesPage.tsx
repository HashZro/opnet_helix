import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Address } from '@btc-vision/transaction';
import { useMines } from '../hooks/useMines';
import { useWallet } from '../hooks/useWallet';
import { useGenomePoolInfo } from '../hooks/useGenomePoolInfo';
import { formatBalance, truncateAddress } from '../lib/helpers';
import { HIDDEN_GENOME_PUBKEYS } from '../config';
import { InjectRewardsModal } from '../components/InjectRewardsModal';
import { SetFeeModal } from '../components/SetFeeModal';
import { AddLiquidityModal } from '../components/AddLiquidityModal';
import { BitcoinTxBanner } from '../components/BitcoinTxBanner';
import type { MineInfo } from '../hooks/useMines';

function isZeroPool(addr: string): boolean {
    return !addr || /^0x0+$/.test(addr);
}

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
    senderAddress: Address | null;
    onRefetch?: () => void;
}

function GenomeOwnerCard({ mine, senderAddress, onRefetch }: GenomeOwnerCardProps) {
    const { address, name, symbol, underlyingBalance, totalSupply, wrapFee, unwrapFee } = mine;
    const ratio = totalSupply > 0n ? Number(underlyingBalance) / Number(totalSupply) : 1.0;
    const wrapFeePercent = (Number(wrapFee) / 10).toFixed(1);
    const unwrapFeePercent = (Number(unwrapFee) / 10).toFixed(1);
    const underlyingSymbol = mine.underlyingSymbol || (symbol.startsWith('g') ? symbol.slice(1) : symbol);
    const [copied, setCopied] = useState(false);
    const [showInjectModal, setShowInjectModal] = useState(false);
    const [injectBtnHovered, setInjectBtnHovered] = useState(false);
    const [showWrapFeeModal, setShowWrapFeeModal] = useState(false);
    const [wrapFeeBtnHovered, setWrapFeeBtnHovered] = useState(false);
    const [showUnwrapFeeModal, setShowUnwrapFeeModal] = useState(false);
    const [unwrapFeeBtnHovered, setUnwrapFeeBtnHovered] = useState(false);
    const [poolRefetchTrigger, setPoolRefetchTrigger] = useState(0);
    const [showAddLiqModal, setShowAddLiqModal] = useState(false);
    const [addLiqBtnHovered, setAddLiqBtnHovered] = useState(false);

    const poolInfo = useGenomePoolInfo(address, mine.pubkey, mine.underlyingAddress, senderAddress, poolRefetchTrigger);

    const handleCopy = () => {
        navigator.clipboard.writeText(poolInfo.poolAddress).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
    };

    return (
        <div
            style={{
                position: 'relative',
                border: '1px solid #000',
                background: '#fff',
                padding: '20px',
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                    <h3 style={{ fontFamily: 'Mulish', fontWeight: 700, fontSize: '1rem', color: '#000', marginBottom: '2px' }}>{name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'Sometype Mono', color: '#888' }}>{symbol}</span>
                        <span style={{ fontSize: '0.65rem', color: '#ccc' }}>▸</span>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'Sometype Mono', color: '#555' }}>{underlyingSymbol}</span>
                    </div>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#888', fontFamily: 'Sometype Mono', marginTop: '2px' }}>{truncateAddress(address)}</span>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '12px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888', fontSize: '0.8rem' }}>Ratio</span>
                    <span style={{ color: '#000', fontSize: '0.8rem' }}>{ratio.toFixed(6)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888', fontSize: '0.8rem' }}>Total Wrapped</span>
                    <span style={{ color: '#000', fontSize: '0.8rem' }}>{formatBalance(underlyingBalance, 18)} {underlyingSymbol}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888', fontSize: '0.8rem' }}>Wrap Fee</span>
                    <span style={{ color: '#000', fontSize: '0.8rem' }}>{wrapFeePercent}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888', fontSize: '0.8rem' }}>Unwrap Fee</span>
                    <span style={{ color: '#000', fontSize: '0.8rem' }}>{unwrapFeePercent}%</span>
                </div>
            </div>

            {/* Pool info — fixed rows so all cards stay the same height */}
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #eee' }}>
                <div style={{ fontFamily: 'Sometype Mono', fontSize: '0.65rem', color: '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Liquidity Pool
                </div>
                {poolInfo.loading ? (
                    <div style={{ background: '#eee', height: '14px', width: '60%' }} className="animate-pulse" />
                ) : (() => {
                    const noPool = isZeroPool(poolInfo.poolAddress);
                    const noLp = senderAddress && !noPool && poolInfo.lpBalance === 0n;
                    const needsLiquidity = noPool || noLp;
                    return (
                        <div style={{ position: 'relative' }}>
                            {/* Fixed rows — always rendered so height is identical across all cards */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minHeight: '20px' }}>
                                    <span style={{ fontFamily: 'Sometype Mono', fontSize: '0.7rem', color: '#555' }}>
                                        {noPool ? <span style={{ color: '#bbb' }}>—</span> : truncateAddress(poolInfo.poolAddress)}
                                    </span>
                                    {!noPool && (
                                        <button onClick={handleCopy} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Sometype Mono', fontSize: '0.65rem', color: '#aaa', padding: '0 4px' }}>
                                            {copied ? '✓' : '⎘'}
                                        </button>
                                    )}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#888', fontSize: '0.75rem' }}>Reserve A</span>
                                    <span style={{ color: '#000', fontSize: '0.75rem', fontFamily: 'Sometype Mono' }}>{noPool ? '—' : formatBalance(poolInfo.reserve0, 18)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#888', fontSize: '0.75rem' }}>Reserve B</span>
                                    <span style={{ color: '#000', fontSize: '0.75rem', fontFamily: 'Sometype Mono' }}>{noPool ? '—' : formatBalance(poolInfo.reserve1, 18)}</span>
                                </div>
                                {senderAddress && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#888', fontSize: '0.75rem' }}>LP Balance</span>
                                        <span style={{ color: '#000', fontSize: '0.75rem', fontFamily: 'Sometype Mono' }}>{noPool ? '—' : formatBalance(poolInfo.lpBalance, 18)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Overlay — sits on top of the rows above, same footprint, no layout shift */}
                            {senderAddress && needsLiquidity && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    background: '#fff',
                                    zIndex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    gap: '8px',
                                }}>
                                    <div style={{ fontFamily: 'Sometype Mono', fontSize: '0.72rem', color: '#8a6800' }}>
                                        ⚠ {noPool ? 'No liquidity pool — genome has no market yet' : 'You have no liquidity in this pool'}
                                    </div>
                                    <button
                                        onClick={() => setShowAddLiqModal(true)}
                                        onMouseEnter={() => setAddLiqBtnHovered(true)}
                                        onMouseLeave={() => setAddLiqBtnHovered(false)}
                                        style={{
                                            width: '100%',
                                            border: '1px solid #000',
                                            background: addLiqBtnHovered ? '#000' : 'transparent',
                                            color: addLiqBtnHovered ? '#fff' : '#000',
                                            padding: '8px 12px',
                                            fontFamily: 'Sometype Mono',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            transition: 'background 0.1s, color 0.1s',
                                        }}
                                    >
                                        + Add Liquidity
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>

            {/* Inject Rewards — only shown when connected */}
            {senderAddress && (
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #eee' }}>
                    <button
                        onClick={() => setShowInjectModal(true)}
                        onMouseEnter={() => setInjectBtnHovered(true)}
                        onMouseLeave={() => setInjectBtnHovered(false)}
                        style={{
                            width: '100%',
                            border: '1px solid #000',
                            background: injectBtnHovered ? '#000' : 'transparent',
                            color: injectBtnHovered ? '#fff' : '#000',
                            padding: '8px 12px',
                            fontFamily: 'Sometype Mono',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            transition: 'background 0.1s, color 0.1s',
                        }}
                    >
                        Inject LP Rewards
                    </button>
                </div>
            )}
            {showInjectModal && (
                <InjectRewardsModal
                    mine={mine}
                    onClose={() => setShowInjectModal(false)}
                    onSuccess={() => { setPoolRefetchTrigger(t => t + 1); onRefetch?.(); }}
                />
            )}
            {showAddLiqModal && (
                <AddLiquidityModal
                    mine={mine}
                    onClose={() => { setShowAddLiqModal(false); setPoolRefetchTrigger(t => t + 1); }}
                />
            )}

            {/* Set Fees — only shown when connected */}
            {senderAddress && (
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setShowWrapFeeModal(true)}
                        onMouseEnter={() => setWrapFeeBtnHovered(true)}
                        onMouseLeave={() => setWrapFeeBtnHovered(false)}
                        style={{
                            flex: 1,
                            border: '1px solid #000',
                            background: wrapFeeBtnHovered ? '#000' : 'transparent',
                            color: wrapFeeBtnHovered ? '#fff' : '#000',
                            padding: '8px 12px',
                            fontFamily: 'Sometype Mono',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            transition: 'background 0.1s, color 0.1s',
                        }}
                    >
                        Set Wrap Fee
                    </button>
                    <button
                        onClick={() => setShowUnwrapFeeModal(true)}
                        onMouseEnter={() => setUnwrapFeeBtnHovered(true)}
                        onMouseLeave={() => setUnwrapFeeBtnHovered(false)}
                        style={{
                            flex: 1,
                            border: '1px solid #000',
                            background: unwrapFeeBtnHovered ? '#000' : 'transparent',
                            color: unwrapFeeBtnHovered ? '#fff' : '#000',
                            padding: '8px 12px',
                            fontFamily: 'Sometype Mono',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            transition: 'background 0.1s, color 0.1s',
                        }}
                    >
                        Set Unwrap Fee
                    </button>
                </div>
            )}
            {showWrapFeeModal && (
                <SetFeeModal
                    mine={mine}
                    feeType="wrap"
                    onClose={() => setShowWrapFeeModal(false)}
                    onSuccess={() => onRefetch?.()}
                />
            )}
            {showUnwrapFeeModal && (
                <SetFeeModal
                    mine={mine}
                    feeType="unwrap"
                    onClose={() => setShowUnwrapFeeModal(false)}
                    onSuccess={() => onRefetch?.()}
                />
            )}

        </div>
    );
}

export function MyGenomesPage() {
    const { mines: allMines, loading, error, refetch } = useMines();
    const { identityKey, isConnected, senderAddress } = useWallet();
    const navigate = useNavigate();

    const mines = allMines
        .filter(m => !HIDDEN_GENOME_PUBKEYS.includes(m.pubkey))
        .filter(m => identityKey && m.ownerAddress.toLowerCase() === identityKey.toLowerCase());

    return (
        <div style={{ padding: '48px 0' }}>
            <BitcoinTxBanner />
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '24px' }}>
                    <p style={{ color: '#888', fontFamily: 'Sometype Mono', fontSize: '0.85rem' }}>You have not created any Genomes yet.</p>
                    <button
                        onClick={() => navigate('/create')}
                        style={{
                            border: '2px solid #000',
                            background: '#000',
                            color: '#fff',
                            padding: '16px 48px',
                            fontFamily: 'Mulish, sans-serif',
                            fontWeight: 700,
                            fontSize: '1rem',
                            cursor: 'pointer',
                            letterSpacing: '0.05em',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; (e.currentTarget as HTMLButtonElement).style.color = '#000'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#000'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
                    >
                        Create Now
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mines.map((mine) => <GenomeOwnerCard key={mine.address} mine={mine} senderAddress={senderAddress} onRefetch={refetch} />)}
                </div>
            )}
        </div>
    );
}
