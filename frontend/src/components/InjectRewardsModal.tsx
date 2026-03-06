import { useState, useEffect, useCallback } from 'react';
import { getContract } from 'opnet';
import { Address } from '@btc-vision/transaction';
import { useWallet } from '../hooks/useWallet';
import { useToast } from '../contexts/ToastContext';
import { provider } from '../lib/provider';
import { NETWORK } from '../config';
import { GENOME_ABI, OP_20_ABI } from '../lib/contracts';
import { DepositInput } from './DepositInput';
import { TransactionButton } from './TransactionButton';
import { formatBalance, parseAmount, parseContractError } from '../lib/helpers';
import type { MineInfo } from '../hooks/useMines';

function safeBI(v: unknown): bigint {
    if (v === null || v === undefined) return 0n;
    if (typeof v === 'bigint') return v;
    if (typeof v === 'number') return BigInt(Math.trunc(v));
    if (typeof v === 'string') { const s = v.trim(); return s === '' ? 0n : BigInt(s); }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (v as any).toBigInt === 'function') return (v as any).toBigInt();
    const str = (v as { toString(): string }).toString?.();
    if (str && str !== '[object Object]') return BigInt(str);
    return 0n;
}

function extractFirstU256(res: unknown): bigint {
    const r = res as Record<string, unknown> | null;
    const props = r?.properties as Record<string, unknown> | undefined;
    if (props) { for (const v of Object.values(props)) { if (v !== undefined && v !== null) return safeBI(v); } }
    const decoded = (r?.decoded as unknown[] | undefined)?.[0];
    if (decoded !== undefined && decoded !== null) return safeBI(decoded);
    return 0n;
}

interface InjectRewardsModalProps {
    mine: MineInfo;
    onClose: () => void;
    onSuccess?: () => void;
}

