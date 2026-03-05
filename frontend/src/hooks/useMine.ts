import { useState, useEffect, useCallback } from 'react';
import { getContract } from 'opnet';
import { provider } from '../lib/provider';
import { NETWORK } from '../config';
import { MINE_ABI, OP_20_ABI } from '../lib/contracts';
import { useWallet } from './useWallet';

export interface MineData {
    address: string;
    name: string;
    symbol: string;
    totalSupply: bigint;
    underlyingBalance: bigint;
    ratio: number;
    wrapFee: bigint;
    unwrapFee: bigint;
    controllerFee: bigint;
    protocolFee: bigint;
    underlyingAddress: string;
    ownerAddress: string;
    // user-specific (null when wallet not connected)
    userXBalance: bigint | null;
    userUnderlyingBalance: bigint | null;
    userUnderlyingValue: bigint | null;
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

function extractAddress(res: unknown, field: string): string {
    const r = res as Record<string, unknown> | null;
    const val = (r?.properties as Record<string, unknown> | undefined)?.[field];
    if (val !== null && val !== undefined) {
        const s = (val as { toString(): string }).toString?.();
        if (s) return s;
    }
    const decoded = (r?.decoded as unknown[] | undefined)?.[0];
    if (decoded !== null && decoded !== undefined) return String(decoded);
    return '';
}

export function useMine(mineAddress: string | null) {
    const [data, setData] = useState<MineData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fetchTrigger, setFetchTrigger] = useState(0);

    const { senderAddress, address: walletAddress } = useWallet();

    useEffect(() => {
        if (!mineAddress) {
            setData(null);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        const run = async () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mineContract = getContract<any>(
                    mineAddress,
                    MINE_ABI as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                    provider,
                    NETWORK,
                );

                const [
                    nameRes, symbolRes, totalSupplyRes, underlyingBalRes,
                    wrapFeeRes, unwrapFeeRes, controllerFeeRes, protocolFeeRes,
                    underlyingRes, ownerRes,
                ] = await Promise.all([
                    mineContract.name(),
                    mineContract.symbol(),
                    mineContract.totalSupply(),
                    mineContract.underlyingBalance(),
                    mineContract.getWrapFee(),
                    mineContract.getUnwrapFee(),
                    mineContract.getControllerFee(),
                    mineContract.getProtocolFee(),
                    mineContract.getUnderlying(),
                    mineContract.getOwner(),
                ]);

                if (cancelled) return;

                const totalSupply = extractU256(totalSupplyRes, 'totalSupply');
                const underlyingBalance = extractU256(underlyingBalRes, 'balance');
                const ratio = totalSupply === BigInt(0) ? 1.0 : Number(underlyingBalance) / Number(totalSupply);
                const underlyingAddress = extractAddress(underlyingRes, 'underlying');
                const ownerAddress = extractAddress(ownerRes, 'owner');

                let userXBalance: bigint | null = null;
                let userUnderlyingBalance: bigint | null = null;
                let userUnderlyingValue: bigint | null = null;

                if (senderAddress && walletAddress) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const mineWithSender = getContract<any>(
                        mineAddress,
                        MINE_ABI as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                        provider,
                        NETWORK,
                        senderAddress,
                    );

                    const xBalRes = await mineWithSender.balanceOf(senderAddress);
                    if (cancelled) return;
                    userXBalance = extractU256(xBalRes, 'balance');

                    if (underlyingAddress) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const underlyingContract = getContract<any>(
                            underlyingAddress,
                            OP_20_ABI as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                            provider,
                            NETWORK,
                            senderAddress,
                        );
                        const underlyingBalUserRes = await underlyingContract.balanceOf(senderAddress);
                        if (cancelled) return;
                        userUnderlyingBalance = extractU256(underlyingBalUserRes, 'balance');
                    }

                    if (userXBalance > BigInt(0)) {
                        const underlyingValRes = await mineContract.getUnderlyingAmount(userXBalance);
                        if (cancelled) return;
                        userUnderlyingValue = extractU256(underlyingValRes, 'underlyingAmount');
                    } else {
                        userUnderlyingValue = BigInt(0);
                    }
                }

                if (!cancelled) {
                    setData({
                        address: mineAddress,
                        name: extractString(nameRes, 'name'),
                        symbol: extractString(symbolRes, 'symbol'),
                        totalSupply,
                        underlyingBalance,
                        ratio,
                        wrapFee: extractU256(wrapFeeRes, 'wrapFee'),
                        unwrapFee: extractU256(unwrapFeeRes, 'unwrapFee'),
                        controllerFee: extractU256(controllerFeeRes, 'controllerFee'),
                        protocolFee: extractU256(protocolFeeRes, 'protocolFee'),
                        underlyingAddress,
                        ownerAddress,
                        userXBalance,
                        userUnderlyingBalance,
                        userUnderlyingValue,
                    });
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to fetch mine data');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void run();
        return () => { cancelled = true; };
    }, [mineAddress, senderAddress, walletAddress, fetchTrigger]);

    const refetch = useCallback(() => {
        setFetchTrigger(t => t + 1);
    }, []);

    return { data, loading, error, refetch };
}
