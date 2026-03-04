import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getContract } from 'opnet';
import { useMines } from '../hooks/useMines';
import { useMine } from '../hooks/useMine';
import { useWallet } from '../hooks/useWallet';
import { provider } from '../lib/provider';
import { NETWORK } from '../config';
import { MINE_ABI } from '../lib/contracts';
import { TokenInput } from '../components/TokenInput';
import { TransactionButton } from '../components/TransactionButton';
import { formatBalance, parseAmount } from '../lib/helpers';

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

    const [amount, setAmount] = useState('');
    const [estimatedUnderlying, setEstimatedUnderlying] = useState<bigint | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);

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

        setSuccess(null);

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

        setSuccess(`Unwrap successful! Underlying tokens have been sent to your wallet.`);
        setAmount('');
        setEstimatedUnderlying(null);
        refetch();
    }, [senderAddress, walletAddress, selectedMine, mine, amount, refetch]);

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
        <div className="max-w-lg mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Unwrap Tokens</h1>

            {/* Mine selector — only shown when no :address URL param */}
            {!urlAddress && (
                <div className="mb-6">
                    <label className="block text-sm text-gray-400 mb-1">Select Mine</label>
                    <select
                        value={selectedMine}
                        onChange={(e) => {
                            setSelectedMine(e.target.value);
                            setAmount('');
                            setEstimatedUnderlying(null);
                            setSuccess(null);
                        }}
                        disabled={minesLoading}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white focus:border-gray-500 outline-none disabled:opacity-50"
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

            {/* Loading spinner while mine data loads */}
            {selectedMine && !mine && (
                <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {selectedMine && mine && (
                <div className="space-y-4">
                    {/* Amount input */}
                    <TokenInput
                        label={`You burn (${mine.symbol})`}
                        value={amount}
                        onChange={(v) => { setAmount(v); setSuccess(null); }}
                        max={mine.userXBalance ?? undefined}
                        decimals={18}
                        symbol={mine.symbol}
                        disabled={!isConnected}
                    />

                    {/* Preview section */}
                    {(previewLoading || estimatedUnderlying !== null) && (
                        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-2">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Preview</p>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">You receive (est.)</span>
                                <span className="text-white font-medium">
                                    {previewLoading
                                        ? '...'
                                        : `${formatBalance(estimatedUnderlying ?? 0n, 18)} ${underlyingSymbol}`}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Exchange rate</span>
                                <span className="text-gray-300">
                                    1 {mine.symbol} ≈ {unwrapRate} {underlyingSymbol}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Unwrap fee</span>
                                <span className="text-blue-400">
                                    {(Number(mine.unwrapFee) / 10).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Success banner */}
                    {success && (
                        <div className="p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-400 text-sm">
                            {success}
                        </div>
                    )}

                    {/* Action */}
                    {!isConnected ? (
                        <p className="text-center text-gray-500 text-sm py-4">
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
                        <p className="text-xs text-center text-gray-600">
                            Your {mine.symbol} balance:{' '}
                            {formatBalance(mine.userXBalance, 18)} {mine.symbol}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
