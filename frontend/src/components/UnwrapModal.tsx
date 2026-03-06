import { useState, useEffect, useCallback } from 'react';
import { getContract } from 'opnet';
import { BinaryWriter, OPNetLimitedProvider, TransactionFactory } from '@btc-vision/transaction';
import { useWallet } from '../hooks/useWallet';
import { useToast } from '../contexts/ToastContext';
import { provider } from '../lib/provider';
import { NETWORK, RPC_URL } from '../config';
import { MINE_ABI } from '../lib/contracts';
import { DepositInput } from './DepositInput';
import { TransactionButton } from './TransactionButton';
import { formatBalance, parseAmount, parseContractError } from '../lib/helpers';
import type { MineInfo } from '../hooks/useMines';

function extractU256(res: unknown, field: string): bigint {
    const r = res as Record<string, unknown> | null;
    const raw =
        (r?.properties as Record<string, unknown> | undefined)?.[field] ??
        r?.result ??
        (r?.decoded as unknown[] | undefined)?.[0] ??
        null;
    return raw !== null ? BigInt((raw as { toString(): string }).toString()) : BigInt(0);
}

interface UnwrapModalProps {
    mine: MineInfo;
    onClose: () => void;
    onOpenWrap?: () => void;
}

export function UnwrapModal({ mine, onClose, onOpenWrap }: UnwrapModalProps) {
    const { senderAddress, address: walletAddress, isConnected } = useWallet();
    const toast = useToast();

    const [amount, setAmount] = useState('');
    const [estimatedUnderlying, setEstimatedUnderlying] = useState<bigint | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [userXBalance, setUserXBalance] = useState<bigint | null>(null);

    // Fetch user's xToken balance (1 RPC call)
    useEffect(() => {
        if (!isConnected || !senderAddress) {
            setUserXBalance(null);
            return;
        }
        let cancelled = false;
        const fetchBal = async () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mineContract = getContract<any>(mine.address, MINE_ABI as any, provider, NETWORK, senderAddress);
                const res = await mineContract.balanceOf(senderAddress);
                if (!cancelled) setUserXBalance(extractU256(res, 'balance'));
            } catch {
                if (!cancelled) setUserXBalance(null);
            }
        };
        void fetchBal();
        return () => { cancelled = true; };
    }, [isConnected, senderAddress, mine.address]);

    // Debounced preview — stays visible as long as amount is valid
    // Uses manual calldata because getUnwrappedAmount has inputs:[] in ABI (reads amount from raw calldata)
    useEffect(() => {
        const raw = parseAmount(amount, 18);
        if (raw === 0n) {
            setPreviewLoading(false);
            setEstimatedUnderlying(null);
            return;
        }
        setPreviewLoading(true);
        const timer = setTimeout(async () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mineContract = getContract<any>(mine.address, MINE_ABI as any, provider, NETWORK);
                const selectorBuf: Uint8Array = (mineContract as any).encodeCalldata('getUnwrappedAmount', []);
                const params = new BinaryWriter();
                params.writeU256(raw);
                const paramsBuf = params.getBuffer();
                const calldata = new Uint8Array(selectorBuf.length + paramsBuf.length);
                calldata.set(selectorBuf, 0);
                calldata.set(paramsBuf, selectorBuf.length);
                const calldataHex = '0x' + Array.from(calldata).map((b: number) => b.toString(16).padStart(2, '0')).join('');
                const res = await provider.call(mine.address, calldataHex as any);
                const value = (res as any)?.result?.readU256?.();
                if (value !== undefined) setEstimatedUnderlying(BigInt(value.toString()));
            } catch { /* keep last known value — don't clear on error */ }
            finally { setPreviewLoading(false); }
        }, 500);
        return () => clearTimeout(timer);
    }, [amount, mine.address]);

    const handleUnwrap = useCallback(async () => {
        if (!senderAddress || !walletAddress) throw new Error('Connect wallet first');
        if (!mine.pubkey) throw new Error('Mine pubkey not loaded');
        const raw = parseAmount(amount, 18);
        if (raw === 0n) throw new Error('Enter an amount greater than zero');

        try {
            // Build calldata manually: selector + u256 amount (ABI has inputs:[] — amount is in raw calldata)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mineContractForSelector = getContract<any>(mine.address, MINE_ABI as any, provider, NETWORK);
            const selectorBuf: Uint8Array = (mineContractForSelector as any).encodeCalldata('unwrap', []);
            const params = new BinaryWriter();
            params.writeU256(raw);
            const paramsBuf = params.getBuffer();
            const calldata = new Uint8Array(selectorBuf.length + paramsBuf.length);
            calldata.set(selectorBuf, 0);
            calldata.set(paramsBuf, selectorBuf.length);

            toast.info('Confirm unwrap in OPWallet...');
            const utxoProvider = new OPNetLimitedProvider(RPC_URL);
            const utxos = await utxoProvider.fetchUTXOMultiAddr({
                addresses: [walletAddress],
                minAmount: 330n,
                requestedAmount: 100_000_000n,
                optimized: true,
                usePendingUTXO: true,
            });
            if (!utxos.length) throw new Error('No UTXOs found — fund your wallet with testnet BTC');

            const challenge = await provider.getChallenge();
            const factory = new TransactionFactory();
            const result = await factory.signInteraction({
                to: mine.address,
                from: walletAddress,
                contract: mine.pubkey,
                calldata,
                utxos,
                challenge,
                network: NETWORK,
                feeRate: 50,
                priorityFee: 0n,
                gasSatFee: 10_000n,
            } as any);

            const { fundingTransaction, interactionTransaction } = result as any;
            if (!interactionTransaction) throw new Error('signInteraction returned no transaction');
            if (fundingTransaction) {
                const fundingResp = await utxoProvider.broadcastTransaction(fundingTransaction, false);
                if (!fundingResp?.success) throw new Error(`Funding tx failed: ${fundingResp?.error ?? 'unknown'}`);
            }
            const unwrapResp = await utxoProvider.broadcastTransaction(interactionTransaction, false);
            if (!unwrapResp?.success) throw new Error(`Unwrap tx failed: ${unwrapResp?.error ?? 'unknown'}`);

            toast.success('Unwrap successful! Underlying tokens sent to your wallet.');
            setAmount('');
            setEstimatedUnderlying(null);
            onClose();
        } catch (err) {
            toast.error(`Transaction failed: ${parseContractError(err)}`);
            throw err;
        }
    }, [senderAddress, walletAddress, mine, amount, toast, onClose]);

    const underlyingSymbol = mine.symbol.startsWith('x') ? mine.symbol.slice(1) : mine.symbol;

    const unwrapRate =
        mine.underlyingBalance > 0n && mine.totalSupply > 0n
            ? (Number(mine.underlyingBalance) / Number(mine.totalSupply)).toFixed(4)
            : '1.0000';

    const hasValidAmount = parseAmount(amount, 18) > 0n;

    return (
        <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={onClose}
        >
            <div
                style={{ background: '#fff', border: '1px solid #000', padding: '32px', maxWidth: '520px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <h2 style={{ fontFamily: 'Mulish, sans-serif', fontWeight: 700, fontSize: '1.2rem', color: '#000' }}>
                        Unwrap Tokens
                    </h2>
                    <button
                        onClick={onClose}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem', color: '#888', padding: '4px 8px' }}
                    >
                        ×
                    </button>
                </div>

                <p style={{ fontFamily: 'Sometype Mono, monospace', fontSize: '0.75rem', color: '#888', marginBottom: '20px' }}>
                    {mine.name} ({mine.symbol})
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <DepositInput
                        value={amount}
                        onChange={setAmount}
                        max={userXBalance ?? undefined}
                        loading={isConnected && userXBalance === null}
                        decimals={18}
                        symbol={mine.symbol}
                        tokenName={mine.name}
                        disabled={!isConnected}
                    />

                    {/* Preview — always visible while amount is valid */}
                    {hasValidAmount && (
                        <div style={{ border: '1px solid #000', padding: '16px' }}>
                            <p style={{ fontSize: '0.65rem', color: '#888', fontFamily: 'Sometype Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Preview</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ color: '#888', fontSize: '0.85rem' }}>You receive (est.)</span>
                                <span style={{ color: '#000', fontSize: '0.85rem' }}>
                                    {previewLoading || estimatedUnderlying === null
                                        ? '...'
                                        : `${formatBalance(estimatedUnderlying, 18)} ${underlyingSymbol}`}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ color: '#888', fontSize: '0.85rem' }}>Exchange rate</span>
                                <span style={{ color: '#000', fontSize: '0.85rem' }}>1 {mine.symbol} ≈ {unwrapRate} {underlyingSymbol}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#888', fontSize: '0.85rem' }}>Unwrap fee</span>
                                <span style={{ color: '#000', fontSize: '0.85rem' }}>{(Number(mine.unwrapFee) / 10).toFixed(1)}%</span>
                            </div>
                        </div>
                    )}

                    {!isConnected ? (
                        <p style={{ textAlign: 'center', color: '#888', fontSize: '0.85rem', fontFamily: 'Sometype Mono, monospace', padding: '16px 0' }}>
                            Connect your wallet to unwrap tokens
                        </p>
                    ) : (
                        <TransactionButton
                            label={`Unwrap ${mine.symbol} → ${underlyingSymbol}`}
                            onClick={handleUnwrap}
                            disabled={!hasValidAmount}
                        />
                    )}

                    {isConnected && userXBalance !== null && userXBalance === 0n && onOpenWrap && (
                        <div style={{ paddingTop: '16px', borderTop: '1px solid #eee', textAlign: 'center' }}>
                            <p style={{ fontSize: '0.75rem', color: '#888', fontFamily: 'Sometype Mono, monospace', marginBottom: '8px' }}>No {mine.symbol} to unwrap?</p>
                            <button
                                onClick={onOpenWrap}
                                style={{ fontSize: '0.8rem', padding: '8px 16px', border: '1px solid #000', color: '#000', background: '#fff', fontFamily: 'Sometype Mono, monospace', cursor: 'pointer' }}
                            >
                                Wrap tokens first →
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
