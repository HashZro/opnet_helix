import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatBalance, truncateAddress } from '../lib/helpers';

export interface MineCardProps {
    address: string;
    name: string;
    symbol: string;
    ratio: number;
    wrapFee: bigint;
    unwrapFee: bigint;
    underlyingBalance: bigint;
}

export function MineCard({ address, name, symbol, ratio, wrapFee, unwrapFee, underlyingBalance }: MineCardProps) {
    const wrapFeePercent = (Number(wrapFee) / 10).toFixed(1);
    const unwrapFeePercent = (Number(unwrapFee) / 10).toFixed(1);
    const navigate = useNavigate();
    const [hovered, setHovered] = useState(false);

    return (
        <div
            onClick={() => navigate(`/mine/${address}`)}
            style={{ position: 'relative', border: '1px solid #000', background: '#fff', padding: '20px', cursor: 'pointer' }}
        >
            <div aria-hidden="true" style={{ position: 'absolute', top: '-1px', right: '-1px', width: '16px', height: '16px', borderTop: '1px solid #000', borderRight: '1px solid #000' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                    <h3 style={{ fontFamily: 'Mulish', fontWeight: 700, fontSize: '1rem', color: '#000' }}>{name}</h3>
                    <span style={{ fontSize: '0.8rem', color: '#888' }}>{symbol}</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#888', fontFamily: 'Sometype Mono' }}>{truncateAddress(address)}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '12px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888', fontSize: '0.8rem' }}>Ratio</span>
                    <span style={{ color: '#000', fontSize: '0.8rem' }}>{ratio.toFixed(4)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888', fontSize: '0.8rem' }}>Total Wrapped</span>
                    <span style={{ color: '#000', fontSize: '0.8rem' }}>{formatBalance(underlyingBalance, 18)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888', fontSize: '0.8rem' }}>Wrap Fee</span>
                    <span style={{ color: '#000', fontSize: '0.8rem' }}>{wrapFeePercent}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888', fontSize: '0.8rem' }}>Unwrap Fee</span>
                    <span style={{ color: '#000', fontSize: '0.8rem' }}>{unwrapFeePercent}%</span>
                </div>
            </div>

            <Link
                to={`/wrap/${address}`}
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{ display: 'block', width: '100%', textAlign: 'center', border: '1px solid #000', background: hovered ? '#000' : '#fff', color: hovered ? '#fff' : '#000', padding: '8px', fontFamily: 'Sometype Mono', fontSize: '0.8rem', marginTop: '16px', textDecoration: 'none' }}
            >
                Wrap →
            </Link>

            <div aria-hidden="true" style={{ position: 'absolute', bottom: '-1px', left: '-1px', width: '16px', height: '16px', borderBottom: '1px solid #000', borderLeft: '1px solid #000' }} />
        </div>
    );
}
