import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getContract } from 'opnet';
import { useMines } from '../hooks/useMines';
import { useMine } from '../hooks/useMine';
import { useWallet } from '../hooks/useWallet';
import { useToast } from '../contexts/ToastContext';
import { provider } from '../lib/provider';
import { NETWORK } from '../config';
import { MINE_ABI } from '../lib/contracts';
import { TokenInput } from '../components/TokenInput';
import { TransactionButton } from '../components/TransactionButton';
import { formatBalance, parseAmount, parseContractError } from '../lib/helpers';

function extractU256(res: unknown, field: string): bigint {
    const r = res as Record<string, unknown> | null;
    const raw =
        (r?.properties as Record<string, unknown> | undefined)?.[field] ??
        r?.result ??
        (r?.decoded as unknown[] | undefined)?.[0] ??
        null;
    return raw !== null ? BigInt((raw as { toString(): string }).toString()) : BigInt(0);
}

export function UnwrapPage() {
    const { address: urlAddress } = useParams<{ address: string }>();
    const [selectedMine, setSelectedMine] = useState<string>(urlAddress ?? '');
    const { mines, loading: minesLoading } = useMines();
    const { data: mine, refetch } = useMine(selectedMine || null);
    const { senderAddress, address: walletAddress, isConnected } = useWallet();

    const toast = useToast();

    const [amount, setAmount] = useState('');
    const [estimatedUnderlying, setEstimatedUnderlying] = useState<bigint | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    // Sync urlAddress → selectedMine when route param is present
    useEffect(() => {
        if (urlAddress) setSelectedMine(urlAddress);
    }, [urlAddress]);

    // Debounced preview: fetch estimated underlying amount when user types
    useEffect(() => {
        if (!selectedMine || !mine) {
            setEstimatedUnderlying(null);
            return;
        }
        const raw = parseAmount(amount, 18);
        if (raw === 0n) {
            setEstimatedUnderlying(null);
            return;
        }
        setPreviewLoading(true);
        const timer = setTimeout(async () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mineContract = getContract<any>(selectedMine, MINE_ABI as any, provider, NETWORK);
                const res = await mineContract.getUnwrappedAmount(raw);
                setEstimatedUnderlying(extractU256(res, 'netUnderlying'));
            } catch {
                setEstimatedUnderlying(null);
            } finally {
                setPreviewLoading(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [amount, selectedMine, mine]);

    const handleUnwrap = useCallback(async () => {
        if (!senderAddress || !walletAddress || !selectedMine || !mine) {
            throw new Error('Connect wallet first');
        }
        const raw = parseAmount(amount, 18);
        if (raw === 0n) throw new Error('Enter an amount greater than zero');

        try {
            // Get mine contract with sender and simulate unwrap (no allowance needed — burning own tokens)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mineContract = getContract<any>(
                selectedMine,
                MINE_ABI as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                provider,
                NETWORK,
                senderAddress,
            );
            const unwrapSim = await mineContract.unwrap(raw);
            if ('error' in (unwrapSim as object)) throw new Error(String((unwrapSim as { error: unknown }).error));

            toast.info('Transaction submitted');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (unwrapSim as any).sendTransaction({
                signer: null,
                mldsaSigner: null,
                refundTo: walletAddress,
                maximumAllowedSatToSpend: BigInt(100_000),
                feeRate: 10,
                network: NETWORK,
                minGas: BigInt(100_000),
            });

            toast.success('Unwrap successful! Underlying tokens sent to your wallet.');
            setAmount('');
            setEstimatedUnderlying(null);
            refetch();
        } catch (err) {
            toast.error(`Transaction failed: ${parseContractError(err)}`);
            throw err;
        }
    }, [senderAddress, walletAddress, selectedMine, mine, amount, refetch, toast]);

    // Derive underlying symbol: strip leading 'x' from xToken symbol (e.g. xMINER → MINER)
    const underlyingSymbol = mine
        ? mine.symbol.startsWith('x')
            ? mine.symbol.slice(1)
            : mine.symbol
        : 'TOKEN';

    // Unwrap rate: 1 xToken = underlyingBalance / totalSupply underlying
    const unwrapRate =
        mine && mine.underlyingBalance > 0n && mine.totalSupply > 0n
            ? (Number(mine.underlyingBalance) / Number(mine.totalSupply)).toFixed(4)
            : '1.0000';

    return (
        <div style={{ padding: '48px 0', maxWidth: '520px', margin: '0 auto' }}>
            <h1 style={{ fontFamily: 'Mulish, sans-serif', fontWeight: 700, fontSize: '1.5rem', color: '#000', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontFamily: 'Sometype Mono, monospace', fontWeight: 400 }}>···</span>
                Unwrap Tokens
            </h1>

            {/* Mine selector — only shown when no :address URL param */}
            {!urlAddress && (
                <div style={{ marginBottom: '24px' }}>
                    <label style={{ fontSize: '0.75rem', color: '#888', fontFamily: 'Sometype Mono, monospace', display: 'block', marginBottom: '4px' }}>Select Mine</label>
                    <select
                        value={selectedMine}
                        onChange={(e) => {
                            setSelectedMine(e.target.value);
                            setAmount('');
                            setEstimatedUnderlying(null);
                        }}
                        disabled={minesLoading}
                        style={{ width: '100%', border: '1px solid #000', background: '#fff', color: '#000', padding: '10px 12px', fontFamily: 'Sometype Mono, monospace', fontSize: '0.85rem', outline: 'none', appearance: 'none', opacity: minesLoading ? 0.5 : 1 }}
                    >
                        <option value="">— Select a mine —</option>
                        {mines.map((m) => (
                            <option key={m.address} value={m.address}>
                                {m.name} ({m.symbol})
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Skeleton input area while mine data loads */}
            {selectedMine && !mine && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <div style={{ background: '#eee', height: '16px', marginBottom: '8px', width: '144px' }} />
                        <div style={{ background: '#eee', height: '48px', marginBottom: '8px' }} />
                    </div>
                    <div style={{ background: '#eee', height: '40px' }} />
                </div>
            )}

            {selectedMine && mine && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Amount input */}
                    <TokenInput
                        label={`You burn (${mine.symbol})`}
                        value={amount}
                        onChange={setAmount}
                        max={mine.userXBalance ?? undefined}
                        decimals={18}
                        symbol={mine.symbol}
                        disabled={!isConnected}
                    />

                    {/* Preview section */}
                    {(previewLoading || estimatedUnderlying !== null) && (
                        <div style={{ border: '1px solid #000', padding: '16px', marginTop: '8px' }}>
                            <p style={{ fontSize: '0.65rem', color: '#888', fontFamily: 'Sometype Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Preview</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ color: '#888', fontSize: '0.85rem' }}>You receive (est.)</span>
                                <span style={{ color: '#000', fontSize: '0.85rem' }}>
                                    {previewLoading
                                        ? '...'
                                        : `${formatBalance(estimatedUnderlying ?? 0n, 18)} ${underlyingSymbol}`}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ color: '#888', fontSize: '0.85rem' }}>Exchange rate</span>
                                <span style={{ color: '#000', fontSize: '0.85rem' }}>
                                    1 {mine.symbol} ≈ {unwrapRate} {underlyingSymbol}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#888', fontSize: '0.85rem' }}>Unwrap fee</span>
                                <span style={{ color: '#000', fontSize: '0.85rem' }}>
                                    {(Number(mine.unwrapFee) / 10).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Action */}
                    {!isConnected ? (
                        <p style={{ textAlign: 'center', color: '#888', fontSize: '0.85rem', fontFamily: 'Sometype Mono, monospace', padding: '16px 0' }}>
                            Connect your wallet to unwrap tokens
                        </p>
                    ) : (
                        <TransactionButton
                            label={`Unwrap ${mine.symbol} → ${underlyingSymbol}`}
                            onClick={handleUnwrap}
                            disabled={!amount || parseAmount(amount, 18) === 0n}
                        />
                    )}

                    {/* User balance info */}
                    {isConnected && mine.userXBalance !== null && (
                        <p style={{ fontSize: '0.75rem', textAlign: 'center', color: '#888', fontFamily: 'Sometype Mono, monospace' }}>
                            Your {mine.symbol} balance:{' '}
                            {formatBalance(mine.userXBalance, 18)} {mine.symbol}
                        </p>
                    )}

                    {/* Wrap-first helper — shown when connected but has no xTokens */}
                    {isConnected && mine.userXBalance !== null && mine.userXBalance === 0n && (
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee', textAlign: 'center' }}>
                            <p style={{ fontSize: '0.75rem', color: '#888', fontFamily: 'Sometype Mono, monospace', marginBottom: '8px' }}>No {mine.symbol} to unwrap?</p>
                            <Link
                                to={`/wrap/${selectedMine}`}
                                style={{ fontSize: '0.8rem', padding: '8px 16px', border: '1px solid #000', color: '#000', fontFamily: 'Sometype Mono, monospace', display: 'inline-block', textDecoration: 'none' }}
                            >
                                Wrap tokens first →
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
