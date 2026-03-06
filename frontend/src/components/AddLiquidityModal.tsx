import { useState, useEffect, useCallback } from 'react';
import { getContract, MotoSwapFactoryAbi } from 'opnet';
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

    const [amount, setAmount] = useState('');
    const [xBalance, setXBalance] = useState<bigint | null>(null);
    const [underlyingBalance, setUnderlyingBalance] = useState<bigint | null>(null);
    const [poolExists, setPoolExists] = useState<boolean | null>(null);

    const underlyingSymbol = mine.underlyingSymbol || (mine.symbol.startsWith('x') ? mine.symbol.slice(1) : mine.symbol);
    // Single slider capped at whichever token the user has less of
    const maxAmount: bigint | undefined =
        xBalance !== null && underlyingBalance !== null
            ? (xBalance < underlyingBalance ? xBalance : underlyingBalance)
            : xBalance ?? underlyingBalance ?? undefined;

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

    // Check if pool exists on MotoSwap factory
    useEffect(() => {
        if (!mine.pubkey || !mine.underlyingAddress) return;
        let cancelled = false;
        const check = async () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const underlyingCode = await (provider as any).getCode(mine.underlyingAddress);
                const rawPubkey = underlyingCode?.contractPublicKey;
                const underlyingPubkeyStr: string = rawPubkey instanceof Uint8Array
                    ? '0x' + Array.from(rawPubkey as Uint8Array).map((b: number) => b.toString(16).padStart(2, '0')).join('')
                    : String(rawPubkey ?? '');
                const factoryAddress = Address.fromString(CONTRACT_ADDRESSES.motoswapFactory);
                const underlyingAddr = Address.fromString(underlyingPubkeyStr);
                const xTokenAddr = Address.fromString(mine.pubkey);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const factoryContract = getContract<any>(factoryAddress, MotoSwapFactoryAbi as any, provider, NETWORK);
                const res = await factoryContract.getPool(underlyingAddr, xTokenAddr);
                console.log('[AddLiquidity] getPool result:', res);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const poolAddress = (res as any)?.properties?.pool ?? (res as any)?.decoded?.[0];
                const poolStr = poolAddress?.toString?.() ?? '';
                // Zero address or empty = no pool
                const exists = poolStr !== '' && !poolStr.match(/^0x0+$/) && poolStr !== '0x';
                if (!cancelled) setPoolExists(exists);
            } catch (e) {
                console.warn('[AddLiquidity] pool check failed:', e);
                if (!cancelled) setPoolExists(null);
            }
        };
        void check();
        return () => { cancelled = true; };
    }, [mine.pubkey, mine.underlyingAddress]);

    const handleAddLiquidity = useCallback(async () => {
        if (!senderAddress || !walletAddress) throw new Error('Connect wallet first');
        const rawX = parseAmount(amount, 18);
        const rawUnderlying = parseAmount(amount, 18);
        if (rawX === 0n) throw new Error('Enter an amount greater than zero');
        if (!mine.pubkey) throw new Error('Mine pubkey not loaded — try refreshing');
        if (!mine.underlyingAddress) throw new Error('Mine underlying not loaded');

        console.log('[AddLiquidity] ══ START ══');
        console.log('[AddLiquidity] walletAddress:', walletAddress);
        console.log('[AddLiquidity] senderAddress:', senderAddress?.toString());
        console.log('[AddLiquidity] mine.address (xToken bech32):', mine.address);
        console.log('[AddLiquidity] mine.pubkey (xToken identity key):', mine.pubkey);
        console.log('[AddLiquidity] mine.underlyingAddress (bech32):', mine.underlyingAddress);
        console.log('[AddLiquidity] rawX:', rawX.toString());
        console.log('[AddLiquidity] rawUnderlying:', rawUnderlying.toString());
        console.log('[AddLiquidity] router pubkey:', CONTRACT_ADDRESSES.motoswapRouter);

        console.log('[AddLiquidity] ── building Address objects ──');
        const routerAddress = Address.fromString(CONTRACT_ADDRESSES.motoswapRouter);
        console.log('[AddLiquidity] routerAddress object:', routerAddress, routerAddress?.toString());
        const xTokenPubkey = Address.fromString(mine.pubkey);
        console.log('[AddLiquidity] xTokenPubkey object:', xTokenPubkey, xTokenPubkey?.toString());

        // Get underlying pubkey via getCode
        console.log('[AddLiquidity] ── fetching underlying contract code ──');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const underlyingCode = await (provider as any).getCode(mine.underlyingAddress);
        console.log('[AddLiquidity] underlyingCode raw:', underlyingCode);
        const rawUnderlyingPubkey = underlyingCode?.contractPublicKey;
        console.log('[AddLiquidity] rawUnderlyingPubkey type:', typeof rawUnderlyingPubkey, rawUnderlyingPubkey instanceof Uint8Array ? 'Uint8Array' : 'other');
        const underlyingPubkeyStr: string = rawUnderlyingPubkey instanceof Uint8Array
            ? '0x' + Array.from(rawUnderlyingPubkey as Uint8Array).map((b: number) => b.toString(16).padStart(2, '0')).join('')
            : String(rawUnderlyingPubkey ?? '');
        console.log('[AddLiquidity] underlyingPubkeyStr:', underlyingPubkeyStr);
        const underlyingPubkey = Address.fromString(underlyingPubkeyStr);
        console.log('[AddLiquidity] underlyingPubkey object:', underlyingPubkey, underlyingPubkey?.toString());

        // MotoSwap token ordering: underlying = tokenA, xToken = tokenB
        // (matches observed successful tx: MOTO=tokenA, xMOTO=tokenB)
        const tokenA = underlyingPubkey;
        const tokenB = xTokenPubkey;
        const tokenAAddress = mine.underlyingAddress;
        const tokenBAddress = mine.address;
        const amountADesired = rawUnderlying;
        const amountBDesired = rawX;
        console.log('[AddLiquidity] token ordering — tokenA (underlying):', tokenA?.toString(), '| tokenB (xToken):', tokenB?.toString());

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tokenAContract = getContract<any>(tokenAAddress, OP_20_ABI as any, provider, NETWORK, senderAddress);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tokenBContract = getContract<any>(tokenBAddress, OP_20_ABI as any, provider, NETWORK, senderAddress);

        // Step 1: check allowances and send approval txs if needed
        console.log('[AddLiquidity] ── step 1: allowance checks ──');
        const [aAllowanceRes, bAllowanceRes] = await Promise.all([
            tokenAContract.allowance(senderAddress, routerAddress),
            tokenBContract.allowance(senderAddress, routerAddress),
        ]);
        console.log('[AddLiquidity] tokenA allowanceRes:', aAllowanceRes);
        console.log('[AddLiquidity] tokenB allowanceRes:', bAllowanceRes);
        const aAllowance = extractFirstU256(aAllowanceRes);
        const bAllowance = extractFirstU256(bAllowanceRes);
        console.log('[AddLiquidity] tokenA (underlying) allowance:', aAllowance.toString(), '| needed:', amountADesired.toString());
        console.log('[AddLiquidity] tokenB (xToken) allowance:', bAllowance.toString(), '| needed:', amountBDesired.toString());

        const UINT256_MAX = (1n << 256n) - 1n;

        if (aAllowance < amountADesired) {
            console.log('[AddLiquidity] approving tokenA (underlying) — unlimited...');
            const allowSim = await tokenAContract.increaseAllowance(routerAddress, UINT256_MAX);
            console.log('[AddLiquidity] tokenA increaseAllowance sim:', allowSim);
            if ('error' in (allowSim as object)) throw new Error(String((allowSim as { error: unknown }).error));
            toast.info(`Approving ${underlyingSymbol} for router in OPWallet...`);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const aApproveResult = await (allowSim as any).sendTransaction({
                refundTo: walletAddress,
                maximumAllowedSatToSpend: BigInt(100_000),
                feeRate: 10,
                network: NETWORK,
                minGas: BigInt(100_000),
            });
            console.log('[AddLiquidity] tokenA approve sendTransaction result:', aApproveResult);
            toast.success(`${underlyingSymbol} allowance approved`);
        }

        if (bAllowance < amountBDesired) {
            console.log('[AddLiquidity] approving tokenB (xToken) — unlimited...');
            const allowSim = await tokenBContract.increaseAllowance(routerAddress, UINT256_MAX);
            console.log('[AddLiquidity] tokenB increaseAllowance sim:', allowSim);
            if ('error' in (allowSim as object)) throw new Error(String((allowSim as { error: unknown }).error));
            toast.info(`Approving ${mine.symbol} for router in OPWallet...`);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const bApproveResult = await (allowSim as any).sendTransaction({
                refundTo: walletAddress,
                maximumAllowedSatToSpend: BigInt(100_000),
                feeRate: 10,
                network: NETWORK,
                minGas: BigInt(100_000),
            });
            console.log('[AddLiquidity] tokenB approve sendTransaction result:', bApproveResult);
            toast.success(`${mine.symbol} allowance approved`);
        }

        // Step 2: build access list from approval simulations (required for addLiquidity simulation)
        // MotoSwap pattern: simulate both approvals → merge access lists → set on router → simulate addLiquidity
        console.log('[AddLiquidity] ── step 2: building access list for simulation ──');
        const [aSimForList, bSimForList] = await Promise.all([
            tokenAContract.increaseAllowance(routerAddress, UINT256_MAX),
            tokenBContract.increaseAllowance(routerAddress, UINT256_MAX),
        ]);
        console.log('[AddLiquidity] aSimForList:', aSimForList);
        console.log('[AddLiquidity] bSimForList:', bSimForList);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const aAccessList = (aSimForList as any)?.accessList ?? {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bAccessList = (bSimForList as any)?.accessList ?? {};
        const mergedAccessList = { ...aAccessList, ...bAccessList };
        console.log('[AddLiquidity] aAccessList:', aAccessList);
        console.log('[AddLiquidity] bAccessList:', bAccessList);
        console.log('[AddLiquidity] mergedAccessList:', mergedAccessList);

        // Step 3: addLiquidity via router with access list
        console.log('[AddLiquidity] ── step 3: addLiquidity ──');
        const blockHeight = await provider.getBlockNumber();
        const deadline = blockHeight + 100n;
        console.log('[AddLiquidity] blockHeight:', blockHeight.toString(), '| deadline:', deadline.toString());

        // 40% slippage (matching MotoSwap default for new pools)
        const aMin = (amountADesired * 60n) / 100n;
        const bMin = (amountBDesired * 60n) / 100n;
        console.log('[AddLiquidity] addLiquidity full params:', {
            tokenA: tokenA?.toString(),
            tokenB: tokenB?.toString(),
            amountADesired: amountADesired.toString(),
            amountBDesired: amountBDesired.toString(),
            amountAMin: aMin.toString(),
            amountBMin: bMin.toString(),
            to: senderAddress?.toString(),
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
        console.log('[AddLiquidity] routerContract created:', routerContract);
        console.log('[AddLiquidity] setting access list on routerContract...');
        routerContract.setAccessList(mergedAccessList);

        console.log('[AddLiquidity] calling routerContract.addLiquidity...');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let sim: any;
        try {
            sim = await routerContract.addLiquidity(
                tokenA,
                tokenB,
                amountADesired,
                amountBDesired,
                aMin,
                bMin,
                senderAddress,
                deadline
            );
            console.log('[AddLiquidity] addLiquidity sim result:', sim);
            console.log('[AddLiquidity] sim keys:', sim ? Object.keys(sim as object) : 'null');
            console.log('[AddLiquidity] sim.error:', (sim as any)?.error);
            console.log('[AddLiquidity] sim.result:', (sim as any)?.result);
            console.log('[AddLiquidity] sim.properties:', (sim as any)?.properties);
        } catch (simErr) {
            console.error('[AddLiquidity] addLiquidity simulation THREW:', simErr);
            console.error('[AddLiquidity] simErr message:', simErr instanceof Error ? simErr.message : String(simErr));
            console.error('[AddLiquidity] simErr stack:', simErr instanceof Error ? simErr.stack : 'no stack');
            throw simErr;
        }
        if ('error' in (sim as object)) {
            console.error('[AddLiquidity] sim returned error field:', (sim as { error: unknown }).error);
            throw new Error(String((sim as { error: unknown }).error));
        }

        toast.info('Confirm add liquidity in OPWallet...');
        console.log('[AddLiquidity] calling sim.sendTransaction...');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const txResult = await (sim as any).sendTransaction({
            refundTo: walletAddress,
            maximumAllowedSatToSpend: BigInt(100_000),
            feeRate: 10,
            network: NETWORK,
            minGas: BigInt(100_000),
        });
        console.log('[AddLiquidity] sendTransaction result:', txResult);

        toast.success(`Liquidity added to ${mine.symbol}/${underlyingSymbol} pool!`);
        setAmount('');
        onClose();
    }, [senderAddress, walletAddress, mine, amount, underlyingSymbol, toast, onClose]);

    const hasValidAmounts = parseAmount(amount, 18) > 0n;

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

                <p style={{ fontFamily: 'Sometype Mono, monospace', fontSize: '0.75rem', color: '#888', marginBottom: '12px' }}>
                    {mine.symbol} / {underlyingSymbol} — MotoSwap pool
                </p>

                {poolExists === false && (
                    <div style={{ border: '1px solid #000', background: '#f9f9f9', padding: '10px 14px', marginBottom: '16px', fontFamily: 'Sometype Mono, monospace', fontSize: '0.75rem', color: '#555' }}>
                        [!] No pool exists yet — your deposit will create one.
                    </div>
                )}
                {poolExists === true && (
                    <div style={{ border: '1px solid #ccc', padding: '10px 14px', marginBottom: '16px', fontFamily: 'Sometype Mono, monospace', fontSize: '0.75rem', color: '#555' }}>
                        ✓ Pool found on MotoSwap
                    </div>
                )}

                {/* 1:1 disclaimer */}
                <div style={{ border: '1px solid #e0c060', background: '#fffbe6', padding: '10px 14px', marginBottom: '4px', fontFamily: 'Sometype Mono, monospace', fontSize: '0.75rem', color: '#7a6000' }}>
                    ⚠ This pool requires a 1:1 ratio. Equal amounts of both tokens will be deposited.
                </div>

                {/* Per-token balances */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Sometype Mono, monospace', fontSize: '0.75rem', color: '#888', marginBottom: '4px' }}>
                    <span>{mine.symbol} balance: {xBalance !== null ? xBalance.toString() === '0' ? '0' : (Number(xBalance) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 4 }) : '…'}</span>
                    <span>{underlyingSymbol} balance: {underlyingBalance !== null ? underlyingBalance.toString() === '0' ? '0' : (Number(underlyingBalance) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 4 }) : '…'}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <DepositInput
                        value={amount}
                        onChange={setAmount}
                        max={maxAmount}
                        loading={isConnected && (xBalance === null || underlyingBalance === null)}
                        decimals={18}
                        symbol={`${mine.symbol} + ${underlyingSymbol}`}
                        tokenName={`${mine.name} / ${mine.underlyingName || underlyingSymbol}`}
                        disabled={!isConnected}
                    />

                    {hasValidAmounts && (
                        <div style={{ border: '1px solid #000', padding: '16px' }}>
                            <p style={{ fontSize: '0.65rem', color: '#888', fontFamily: 'Sometype Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Summary</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ color: '#888', fontSize: '0.85rem' }}>Depositing</span>
                                <span style={{ color: '#000', fontSize: '0.85rem' }}>
                                    {amount} {mine.symbol} + {amount} {underlyingSymbol}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ color: '#888', fontSize: '0.85rem' }}>Ratio</span>
                                <span style={{ color: '#000', fontSize: '0.85rem' }}>1:1</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#888', fontSize: '0.85rem' }}>Slippage</span>
                                <span style={{ color: '#000', fontSize: '0.85rem' }}>40%</span>
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
