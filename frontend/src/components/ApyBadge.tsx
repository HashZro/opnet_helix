interface ApyBadgeProps {
    apy: number | null;
    labelColor?: string;
    valueColor?: string;
}

export function ApyBadge({ apy, labelColor = '#888', valueColor = '#000' }: ApyBadgeProps) {
    const display = apy === null ? '—' : `${apy.toFixed(1)}%`;

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: labelColor, fontSize: '0.8rem' }}>Est. APY</span>
            <span style={{ color: valueColor, fontSize: '0.8rem' }}>{display}</span>
        </div>
    );
}
