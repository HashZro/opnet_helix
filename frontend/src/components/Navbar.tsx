import { useState } from 'react';
import { Link } from 'react-router-dom';
import { WalletButton } from './WalletButton';

const NAV_LINKS = [
    { label: 'Home', to: '/' },
    { label: 'Wrap', to: '/wrap' },
    { label: 'Unwrap', to: '/unwrap' },
];

export function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <nav className="w-full bg-gray-900 border-b border-gray-800 px-4 py-3">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="text-lg font-bold text-white tracking-tight">
                    Mines Protocol
                </Link>

                {/* Desktop nav */}
                <div className="hidden md:flex items-center gap-6">
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                {/* Wallet + hamburger */}
                <div className="flex items-center gap-3">
                    <div className="hidden md:block">
                        <WalletButton />
                    </div>
                    <button
                        className="md:hidden p-2.5 text-gray-400 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        onClick={() => setMenuOpen((prev) => !prev)}
                        aria-label="Toggle menu"
                    >
                        {menuOpen ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div className="md:hidden mt-3 pb-2 border-t border-gray-800 pt-3 flex flex-col gap-3">
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className="text-gray-400 hover:text-white text-sm font-medium px-1 py-2.5 min-h-[44px] flex items-center transition-colors"
                            onClick={() => setMenuOpen(false)}
                        >
                            {link.label}
                        </Link>
                    ))}
                    <div className="pt-2">
                        <WalletButton />
                    </div>
                </div>
            )}
        </nav>
    );
}
