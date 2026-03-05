import { useState } from 'react';

interface TransactionButtonProps {
    onClick: () => Promise<void>;
    label: string;
    disabled?: boolean;
    loading?: boolean;
}

export function TransactionButton({ onClick, label, disabled, loading: externalLoading }: TransactionButtonProps) {
    const [internalLoading, setInternalLoading] = useState(false);
    const [error, setError] = useState(false);

    const loading = externalLoading ?? internalLoading;
    const isDisabled = disabled || loading;

    async function handleClick() {
        if (isDisabled) return;
        setInternalLoading(true);
        setError(false);
        try {
            await onClick();
        } catch {
            setError(true);
            setTimeout(() => setError(false), 3000);
        } finally {
            setInternalLoading(false);
        }
    }

    let btnClass = 'w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ';

    if (isDisabled && !error) {
        btnClass += 'opacity-50 cursor-not-allowed bg-gray-700';
    } else if (error) {
        btnClass += 'bg-red-600 hover:bg-red-700 cursor-pointer';
    } else {
        btnClass += 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 cursor-pointer';
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={isDisabled}
            className={btnClass}
        >
            {loading && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            )}
            {error ? 'Transaction Failed' : label}
        </button>
    );
}
