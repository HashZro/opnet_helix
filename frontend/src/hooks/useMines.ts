import { useState, useEffect, useCallback } from 'react';
import { getContract } from 'opnet';
import { BinaryWriter } from '@btc-vision/transaction';
import { provider } from '../lib/provider';
import { NETWORK, CONTRACT_ADDRESSES } from '../config';
import { FACTORY_ABI, MINE_ABI, OP_20_ABI } from '../lib/contracts';

export interface MineInfo {
    address: string;
    pubkey: string;   // hex-encoded contract public key e.g. 0x044494c8... (needed for signInteraction contract field)
    name: string;
    symbol: string;
    underlyingBalance: bigint;
    totalSupply: bigint;
    wrapFee: bigint;
    unwrapFee: bigint;
    underlyingAddress: string;
    underlyingName: string;
    underlyingSymbol: string;
    ownerAddress: string;
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

function extractString(res: unknown, field: string): string {
    const r = res as Record<string, unknown> | null;
    const val = (r?.properties as Record<string, unknown> | undefined)?.[field];
    if (val !== null && val !== undefined) return String(val);
    const decoded = (r?.decoded as unknown[] | undefined)?.[0];
    if (decoded !== null && decoded !== undefined) return String(decoded);
    return '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildGetMineAtIndexCalldata(factoryContract: any, index: number): string {
    const selectorBuf: Uint8Array = factoryContract.encodeCalldata('getMineAtIndex', []);
    const params = new BinaryWriter();
    params.writeU256(BigInt(index));
    const paramsBuf = params.getBuffer();
    const calldata = new Uint8Array(selectorBuf.length + paramsBuf.length);
    calldata.set(selectorBuf, 0);
    calldata.set(paramsBuf, selectorBuf.length);
    return '0x' + Array.from(calldata).map((b: number) => b.toString(16).padStart(2, '0')).join('');
}

async function fetchMineData(mineAddress: string): Promise<MineInfo> {
    // Round 1: mine code + all mine contract reads in parallel
    const [mineCode, nameRes, symbolRes, totalSupplyRes, underlyingBalRes, wrapFeeRes, unwrapFeeRes, underlyingRes, ownerRes] =
        await Promise.all([
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (provider as any).getCode(mineAddress),
            ...((): Promise<unknown>[] => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const c = getContract<any>(mineAddress, MINE_ABI as any, provider, NETWORK);
                return [
                    c.name(),
                    c.symbol(),
                    c.totalSupply(),
                    c.underlyingBalance(),
                    c.getWrapFee(),
                    c.getUnwrapFee(),
                    c.getUnderlying(),
                    c.getOwner(),
                ];
            })(),
        ]);

    const rawPubkey = mineCode?.contractPublicKey;
    const pubkey: string = rawPubkey instanceof Uint8Array
        ? '0x' + Array.from(rawPubkey as Uint8Array).map((b: number) => b.toString(16).padStart(2, '0')).join('')
        : String(rawPubkey ?? '');

    const underlyingAddress = extractAddress(underlyingRes, 'underlying');

    // Round 2: fetch underlying token's name + symbol from chain
    let underlyingName = '';
    let underlyingSymbol = '';
    if (underlyingAddress) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const uc = getContract<any>(underlyingAddress, OP_20_ABI as any, provider, NETWORK);
            const [uNameRes, uSymbolRes] = await Promise.all([uc.name(), uc.symbol()]);
            underlyingName = extractString(uNameRes, 'name');
            underlyingSymbol = extractString(uSymbolRes, 'symbol');
        } catch { /* non-fatal — will display empty */ }
    }

    return {
        address: mineAddress,
        pubkey,
        name: extractString(nameRes, 'name'),
        symbol: extractString(symbolRes, 'symbol'),
        totalSupply: extractU256(totalSupplyRes, 'totalSupply'),
        underlyingBalance: extractU256(underlyingBalRes, 'balance'),
        wrapFee: extractU256(wrapFeeRes, 'wrapFee'),
        unwrapFee: extractU256(unwrapFeeRes, 'unwrapFee'),
        underlyingAddress,
        underlyingName,
        underlyingSymbol,
        ownerAddress: extractAddress(ownerRes, 'owner'),
    };
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
                setMines([]);

                // Round 1: get mine count
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const factoryContract = getContract<any>(CONTRACT_ADDRESSES.factory, FACTORY_ABI as any, provider, NETWORK);
                const countRes = await factoryContract.getMineCount();
                const count = Number(extractU256(countRes, 'count'));
                console.log('[useMines] mine count:', count);
                if (count === 0 || cancelled) return;

                // Round 2: all getMineAtIndex calls in parallel
                const calldatas = Array.from({ length: count }, (_, i) =>
                    buildGetMineAtIndexCalldata(factoryContract, i)
                );
                const addrResults = await Promise.all(
                    calldatas.map(cd => provider.call(CONTRACT_ADDRESSES.factory, cd as any))
                );
                if (cancelled) return;

                const addresses = addrResults
                    .map(res => (res as any)?.result?.readAddress?.()?.toString?.() ?? '')
                    .filter(Boolean);
                console.log('[useMines] addresses:', addresses);

                // Round 3: all mine data fetches in parallel, render each card as it resolves
                const ordered = new Array<MineInfo | null>(addresses.length).fill(null);
                await Promise.all(
                    addresses.map((addr, idx) =>
                        fetchMineData(addr).then(mine => {
                            if (cancelled) return;
                            ordered[idx] = mine;
                            // Render cards progressively — show resolved mines immediately
                            setMines(ordered.filter((m): m is MineInfo => m !== null));
                        }).catch(err => {
                            console.error(`[useMines] failed to fetch mine ${addr}:`, err);
                        })
                    )
                );
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
        return () => { cancelled = true; };
    }, [refetchKey]);

    return { mines, loading, error, refetch };
}
