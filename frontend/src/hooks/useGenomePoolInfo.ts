import { useState, useEffect } from 'react';
import { getContract, MotoSwapFactoryAbi, MotoswapPoolAbi, OP_20_ABI } from 'opnet';
import { Address } from '@btc-vision/transaction';
import { provider } from '../lib/provider';
import { NETWORK, CONTRACT_ADDRESSES } from '../config';

export interface GenomePoolInfo {
    poolAddress: string;
    reserve0: bigint;
    reserve1: bigint;
    lpBalance: bigint;
    loading: boolean;
    error: string | null;
}

const EMPTY: GenomePoolInfo = {
    poolAddress: '',
    reserve0: 0n,
    reserve1: 0n,
    lpBalance: 0n,
    loading: false,
    error: null,
};

function isZeroAddress(addr: string): boolean {
    return !addr || addr === '' || /^0x0+$/.test(addr) || addr === '0x';
}

function extractPoolAddress(res: unknown): string {
    const r = res as Record<string, unknown> | null;
    const val = (r?.properties as Record<string, unknown> | undefined)?.['pool'];
    if (val !== null && val !== undefined) {
        const s = (val as { toString(): string }).toString?.();
        if (s) return s;
    }
    const decoded = (r?.decoded as unknown[] | undefined)?.[0];
    if (decoded !== null && decoded !== undefined) return String(decoded);
    return '';
}

function extractU256Named(res: unknown, field: string): bigint {
    const r = res as Record<string, unknown> | null;
    const raw = (r?.properties as Record<string, unknown> | undefined)?.[field] ??
        (r?.decoded as unknown[] | undefined)?.[0] ??
        null;
    return raw !== null ? BigInt((raw as { toString(): string }).toString()) : 0n;
}

function extractU256AtIndex(res: unknown, field: string, index: number): bigint {
    const r = res as Record<string, unknown> | null;
    const fromProp = (r?.properties as Record<string, unknown> | undefined)?.[field];
    if (fromProp !== null && fromProp !== undefined) {
        return BigInt((fromProp as { toString(): string }).toString());
    }
    const decoded = (r?.decoded as unknown[] | undefined)?.[index];
    if (decoded !== null && decoded !== undefined) {
        return BigInt((decoded as { toString(): string }).toString());
    }
    return 0n;
}

export function useGenomePoolInfo(
    genomeAddress: string | null,
    genomePubkey: string,
    underlyingPubkey: string,
    senderAddress: Address | null,
    _refetchTrigger?: number,
): GenomePoolInfo {
    const [state, setState] = useState<GenomePoolInfo>({ ...EMPTY });

    // Use string representation to avoid object reference churn in deps
    const senderKey = senderAddress?.toString() ?? null;

    useEffect(() => {
        if (!genomeAddress || !genomePubkey || !underlyingPubkey) {
            setState({ ...EMPTY });
            return;
        }

        let cancelled = false;

        const fetch = async () => {
            setState(prev => ({ ...prev, loading: true, error: null }));
            try {
                const factoryAddr = Address.fromString(CONTRACT_ADDRESSES.motoswapFactory);
                const underlyingAddr = Address.fromString(underlyingPubkey);
                const genomeAddr = Address.fromString(genomePubkey);

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const factoryContract = getContract<any>(factoryAddr, MotoSwapFactoryAbi as any, provider, NETWORK);
                const poolRes = await factoryContract.getPool(underlyingAddr, genomeAddr);
                console.log('[useGenomePoolInfo] getPool result:', poolRes);
                const poolAddress = extractPoolAddress(poolRes);
                console.log('[useGenomePoolInfo] poolAddress:', poolAddress);

                if (isZeroAddress(poolAddress)) {
                    if (!cancelled) setState({ poolAddress: '', reserve0: 0n, reserve1: 0n, lpBalance: 0n, loading: false, error: null });
                    return;
                }

                // Pool exists — fetch reserves and LP balance in parallel
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const poolContract = getContract<any>(poolAddress, MotoswapPoolAbi as any, provider, NETWORK);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const lpContract = getContract<any>(poolAddress, OP_20_ABI as any, provider, NETWORK);

                const [reservesRes, lpBalanceRes] = await Promise.all([
                    poolContract.getReserves(),
                    senderAddress ? lpContract.balanceOf(senderAddress) : Promise.resolve(null),
                ]);

                console.log('[useGenomePoolInfo] getReserves result:', reservesRes);
                console.log('[useGenomePoolInfo] lpBalance result:', lpBalanceRes);

                if (cancelled) return;

                const reserve0 = extractU256AtIndex(reservesRes, 'reserve0', 0);
                const reserve1 = extractU256AtIndex(reservesRes, 'reserve1', 1);
                const lpBalance = senderAddress ? extractU256Named(lpBalanceRes, 'balance') : 0n;

                setState({ poolAddress, reserve0, reserve1, lpBalance, loading: false, error: null });
            } catch (err) {
                console.error('[useGenomePoolInfo] error:', err);
                if (!cancelled) {
                    setState(prev => ({
                        ...prev,
                        loading: false,
                        error: err instanceof Error ? err.message : 'Failed to fetch pool info',
                    }));
                }
            }
        };

        void fetch();
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [genomeAddress, genomePubkey, underlyingPubkey, senderKey, _refetchTrigger]);

    return state;
}
