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
    const [hovered, setHovered] = useState(false);

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

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={isDisabled}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                border: '1px solid #000',
                background: hovered && !isDisabled ? '#000' : '#fff',
                color: hovered && !isDisabled ? '#fff' : '#000',
                width: '100%',
                padding: '10px 16px',
                fontFamily: 'Sometype Mono',
                fontSize: '0.8rem',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.4 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
            }}
        >
            {loading && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            )}
            {error ? '[!] Transaction Failed' : label}
        </button>
    );
}
