import { useState } from 'react';
import { getContract, MotoswapPoolAbi } from 'opnet';
import { Address } from '@btc-vision/transaction';
import { useMines } from '../hooks/useMines';
import { useWallet } from '../hooks/useWallet';
import { useGenomePoolInfo } from '../hooks/useGenomePoolInfo';
import { useToast } from '../contexts/ToastContext';
import { formatBalance, truncateAddress, parseAmount, parseContractError } from '../lib/helpers';
import { GENOME_ABI, OP_20_ABI, MOTOSWAP_ROUTER_ABI } from '../lib/contracts';
import { provider } from '../lib/provider';
import { NETWORK, HIDDEN_MINE_PUBKEYS, CONTRACT_ADDRESSES } from '../config';
import type { MineInfo } from '../hooks/useMines';

function isZeroPool(addr: string): boolean {
    return !addr || /^0x0+$/.test(addr);
}

function SkeletonCard() {
    return (
        <div style={{ border: '1px solid #eee', background: '#fff', padding: '20px' }} className="animate-pulse">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <div style={{ background: '#eee', height: '20px', marginBottom: '8px', borderRadius: 0 }} className="w-24" />
                    <div style={{ background: '#eee', height: '16px', borderRadius: 0 }} className="w-16" />
                </div>
                <div style={{ background: '#eee', height: '16px', borderRadius: 0 }} className="w-20" />
            </div>
            <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex justify-between">
                        <div style={{ background: '#eee', height: '16px', borderRadius: 0 }} className="w-28" />
                        <div style={{ background: '#eee', height: '16px', borderRadius: 0 }} className="w-16" />
                    </div>
                ))}
            </div>
        </div>
    );
}

interface GenomeOwnerCardProps {
    mine: MineInfo;
    senderAddress: Address | null;
    onRefetch?: () => void;
}

