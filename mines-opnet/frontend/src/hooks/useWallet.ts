import { useState, useEffect, useCallback } from 'react';
import { Address } from '@btc-vision/transaction';
import { networks, toOutputScript } from '@btc-vision/bitcoin';
import { useWalletConnect } from '@btc-vision/walletconnect';
import { provider } from '../lib/provider';

interface WalletState {
    address: string | null;
    isConnected: boolean;
    identityKey: string | null;
    tweakedKey: string | null;
    senderAddress: Address | null;
}

const INITIAL_STATE: WalletState = {
    address: null,
    isConnected: false,
    identityKey: null,
    tweakedKey: null,
    senderAddress: null,
};

export function useWallet() {
    const { walletAddress, openConnectModal, connectToWallet, disconnect: wcDisconnect } = useWalletConnect();
    const [state, setState] = useState<WalletState>(INITIAL_STATE);

    // Resolve identity key whenever walletAddress changes
    useEffect(() => {
        if (!walletAddress) {
            setState(INITIAL_STATE);
            return;
        }

        let cancelled = false;

        const resolveKeys = async () => {
            try {
                // Decode bech32 opt1... address → tweaked hex
                const opnetNet = { ...networks.testnet, bech32: (networks.testnet as any).bech32Opnet ?? 'opt' };
                const script = toOutputScript(walletAddress, opnetNet);
                const tweakedHex = '0x' + Array.from(script.subarray(2) as Uint8Array)
                    .map((b: number) => b.toString(16).padStart(2, '0'))
                    .join('');

                // Resolve identity key via provider
                const pubKeyInfo = await provider.getPublicKeyInfo(tweakedHex, false);
                const identityHex = pubKeyInfo?.toString?.() ?? null;

                if (cancelled) return;

                let senderAddress: Address | null = null;
                if (identityHex) {
                    const compressedTweaked = '0x02' + tweakedHex.slice(2);
                    senderAddress = Address.fromString(identityHex, compressedTweaked);
                }

                setState({
                    address: walletAddress,
                    isConnected: true,
                    identityKey: identityHex,
                    tweakedKey: tweakedHex,
                    senderAddress,
                });
            } catch {
                if (!cancelled) {
                    setState({ address: walletAddress, isConnected: true, identityKey: null, tweakedKey: null, senderAddress: null });
                }
            }
        };

        void resolveKeys();
        return () => { cancelled = true; };
    }, [walletAddress]);

    const connect = useCallback(() => {
        openConnectModal();
    }, [openConnectModal]);

    const disconnect = useCallback(() => {
        wcDisconnect();
        setState(INITIAL_STATE);
    }, [wcDisconnect]);

    return {
        ...state,
        connect,
        disconnect,
        connectToWallet,
    };
}
