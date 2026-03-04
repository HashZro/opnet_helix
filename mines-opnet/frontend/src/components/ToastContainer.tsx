import { useToast } from '../contexts/ToastContext';

const TYPE_STYLES = {
    success: 'bg-green-900/90 border-green-600 text-green-300',
    error: 'bg-red-900/90 border-red-600 text-red-300',
    info: 'bg-blue-900/90 border-blue-600 text-blue-300',
};

const TYPE_ICONS = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
};

export function ToastContainer() {
    const { toasts, removeToast } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[99999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm shadow-lg backdrop-blur-sm pointer-events-auto ${TYPE_STYLES[toast.type]}`}
                >
                    <span className="font-bold text-base leading-tight mt-0.5 flex-shrink-0">
                        {TYPE_ICONS[toast.type]}
                    </span>
                    <span className="flex-1 leading-snug break-words">{toast.message}</span>
                    <button
                        type="button"
                        onClick={() => removeToast(toast.id)}
                        className="opacity-60 hover:opacity-100 text-lg leading-none ml-1 flex-shrink-0"
                        aria-label="Dismiss"
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}
