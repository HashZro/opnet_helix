import { useState, useEffect, useCallback } from 'react';
import { getContract } from 'opnet';
import { provider } from '../lib/provider';
import { NETWORK } from '../config';
import { MINE_ABI, OP_20_ABI } from '../lib/contracts';
import { useWallet } from './useWallet';

export interface MineData {
    address: string;
    pubkey: string;   // hex-encoded contract public key e.g. 0x044494c8... (needed for signInteraction contract field)
    name: string;
    symbol: string;
    totalSupply: bigint;
    underlyingBalance: bigint;
    ratio: number;
    wrapFee: bigint;
    unwrapFee: bigint;
    underlyingAddress: string;
    underlyingPubkey: string;
    underlyingName: string;
    underlyingSymbol: string;
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
                // Resolve mine contract pubkey hex (required for signInteraction contract field)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mineCode = await (provider as any).getCode(mineAddress);
                const rawPubkey = mineCode?.contractPublicKey;
                const pubkey: string = rawPubkey instanceof Uint8Array
                    ? '0x' + Array.from(rawPubkey as Uint8Array).map((b: number) => b.toString(16).padStart(2, '0')).join('')
                    : String(rawPubkey ?? '');

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mineContract = getContract<any>(
                    mineAddress,
                    MINE_ABI as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                    provider,
                    NETWORK,
                );

                const [
                    nameRes, symbolRes, totalSupplyRes, underlyingBalRes,
                    wrapFeeRes, unwrapFeeRes,
                    underlyingRes, ownerRes,
                ] = await Promise.all([
                    mineContract.name(),
                    mineContract.symbol(),
                    mineContract.totalSupply(),
                    mineContract.underlyingBalance(),
                    mineContract.getWrapFee(),
                    mineContract.getUnwrapFee(),
                    mineContract.getUnderlying(),
                    mineContract.getOwner(),
                ]);

                if (cancelled) return;

                const totalSupply = extractU256(totalSupplyRes, 'totalSupply');
                const underlyingBalance = extractU256(underlyingBalRes, 'balance');
                const ratio = totalSupply === BigInt(0) ? 1.0 : Number(underlyingBalance) / Number(totalSupply);
                const underlyingAddress = extractAddress(underlyingRes, 'underlying');
                const ownerAddress = extractAddress(ownerRes, 'owner');

                // Fetch underlying contract pubkey + name + symbol in parallel
                let underlyingPubkey = '';
                let underlyingName = '';
                let underlyingSymbol = '';
                if (underlyingAddress) {
                    try {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const uc = getContract<any>(underlyingAddress, OP_20_ABI as any, provider, NETWORK);
                        const [underlyingCode, uNameRes, uSymbolRes] = await Promise.all([
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (provider as any).getCode(underlyingAddress),
                            uc.name(),
                            uc.symbol(),
                        ]);
                        const rawUp = underlyingCode?.contractPublicKey;
                        underlyingPubkey = rawUp instanceof Uint8Array
                            ? '0x' + Array.from(rawUp as Uint8Array).map((b: number) => b.toString(16).padStart(2, '0')).join('')
                            : String(rawUp ?? '');
                        underlyingName = extractString(uNameRes, 'name');
                        underlyingSymbol = extractString(uSymbolRes, 'symbol');
                    } catch { /* non-fatal */ }
                }
                if (cancelled) return;

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

                    // Compute client-side: xAmount * underlyingBalance / totalSupply
                    // (mirrors _getUnderlyingAmount in Mine.ts — avoids selector mismatch for bare @method())
                    if (userXBalance > BigInt(0) && totalSupply > BigInt(0)) {
                        userUnderlyingValue = userXBalance * underlyingBalance / totalSupply;
                    } else {
                        userUnderlyingValue = BigInt(0);
                    }
                }

                if (!cancelled) {
                    setData({
                        address: mineAddress,
                        pubkey,
                        name: extractString(nameRes, 'name'),
                        symbol: extractString(symbolRes, 'symbol'),
                        totalSupply,
                        underlyingBalance,
                        ratio,
                        wrapFee: extractU256(wrapFeeRes, 'wrapFee'),
                        unwrapFee: extractU256(unwrapFeeRes, 'unwrapFee'),
                        underlyingAddress,
                        underlyingPubkey,
                        underlyingName,
                        underlyingSymbol,
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
