import { useState } from 'react';

const TOOLTIP_TEXT =
    'Estimated APY is calculated by comparing the current xToken ratio against the first time you visited this page. ' +
    'It is annualised linearly and does not account for compounding or future fee volume. ' +
    'Yield comes from wrap, unwrap, and AMM trading fees accumulating in the pool.';

interface ApyBadgeProps {
    apy: number | null;
    /** text colour for the label — adapts to card hover inversion */
    labelColor?: string;
    valueColor?: string;
}

export function ApyBadge({ apy, labelColor = '#888', valueColor = '#000' }: ApyBadgeProps) {
    const [tipVisible, setTipVisible] = useState(false);

    const display = apy === null ? '—' : `${apy.toFixed(1)}%`;

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Label + info icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
                <span style={{ color: labelColor, fontSize: '0.8rem' }}>Est. APY</span>
                <span
                    onMouseEnter={() => setTipVisible(true)}
                    onMouseLeave={() => setTipVisible(false)}
                    style={{ cursor: 'help', color: labelColor, fontSize: '0.65rem', border: `1px solid ${labelColor}`, borderRadius: '50%', width: '12px', height: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, flexShrink: 0 }}
                >
                    ?
                </span>
                {tipVisible && (
                    <div style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: 0,
                        marginBottom: '6px',
                        background: '#000',
                        color: '#fff',
                        fontFamily: 'Sometype Mono, monospace',
                        fontSize: '0.65rem',
                        padding: '8px 10px',
                        width: '240px',
                        lineHeight: 1.5,
                        zIndex: 999,
                        pointerEvents: 'none',
                    }}>
                        {TOOLTIP_TEXT}
                    </div>
                )}
            </div>
            {/* Value */}
            <span style={{ color: valueColor, fontSize: '0.8rem' }}>{display}</span>
        </div>
    );
}
