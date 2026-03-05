export function Spinner({ size = 6 }: { size?: number }) {
    const px = size * 4;
    return (
        <div
            className="animate-spin"
            style={{
                width: px,
                height: px,
                border: '2px solid #000',
                borderTopColor: 'transparent',
                borderRadius: '50%',
            }}
        />
    );
}
