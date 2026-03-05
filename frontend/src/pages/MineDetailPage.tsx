import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useMine } from '../hooks/useMine';
import { useWallet } from '../hooks/useWallet';
import { formatBalance, truncateAddress } from '../lib/helpers';

function ActionLink({ to, children }: { to: string; children: React.ReactNode }) {
    const [hovered, setHovered] = useState(false);
    return (
        <Link
            to={to}
            style={{
                flex: 1,
                border: '1px solid #000',
                background: hovered ? '#000' : '#fff',
                color: hovered ? '#fff' : '#000',
                padding: '10px',
                fontFamily: 'Sometype Mono',
                fontSize: '0.8rem',
                textAlign: 'center',
                textDecoration: 'none',
                display: 'block',
                cursor: 'pointer',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {children}
        </Link>
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
        <div style={{ padding: '48px 0' }}>
            {/* Header */}
            {loading ? (
                <div style={{ marginBottom: '32px' }}>
                    <div style={{ background: '#eee', height: '28px', marginBottom: '8px' }} />
                    <div style={{ background: '#eee', height: '16px', width: '60%' }} />
                </div>
            ) : (
                <h1 style={{
                    fontFamily: 'Mulish',
                    fontWeight: 700,
                    fontSize: '1.5rem',
                    color: '#000',
                    marginBottom: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                }}>
                    <span style={{ fontFamily: 'Sometype Mono', fontWeight: 400 }}>|||</span>
                    {mine ? `${mine.name} (${mine.symbol})` : 'Mine Detail'}
                </h1>
            )}

            {/* Error banner */}
            {error && (
                <div style={{
                    border: '1px solid #000',
                    padding: '10px 14px',
                    marginBottom: '24px',
                    fontFamily: 'Sometype Mono',
                    fontSize: '0.8rem',
                    color: '#000',
                }}>
                    [!] {error}
                </div>
            )}

            {/* Protocol stats table */}
            {loading ? (
                <div style={{ marginBottom: '32px' }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} style={{ background: '#eee', height: '40px', marginBottom: '8px', border: '1px solid #eee' }} />
                    ))}
                </div>
            ) : mine ? (
                <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #000', marginBottom: '32px' }}>
                    <tbody>
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '10px 14px', fontSize: '0.8rem', fontFamily: 'Sometype Mono', color: '#888', width: '40%' }}>Ratio</td>
                            <td style={{ border: '1px solid #000', padding: '10px 14px', fontSize: '0.8rem', fontFamily: 'Sometype Mono', color: '#000' }}>{mine.ratio.toFixed(4)}</td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '10px 14px', fontSize: '0.8rem', fontFamily: 'Sometype Mono', color: '#888', width: '40%' }}>Total Wrapped</td>
                            <td style={{ border: '1px solid #000', padding: '10px 14px', fontSize: '0.8rem', fontFamily: 'Sometype Mono', color: '#000' }}>{formatBalance(mine.underlyingBalance, 18)} {underlyingSymbol}</td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '10px 14px', fontSize: '0.8rem', fontFamily: 'Sometype Mono', color: '#888', width: '40%' }}>xToken Supply</td>
                            <td style={{ border: '1px solid #000', padding: '10px 14px', fontSize: '0.8rem', fontFamily: 'Sometype Mono', color: '#000' }}>{formatBalance(mine.totalSupply, 18)} {mine.symbol}</td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '10px 14px', fontSize: '0.8rem', fontFamily: 'Sometype Mono', color: '#888', width: '40%' }}>Wrap Fee %</td>
                            <td style={{ border: '1px solid #000', padding: '10px 14px', fontSize: '0.8rem', fontFamily: 'Sometype Mono', color: '#000' }}>{(Number(mine.wrapFee) / 10).toFixed(1)}%</td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '10px 14px', fontSize: '0.8rem', fontFamily: 'Sometype Mono', color: '#888', width: '40%' }}>Unwrap Fee %</td>
                            <td style={{ border: '1px solid #000', padding: '10px 14px', fontSize: '0.8rem', fontFamily: 'Sometype Mono', color: '#000' }}>{(Number(mine.unwrapFee) / 10).toFixed(1)}%</td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '10px 14px', fontSize: '0.8rem', fontFamily: 'Sometype Mono', color: '#888', width: '40%' }}>Underlying Token</td>
                            <td style={{ border: '1px solid #000', padding: '10px 14px', fontSize: '0.8rem', fontFamily: 'Sometype Mono', color: '#000' }}>{truncateAddress(mine.underlyingAddress)}</td>
                        </tr>
                    </tbody>
                </table>
            ) : null}

            {/* User position — only when wallet connected */}
            {isConnected && (
                <div style={{ marginBottom: '32px' }}>
                    <div style={{
                        fontSize: '0.7rem',
                        color: '#888',
                        fontFamily: 'Sometype Mono',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        marginBottom: '8px',
                    }}>
                        Your Position
                    </div>
                    {loading ? (
                        <div>
                            <div style={{ background: '#eee', height: '40px', marginBottom: '8px', border: '1px solid #eee' }} />
                            <div style={{ background: '#eee', height: '40px', border: '1px solid #eee' }} />
                        </div>
                    ) : mine ? (
                        <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #000' }}>
                            <tbody>
                                <tr>
                                    <td style={{ border: '1px solid #000', padding: '10px 14px', fontSize: '0.8rem', fontFamily: 'Sometype Mono', color: '#888', width: '40%' }}>Your xToken Balance</td>
                                    <td style={{ border: '1px solid #000', padding: '10px 14px', fontSize: '0.8rem', fontFamily: 'Sometype Mono', color: '#000' }}>
                                        {mine.userXBalance !== null ? `${formatBalance(mine.userXBalance, 18)} ${mine.symbol}` : '—'}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid #000', padding: '10px 14px', fontSize: '0.8rem', fontFamily: 'Sometype Mono', color: '#888', width: '40%' }}>Your Underlying Value</td>
                                    <td style={{ border: '1px solid #000', padding: '10px 14px', fontSize: '0.8rem', fontFamily: 'Sometype Mono', color: '#000' }}>
                                        {mine.userUnderlyingValue !== null ? `${formatBalance(mine.userUnderlyingValue, 18)} ${underlyingSymbol}` : '—'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    ) : null}
                </div>
            )}

            {/* Action buttons */}
            {mine && (
                <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
                    <ActionLink to={`/wrap/${address}`}>
                        Wrap {underlyingSymbol} → {mine.symbol}
                    </ActionLink>
                    <ActionLink to={`/unwrap/${address}`}>
                        Unwrap {mine.symbol} → {underlyingSymbol}
                    </ActionLink>
                </div>
            )}
        </div>
    );
}
