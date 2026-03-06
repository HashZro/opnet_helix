import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { WalletButton } from './WalletButton';
import { useWallet } from '../hooks/useWallet';
import { useBalances } from '../contexts/BalancesContext';
import { CONTRACT_ADDRESSES } from '../config';

const OPSCAN_FACTORY_URL = `https://opscan.org/contracts/${CONTRACT_ADDRESSES.factoryPubkey}?network=op_testnet`;

function NavTab({ to, children }: { to: string; children: React.ReactNode }) {
    const location = useLocation();
    const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
    return (
        <Link
            to={to}
            style={{
                fontFamily: 'Sometype Mono, monospace',
                fontSize: '0.75rem',
                color: active ? '#000' : '#888',
                textDecoration: 'none',
                padding: '4px 0',
                borderBottom: active ? '1px solid #000' : '1px solid transparent',
                letterSpacing: '0.04em',
                transition: 'color 0.1s, border-color 0.1s',
            }}
        >
            {children}
        </Link>
    );
}

export function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const { isConnected } = useWallet();
    const { btcBalance } = useBalances();

    return (
        <nav style={{ borderBottom: '1px solid #000', background: '#fff', position: 'sticky', top: 0, zIndex: 100 }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem' }}>
                {/* Brand */}
                <Link to="/" style={{ fontFamily: 'Mulish, sans-serif', fontWeight: 800, fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#000', textDecoration: 'none' }}>
                    HELIX
                </Link>

                {/* Tabs + Wallet */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div className="hidden md:flex" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <NavTab to="/">Explore</NavTab>
                        <NavTab to="/create">Create</NavTab>
                        {isConnected && (
                            <NavTab to="/my-genomes">
                                My Genomes
                            </NavTab>
                        )}
                        <a
                            href={OPSCAN_FACTORY_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                fontFamily: 'Sometype Mono, monospace',
                                fontSize: '0.75rem',
                                color: '#888',
                                textDecoration: 'none',
                                padding: '4px 0',
                                borderBottom: '1px solid transparent',
                                letterSpacing: '0.04em',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                transition: 'color 0.1s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#000')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#888')}
                        >
                            OPScan
                            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '2px' }}>
                                <path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </a>
                    </div>
                    {isConnected && (
                        <span style={{ border: '1px solid #000', background: '#fff', color: '#000', fontFamily: 'Sometype Mono, monospace', fontSize: '0.75rem', padding: '6px 16px' }}>
                            {btcBalance ?? '...'} BTC
                        </span>
                    )}
                    <div className="hidden md:block">
                        <WalletButton />
                    </div>
                    <button
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '8px', color: '#000' }}
                        className="md:hidden"
                        onClick={() => setMenuOpen((prev) => !prev)}
                        aria-label="Toggle menu"
                    >
                        {menuOpen ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div style={{ borderTop: '1px solid #000', padding: '12px 2rem', background: '#fff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <NavTab to="/">Explore</NavTab>
                    <NavTab to="/create">Create</NavTab>
                    {isConnected && (
                        <NavTab to="/my-genomes">
                            My Genomes
                        </NavTab>
                    )}
                    <a
                        href={OPSCAN_FACTORY_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontFamily: 'Sometype Mono, monospace', fontSize: '0.75rem', color: '#888', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                        OPScan
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '2px' }}>
                            <path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </a>
                    {isConnected && (
                        <span style={{ border: '1px solid #000', background: '#fff', color: '#000', fontFamily: 'Sometype Mono, monospace', fontSize: '0.75rem', padding: '6px 16px', alignSelf: 'flex-start' }}>
                            {btcBalance ?? '...'} BTC
                        </span>
                    )}
                    <div>
                        <WalletButton />
                    </div>
                </div>
            )}
        </nav>
    );
}
