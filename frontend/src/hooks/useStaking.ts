import { useState, useEffect, useCallback } from 'react';
import { getContract } from 'opnet';
import { provider } from '../lib/provider';
import { NETWORK, CONTRACT_ADDRESSES } from '../config';
import { STAKING_ABI, MINER_TOKEN_ABI } from '../lib/contracts';
import { useWallet } from './useWallet';

export interface StakingData {
    stakedBalance: bigint;
    pendingRewards: bigint;
    minerBalance: bigint;
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

export function useStaking(mineAddress: string | null) {
    const [data, setData] = useState<StakingData>({
        stakedBalance: BigInt(0),
        pendingRewards: BigInt(0),
        minerBalance: BigInt(0),
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fetchTrigger, setFetchTrigger] = useState(0);

    const { senderAddress } = useWallet();

    useEffect(() => {
        if (!mineAddress || !senderAddress) {
            setData({ stakedBalance: BigInt(0), pendingRewards: BigInt(0), minerBalance: BigInt(0) });
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        const run = async () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const stakingContract = getContract<any>(
                    CONTRACT_ADDRESSES.staking,
                    STAKING_ABI as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                    provider,
                    NETWORK,
                    senderAddress,
                );

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const minerContract = getContract<any>(
                    CONTRACT_ADDRESSES.minerToken,
                    MINER_TOKEN_ABI as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                    provider,
                    NETWORK,
                    senderAddress,
                );

                const [stakedRes, rewardsRes, minerBalRes] = await Promise.all([
                    stakingContract.getStakeBalance(mineAddress, senderAddress),
                    stakingContract.getRewards(mineAddress, senderAddress),
                    minerContract.balanceOf(senderAddress),
                ]);

                if (cancelled) return;

                setData({
                    stakedBalance: extractU256(stakedRes, 'balance'),
                    pendingRewards: extractU256(rewardsRes, 'pending'),
                    minerBalance: extractU256(minerBalRes, 'balance'),
                });
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to fetch staking data');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void run();
        return () => { cancelled = true; };
    }, [mineAddress, senderAddress, fetchTrigger]);

    const refetch = useCallback(() => {
        setFetchTrigger(t => t + 1);
    }, []);

    return { data, loading, error, refetch };
}
