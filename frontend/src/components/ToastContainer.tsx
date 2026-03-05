import { useToast } from '../contexts/ToastContext';

const TYPE_PREFIX: Record<string, string> = {
    success: '[OK] ',
    error: '[!] ',
    info: '[i] ',
};

export function ToastContainer() {
    const { toasts, removeToast } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div style={{ position: 'fixed', bottom: '16px', right: '16px', zIndex: 99999, display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '360px', width: '100%', pointerEvents: 'none' }}>
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        padding: '10px 14px',
                        background: '#fff',
                        border: '1px solid #000',
                        fontFamily: 'Sometype Mono, monospace',
                        fontSize: '0.75rem',
                        color: '#000',
                        pointerEvents: 'auto',
                    }}
                >
                    <span style={{ flex: 1, wordBreak: 'break-word' }}>
                        {TYPE_PREFIX[toast.type] ?? ''}{toast.message}
                    </span>
                    <button
                        type="button"
                        onClick={() => removeToast(toast.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, color: '#000', flexShrink: 0 }}
                        aria-label="Dismiss"
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}
