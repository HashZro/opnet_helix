export function Spinner({ size = 6 }: { size?: number }) {
    return (
        <div
            className={`w-${size} h-${size} border-2 border-purple-500 border-t-transparent rounded-full animate-spin`}
        />
    );
}
