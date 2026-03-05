import { useState, useEffect, useCallback } from 'react';
import { getContract } from 'opnet';
import { Address } from '@btc-vision/transaction';
import { useWallet } from '../hooks/useWallet';
import { useToast } from '../contexts/ToastContext';
import { useBalances } from '../contexts/BalancesContext';
import { provider } from '../lib/provider';
import { NETWORK, CONTRACT_ADDRESSES } from '../config';
import { OP_20_ABI, MOTOSWAP_ROUTER_ABI } from '../lib/contracts';
import { DepositInput } from './DepositInput';
import { TransactionButton } from './TransactionButton';
import { parseAmount } from '../lib/helpers';
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

interface AddLiquidityModalProps {
    mine: MineInfo;
    onClose: () => void;
}

export function AddLiquidityModal({ mine, onClose }: AddLiquidityModalProps) {
    const { senderAddress, address: walletAddress, isConnected } = useWallet();
    const toast = useToast();
    const { motoRaw, pillRaw } = useBalances();

    const [xAmount, setXAmount] = useState('');
    const [underlyingAmount, setUnderlyingAmount] = useState('');
    const [xBalance, setXBalance] = useState<bigint | null>(null);
    const [underlyingBalance, setUnderlyingBalance] = useState<bigint | null>(null);

    const underlyingSymbol = mine.symbol.startsWith('x') ? mine.symbol.slice(1) : mine.symbol;

    // Fetch xToken balance
    useEffect(() => {
        if (!isConnected || !senderAddress || !mine.address) { setXBalance(null); return; }
        let cancelled = false;
        const fetch = async () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const c = getContract<any>(mine.address, OP_20_ABI as any, provider, NETWORK, senderAddress);
                const res = await c.balanceOf(senderAddress);
                if (!cancelled) setXBalance(extractFirstU256(res));
            } catch { if (!cancelled) setXBalance(null); }
        };
        void fetch();
        return () => { cancelled = true; };
    }, [isConnected, senderAddress, mine.address]);

    // Fetch underlying balance (use context for MOTO/PILL)
    useEffect(() => {
        if (!isConnected || !senderAddress || !mine.underlyingAddress) { setUnderlyingBalance(null); return; }

        const addr = mine.underlyingAddress.toLowerCase();
        if (addr === CONTRACT_ADDRESSES.motoToken.toLowerCase() && motoRaw !== null) {
            setUnderlyingBalance(motoRaw); return;
        }
        if (addr === CONTRACT_ADDRESSES.pillToken.toLowerCase() && pillRaw !== null) {
            setUnderlyingBalance(pillRaw); return;
        }

        let cancelled = false;
        const fetch = async () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const c = getContract<any>(mine.underlyingAddress, OP_20_ABI as any, provider, NETWORK, senderAddress);
                const res = await c.balanceOf(senderAddress);
                if (!cancelled) setUnderlyingBalance(extractFirstU256(res));
            } catch { if (!cancelled) setUnderlyingBalance(null); }
        };
        void fetch();
        return () => { cancelled = true; };
    }, [isConnected, senderAddress, mine.underlyingAddress, motoRaw, pillRaw]);

    const handleAddLiquidity = useCallback(async () => {
        if (!senderAddress || !walletAddress) throw new Error('Connect wallet first');
        const rawX = parseAmount(xAmount, 18);
        const rawUnderlying = parseAmount(underlyingAmount, 18);
        if (rawX === 0n) throw new Error('Enter an xToken amount greater than zero');
        if (rawUnderlying === 0n) throw new Error('Enter an underlying token amount greater than zero');
        if (!mine.pubkey) throw new Error('Mine pubkey not loaded — try refreshing');
        if (!mine.underlyingAddress) throw new Error('Mine underlying not loaded');

        console.log('[AddLiquidity] xToken:', mine.address, 'amount:', rawX.toString());
        console.log('[AddLiquidity] underlying:', mine.underlyingAddress, 'amount:', rawUnderlying.toString());
        console.log('[AddLiquidity] router pubkey:', CONTRACT_ADDRESSES.motoswapRouter);

        const routerAddress = Address.fromString(CONTRACT_ADDRESSES.motoswapRouter);
        const xTokenPubkey = Address.fromString(mine.pubkey);

        // Get underlying pubkey via getCode
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const underlyingCode = await (provider as any).getCode(mine.underlyingAddress);
        const rawUnderlyingPubkey = underlyingCode?.contractPublicKey;
        const underlyingPubkeyStr: string = rawUnderlyingPubkey instanceof Uint8Array
            ? '0x' + Array.from(rawUnderlyingPubkey as Uint8Array).map((b: number) => b.toString(16).padStart(2, '0')).join('')
            : String(rawUnderlyingPubkey ?? '');
        console.log('[AddLiquidity] underlying pubkey:', underlyingPubkeyStr);
        const underlyingPubkey = Address.fromString(underlyingPubkeyStr);

        // Step 1: approve xToken → router
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const xTokenContract = getContract<any>(mine.address, OP_20_ABI as any, provider, NETWORK, senderAddress);
        const xAllowanceRes = await xTokenContract.allowance(senderAddress, routerAddress);
        const xAllowance = extractFirstU256(xAllowanceRes);
        console.log('[AddLiquidity] xToken current allowance:', xAllowance.toString(), 'needed:', rawX.toString());
        if (xAllowance < rawX) {
            const needed = rawX - xAllowance;
            const allowSim = await xTokenContract.increaseAllowance(routerAddress, needed);
            if ('error' in (allowSim as object)) throw new Error(String((allowSim as { error: unknown }).error));
            toast.info(`Approving ${mine.symbol} for router in OPWallet...`);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (allowSim as any).sendTransaction({
                refundTo: walletAddress,
                maximumAllowedSatToSpend: BigInt(100_000),
                feeRate: 10,
                network: NETWORK,
                minGas: BigInt(100_000),
            });
            toast.success(`${mine.symbol} allowance approved`);
        }

        // Step 2: approve underlying → router
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const underlyingContract = getContract<any>(mine.underlyingAddress, OP_20_ABI as any, provider, NETWORK, senderAddress);
        const uAllowanceRes = await underlyingContract.allowance(senderAddress, routerAddress);
        const uAllowance = extractFirstU256(uAllowanceRes);
        console.log('[AddLiquidity] underlying current allowance:', uAllowance.toString(), 'needed:', rawUnderlying.toString());
        if (uAllowance < rawUnderlying) {
            const needed = rawUnderlying - uAllowance;
            const allowSim = await underlyingContract.increaseAllowance(routerAddress, needed);
            if ('error' in (allowSim as object)) throw new Error(String((allowSim as { error: unknown }).error));
            toast.info(`Approving ${underlyingSymbol} for router in OPWallet...`);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (allowSim as any).sendTransaction({
                refundTo: walletAddress,
                maximumAllowedSatToSpend: BigInt(100_000),
                feeRate: 10,
                network: NETWORK,
                minGas: BigInt(100_000),
            });
            toast.success(`${underlyingSymbol} allowance approved`);
        }

        // Step 3: addLiquidity via router
        const blockHeight = await provider.getBlockNumber();
        const deadline = blockHeight + 100n;
        console.log('[AddLiquidity] blockHeight:', blockHeight.toString(), 'deadline:', deadline.toString());

        // 1% slippage
        const xMin = (rawX * 99n) / 100n;
        const underlyingMin = (rawUnderlying * 99n) / 100n;
        console.log('[AddLiquidity] addLiquidity params:', {
            tokenA: mine.pubkey,
            tokenB: underlyingPubkeyStr,
            amountADesired: rawX.toString(),
            amountBDesired: rawUnderlying.toString(),
            amountAMin: xMin.toString(),
            amountBMin: underlyingMin.toString(),
            to: senderAddress,
            deadline: deadline.toString(),
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const routerContract = getContract<any>(
            routerAddress,
            MOTOSWAP_ROUTER_ABI as any,
            provider,
            NETWORK,
            senderAddress
        );

        const sim = await routerContract.addLiquidity(
            xTokenPubkey,
            underlyingPubkey,
            rawX,
            rawUnderlying,
            xMin,
            underlyingMin,
            senderAddress,
            deadline
        );
        if ('error' in (sim as object)) throw new Error(String((sim as { error: unknown }).error));

        toast.info('Confirm add liquidity in OPWallet...');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (sim as any).sendTransaction({
            refundTo: walletAddress,
            maximumAllowedSatToSpend: BigInt(100_000),
            feeRate: 10,
            network: NETWORK,
            minGas: BigInt(100_000),
        });

        toast.success(`Liquidity added to ${mine.symbol}/${underlyingSymbol} pool!`);
        setXAmount('');
        setUnderlyingAmount('');
        onClose();
    }, [senderAddress, walletAddress, mine, xAmount, underlyingAmount, underlyingSymbol, toast, onClose]);

    const hasValidAmounts = parseAmount(xAmount, 18) > 0n && parseAmount(underlyingAmount, 18) > 0n;

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
                        Add Liquidity
                    </h2>
                    <button
                        onClick={onClose}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem', color: '#888', padding: '4px 8px' }}
                    >
                        ×
                    </button>
                </div>

                <p style={{ fontFamily: 'Sometype Mono, monospace', fontSize: '0.75rem', color: '#888', marginBottom: '20px' }}>
                    {mine.symbol} / {underlyingSymbol} — MotoSwap pool
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <DepositInput
                        value={xAmount}
                        onChange={setXAmount}
                        max={xBalance ?? undefined}
                        loading={isConnected && xBalance === null}
                        decimals={18}
                        symbol={mine.symbol}
                        tokenName={mine.name}
                        disabled={!isConnected}
                    />

                    <DepositInput
                        value={underlyingAmount}
                        onChange={setUnderlyingAmount}
                        max={underlyingBalance ?? undefined}
                        loading={isConnected && underlyingBalance === null}
                        decimals={18}
                        symbol={underlyingSymbol}
                        tokenName={mine.underlyingName || underlyingSymbol}
                        disabled={!isConnected}
                    />

                    {hasValidAmounts && (
                        <div style={{ border: '1px solid #000', padding: '16px' }}>
                            <p style={{ fontSize: '0.65rem', color: '#888', fontFamily: 'Sometype Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Summary</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ color: '#888', fontSize: '0.85rem' }}>Depositing</span>
                                <span style={{ color: '#000', fontSize: '0.85rem' }}>
                                    {xAmount} {mine.symbol} + {underlyingAmount} {underlyingSymbol}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#888', fontSize: '0.85rem' }}>Slippage</span>
                                <span style={{ color: '#000', fontSize: '0.85rem' }}>1%</span>
                            </div>
                        </div>
                    )}

                    {!isConnected ? (
                        <p style={{ textAlign: 'center', color: '#888', fontSize: '0.85rem', fontFamily: 'Sometype Mono, monospace', padding: '16px 0' }}>
                            Connect your wallet to add liquidity
                        </p>
                    ) : (
                        <TransactionButton
                            label={`Add ${mine.symbol} / ${underlyingSymbol} Liquidity`}
                            onClick={handleAddLiquidity}
                            disabled={!hasValidAmounts}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
