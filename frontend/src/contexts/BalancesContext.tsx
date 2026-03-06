import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getContract, OP_20_ABI } from 'opnet';
import { OPNetLimitedProvider } from '@btc-vision/transaction';
import { useWallet } from '../hooks/useWallet';
import { provider } from '../lib/provider';
import { NETWORK, CONTRACT_ADDRESSES, RPC_URL } from '../config';
import { formatBalance } from '../lib/helpers';

function extractBalance(res: unknown): bigint {
    const r = res as Record<string, unknown> | null;
    const raw =
        (r?.properties as Record<string, unknown> | undefined)?.['balance'] ??
        r?.result ??
        (r?.decoded as unknown[] | undefined)?.[0] ??
        null;
    return raw !== null ? BigInt((raw as { toString(): string }).toString()) : 0n;
}

interface BalancesState {
    motoBalance: string | null;
    pillBalance: string | null;
    btcBalance: string | null;
    motoRaw: bigint | null;
    pillRaw: bigint | null;
    refresh: () => void;
}

const BalancesContext = createContext<BalancesState>({
    motoBalance: null,
    pillBalance: null,
    btcBalance: null,
    motoRaw: null,
    pillRaw: null,
    refresh: () => {},
});

export function BalancesProvider({ children }: { children: ReactNode }) {
    const { isConnected, senderAddress, address: walletAddress } = useWallet();
    const [motoBalance, setMotoBalance] = useState<string | null>(null);
    const [pillBalance, setPillBalance] = useState<string | null>(null);
    const [btcBalance, setBtcBalance] = useState<string | null>(null);
    const [motoRaw, setMotoRaw] = useState<bigint | null>(null);
    const [pillRaw, setPillRaw] = useState<bigint | null>(null);
    const [tick, setTick] = useState(0);

    const refresh = useCallback(() => setTick(t => t + 1), []);

    useEffect(() => {
        if (!isConnected || !senderAddress || !walletAddress) {
            setMotoBalance(null);
            setPillBalance(null);
            setBtcBalance(null);
            setMotoRaw(null);
            setPillRaw(null);
            return;
        }

        let cancelled = false;

        const fetchBalances = async () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const motoContract = getContract<any>(CONTRACT_ADDRESSES.motoToken, OP_20_ABI as any, provider, NETWORK, senderAddress);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const pillContract = getContract<any>(CONTRACT_ADDRESSES.pillToken, OP_20_ABI as any, provider, NETWORK, senderAddress);
                const [motoRes, pillRes] = await Promise.all([
                    motoContract.balanceOf(senderAddress),
                    pillContract.balanceOf(senderAddress),
                ]);
                if (cancelled) return;
                const mr = extractBalance(motoRes);
                const pr = extractBalance(pillRes);
                setMotoRaw(mr);
                setPillRaw(pr);
                setMotoBalance(formatBalance(mr, 18));
                setPillBalance(formatBalance(pr, 18));
            } catch (e) {
                console.error('[BalancesContext] token balance error:', e);
            }

            try {
                const utxoProvider = new OPNetLimitedProvider(RPC_URL);
                const utxos = await utxoProvider.fetchUTXOMultiAddr({
                    addresses: [walletAddress],
                    minAmount: 546n,
                    requestedAmount: 10_000_000_000n,
                    optimized: false,
                    usePendingUTXO: true,
                });
                if (cancelled) return;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const totalSats = utxos.reduce((sum: bigint, u: any) => sum + BigInt(u.value ?? 0), 0n);
                setBtcBalance(formatBalance(totalSats, 8));
            } catch (e) {
                console.error('[BalancesContext] BTC balance error:', e);
            }
        };

        void fetchBalances();
        return () => { cancelled = true; };
    }, [isConnected, senderAddress, walletAddress, tick]);

    return (
        <BalancesContext.Provider value={{ motoBalance, pillBalance, btcBalance, motoRaw, pillRaw, refresh }}>
            {children}
        </BalancesContext.Provider>
    );
}

export function useBalances() {
    return useContext(BalancesContext);
}
