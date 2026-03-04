import { type ReactNode } from 'react';
import { Navbar } from './Navbar';

interface LayoutProps {
    children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
    return (
        <div className="flex flex-col min-h-screen bg-gray-950 text-gray-100">
            <Navbar />
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}
