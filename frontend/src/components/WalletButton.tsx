import { useEffect, useRef, useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useToast } from '../contexts/ToastContext';
import { truncateAddress } from '../lib/helpers';

export function WalletButton() {
    const { address, isConnected, connect, disconnect } = useWallet();
    const toast = useToast();
    const prevConnectedRef = useRef(false);
    const [hovered, setHovered] = useState(false);

    useEffect(() => {
        if (isConnected && !prevConnectedRef.current) {
            toast.success('Wallet connected');
        } else if (!isConnected && prevConnectedRef.current) {
            toast.info('Wallet disconnected');
        }
        prevConnectedRef.current = isConnected;
    }, [isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

    const buttonStyle = {
        border: '1px solid #000',
        background: hovered ? '#000' : '#fff',
        color: hovered ? '#fff' : '#000',
        fontFamily: "'Sometype Mono', monospace",
        fontSize: '0.75rem',
        padding: '6px 16px',
        cursor: 'pointer',
    };

    if (isConnected && address) {
        return (
            <button
                onClick={disconnect}
                style={buttonStyle}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                {truncateAddress(address)}
            </button>
        );
    }

    return (
        <button
            onClick={connect}
            style={buttonStyle}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            Connect Wallet
        </button>
    );
}
