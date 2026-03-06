import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatBalance, truncateAddress } from '../lib/helpers';
import { useApyEstimate } from '../hooks/useApyEstimate';
import { ApyBadge } from './ApyBadge';
import type { MineInfo } from '../hooks/useMines';

export interface MineCardProps {
    mine: MineInfo;
}

export function MineCard({ mine }: MineCardProps) {
    const { address, name, symbol, wrapFee, unwrapFee, underlyingBalance, totalSupply } = mine;
    const ratio = totalSupply > 0n ? Number(underlyingBalance) / Number(totalSupply) : 1.0;
    const wrapFeePercent = (Number(wrapFee) / 10).toFixed(1);
    const unwrapFeePercent = (Number(unwrapFee) / 10).toFixed(1);
    const underlyingSymbol = mine.underlyingSymbol || (symbol.startsWith('x') ? symbol.slice(1) : symbol);
    const underlyingName = mine.underlyingName || underlyingSymbol;
    const navigate = useNavigate();
    const [cardHovered, setCardHovered] = useState(false);
    const apy = useApyEstimate(address, ratio);

    return (
        <div
            onClick={() => navigate(`/mine/${address}`)}
            onMouseEnter={() => setCardHovered(true)}
            onMouseLeave={() => setCardHovered(false)}
            style={{ position: 'relative', border: '1px solid #000', background: cardHovered ? '#000' : '#fff', padding: '20px', cursor: 'pointer', transition: 'background 0s' }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                    <h3 style={{ fontFamily: 'Mulish', fontWeight: 700, fontSize: '1rem', color: cardHovered ? '#fff' : '#000', marginBottom: '2px' }}>{name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'Sometype Mono', color: cardHovered ? '#aaa' : '#888' }}>{symbol}</span>
                        {symbol.startsWith('g') && (
                            <span style={{ border: '1px solid currentColor', padding: '1px 4px', fontSize: '0.6rem', fontFamily: 'Sometype Mono', color: cardHovered ? '#aaa' : '#888', lineHeight: 1 }}>gToken</span>
                        )}
                        <span style={{ fontSize: '0.65rem', color: cardHovered ? '#666' : '#ccc' }}>▸</span>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'Sometype Mono', color: cardHovered ? '#bbb' : '#555' }}>{underlyingName}</span>
                    </div>
                </div>
                <span style={{ fontSize: '0.7rem', color: cardHovered ? '#aaa' : '#888', fontFamily: 'Sometype Mono', marginTop: '2px' }}>{truncateAddress(address)}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '12px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: cardHovered ? '#aaa' : '#888', fontSize: '0.8rem' }}>Ratio</span>
                    <span style={{ color: cardHovered ? '#fff' : '#000', fontSize: '0.8rem' }}>{ratio.toFixed(4)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: cardHovered ? '#aaa' : '#888', fontSize: '0.8rem' }}>Total Wrapped</span>
                    <span style={{ color: cardHovered ? '#fff' : '#000', fontSize: '0.8rem' }}>{formatBalance(underlyingBalance, 18)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: cardHovered ? '#aaa' : '#888', fontSize: '0.8rem' }}>Wrap Fee</span>
                    <span style={{ color: cardHovered ? '#fff' : '#000', fontSize: '0.8rem' }}>{wrapFeePercent}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: cardHovered ? '#aaa' : '#888', fontSize: '0.8rem' }}>Unwrap Fee</span>
                    <span style={{ color: cardHovered ? '#fff' : '#000', fontSize: '0.8rem' }}>{unwrapFeePercent}%</span>
                </div>
                <ApyBadge
                    apy={apy}
                    labelColor={cardHovered ? '#aaa' : '#888'}
                    valueColor={cardHovered ? '#fff' : '#000'}
                />
            </div>
        </div>
    );
}
