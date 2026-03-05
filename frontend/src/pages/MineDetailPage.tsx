import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMine } from '../hooks/useMine';
import { useWallet } from '../hooks/useWallet';
import { formatBalance } from '../lib/helpers';
import { WrapModal } from '../components/WrapModal';
import { UnwrapModal } from '../components/UnwrapModal';
import { AddLiquidityModal } from '../components/AddLiquidityModal';
import type { MineInfo } from '../hooks/useMines';

const SECTION_LABEL: React.CSSProperties = {
    fontSize: '0.65rem',
    color: '#888',
    fontFamily: 'Sometype Mono',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    marginBottom: '12px',
};

function BalanceCard({ label, amount, symbol, loading }: { label: string; amount: bigint | null; symbol: string; loading: boolean }) {
    return (
        <div style={{ flex: 1, border: '1px solid #000', padding: '20px 24px' }}>
            <div style={SECTION_LABEL}>{label}</div>
            {loading ? (
                <div style={{ background: '#eee', height: '36px', marginBottom: '6px' }} />
            ) : (
                <div style={{ fontFamily: 'Sometype Mono', fontSize: '2rem', fontWeight: 700, color: '#000', lineHeight: 1.1, wordBreak: 'break-all' }}>
                    {amount !== null ? formatBalance(amount, 18) : '—'}
                </div>
            )}
            <div style={{ fontFamily: 'Sometype Mono', fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>{symbol}</div>
        </div>
    );
}

function TokenCard({ label, symbol, address, pubkey, loading }: { label: string; symbol: string; address: string; pubkey: string; loading: boolean }) {
    const opscanUrl = pubkey ? `https://opscan.org/tokens/${pubkey}?network=op_testnet` : null;
    const [linkHovered, setLinkHovered] = useState(false);
    const [copied, setCopied] = useState(false);

    function handleCopy() {
        if (!address) return;
        navigator.clipboard.writeText(address).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    }

    return (
        <div style={{ flex: 1, border: '1px solid #000', padding: '16px 20px' }}>
            <div style={SECTION_LABEL}>{label}</div>
            {loading ? (
                <>
                    <div style={{ background: '#eee', height: '20px', marginBottom: '8px' }} />
                    <div style={{ background: '#eee', height: '14px', width: '70%' }} />
                </>
            ) : (
                <>
                    <div style={{ fontFamily: 'Mulish', fontWeight: 700, fontSize: '1.1rem', color: '#000', marginBottom: '8px' }}>{symbol}</div>
                    <div
                        onClick={handleCopy}
                        title="Click to copy"
                        style={{ position: 'relative', fontFamily: 'Sometype Mono', fontSize: '0.7rem', wordBreak: 'break-all', marginBottom: '10px', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'flex-start', gap: '5px' }}
                    >
                        <span style={{ color: '#555' }}>{address}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" style={{ flexShrink: 0, marginTop: '1px' }}>
                            <rect x="9" y="9" width="13" height="13" rx="0" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        {copied && (
                            <span style={{ position: 'absolute', inset: 0, background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                                ✓ Copied
                            </span>
                        )}
                    </div>
                    {opscanUrl && (
                        <a
                            href={opscanUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onMouseEnter={() => setLinkHovered(true)}
                            onMouseLeave={() => setLinkHovered(false)}
                            style={{
                                display: 'inline-block',
                                fontFamily: 'Sometype Mono',
                                fontSize: '0.7rem',
                                color: linkHovered ? '#fff' : '#000',
                                background: linkHovered ? '#000' : 'transparent',
                                border: '1px solid #000',
                                padding: '3px 8px',
                                textDecoration: 'none',
                            }}
                        >
                            View on OpScan ↗
                        </a>
                    )}
                </>
            )}
        </div>
    );
}

function ActionBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
    const [hovered, setHovered] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                flex: 1,
                border: '1px solid #000',
                background: hovered ? '#fff' : '#000',
                color: hovered ? '#000' : '#fff',
                padding: '12px',
                fontFamily: 'Sometype Mono',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'background 0.1s, color 0.1s',
            }}
        >
            {children}
        </button>
    );
}

export function MineDetailPage() {
    const { address } = useParams<{ address: string }>();
    const { data: mine, loading, error } = useMine(address ?? null);
    const { isConnected } = useWallet();
    const [showWrap, setShowWrap] = useState(false);
    const [showUnwrap, setShowUnwrap] = useState(false);
    const [showAddLiquidity, setShowAddLiquidity] = useState(false);

    const underlyingSymbol = mine?.underlyingSymbol || (mine
        ? (mine.symbol.startsWith('x') ? mine.symbol.slice(1) : mine.symbol)
        : 'TOKEN');

    // Cast MineData → MineInfo shape for modals (fields are compatible)
    const mineAsInfo = mine as unknown as MineInfo;

    const divider = (
        <div style={{ backgroundImage: 'repeating-linear-gradient(to right, #000 0px, #000 1px, transparent 1px, transparent 6px)', height: '12px', width: '100%', margin: '28px 0' }} />
    );

    return (
        <div style={{ padding: '48px 0', maxWidth: '860px' }}>
            {/* Back + header */}
            <div style={{ marginBottom: '28px' }}>
                <Link
                    to="/"
                    style={{ fontFamily: 'Sometype Mono', fontSize: '0.75rem', color: '#888', textDecoration: 'none', display: 'inline-block', marginBottom: '12px' }}
                >
                    ← Back
                </Link>
                {loading ? (
                    <div style={{ background: '#eee', height: '28px', width: '50%' }} />
                ) : (
                    <h1 style={{ fontFamily: 'Mulish', fontWeight: 700, fontSize: '1.5rem', color: '#000', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontFamily: 'Sometype Mono', fontWeight: 400, fontSize: '1rem' }}>|||</span>
                        {mine ? mine.name : 'Mine Detail'}
                        {mine && <span style={{ fontFamily: 'Sometype Mono', fontWeight: 400, fontSize: '0.9rem', color: '#888' }}>{mine.symbol}</span>}
                    </h1>
                )}
            </div>

            {/* Error */}
            {error && (
                <div style={{ border: '1px solid #000', padding: '10px 14px', marginBottom: '24px', fontFamily: 'Sometype Mono', fontSize: '0.8rem' }}>
                    [!] {error}
                </div>
            )}

            {/* Token address cards */}
            <div style={SECTION_LABEL}>Tokens</div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
                <TokenCard
                    label="xToken"
                    symbol={mine?.symbol ?? '—'}
                    address={address ?? ''}
                    pubkey={mine?.pubkey ?? ''}
                    loading={loading}
                />
                <TokenCard
                    label="Underlying"
                    symbol={mine?.underlyingName ? `${mine.underlyingName} (${underlyingSymbol})` : underlyingSymbol}
                    address={mine?.underlyingAddress ?? ''}
                    pubkey={mine?.underlyingPubkey ?? ''}
                    loading={loading}
                />
            </div>

            {divider}

            {/* User balances + actions — only when wallet connected */}
            {isConnected && (
                <>
                    <div style={SECTION_LABEL}>Your Balances</div>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                        <BalanceCard
                            label={`${mine?.symbol ?? 'xToken'} Balance`}
                            amount={mine?.userXBalance ?? null}
                            symbol={mine?.symbol ?? ''}
                            loading={loading}
                        />
                        <BalanceCard
                            label={`${underlyingSymbol} Wallet Balance`}
                            amount={mine?.userUnderlyingBalance ?? null}
                            symbol={underlyingSymbol}
                            loading={loading}
                        />
                        <BalanceCard
                            label="Underlying Value of xTokens"
                            amount={mine?.userUnderlyingValue ?? null}
                            symbol={underlyingSymbol}
                            loading={loading}
                        />
                    </div>
                    {mine && (
                        <>
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                <ActionBtn onClick={() => setShowWrap(true)}>
                                    Wrap {underlyingSymbol} → {mine.symbol}
                                </ActionBtn>
                                <ActionBtn onClick={() => setShowUnwrap(true)}>
                                    Unwrap {mine.symbol} → {underlyingSymbol}
                                </ActionBtn>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '28px' }}>
                                <ActionBtn onClick={() => setShowAddLiquidity(true)}>
                                    + Add Liquidity on MotoSwap
                                </ActionBtn>
                            </div>
                        </>
                    )}
                    {divider}
                </>
            )}

            {/* Protocol stats */}
            <div style={SECTION_LABEL}>Protocol</div>
            {loading ? (
                <div style={{ marginBottom: '28px' }}>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} style={{ background: '#eee', height: '38px', marginBottom: '4px' }} />
                    ))}
                </div>
            ) : mine ? (
                <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #000', marginBottom: '28px' }}>
                    <tbody>
                        {[
                            ['Ratio', mine.ratio.toFixed(6)],
                            ['Total Wrapped', `${formatBalance(mine.underlyingBalance, 18)} ${underlyingSymbol}`],
                            ['xToken Supply', `${formatBalance(mine.totalSupply, 18)} ${mine.symbol}`],
                            ['Wrap Fee', `${(Number(mine.wrapFee) / 10).toFixed(1)}%`],
                            ['Unwrap Fee', `${(Number(mine.unwrapFee) / 10).toFixed(1)}%`],
                        ].map(([k, v]) => (
                            <tr key={k}>
                                <td style={{ border: '1px solid #000', padding: '10px 14px', fontSize: '0.8rem', fontFamily: 'Sometype Mono', color: '#888', width: '40%' }}>{k}</td>
                                <td style={{ border: '1px solid #000', padding: '10px 14px', fontSize: '0.8rem', fontFamily: 'Sometype Mono', color: '#000' }}>{v}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : null}

            {showWrap && mineAsInfo && (
                <WrapModal mine={mineAsInfo} onClose={() => setShowWrap(false)} />
            )}
            {showUnwrap && mineAsInfo && (
                <UnwrapModal
                    mine={mineAsInfo}
                    onClose={() => setShowUnwrap(false)}
                    onOpenWrap={() => { setShowUnwrap(false); setShowWrap(true); }}
                />
            )}
            {showAddLiquidity && mineAsInfo && (
                <AddLiquidityModal mine={mineAsInfo} onClose={() => setShowAddLiquidity(false)} />
            )}
        </div>
    );
}
