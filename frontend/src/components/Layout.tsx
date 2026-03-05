import { type ReactNode } from 'react';
import { Navbar } from './Navbar';

interface LayoutProps {
    children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
    return (
        <div style={{ position: 'relative', minHeight: '100vh', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' }}>
            <div aria-hidden='true' style={{ position: 'absolute', left: 'calc((100vw - 900px) / 2 - 28px)', top: '80px', width: '1px', background: '#000', height: '60vh', pointerEvents: 'none' }} />
            <Navbar />
            <main style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2rem', flex: 1, width: '100%' }}>
                {children}
            </main>
        </div>
    );
}
