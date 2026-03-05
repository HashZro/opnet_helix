import { useState, useEffect, useCallback } from 'react';
import { getContract } from 'opnet';
import { provider } from '../lib/provider';
import { NETWORK, CONTRACT_ADDRESSES } from '../config';
import { FACTORY_ABI, MINE_ABI } from '../lib/contracts';

export interface MineInfo {
    address: string;
    name: string;
    symbol: string;
    underlyingBalance: bigint;
    totalSupply: bigint;
    wrapFee: bigint;
    unwrapFee: bigint;
}

function extractU256(res: unknown, field: string): bigint {
    const r = res as Record<string, unknown> | null;
    const raw =
        (r?.properties as Record<string, unknown> | undefined)?.[field] ??
        r?.result ??
        (r?.decoded as unknown[] | undefined)?.[0] ??
        null;
    return raw !== null ? BigInt((raw as { toString(): string }).toString()) : BigInt(0);
}

function extractString(res: unknown, field: string): string {
    const r = res as Record<string, unknown> | null;
    const val = (r?.properties as Record<string, unknown> | undefined)?.[field];
    if (val !== null && val !== undefined) return String(val);
    const decoded = (r?.decoded as unknown[] | undefined)?.[0];
    if (decoded !== null && decoded !== undefined) return String(decoded);
    return '';
}

export function useMines() {
    const [mines, setMines] = useState<MineInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refetchKey, setRefetchKey] = useState(0);

    const refetch = useCallback(() => setRefetchKey((k) => k + 1), []);

    useEffect(() => {
        let cancelled = false;

        const fetchMines = async () => {
            try {
                setLoading(true);
                setError(null);

                console.log('[useMines] factory address:', CONTRACT_ADDRESSES.factory);

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const factoryContract = getContract<any>(
                    CONTRACT_ADDRESSES.factory,
                    FACTORY_ABI as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                    provider,
                    NETWORK,
                );

                const countRes = await factoryContract.getMineCount();
                console.log('[useMines] getMineCount raw:', countRes);
                const count = Number(extractU256(countRes, 'count'));
                console.log('[useMines] mine count:', count);

                const results: MineInfo[] = [];

                for (let i = 0; i < count; i++) {
                    const addrRes = await factoryContract.getMineAtIndex(BigInt(i));
                    console.log(`[useMines] getMineAtIndex(${i}) raw:`, addrRes);
                    const mineAddress: string =
                        (addrRes?.properties?.mineAddress as { toString(): string } | undefined)?.toString?.() ?? '';
                    console.log(`[useMines] mine[${i}] address:`, mineAddress);

                    if (!mineAddress) continue;

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const mineContract = getContract<any>(
                        mineAddress,
                        MINE_ABI as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                        provider,
                        NETWORK,
                    );

                    const [nameRes, symbolRes, totalSupplyRes, underlyingBalRes, wrapFeeRes, unwrapFeeRes] =
                        await Promise.all([
                            mineContract.name(),
                            mineContract.symbol(),
                            mineContract.totalSupply(),
                            mineContract.underlyingBalance(),
                            mineContract.getWrapFee(),
                            mineContract.getUnwrapFee(),
                        ]);

                    results.push({
                        address: mineAddress,
                        name: extractString(nameRes, 'name'),
                        symbol: extractString(symbolRes, 'symbol'),
                        totalSupply: extractU256(totalSupplyRes, 'totalSupply'),
                        underlyingBalance: extractU256(underlyingBalRes, 'balance'),
                        wrapFee: extractU256(wrapFeeRes, 'wrapFee'),
                        unwrapFee: extractU256(unwrapFeeRes, 'unwrapFee'),
                    });
                }

                console.log('[useMines] final results:', results);
                if (!cancelled) {
                    setMines(results);
                }
            } catch (err) {
                console.error('[useMines] error:', err);
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to fetch mines');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void fetchMines();
        return () => {
            cancelled = true;
        };
    }, [refetchKey]);

    return { mines, loading, error, refetch };
}
