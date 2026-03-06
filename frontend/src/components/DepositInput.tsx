import { useRef } from 'react';
import { formatBalance } from '../lib/helpers';

export interface DepositInputProps {
    value: string;
    onChange: (value: string) => void;
    max?: bigint;
    decimals: number;
    symbol: string;
    tokenName?: string;
    disabled?: boolean;
    loading?: boolean;
}

export function DepositInput({
    value,
    onChange,
    max,
    decimals,
    symbol,
    tokenName,
    disabled,
    loading,
}: DepositInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const maxNum = max !== undefined && max > 0n ? Number(max) / Math.pow(10, decimals) : 0;
    const currentNum = parseFloat(value) || 0;
    const pct = maxNum > 0 ? Math.min(100, (currentNum / maxNum) * 100) : 0;
    const pctRounded = Math.round(pct);

    function setPercent(p: number) {
        if (!max || max === 0n) return;
        if (p >= 100) {
            onChange(formatBalance(max, decimals));
        } else {
            const raw = (max * BigInt(p)) / 100n;
            onChange(formatBalance(raw, decimals));
        }
    }

    const pctDisplay = maxNum > 0 && currentNum > 0
        ? `${Math.min(100, pctRounded)}% of balance`
        : null;

    const pctBtns = [25, 50, 75] as const;

    // Always reserve space for slider + buttons to avoid layout shift.
    // Show skeleton placeholders while balance is loading.
    const showControls = loading || (max !== undefined);

    return (
        <div style={{ border: '1px solid #000', background: '#fff' }}>
            {/* Token header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #000',
                padding: '12px 14px',
            }}>
                <div>
                    <span style={{ fontFamily: 'Mulish, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#000' }}>
                        {tokenName ?? symbol}
                    </span>
                    {tokenName && (
                        <span style={{ marginLeft: '8px', fontFamily: 'Sometype Mono, monospace', fontSize: '0.75rem', color: '#888' }}>
                            {symbol}
                        </span>
                    )}
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.6rem', color: '#888', fontFamily: 'Sometype Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
                        Your Balance
                    </div>
                    {loading ? (
                        <div style={{ height: '1.1em', width: '80px', background: '#eee', borderRadius: 2, display: 'inline-block', verticalAlign: 'middle', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    ) : max !== undefined ? (
                        <div style={{ fontFamily: 'Sometype Mono, monospace', fontWeight: 700, fontSize: '0.9rem', color: '#000' }}>
                            {formatBalance(max, decimals)} {symbol}
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Amount input */}
            <div style={{ padding: '14px 14px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.6rem', color: '#888', fontFamily: 'Sometype Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Amount
                    </span>
                    {pctDisplay && (
                        <span style={{ fontSize: '0.6rem', color: '#888', fontFamily: 'Sometype Mono, monospace' }}>
                            {pctDisplay}
                        </span>
                    )}
                </div>
                <div style={{ border: '1px solid #000', display: 'flex', alignItems: 'stretch' }}>
                    <input
                        ref={inputRef}
                        type="number"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                        placeholder="0.0"
                        min="0"
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            padding: '10px 12px',
                            color: '#000',
                            fontFamily: 'Sometype Mono, monospace',
                            fontSize: '1rem',
                        }}
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                </div>
            </div>

            {/* Slider — always rendered when showControls, invisible skeleton when loading */}
            {showControls && (
                <div style={{ padding: '10px 14px 0' }}>
                    <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={loading ? 0 : pctRounded}
                        onChange={(e) => setPercent(Number(e.target.value))}
                        disabled={disabled || loading || !max || max === 0n}
                        style={{
                            width: '100%',
                            accentColor: '#000',
                            cursor: disabled || loading || !max || max === 0n ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.3 : 1,
                        }}
                    />
                </div>
            )}

            {/* % + MAX buttons — always rendered when showControls */}
            {showControls && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: '#000', borderTop: '1px solid #000', marginTop: '10px' }}>
                    {pctBtns.map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setPercent(p)}
                            disabled={disabled || loading || !max || max === 0n}
                            style={{
                                background: !loading && pctRounded === p ? '#000' : '#fff',
                                color: !loading && pctRounded === p ? '#fff' : loading ? '#ccc' : '#000',
                                border: 'none',
                                padding: '10px 0',
                                fontFamily: 'Sometype Mono, monospace',
                                fontSize: '0.8rem',
                                cursor: disabled || loading || !max || max === 0n ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {p}%
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => setPercent(100)}
                        disabled={disabled || loading || !max || max === 0n}
                        style={{
                            background: !loading && pctRounded === 100 ? '#000' : '#fff',
                            color: !loading && pctRounded === 100 ? '#fff' : loading ? '#ccc' : '#000',
                            border: 'none',
                            padding: '10px 0',
                            fontFamily: 'Sometype Mono, monospace',
                            fontSize: '0.8rem',
                            cursor: disabled || loading || !max || max === 0n ? 'not-allowed' : 'pointer',
                        }}
                    >
                        MAX
                    </button>
                </div>
            )}
        </div>
    );
}
