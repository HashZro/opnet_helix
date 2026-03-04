import { useState, useCallback } from 'react';
import { getContract } from 'opnet';
import { Address } from '@btc-vision/transaction';
import { useStaking } from '../hooks/useStaking';
import { useWallet } from '../hooks/useWallet';
import { useToast } from '../contexts/ToastContext';
import { provider } from '../lib/provider';
import { NETWORK, CONTRACT_ADDRESSES } from '../config';
import { STAKING_ABI, MINER_TOKEN_ABI } from '../lib/contracts';
import { TokenInput } from './TokenInput';
import { TransactionButton } from './TransactionButton';
import { formatBalance, parseAmount, parseContractError } from '../lib/helpers';

interface StakingPanelProps {
    mineAddress: string;
}

// Resolve a contract's Address object from its bech32 address via RPC
async function resolveContractAddress(bech32: string): Promise<Address> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const code = await (provider as any).getCode(bech32);
    const pubkey = code?.contractPublicKey;
    const hex: string =
        pubkey instanceof Uint8Array
            ? '0x' + Array.from(pubkey as Uint8Array).map((b: number) => b.toString(16).padStart(2, '0')).join('')
            : String(pubkey);
    return Address.fromString(hex, '0x02' + hex.slice(2));
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

type Tab = 'stake' | 'unstake';

