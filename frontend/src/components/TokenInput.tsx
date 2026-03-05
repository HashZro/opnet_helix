import { formatBalance } from '../lib/helpers';

export interface TokenInputProps {
    value: string;
    onChange: (value: string) => void;
    max?: bigint;
    decimals: number;
    symbol: string;
    label: string;
    disabled?: boolean;
}

export function TokenInput({ value, onChange, max, decimals, symbol, label, disabled }: TokenInputProps) {
    function handleMax() {
        if (max === undefined) return;
        onChange(formatBalance(max, decimals));
    }

    return (
        <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.75rem', color: '#888', fontFamily: 'Sometype Mono', display: 'block' }}>{label}</label>
                {max !== undefined && (
                    <span style={{ fontSize: '0.7rem', color: '#888' }}>
                        Max: {formatBalance(max, decimals)} {symbol}
                    </span>
                )}
            </div>
            <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid #000', background: '#fff' }}>
                <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    placeholder="0.0"
                    min="0"
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '10px 12px', color: '#000', fontFamily: 'Sometype Mono', fontSize: '0.9rem' }}
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                {max !== undefined && (
                    <button
                        type="button"
                        onClick={handleMax}
                        disabled={disabled}
                        style={{ borderLeft: '1px solid #000', borderTop: 'none', borderRight: 'none', borderBottom: 'none', background: 'transparent', color: '#000', padding: '4px 10px', fontFamily: 'Sometype Mono', fontSize: '0.7rem', cursor: 'pointer' }}
                    >
                        MAX
                    </button>
                )}
                <span style={{ borderLeft: '1px solid #000', padding: '10px 12px', fontSize: '0.8rem', color: '#000', background: '#fff', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                    {symbol}
                </span>
            </div>
        </div>
    );
}
