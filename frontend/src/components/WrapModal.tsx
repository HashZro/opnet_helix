import { useState, useEffect, useCallback } from 'react';
import { getContract } from 'opnet';
import { Address, BinaryWriter, TransactionFactory, OPNetLimitedProvider } from '@btc-vision/transaction';
import { useWallet } from '../hooks/useWallet';
import { useToast } from '../contexts/ToastContext';
import { useBalances } from '../contexts/BalancesContext';
import { provider } from '../lib/provider';
import { NETWORK, CONTRACT_ADDRESSES, RPC_URL } from '../config';
import { MINE_ABI, OP_20_ABI } from '../lib/contracts';
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

interface WrapModalProps {
    mine: MineInfo;
    onClose: () => void;
}

export function WrapModal({ mine, onClose }: WrapModalProps) {
    const { senderAddress, address: walletAddress, isConnected } = useWallet();
    const toast = useToast();
    const { motoRaw, pillRaw } = useBalances();

    const [amount, setAmount] = useState('');
    const [estimatedXAmount, setEstimatedXAmount] = useState<bigint | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [userUnderlyingBalance, setUserUnderlyingBalance] = useState<bigint | null>(null);

    // Resolve user's underlying token balance — use global context if it's MOTO or PILL, else fetch
    useEffect(() => {
        if (!isConnected || !senderAddress || !mine.underlyingAddress) {
            setUserUnderlyingBalance(null);
            return;
        }

        const addr = mine.underlyingAddress.toLowerCase();
        if (addr === CONTRACT_ADDRESSES.motoToken.toLowerCase() && motoRaw !== null) {
            setUserUnderlyingBalance(motoRaw);
            return;
        }
        if (addr === CONTRACT_ADDRESSES.pillToken.toLowerCase() && pillRaw !== null) {
            setUserUnderlyingBalance(pillRaw);
            return;
        }

        // Fallback: fetch the balance for this specific token
        let cancelled = false;
        const fetchBal = async () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const underlyingContract = getContract<any>(mine.underlyingAddress, OP_20_ABI as any, provider, NETWORK, senderAddress);
                const res = await underlyingContract.balanceOf(senderAddress);
                if (cancelled) return;
                setUserUnderlyingBalance(extractFirstU256(res));
            } catch {
                if (!cancelled) setUserUnderlyingBalance(null);
            }
        };
        void fetchBal();
        return () => { cancelled = true; };
    }, [isConnected, senderAddress, mine.underlyingAddress, motoRaw, pillRaw]);

    // Preview: debounced getWrappedAmount call — stays visible as long as amount is valid
    useEffect(() => {
        const raw = parseAmount(amount, 18);
        if (raw === 0n) {
            setPreviewLoading(false);
            setEstimatedXAmount(null);
            return;
        }
        setPreviewLoading(true);
        const timer = setTimeout(async () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mineContract = getContract<any>(mine.address, MINE_ABI as any, provider, NETWORK);
                const selectorBuf: Uint8Array = (mineContract as any).encodeCalldata('getWrappedAmount', []);
                const params = new BinaryWriter();
                params.writeU256(raw);
                const paramsBuf = params.getBuffer();
                const calldata = new Uint8Array(selectorBuf.length + paramsBuf.length);
                calldata.set(selectorBuf, 0);
                calldata.set(paramsBuf, selectorBuf.length);
                const calldataHex = '0x' + Array.from(calldata).map((b: number) => b.toString(16).padStart(2, '0')).join('');
                const res = await provider.call(mine.address, calldataHex as any);
                const xAmount = (res as any)?.result?.readU256?.();
                setEstimatedXAmount(xAmount !== undefined ? BigInt(xAmount.toString()) : null);
            } catch { /* keep last known value — don't clear on error */ }
            finally { setPreviewLoading(false); }
        }, 500);
        return () => clearTimeout(timer);
    }, [amount, mine.address]);

    const handleWrap = useCallback(async () => {
        if (!senderAddress || !walletAddress) throw new Error('Connect wallet first');
        const raw = parseAmount(amount, 18);
        if (raw === 0n) throw new Error('Enter an amount greater than zero');
        if (!mine.underlyingAddress) throw new Error('Mine data not loaded');

        try {
            if (!mine.pubkey) throw new Error('Mine pubkey not loaded — try refreshing');
            const minePubkeyHex = mine.pubkey;
            const mineContractAddr = Address.fromString(minePubkeyHex);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const underlyingContract = getContract<any>(mine.underlyingAddress, OP_20_ABI as any, provider, NETWORK, senderAddress);
            const allowanceRes = await underlyingContract.allowance(senderAddress, mineContractAddr);
            const currentAllowance = extractFirstU256(allowanceRes);

            if (currentAllowance < raw) {
                const needed = raw - currentAllowance;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const allowSim = await underlyingContract.increaseAllowance(mineContractAddr, needed);
                if ('error' in (allowSim as object)) throw new Error(String((allowSim as { error: unknown }).error));
                toast.info('Approving allowance in OPWallet...');
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (allowSim as any).sendTransaction({
                    refundTo: walletAddress,
                    maximumAllowedSatToSpend: BigInt(100_000),
                    feeRate: 10,
                    network: NETWORK,
                    minGas: BigInt(100_000),
                });
                toast.success('Allowance approved');
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mineContractForSelector = getContract<any>(mine.address, MINE_ABI as any, provider, NETWORK);
            const selectorBuf: Uint8Array = (mineContractForSelector as any).encodeCalldata('wrap', []);
            const wrapParams = new BinaryWriter();
            wrapParams.writeU256(raw);
            const wrapParamsBuf = wrapParams.getBuffer();
            const wrapCalldata = new Uint8Array(selectorBuf.length + wrapParamsBuf.length);
            wrapCalldata.set(selectorBuf, 0);
            wrapCalldata.set(wrapParamsBuf, selectorBuf.length);

            toast.info('Confirm wrap in OPWallet...');
            const utxoProvider = new OPNetLimitedProvider(RPC_URL);
            const wrapUtxos = await utxoProvider.fetchUTXOMultiAddr({
                addresses: [walletAddress],
                minAmount: 330n,
                requestedAmount: 100_000_000n,
                optimized: true,
                usePendingUTXO: true,
            });
            if (!wrapUtxos.length) throw new Error('No UTXOs found — fund your wallet with testnet BTC');

            const wrapChallenge = await provider.getChallenge();
            const wrapFactory = new TransactionFactory();
            const wrapResult = await wrapFactory.signInteraction({
                to: mine.address,
                from: walletAddress,
                contract: minePubkeyHex,
                calldata: wrapCalldata,
                utxos: wrapUtxos,
                challenge: wrapChallenge,
                network: NETWORK,
                feeRate: 50,
                priorityFee: 0n,
                gasSatFee: 10_000n,
            } as any);

            const { fundingTransaction, interactionTransaction } = wrapResult as any;
            if (!interactionTransaction) throw new Error('signInteraction returned no transaction');
            if (fundingTransaction) {
                const fundingResp = await utxoProvider.broadcastTransaction(fundingTransaction, false);
                if (!fundingResp?.success) throw new Error(`Funding tx failed: ${fundingResp?.error ?? 'unknown'}`);
            }
            const wrapResp = await utxoProvider.broadcastTransaction(interactionTransaction, false);
            if (!wrapResp?.success) throw new Error(`Wrap tx failed: ${wrapResp?.error ?? 'unknown'}`);

            toast.success(`Wrap successful! ${mine.symbol} tokens minted to your wallet.`);
            setAmount('');
            setEstimatedXAmount(null);
            onClose();
        } catch (err) {
            toast.error(`Transaction failed: ${parseContractError(err)}`);
            throw err;
        }
    }, [senderAddress, walletAddress, mine, amount, toast]);

    const hasValidAmount = parseAmount(amount, 18) > 0n;
    const underlyingSymbol = mine.underlyingSymbol || (mine.symbol.startsWith('x') ? mine.symbol.slice(1) : mine.symbol);

    const wrapRate =
        mine.underlyingBalance > 0n && mine.totalSupply > 0n
            ? (Number(mine.totalSupply) / Number(mine.underlyingBalance)).toFixed(4)
            : '1.0000';

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
                        Wrap Tokens
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
                        max={userUnderlyingBalance ?? undefined}
                        loading={isConnected && userUnderlyingBalance === null}
                        decimals={18}
                        symbol={underlyingSymbol}
                        tokenName={mine.underlyingName || underlyingSymbol}
                        disabled={!isConnected}
                    />

                    {/* Preview — always visible while amount is valid */}
                    {hasValidAmount && (
                        <div style={{ border: '1px solid #000', padding: '16px' }}>
                            <p style={{ fontSize: '0.65rem', color: '#888', fontFamily: 'Sometype Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Preview</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ color: '#888', fontSize: '0.85rem' }}>You receive (est.)</span>
                                <span style={{ color: '#000', fontSize: '0.85rem' }}>
                                    {previewLoading || estimatedXAmount === null
                                        ? '...'
                                        : `${formatBalance(estimatedXAmount, 18)} ${mine.symbol}`}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ color: '#888', fontSize: '0.85rem' }}>Exchange rate</span>
                                <span style={{ color: '#000', fontSize: '0.85rem' }}>1 {underlyingSymbol} ≈ {wrapRate} {mine.symbol}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#888', fontSize: '0.85rem' }}>Wrap fee</span>
                                <span style={{ color: '#000', fontSize: '0.85rem' }}>{(Number(mine.wrapFee) / 10).toFixed(1)}%</span>
                            </div>
                        </div>
                    )}

                    {!isConnected ? (
                        <p style={{ textAlign: 'center', color: '#888', fontSize: '0.85rem', fontFamily: 'Sometype Mono, monospace', padding: '16px 0' }}>
                            Connect your wallet to wrap tokens
                        </p>
                    ) : (
                        <TransactionButton
                            label={`Wrap ${underlyingSymbol} → ${mine.symbol}`}
                            onClick={handleWrap}
                            disabled={!hasValidAmount}
                        />
                    )}

                </div>
            </div>
        </div>
    );
}