function GenomeOwnerCard({ mine, senderAddress, onRefetch }: GenomeOwnerCardProps) {
    const { address, name, symbol, underlyingBalance, totalSupply, wrapFee, unwrapFee } = mine;
    const ratio = totalSupply > 0n ? Number(underlyingBalance) / Number(totalSupply) : 1.0;
    const wrapFeePercent = (Number(wrapFee) / 10).toFixed(1);
    const unwrapFeePercent = (Number(unwrapFee) / 10).toFixed(1);
    const underlyingSymbol = mine.underlyingSymbol || (symbol.startsWith('g') ? symbol.slice(1) : symbol);
    const [hovered, setHovered] = useState(false);
    const [copied, setCopied] = useState(false);
    const [injectAmount, setInjectAmount] = useState('');
    const [isInjecting, setIsInjecting] = useState(false);
    const [btnHovered, setBtnHovered] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [claimStep, setClaimStep] = useState(0);
    const [claimBtnHovered, setClaimBtnHovered] = useState(false);
    const [claimSuccess, setClaimSuccess] = useState(false);
    const [poolRefetchTrigger, setPoolRefetchTrigger] = useState(0);

    const toast = useToast();
    const { address: walletAddress } = useWallet();

    const poolInfo = useGenomePoolInfo(address, mine.pubkey, mine.underlyingAddress, senderAddress, poolRefetchTrigger);

    async function handleInject() {
        const parsed = parseAmount(injectAmount, 18);
        if (parsed === 0n) {
            toast.error('Enter an amount greater than zero');
            return;
        }
        setIsInjecting(true);
        try {
            const genomePubAddr = Address.fromString(mine.pubkey);
            const underlyingAddr = Address.fromString(mine.underlyingAddress);

            console.log('[injectRewards] increaseAllowance', { genome: mine.pubkey, underlying: mine.underlyingAddress, parsed: parsed.toString() });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const underlyingContract = getContract<any>(underlyingAddr, OP_20_ABI as any, provider, NETWORK, senderAddress ?? undefined);
            const allowSim = await underlyingContract.increaseAllowance(genomePubAddr, parsed);
            if ('error' in (allowSim as object)) throw new Error(String((allowSim as { error: unknown }).error));
            toast.info('Approving underlying token...');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (allowSim as any).sendTransaction({ signer: null, mldsaSigner: null, refundTo: walletAddress });
            toast.success('Approved');

            console.log('[injectRewards] injectRewards', { amount: parsed.toString() });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const genomeContract = getContract<any>(mine.address, GENOME_ABI as any, provider, NETWORK, senderAddress ?? undefined);
            const injectSim = await genomeContract.injectRewards(parsed);
            if ('error' in (injectSim as object)) throw new Error(String((injectSim as { error: unknown }).error));
            toast.info('Injecting rewards...');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (injectSim as any).sendTransaction({ signer: null, mldsaSigner: null, refundTo: walletAddress });
            toast.success('Rewards injected — ratio increased');
            setInjectAmount('');
        } catch (err) {
            console.error('[injectRewards] error:', err);
            toast.error(parseContractError(err));
        } finally {
            setIsInjecting(false);
        }
    }

    async function handleClaimLP() {
        if (!senderAddress) return;
        setIsClaiming(true);
        setClaimStep(1);
        try {
            const routerAddr = Address.fromString(CONTRACT_ADDRESSES.motoswapRouter);

            // Step 1: Approve LP tokens to router
            console.log('[claimLP] Step 1: Approving LP tokens to router', {
                poolAddress: poolInfo.poolAddress,
                router: CONTRACT_ADDRESSES.motoswapRouter,
                lpBalance: poolInfo.lpBalance.toString(),
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const poolContract = getContract<any>(poolInfo.poolAddress, MotoswapPoolAbi as any, provider, NETWORK, senderAddress);
            const approveSim = await poolContract.increaseAllowance(routerAddr, poolInfo.lpBalance);
            console.log('[claimLP] increaseAllowance sim:', approveSim);
            if ('error' in (approveSim as object)) throw new Error(String((approveSim as { error: unknown }).error));
            toast.info('Step 1/3: Approving LP tokens...');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (approveSim as any).sendTransaction({ signer: null, mldsaSigner: null, refundTo: walletAddress });
            toast.success('LP tokens approved');

            // Step 2: Remove liquidity
            setClaimStep(2);
            const gTokenAddr = Address.fromString(mine.pubkey);
            const underlyingAddr = Address.fromString(mine.underlyingAddress);
            const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

            console.log('[claimLP] Step 2: Removing liquidity', {
                gToken: mine.pubkey,
                underlying: mine.underlyingAddress,
                lpBalance: poolInfo.lpBalance.toString(),
                deadline: deadline.toString(),
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const routerContract = getContract<any>(routerAddr, MOTOSWAP_ROUTER_ABI as any, provider, NETWORK, senderAddress);
            const removeSim = await routerContract.removeLiquidity(
                gTokenAddr,
                underlyingAddr,
                poolInfo.lpBalance,
                0n,
                0n,
                senderAddress,
                deadline,
            );
            console.log('[claimLP] removeLiquidity sim:', removeSim);
            console.log('[claimLP] removeLiquidity sim keys:', removeSim ? Object.keys(removeSim as object) : 'null');
            console.log('[claimLP] removeLiquidity properties:', (removeSim as any)?.properties);
            console.log('[claimLP] removeLiquidity decoded:', (removeSim as any)?.decoded);
            if ('error' in (removeSim as object)) throw new Error(String((removeSim as { error: unknown }).error));
            toast.info('Step 2/3: Removing liquidity...');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (removeSim as any).sendTransaction({ signer: null, mldsaSigner: null, refundTo: walletAddress });

            // Extract underlyingAmount from result (used in Step 3 — S149)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const props = (removeSim as any)?.properties;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const decoded = (removeSim as any)?.decoded;
            const underlyingAmount: bigint = (() => {
                if (props?.amountB !== undefined && props.amountB !== null) return BigInt(props.amountB.toString());
                if (props?.amountA !== undefined && props.amountA !== null) return BigInt(props.amountA.toString());
                if (Array.isArray(decoded) && decoded.length > 1) return BigInt(decoded[1].toString());
                if (Array.isArray(decoded) && decoded.length > 0) return BigInt(decoded[0].toString());
                return 0n;
            })();
            console.log('[claimLP] underlyingAmount extracted:', underlyingAmount.toString());
            toast.success('Liquidity removed');

            // Step 3: Inject underlying into genome (reuse gTokenAddr/underlyingAddr from step 2)
            setClaimStep(3);

            console.log('[claimLP] Step 3a: Approving underlying to genome', {
                underlying: mine.underlyingAddress,
                genome: mine.pubkey,
                underlyingAmount: underlyingAmount.toString(),
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const underlyingContract = getContract<any>(underlyingAddr, OP_20_ABI as any, provider, NETWORK, senderAddress);
            const approveSim2 = await underlyingContract.increaseAllowance(gTokenAddr, underlyingAmount);
            console.log('[claimLP] Step 3a increaseAllowance sim:', approveSim2);
            if ('error' in (approveSim2 as object)) throw new Error(String((approveSim2 as { error: unknown }).error));
            toast.info('Step 3/3: Approving underlying to genome...');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (approveSim2 as any).sendTransaction({ signer: null, mldsaSigner: null, refundTo: walletAddress });
            toast.success('Underlying approved');

            console.log('[claimLP] Step 3b: Injecting rewards into genome', { amount: underlyingAmount.toString() });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const genomeContract = getContract<any>(mine.address, GENOME_ABI as any, provider, NETWORK, senderAddress);
            const injectSim = await genomeContract.injectRewards(underlyingAmount);
            console.log('[claimLP] Step 3b injectRewards sim:', injectSim);
            if ('error' in (injectSim as object)) throw new Error(String((injectSim as { error: unknown }).error));
            toast.info('Step 3/3: Injecting rewards into genome...');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (injectSim as any).sendTransaction({ signer: null, mldsaSigner: null, refundTo: walletAddress });

            toast.success('LP fees claimed and injected into genome! Ratio increased.');
            setClaimSuccess(true);
            setPoolRefetchTrigger(t => t + 1);
            onRefetch?.();
        } catch (err) {
            console.error('[claimLP] error:', err);
            toast.error(parseContractError(err));
        } finally {
            setIsClaiming(false);
            setClaimStep(0);
        }
    }

    const claimStepLabel = claimStep === 1 ? 'Step 1/3: Approving LP...'
        : claimStep === 2 ? 'Step 2/3: Removing liquidity...'
        : claimStep === 3 ? 'Step 3/3: Injecting rewards...'
        : null;

    const handleCopy = () => {
        navigator.clipboard.writeText(poolInfo.poolAddress).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
    };

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                position: 'relative',
                border: '1px solid #000',
                background: hovered ? '#000' : '#fff',
                padding: '20px',
                transition: 'background 0s',
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                    <h3 style={{ fontFamily: 'Mulish', fontWeight: 700, fontSize: '1rem', color: hovered ? '#fff' : '#000', marginBottom: '2px' }}>{name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'Sometype Mono', color: hovered ? '#aaa' : '#888' }}>{symbol}</span>
                        <span style={{ fontSize: '0.65rem', color: hovered ? '#666' : '#ccc' }}>▸</span>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'Sometype Mono', color: hovered ? '#bbb' : '#555' }}>{underlyingSymbol}</span>
                    </div>
                </div>
                <span style={{ fontSize: '0.7rem', color: hovered ? '#aaa' : '#888', fontFamily: 'Sometype Mono', marginTop: '2px' }}>{truncateAddress(address)}</span>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '12px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: hovered ? '#aaa' : '#888', fontSize: '0.8rem' }}>Ratio</span>
                    <span style={{ color: hovered ? '#fff' : '#000', fontSize: '0.8rem' }}>{ratio.toFixed(6)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: hovered ? '#aaa' : '#888', fontSize: '0.8rem' }}>Total Wrapped</span>
                    <span style={{ color: hovered ? '#fff' : '#000', fontSize: '0.8rem' }}>{formatBalance(underlyingBalance, 18)} {underlyingSymbol}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: hovered ? '#aaa' : '#888', fontSize: '0.8rem' }}>Wrap Fee</span>
                    <span style={{ color: hovered ? '#fff' : '#000', fontSize: '0.8rem' }}>{wrapFeePercent}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: hovered ? '#aaa' : '#888', fontSize: '0.8rem' }}>Unwrap Fee</span>
                    <span style={{ color: hovered ? '#fff' : '#000', fontSize: '0.8rem' }}>{unwrapFeePercent}%</span>
                </div>
            </div>

            {/* Pool info */}
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: `1px solid ${hovered ? '#333' : '#eee'}` }}>
                <div style={{ fontFamily: 'Sometype Mono', fontSize: '0.65rem', color: hovered ? '#666' : '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Liquidity Pool
                </div>
                {poolInfo.loading ? (
                    <div style={{ background: '#eee', height: '14px', width: '60%' }} className="animate-pulse" />
                ) : isZeroPool(poolInfo.poolAddress) ? (
                    <div style={{ display: 'inline-block', border: `1px solid ${hovered ? '#555' : '#ccc'}`, padding: '2px 8px', fontFamily: 'Sometype Mono', fontSize: '0.7rem', color: hovered ? '#888' : '#999' }}>
                        No Pool
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontFamily: 'Sometype Mono', fontSize: '0.7rem', color: hovered ? '#bbb' : '#555' }}>
                                {truncateAddress(poolInfo.poolAddress)}
                            </span>
                            <button
                                onClick={handleCopy}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Sometype Mono', fontSize: '0.65rem', color: hovered ? '#888' : '#aaa', padding: '0 4px' }}
                            >
                                {copied ? '✓' : '⎘'}
                            </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: hovered ? '#aaa' : '#888', fontSize: '0.75rem' }}>Reserve A</span>
                            <span style={{ color: hovered ? '#fff' : '#000', fontSize: '0.75rem', fontFamily: 'Sometype Mono' }}>{formatBalance(poolInfo.reserve0, 18)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: hovered ? '#aaa' : '#888', fontSize: '0.75rem' }}>Reserve B</span>
                            <span style={{ color: hovered ? '#fff' : '#000', fontSize: '0.75rem', fontFamily: 'Sometype Mono' }}>{formatBalance(poolInfo.reserve1, 18)}</span>
                        </div>
                        {senderAddress && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: hovered ? '#aaa' : '#888', fontSize: '0.75rem' }}>LP Balance</span>
                                <span style={{ color: hovered ? '#fff' : '#000', fontSize: '0.75rem', fontFamily: 'Sometype Mono' }}>{formatBalance(poolInfo.lpBalance, 18)}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Inject Rewards — only shown when connected */}
            {senderAddress && (
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: `1px solid ${hovered ? '#333' : '#eee'}` }}>
                    <div style={{ fontFamily: 'Sometype Mono', fontSize: '0.65rem', color: hovered ? '#666' : '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Inject Rewards
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                        <input
                            type="text"
                            value={injectAmount}
                            onChange={e => setInjectAmount(e.target.value)}
                            placeholder={`0.0 ${underlyingSymbol}`}
                            disabled={isInjecting}
                            style={{
                                flex: 1,
                                border: `1px solid ${hovered ? '#555' : '#000'}`,
                                background: 'transparent',
                                color: hovered ? '#fff' : '#000',
                                padding: '6px 10px',
                                fontFamily: 'Sometype Mono',
                                fontSize: '0.8rem',
                                outline: 'none',
                            }}
                        />
                        <button
                            onClick={handleInject}
                            disabled={isInjecting || !injectAmount}
                            onMouseEnter={() => setBtnHovered(true)}
                            onMouseLeave={() => setBtnHovered(false)}
                            style={{
                                border: `1px solid ${hovered ? '#fff' : '#000'}`,
                                background: btnHovered && !isInjecting && injectAmount ? (hovered ? '#fff' : '#000') : 'transparent',
                                color: btnHovered && !isInjecting && injectAmount ? (hovered ? '#000' : '#fff') : (hovered ? '#fff' : '#000'),
                                padding: '6px 12px',
                                fontFamily: 'Sometype Mono',
                                fontSize: '0.75rem',
                                cursor: isInjecting || !injectAmount ? 'not-allowed' : 'pointer',
                                opacity: isInjecting || !injectAmount ? 0.5 : 1,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {isInjecting ? '...' : 'Inject Rewards'}
                        </button>
                    </div>
                </div>
            )}

            {/* Claim LP Rewards — only shown when connected and LP balance > 0 */}
            {senderAddress && poolInfo.lpBalance > 0n && (
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: `1px solid ${hovered ? '#333' : '#eee'}` }}>
                    <div style={{ fontFamily: 'Sometype Mono', fontSize: '0.65rem', color: hovered ? '#666' : '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Claim LP Fees
                    </div>
                    {claimSuccess && (
                        <div style={{ fontFamily: 'Sometype Mono', fontSize: '0.7rem', color: hovered ? '#6f6' : '#060', marginBottom: '8px' }}>
                            LP fees claimed and injected into genome! Ratio increased.
                        </div>
                    )}
                    {isClaiming && claimStepLabel && (
                        <div style={{ fontFamily: 'Sometype Mono', fontSize: '0.7rem', color: hovered ? '#aaa' : '#555', marginBottom: '8px' }}>
                            {claimStepLabel}
                        </div>
                    )}
                    <button
                        onClick={handleClaimLP}
                        disabled={isClaiming}
                        onMouseEnter={() => setClaimBtnHovered(true)}
                        onMouseLeave={() => setClaimBtnHovered(false)}
                        style={{
                            border: `1px solid ${hovered ? '#fff' : '#000'}`,
                            background: claimBtnHovered && !isClaiming ? (hovered ? '#fff' : '#000') : 'transparent',
                            color: claimBtnHovered && !isClaiming ? (hovered ? '#000' : '#fff') : (hovered ? '#fff' : '#000'),
                            padding: '6px 12px',
                            fontFamily: 'Sometype Mono',
                            fontSize: '0.75rem',
                            cursor: isClaiming ? 'not-allowed' : 'pointer',
                            opacity: isClaiming ? 0.5 : 1,
                            whiteSpace: 'nowrap',
                            width: '100%',
                        }}
                    >
                        {isClaiming ? claimStepLabel ?? '...' : 'Claim LP Fees -> Genome'}
                    </button>
                </div>
            )}
        </div>
    );
}

