import { useState } from 'react';
import { Link } from 'react-router-dom';
import { WalletButton } from './WalletButton';

const NAV_LINKS = [
    { label: '/Wrap', to: '/wrap' },
    { label: '/Unwrap', to: '/unwrap' },
];

export function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <nav style={{ borderBottom: '1px solid #000', background: '#fff', position: 'sticky', top: 0, zIndex: 100 }}>
            <div style={{ maxWidth: '900px', margin: '0 auto', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem' }}>
                {/* Brand */}
                <Link to="/" style={{ fontFamily: 'Mulish, sans-serif', fontWeight: 800, fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#000', textDecoration: 'none' }}>
                    HELIX
                </Link>

                {/* Desktop nav */}
                <div style={{ display: 'flex', gap: '24px' }}>
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            style={{ fontFamily: 'Sometype Mono, monospace', fontSize: '0.8rem', color: '#000', textDecoration: 'none' }}
                            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                {/* Wallet + hamburger */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            style={{ fontFamily: 'Sometype Mono, monospace', fontSize: '0.8rem', color: '#000', textDecoration: 'none' }}
                            onClick={() => setMenuOpen(false)}
                        >
                            {link.label}
                        </Link>
                    ))}
                    <div>
                        <WalletButton />
                    </div>
                </div>
            )}
        </nav>
    );
}
