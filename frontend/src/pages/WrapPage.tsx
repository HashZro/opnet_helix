import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getContract } from 'opnet';
import { Address } from '@btc-vision/transaction';
import { useMines } from '../hooks/useMines';
import { useMine } from '../hooks/useMine';
import { useWallet } from '../hooks/useWallet';
import { useToast } from '../contexts/ToastContext';
import { provider } from '../lib/provider';
import { NETWORK } from '../config';
import { MINE_ABI, OP_20_ABI } from '../lib/contracts';
import { TokenInput } from '../components/TokenInput';
import { TransactionButton } from '../components/TransactionButton';
import { formatBalance, parseAmount, parseContractError } from '../lib/helpers';

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

export function WrapPage() {
    const { address: urlAddress } = useParams<{ address: string }>();
    const [selectedMine, setSelectedMine] = useState<string>(urlAddress ?? '');
    const { mines, loading: minesLoading } = useMines();
    const { data: mine, refetch } = useMine(selectedMine || null);
    const { senderAddress, address: walletAddress, isConnected } = useWallet();

    const toast = useToast();

    const [amount, setAmount] = useState('');
    const [estimatedXAmount, setEstimatedXAmount] = useState<bigint | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    // Sync urlAddress → selectedMine when route param is present
    useEffect(() => {
        if (urlAddress) setSelectedMine(urlAddress);
    }, [urlAddress]);

    // Debounced preview: fetch estimated xToken amount when user types
    useEffect(() => {
        if (!selectedMine || !mine) {
            setEstimatedXAmount(null);
            return;
        }
        const raw = parseAmount(amount, 18);
        if (raw === 0n) {
            setEstimatedXAmount(null);
            return;
        }
        setPreviewLoading(true);
        const timer = setTimeout(async () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mineContract = getContract<any>(selectedMine, MINE_ABI as any, provider, NETWORK);
                const res = await mineContract.getWrappedAmount(raw);
                setEstimatedXAmount(extractU256(res, 'xAmount'));
            } catch {
                setEstimatedXAmount(null);
            } finally {
                setPreviewLoading(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [amount, selectedMine, mine]);

    const handleWrap = useCallback(async () => {
        if (!senderAddress || !walletAddress || !selectedMine || !mine) {
            throw new Error('Connect wallet first');
        }
        const raw = parseAmount(amount, 18);
        if (raw === 0n) throw new Error('Enter an amount greater than zero');
        if (!mine.underlyingAddress) throw new Error('Mine data not loaded');

        try {
            // 1. Get underlying token contract with sender
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const underlyingContract = getContract<any>(
                mine.underlyingAddress,
                OP_20_ABI as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                provider,
                NETWORK,
                senderAddress,
            );

            // 2. Resolve mine's Address object (needed as spender for allowance)
            const mineContractAddr = await resolveContractAddress(selectedMine);

            // 3. Check current allowance
            const allowanceRes = await underlyingContract.allowance(senderAddress, mineContractAddr);
            const currentAllowance = extractU256(allowanceRes, 'allowance');

            // 4. If insufficient, increaseAllowance before wrapping
            if (currentAllowance < raw) {
                const needed = raw - currentAllowance;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const allowSim = await underlyingContract.increaseAllowance(mineContractAddr, needed);
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

            // 5. Get mine contract with sender and simulate wrap
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mineContract = getContract<any>(
                selectedMine,
                MINE_ABI as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                provider,
                NETWORK,
                senderAddress,
            );
            const wrapSim = await mineContract.wrap(raw);
            if ('error' in (wrapSim as object)) throw new Error(String((wrapSim as { error: unknown }).error));

            // 6. Send the wrap transaction
            toast.info('Transaction submitted');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (wrapSim as any).sendTransaction({
                signer: null,
                mldsaSigner: null,
                refundTo: walletAddress,
                maximumAllowedSatToSpend: BigInt(100_000),
                feeRate: 10,
                network: NETWORK,
                minGas: BigInt(100_000),
            });

            toast.success(`Wrap successful! ${mine.symbol} tokens minted to your wallet.`);
            setAmount('');
            setEstimatedXAmount(null);
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

    // Wrap rate: 1 underlying = totalSupply / underlyingBalance xTokens
    const wrapRate =
        mine && mine.underlyingBalance > 0n && mine.totalSupply > 0n
            ? (Number(mine.totalSupply) / Number(mine.underlyingBalance)).toFixed(4)
            : '1.0000';

    return (
        <div className="max-w-lg mx-auto p-4 md:p-6">
            <h1 className="text-2xl font-bold mb-6">Wrap Tokens</h1>

            {/* Mine selector — only shown when no :address URL param */}
            {!urlAddress && (
                <div className="mb-6">
                    <label className="block text-sm text-gray-400 mb-1">Select Mine</label>
                    <select
                        value={selectedMine}
                        onChange={(e) => {
                            setSelectedMine(e.target.value);
                            setAmount('');
                            setEstimatedXAmount(null);
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

            {/* Skeleton input area while mine data loads */}
            {selectedMine && !mine && (
                <div className="space-y-4 animate-pulse">
                    <div>
                        <div className="h-4 w-36 bg-gray-700 rounded mb-2" />
                        <div className="h-12 bg-gray-800 rounded-lg" />
                    </div>
                    <div className="h-10 bg-gray-800 rounded-lg" />
                </div>
            )}

            {selectedMine && mine && (
                <div className="space-y-4">
                    {/* Amount input */}
                    <TokenInput
                        label={`You deposit (${underlyingSymbol})`}
                        value={amount}
                        onChange={setAmount}
                        max={mine.userUnderlyingBalance ?? undefined}
                        decimals={18}
                        symbol={underlyingSymbol}
                        disabled={!isConnected}
                    />

                    {/* Preview section */}
                    {(previewLoading || estimatedXAmount !== null) && (
                        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-2">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Preview</p>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">You receive (est.)</span>
                                <span className="text-white font-medium">
                                    {previewLoading
                                        ? '...'
                                        : `${formatBalance(estimatedXAmount ?? 0n, 18)} ${mine.symbol}`}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Exchange rate</span>
                                <span className="text-gray-300">
                                    1 {underlyingSymbol} ≈ {wrapRate} {mine.symbol}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Wrap fee</span>
                                <span className="text-purple-400">
                                    {(Number(mine.wrapFee) / 10).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Action */}
                    {!isConnected ? (
                        <p className="text-center text-gray-500 text-sm py-4">
                            Connect your wallet to wrap tokens
                        </p>
                    ) : (
                        <TransactionButton
                            label={`Wrap ${underlyingSymbol} → ${mine.symbol}`}
                            onClick={handleWrap}
                            disabled={!amount || parseAmount(amount, 18) === 0n}
                        />
                    )}

                    {/* User balance info */}
                    {isConnected && mine.userUnderlyingBalance !== null && (
                        <p className="text-xs text-center text-gray-600">
                            Your {underlyingSymbol} balance:{' '}
                            {formatBalance(mine.userUnderlyingBalance, 18)} {underlyingSymbol}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