export function MyGenomesPage() {
    const { mines: allMines, loading, error, refetch } = useMines();
    const { identityKey, isConnected, senderAddress } = useWallet();

    const mines = allMines
        .filter(m => !HIDDEN_MINE_PUBKEYS.includes(m.pubkey))
        .filter(m => identityKey && m.ownerAddress.toLowerCase() === identityKey.toLowerCase());

    return (
        <div style={{ padding: '48px 0' }}>
            <div style={{ marginBottom: '16px' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'Mulish', fontWeight: 700, fontSize: '1.5rem', color: '#000', lineHeight: 1.1 }}>
                    <span style={{ fontFamily: 'Sometype Mono', fontSize: '1rem', fontWeight: 400 }}>&#8801;</span>My <strong>Genomes</strong>
                </h1>
                <p style={{ fontFamily: 'Sometype Mono', fontSize: '0.8rem', color: '#888', marginTop: '8px' }}>Genomes you have deployed.</p>
            </div>

            {error && (
                <div style={{ border: '1px solid #000', padding: '16px', marginBottom: '24px', fontFamily: 'Sometype Mono', fontSize: '0.8rem', color: '#000' }}>
                    [!] {error}
                </div>
            )}

            <div style={{ backgroundImage: 'repeating-linear-gradient(to right, #000 0px, #000 1px, transparent 1px, transparent 6px)', height: '16px', width: '100%', margin: '32px 0' }} />

            {!isConnected ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#888', fontFamily: 'Sometype Mono' }}>
                    <p>Connect your wallet to see your Genomes.</p>
                </div>
            ) : loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
                </div>
            ) : mines.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#888', fontFamily: 'Sometype Mono' }}>
                    <p>You have not created any Genomes yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mines.map((mine) => <GenomeOwnerCard key={mine.address} mine={mine} senderAddress={senderAddress} onRefetch={refetch} />)}
                </div>
            )}
        </div>
    );
}
