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
        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <label className="text-sm text-gray-400">{label}</label>
                {max !== undefined && (
                    <span className="text-xs text-gray-500">
                        Max: {formatBalance(max, decimals)} {symbol}
                    </span>
                )}
            </div>
            <div className="flex items-center bg-gray-800 border border-gray-700 rounded-lg overflow-hidden focus-within:border-gray-500 transition-colors">
                <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    placeholder="0.0"
                    min="0"
                    className="flex-1 bg-transparent px-3 py-3 text-white placeholder-gray-600 outline-none text-base disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                {max !== undefined && (
                    <button
                        type="button"
                        onClick={handleMax}
                        disabled={disabled}
                        className="px-3 py-1 mr-1 text-xs font-semibold text-purple-400 hover:text-purple-300 hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        MAX
                    </button>
                )}
                <span className="px-3 py-3 text-sm font-medium text-gray-300 bg-gray-750 border-l border-gray-700">
                    {symbol}
                </span>
            </div>
        </div>
    );
}