export function InjectRewardsModal({ mine, onClose, onSuccess }: InjectRewardsModalProps) {
    const { senderAddress, address: walletAddress, isConnected } = useWallet();
    const toast = useToast();

    const [amount, setAmount] = useState('');
    const [userUnderlyingBalance, setUserUnderlyingBalance] = useState<bigint | null>(null);

    const underlyingSymbol = mine.underlyingSymbol || (mine.symbol.startsWith('G') ? mine.symbol.slice(1) : mine.symbol);

    // Fetch user's underlying balance
    useEffect(() => {
        if (!isConnected || !senderAddress || !mine.underlyingAddress) {
            setUserUnderlyingBalance(null);
            return;
        }
        let cancelled = false;
        const run = async () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const uc = getContract<any>(mine.underlyingAddress, OP_20_ABI as any, provider, NETWORK, senderAddress);
                const res = await uc.balanceOf(senderAddress);
                if (!cancelled) setUserUnderlyingBalance(extractFirstU256(res));
            } catch {
                if (!cancelled) setUserUnderlyingBalance(null);
            }
        };
        void run();
        return () => { cancelled = true; };
    }, [isConnected, senderAddress, mine.underlyingAddress]);

    const handleInject = useCallback(async () => {
        if (!senderAddress || !walletAddress) throw new Error('Connect wallet first');
        const parsed = parseAmount(amount, 18);
        if (parsed === 0n) throw new Error('Enter an amount greater than zero');

        try {
            const genomePubAddr = Address.fromString(mine.pubkey);
            const underlyingAddr = Address.fromString(mine.underlyingAddress);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const underlyingContract = getContract<any>(underlyingAddr, OP_20_ABI as any, provider, NETWORK, senderAddress);

            console.log('[injectRewards] checking allowance', { spender: mine.pubkey, amount: parsed.toString() });
            const allowanceRes = await underlyingContract.allowance(senderAddress, genomePubAddr);
            const currentAllowance = extractFirstU256(allowanceRes);
            console.log('[injectRewards] current allowance:', currentAllowance.toString(), 'needed:', parsed.toString());

            if (currentAllowance < parsed) {
                const needed = parsed - currentAllowance;
                const allowSim = await underlyingContract.increaseAllowance(genomePubAddr, needed);
                if ('error' in (allowSim as object)) throw new Error(String((allowSim as { error: unknown }).error));
                toast.info('Approving underlying token...');
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (allowSim as any).sendTransaction({ signer: null, mldsaSigner: null, refundTo: walletAddress });
                toast.success('Approved');
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const genomeContract = getContract<any>(mine.address, GENOME_ABI as any, provider, NETWORK, senderAddress);
            console.log('[injectRewards] calling injectRewards', { amount: parsed.toString() });
            const injectSim = await genomeContract.injectRewards(parsed);
            if ('error' in (injectSim as object)) throw new Error(String((injectSim as { error: unknown }).error));
            toast.info('Injecting rewards...');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (injectSim as any).sendTransaction({ signer: null, mldsaSigner: null, refundTo: walletAddress });

            toast.success('Rewards injected — ratio increased');
            setAmount('');
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('[injectRewards] error:', err);
            toast.error(parseContractError(err));
            throw err;
        }
    }, [senderAddress, walletAddress, mine, amount, toast, onClose, onSuccess]);

    const raw = parseAmount(amount, 18);
    const hasValidAmount = raw > 0n;

    // Preview: new ratio after injection
    const newUnderlyingBalance = mine.underlyingBalance + raw;
    const newRatio = mine.totalSupply > 0n
        ? Number(newUnderlyingBalance) / Number(mine.totalSupply)
        : 1.0;
    const currentRatio = mine.totalSupply > 0n
        ? Number(mine.underlyingBalance) / Number(mine.totalSupply)
        : 1.0;
    const ratioDelta = newRatio - currentRatio;

    // Reward per gToken held (how much more underlying each gToken is worth after inject)
    const rewardPerToken = mine.totalSupply > 0n
        ? Number(raw) / Number(mine.totalSupply)
        : 0;

    return (
        <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={onClose}
        >
            <div
                style={{ background: '#fff', border: '1px solid #000', padding: '32px', maxWidth: '520px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <h2 style={{ fontFamily: 'Mulish, sans-serif', fontWeight: 700, fontSize: '1.2rem', color: '#000' }}>
                        Inject Rewards
                    </h2>
                    <button
                        onClick={onClose}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem', color: '#888', padding: '4px 8px' }}
                    >
                        ×
                    </button>
                </div>

                <p style={{ fontFamily: 'Sometype Mono, monospace', fontSize: '0.75rem', color: '#888', marginBottom: '20px' }}>
                    {mine.name} ({mine.symbol}) — deposit {underlyingSymbol} to increase the ratio for all holders.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <DepositInput
                        value={amount}
                        onChange={setAmount}
                        max={userUnderlyingBalance ?? undefined}
                        loading={isConnected && userUnderlyingBalance === null}
                        decimals={18}
                        symbol={underlyingSymbol}
                        tokenName={mine.underlyingName || underlyingSymbol}
                        disabled={!isConnected}
                    />

                    {/* Preview */}
                    {hasValidAmount && (
                        <div style={{ border: '1px solid #000', padding: '16px' }}>
                            <p style={{ fontSize: '0.65rem', color: '#888', fontFamily: 'Sometype Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Preview</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ color: '#888', fontSize: '0.85rem' }}>Current ratio</span>
                                <span style={{ color: '#000', fontSize: '0.85rem' }}>{currentRatio.toFixed(6)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ color: '#888', fontSize: '0.85rem' }}>New ratio</span>
                                <span style={{ color: '#000', fontSize: '0.85rem' }}>
                                    {newRatio.toFixed(6)}
                                    <span style={{ color: '#080', fontSize: '0.75rem', marginLeft: '6px' }}>+{ratioDelta.toFixed(6)}</span>
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ color: '#888', fontSize: '0.85rem' }}>Reward / {mine.symbol}</span>
                                <span style={{ color: '#000', fontSize: '0.85rem' }}>+{rewardPerToken.toFixed(8)} {underlyingSymbol}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#888', fontSize: '0.85rem' }}>You deposit</span>
                                <span style={{ color: '#000', fontSize: '0.85rem' }}>{formatBalance(raw, 18)} {underlyingSymbol}</span>
                            </div>
                        </div>
                    )}

                    {!isConnected ? (
                        <p style={{ textAlign: 'center', color: '#888', fontSize: '0.85rem', fontFamily: 'Sometype Mono, monospace', padding: '16px 0' }}>
                            Connect your wallet to inject rewards
                        </p>
                    ) : (
                        <TransactionButton
                            label={`Inject ${hasValidAmount ? formatBalance(raw, 18) + ' ' + underlyingSymbol : underlyingSymbol + ' rewards'}`}
                            onClick={handleInject}
                            disabled={!hasValidAmount}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