export function StakingPanel({ mineAddress }: StakingPanelProps) {
    const [tab, setTab] = useState<Tab>('stake');
    const [amount, setAmount] = useState('');

    const toast = useToast();
    const { senderAddress, address: walletAddress, isConnected } = useWallet();
    const { data, loading, error, refetch } = useStaking(mineAddress);

    const handleStake = useCallback(async () => {
        if (!senderAddress || !walletAddress) throw new Error('Connect wallet first');
        const raw = parseAmount(amount, 18);
        if (raw === 0n) throw new Error('Enter an amount greater than zero');

        try {
            // Resolve staking contract Address for allowance approval
            const stakingAddr = await resolveContractAddress(CONTRACT_ADDRESSES.staking);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const minerContract = getContract<any>(
                CONTRACT_ADDRESSES.minerToken,
                MINER_TOKEN_ABI as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                provider,
                NETWORK,
                senderAddress,
            );

            // Check current allowance
            const allowanceRes = await minerContract.allowance(senderAddress, stakingAddr);
            const currentAllowance = extractU256(allowanceRes, 'allowance');

            // Increase allowance if needed
            if (currentAllowance < raw) {
                const needed = raw - currentAllowance;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const allowSim = await minerContract.increaseAllowance(stakingAddr, needed);
                if ('error' in (allowSim as object)) throw new Error(String((allowSim as { error: unknown }).error));
                toast.info('Approving allowance...');
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (allowSim as any).sendTransaction({
                    signer: null,
                    mldsaSigner: null,
                    refundTo: walletAddress,
                    maximumAllowedSatToSpend: BigInt(100_000),
                    feeRate: 10,
                    network: NETWORK,
                    minGas: BigInt(100_000),
                });
                toast.success('Allowance approved');
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const stakingContract = getContract<any>(
                CONTRACT_ADDRESSES.staking,
                STAKING_ABI as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                provider,
                NETWORK,
                senderAddress,
            );

            const stakeSim = await stakingContract.stake(mineAddress, raw);
            if ('error' in (stakeSim as object)) throw new Error(String((stakeSim as { error: unknown }).error));

            toast.info('Transaction submitted');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (stakeSim as any).sendTransaction({
                signer: null,
                mldsaSigner: null,
                refundTo: walletAddress,
                maximumAllowedSatToSpend: BigInt(100_000),
                feeRate: 10,
                network: NETWORK,
                minGas: BigInt(100_000),
            });

            toast.success('Stake successful!');
            setAmount('');
            refetch();
        } catch (err) {
            toast.error(`Transaction failed: ${parseContractError(err)}`);
            throw err;
        }
    }, [senderAddress, walletAddress, mineAddress, amount, refetch, toast]);

    const handleUnstake = useCallback(async () => {
        if (!senderAddress || !walletAddress) throw new Error('Connect wallet first');
        const raw = parseAmount(amount, 18);
        if (raw === 0n) throw new Error('Enter an amount greater than zero');

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const stakingContract = getContract<any>(
                CONTRACT_ADDRESSES.staking,
                STAKING_ABI as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                provider,
                NETWORK,
                senderAddress,
            );

            const unstakeSim = await stakingContract.unstake(mineAddress, raw);
            if ('error' in (unstakeSim as object)) throw new Error(String((unstakeSim as { error: unknown }).error));

            toast.info('Transaction submitted');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (unstakeSim as any).sendTransaction({
                signer: null,
                mldsaSigner: null,
                refundTo: walletAddress,
                maximumAllowedSatToSpend: BigInt(100_000),
                feeRate: 10,
                network: NETWORK,
                minGas: BigInt(100_000),
            });

            toast.success('Unstake successful!');
            setAmount('');
            refetch();
        } catch (err) {
            toast.error(`Transaction failed: ${parseContractError(err)}`);
            throw err;
        }
    }, [senderAddress, walletAddress, mineAddress, amount, refetch, toast]);

    const handleClaim = useCallback(async () => {
        if (!senderAddress || !walletAddress) throw new Error('Connect wallet first');

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const stakingContract = getContract<any>(
                CONTRACT_ADDRESSES.staking,
                STAKING_ABI as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                provider,
                NETWORK,
                senderAddress,
            );

            const claimSim = await stakingContract.claim(mineAddress);
            if ('error' in (claimSim as object)) throw new Error(String((claimSim as { error: unknown }).error));

            toast.info('Transaction submitted');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (claimSim as any).sendTransaction({
                signer: null,
                mldsaSigner: null,
                refundTo: walletAddress,
                maximumAllowedSatToSpend: BigInt(100_000),
                feeRate: 10,
                network: NETWORK,
                minGas: BigInt(100_000),
            });

            toast.success('Rewards claimed!');
            refetch();
        } catch (err) {
            toast.error(`Transaction failed: ${parseContractError(err)}`);
            throw err;
        }
    }, [senderAddress, walletAddress, mineAddress, refetch, toast]);

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white">Staking</h2>

            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Staked Balance</p>
                    <p className="text-sm font-medium text-white">
                        {loading ? '…' : formatBalance(data.stakedBalance, 18)} MINER
                    </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">MINER Balance</p>
                    <p className="text-sm font-medium text-white">
                        {loading ? '…' : formatBalance(data.minerBalance, 18)} MINER
                    </p>
                </div>
            </div>

            {/* Tab switcher */}
            <div className="flex rounded-lg overflow-hidden border border-gray-700">
                <button
                    type="button"
                    onClick={() => { setTab('stake'); setAmount(''); }}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        tab === 'stake'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                >
                    Stake
                </button>
                <button
                    type="button"
                    onClick={() => { setTab('unstake'); setAmount(''); }}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        tab === 'unstake'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                >
                    Unstake
                </button>
            </div>

            {/* Input + action */}
            {tab === 'stake' ? (
                <div className="space-y-3">
                    <TokenInput
                        label="Amount to Stake"
                        value={amount}
                        onChange={setAmount}
                        max={data.minerBalance}
                        decimals={18}
                        symbol="MINER"
                        disabled={!isConnected}
                    />
                    {!isConnected ? (
                        <p className="text-center text-gray-500 text-sm py-2">Connect your wallet to stake</p>
                    ) : (
                        <TransactionButton
                            label="Stake MINER"
                            onClick={handleStake}
                            disabled={!amount || parseAmount(amount, 18) === 0n}
                        />
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    <TokenInput
                        label="Amount to Unstake"
                        value={amount}
                        onChange={setAmount}
                        max={data.stakedBalance}
                        decimals={18}
                        symbol="MINER"
                        disabled={!isConnected}
                    />
                    {!isConnected ? (
                        <p className="text-center text-gray-500 text-sm py-2">Connect your wallet to unstake</p>
                    ) : (
                        <TransactionButton
                            label="Unstake MINER"
                            onClick={handleUnstake}
                            disabled={!amount || parseAmount(amount, 18) === 0n}
                        />
                    )}
                </div>
            )}

            {/* Claim section */}
            <div className="border-t border-gray-800 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Pending Rewards</span>
                    <span className="text-sm font-medium text-green-400">
                        {loading ? '…' : formatBalance(data.pendingRewards, 18)} MINER
                    </span>
                </div>
                {!isConnected ? (
                    <p className="text-center text-gray-500 text-sm py-2">Connect your wallet to claim rewards</p>
                ) : (
                    <TransactionButton
                        label="Claim Rewards"
                        onClick={handleClaim}
                        disabled={data.pendingRewards === 0n}
                    />
                )}
            </div>

            {/* Error banner (fetch errors, not transaction errors) */}
            {error && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
                    {error}
                </div>
            )}
        </div>
    );
}
