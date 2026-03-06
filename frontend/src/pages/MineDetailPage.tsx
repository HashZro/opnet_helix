import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getContract, MotoSwapFactoryAbi } from 'opnet';
import { Address } from '@btc-vision/transaction';
import { useMine } from '../hooks/useMine';
import { useWallet } from '../hooks/useWallet';
import { useGenomePoolInfo } from '../hooks/useGenomePoolInfo';
import { formatBalance, parseAmount, parseContractError } from '../lib/helpers';
import { provider } from '../lib/provider';
import { NETWORK, CONTRACT_ADDRESSES } from '../config';
import { useToast } from '../contexts/ToastContext';
import { GENOME_ABI, OP_20_ABI } from '../lib/contracts';
import { WrapModal } from '../components/WrapModal';
import { UnwrapModal } from '../components/UnwrapModal';
import { AddLiquidityModal } from '../components/AddLiquidityModal';
import { ApyBadge } from '../components/ApyBadge';
import { useApyEstimate } from '../hooks/useApyEstimate';
import type { MineInfo } from '../hooks/useMines';

const SECTION_LABEL: React.CSSProperties = {
    fontSize: '0.65rem',
    color: '#888',
    fontFamily: 'Sometype Mono',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    marginBottom: '12px',
};

function BalanceCard({ label, amount, symbol, loading }: { label: string; amount: bigint | null; symbol: string; loading: boolean }) {
    return (
        <div style={{ flex: 1, border: '1px solid #000', padding: '20px 24px' }}>
            <div style={SECTION_LABEL}>{label}</div>
            {loading ? (
                <div style={{ background: '#eee', height: '36px', marginBottom: '6px' }} />
            ) : (
                <div style={{ fontFamily: 'Sometype Mono', fontSize: '2rem', fontWeight: 700, color: '#000', lineHeight: 1.1, wordBreak: 'break-all' }}>
                    {amount !== null ? formatBalance(amount, 18) : '—'}
                </div>
            )}
            <div style={{ fontFamily: 'Sometype Mono', fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>{symbol}</div>
        </div>
    );
}

function TokenCard({ label, symbol, address, pubkey, loading }: { label: string; symbol: string; address: string; pubkey: string; loading: boolean }) {
    const opscanUrl = pubkey ? `https://opscan.org/tokens/${pubkey}?network=op_testnet` : null;
    const [linkHovered, setLinkHovered] = useState(false);
    const [copied, setCopied] = useState(false);

    function handleCopy() {
        if (!address) return;
        navigator.clipboard.writeText(address).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    }

    return (
        <div style={{ flex: 1, border: '1px solid #000', padding: '16px 20px' }}>
            <div style={SECTION_LABEL}>{label}</div>
            {loading ? (
                <>
                    <div style={{ background: '#eee', height: '20px', marginBottom: '8px' }} />
                    <div style={{ background: '#eee', height: '14px', width: '70%' }} />
                </>
            ) : (
                <>
                    <div style={{ fontFamily: 'Mulish', fontWeight: 700, fontSize: '1.1rem', color: '#000', marginBottom: '8px' }}>{symbol}</div>
                    <div
                        onClick={handleCopy}
                        title="Click to copy"
                        style={{ position: 'relative', fontFamily: 'Sometype Mono', fontSize: '0.7rem', wordBreak: 'break-all', marginBottom: '10px', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'flex-start', gap: '5px' }}
                    >
                        <span style={{ color: '#555' }}>{address}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" style={{ flexShrink: 0, marginTop: '1px' }}>
                            <rect x="9" y="9" width="13" height="13" rx="0" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        {copied && (
                            <span style={{ position: 'absolute', inset: 0, background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                                ✓ Copied
                            </span>
                        )}
                    </div>
                    {opscanUrl && (
                        <a
                            href={opscanUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onMouseEnter={() => setLinkHovered(true)}
                            onMouseLeave={() => setLinkHovered(false)}
                            style={{
                                display: 'inline-block',
                                fontFamily: 'Sometype Mono',
                                fontSize: '0.7rem',
                                color: linkHovered ? '#fff' : '#000',
                                background: linkHovered ? '#000' : 'transparent',
                                border: '1px solid #000',
                                padding: '3px 8px',
                                textDecoration: 'none',
                            }}
                        >
                            View on OpScan ↗
                        </a>
                    )}
                </>
            )}
        </div>
    );
}

function TradeCard({ underlyingPubkey, xTokenPubkey, loading }: { underlyingPubkey: string; xTokenPubkey: string; loading: boolean }) {
    const [hovered, setHovered] = useState(false);
    const url = underlyingPubkey && xTokenPubkey
        ? `https://motoswap.org/swap/${underlyingPubkey}/${xTokenPubkey}/`
        : null;

    return (
        <div style={{ flex: 1, border: '1px solid #000', padding: '16px 20px', minWidth: '180px' }}>
            <div style={SECTION_LABEL}>Trade</div>
            {loading ? (
                <>
                    <div style={{ background: '#eee', height: '20px', marginBottom: '8px' }} />
                    <div style={{ background: '#eee', height: '14px', width: '70%' }} />
                </>
            ) : (
                <>
                    <div style={{ fontFamily: 'Mulish', fontWeight: 700, fontSize: '1.1rem', color: '#000', marginBottom: '8px' }}>MotoSwap</div>
                    {url && (
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onMouseEnter={() => setHovered(true)}
                            onMouseLeave={() => setHovered(false)}
                            style={{
                                display: 'inline-block',
                                fontFamily: 'Sometype Mono',
                                fontSize: '0.7rem',
                                color: hovered ? '#fff' : '#000',
                                background: hovered ? '#000' : 'transparent',
                                border: '1px solid #000',
                                padding: '3px 8px',
                                textDecoration: 'none',
                            }}
                        >
                            Trade on MotoSwap ↗
                        </a>
                    )}
                </>
            )}
        </div>
    );
}

function ActionBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
    const [hovered, setHovered] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                flex: 1,
                border: '1px solid #000',
                background: hovered ? '#fff' : '#000',
                color: hovered ? '#000' : '#fff',
                padding: '12px',
                fontFamily: 'Sometype Mono',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'background 0.1s, color 0.1s',
            }}
        >
            {children}
        </button>
    );
}

export function MineDetailPage() {
    const { address } = useParams<{ address: string }>();
    const { data: mine, loading, error } = useMine(address ?? null);
    const { isConnected, identityKey, senderAddress, address: walletAddress } = useWallet();
    const toast = useToast();
    const ratio = mine && mine.totalSupply > 0n ? Number(mine.underlyingBalance) / Number(mine.totalSupply) : 1.0;
    const apy = useApyEstimate(address ?? '', ratio);
    const [showWrap, setShowWrap] = useState(false);
    const [showUnwrap, setShowUnwrap] = useState(false);
    const [showAddLiquidity, setShowAddLiquidity] = useState(false);
    const [injectAmount, setInjectAmount] = useState('');
    const [isInjecting, setIsInjecting] = useState(false);
    const [wrapFeeInput, setWrapFeeInput] = useState('');
    const [isSettingWrapFee, setIsSettingWrapFee] = useState(false);
    const [unwrapFeeInput, setUnwrapFeeInput] = useState('');
    const [isSettingUnwrapFee, setIsSettingUnwrapFee] = useState(false);
    const [isCreatingPool, setIsCreatingPool] = useState(false);
    const [poolCopied, setPoolCopied] = useState(false);

    const poolInfo = useGenomePoolInfo(
        mine?.address ?? null,
        mine?.pubkey ?? '',
        mine?.underlyingPubkey ?? '',
        senderAddress ?? null,
    );
    const poolExists = poolInfo.poolAddress !== '';

    const isOwner = isConnected && !!identityKey && !!mine && identityKey.toLowerCase() === mine.ownerAddress.toLowerCase();

    async function handleInjectRewards() {
        if (!senderAddress || !walletAddress || !mine) return;
        const parsed = parseAmount(injectAmount, 18);
        if (parsed === 0n) { toast.error('Enter an amount greater than zero'); return; }
        setIsInjecting(true);
        try {
            const genomePubAddr = Address.fromString(mine.pubkey);
            const underlyingContractAddr = Address.fromString(mine.underlyingAddress);
            console.log('[injectRewards] increaseAllowance', { genome: mine.pubkey, underlying: mine.underlyingAddress, amount: parsed.toString() });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const underlyingContract = getContract<any>(underlyingContractAddr, OP_20_ABI as any, provider, NETWORK, senderAddress);
            const allowSim = await underlyingContract.increaseAllowance(genomePubAddr, parsed);
            if ('error' in (allowSim as object)) throw new Error(String((allowSim as { error: unknown }).error));
            toast.info('Approving underlying token...');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (allowSim as any).sendTransaction({ signer: null, mldsaSigner: null, refundTo: walletAddress });
            toast.success('Approved');
            console.log('[injectRewards] injectRewards', { amount: parsed.toString() });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const genomeContract = getContract<any>(mine.address, GENOME_ABI as any, provider, NETWORK, senderAddress);
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

    async function handleSetWrapFee() {
        if (!senderAddress || !walletAddress || !mine) return;
        const pct = parseFloat(wrapFeeInput);
        if (isNaN(pct) || pct < 0 || pct > 20) { toast.error('Wrap fee must be 0%–20%'); return; }
        const feeBps = BigInt(Math.round(pct * 10));
        setIsSettingWrapFee(true);
        try {
            console.log('[setWrapFee]', { feeBps: feeBps.toString() });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const genomeContract = getContract<any>(mine.address, GENOME_ABI as any, provider, NETWORK, senderAddress);
            const sim = await genomeContract.setWrapFee(feeBps);
            if ('error' in (sim as object)) throw new Error(String((sim as { error: unknown }).error));
            toast.info('Setting wrap fee...');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (sim as any).sendTransaction({ signer: null, mldsaSigner: null, refundTo: walletAddress });
            toast.success('Wrap fee updated');
            setWrapFeeInput('');
        } catch (err) {
            console.error('[setWrapFee] error:', err);
            toast.error(parseContractError(err));
        } finally {
            setIsSettingWrapFee(false);
        }
    }

    async function handleSetUnwrapFee() {
        if (!senderAddress || !walletAddress || !mine) return;
        const pct = parseFloat(unwrapFeeInput);
        if (isNaN(pct) || pct < 0 || pct > 20) { toast.error('Unwrap fee must be 0%–20%'); return; }
        const feeBps = BigInt(Math.round(pct * 10));
        setIsSettingUnwrapFee(true);
        try {
            console.log('[setUnwrapFee]', { feeBps: feeBps.toString() });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const genomeContract = getContract<any>(mine.address, GENOME_ABI as any, provider, NETWORK, senderAddress);
            const sim = await genomeContract.setUnwrapFee(feeBps);
            if ('error' in (sim as object)) throw new Error(String((sim as { error: unknown }).error));
            toast.info('Setting unwrap fee...');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (sim as any).sendTransaction({ signer: null, mldsaSigner: null, refundTo: walletAddress });
            toast.success('Unwrap fee updated');
            setUnwrapFeeInput('');
        } catch (err) {
            console.error('[setUnwrapFee] error:', err);
            toast.error(parseContractError(err));
        } finally {
            setIsSettingUnwrapFee(false);
        }
    }

    async function handleCreatePool() {
        if (!senderAddress || !walletAddress || !mine) return;
        setIsCreatingPool(true);
        try {
            console.log('[createPool]', { gTokenPubkey: mine.pubkey, underlyingPubkey: mine.underlyingPubkey });
            const factoryAddress = Address.fromString(CONTRACT_ADDRESSES.motoswapFactory);
            const gTokenAddr = Address.fromString(mine.pubkey);
            const underlyingAddr = Address.fromString(mine.underlyingPubkey!);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const factory = getContract<any>(factoryAddress, MotoSwapFactoryAbi as any, provider, NETWORK, senderAddress);
            const sim = await factory.createPool(gTokenAddr, underlyingAddr);
            if ('error' in (sim as object)) throw new Error(String((sim as { error: unknown }).error));
            toast.info('Creating pool...');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (sim as any).sendTransaction({ signer: null, mldsaSigner: null, refundTo: walletAddress });
            toast.success('Pool created');
        } catch (err) {
            console.error('[createPool] error:', err);
            toast.error(parseContractError(err));
        } finally {
            setIsCreatingPool(false);
        }
    }

    const underlyingSymbol = mine?.underlyingSymbol || (mine
        ? (mine.symbol.startsWith('x') ? mine.symbol.slice(1) : mine.symbol)
        : 'TOKEN');

    // Cast MineData → MineInfo shape for modals (fields are compatible)
    const mineAsInfo = mine as unknown as MineInfo;

    const divider = (
        <div style={{ backgroundImage: 'repeating-linear-gradient(to right, #000 0px, #000 1px, transparent 1px, transparent 6px)', height: '12px', width: '100%', margin: '28px 0' }} />
    );

    return (
        <div style={{ padding: '48px 0', maxWidth: '860px' }}>
            {/* Back + header */}
            <div style={{ marginBottom: '28px' }}>
                <Link
                    to="/"
                    style={{ fontFamily: 'Sometype Mono', fontSize: '0.75rem', color: '#888', textDecoration: 'none', display: 'inline-block', marginBottom: '12px' }}
                >
                    ← Back
                </Link>
                {loading ? (
                    <div style={{ background: '#eee', height: '28px', width: '50%' }} />
                ) : (
                    <h1 style={{ fontFamily: 'Mulish', fontWeight: 700, fontSize: '1.5rem', color: '#000', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontFamily: 'Sometype Mono', fontWeight: 400, fontSize: '1rem' }}>|||</span>
                        {mine ? mine.name : 'Genome Detail'}
                        {mine && <span style={{ fontFamily: 'Sometype Mono', fontWeight: 400, fontSize: '0.9rem', color: '#888' }}>{mine.symbol}</span>}
                    </h1>
                )}
            </div>

            {/* Error */}
            {error && (
                <div style={{ border: '1px solid #000', padding: '10px 14px', marginBottom: '24px', fontFamily: 'Sometype Mono', fontSize: '0.8rem' }}>
                    [!] {error}
                </div>
            )}

            {/* Token address cards */}
            <div style={SECTION_LABEL}>Tokens</div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
                <TokenCard
                    label="gToken"
                    symbol={mine?.symbol ?? '—'}
                    address={address ?? ''}
                    pubkey={mine?.pubkey ?? ''}
                    loading={loading}
                />
                <TokenCard
                    label="Underlying"
                    symbol={mine?.underlyingName ? `${mine.underlyingName} (${underlyingSymbol})` : underlyingSymbol}
                    address={mine?.underlyingAddress ?? ''}
                    pubkey={mine?.underlyingPubkey ?? ''}
                    loading={loading}
                />
                <TradeCard
                    underlyingPubkey={mine?.underlyingPubkey ?? ''}
                    xTokenPubkey={mine?.pubkey ?? ''}
                    loading={loading}
                />
            </div>

            {divider}

            {/* User balances + actions — only when wallet connected */}
            {isConnected && (
                <>
                    <div style={SECTION_LABEL}>Your Balances</div>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                        <BalanceCard
                            label={`${mine?.symbol ?? 'gToken'} Balance`}
                            amount={mine?.userXBalance ?? null}
                            symbol={mine?.symbol ?? ''}
                            loading={loading}
                        />
                        <BalanceCard
                            label={`${underlyingSymbol} Wallet Balance`}
                            amount={mine?.userUnderlyingBalance ?? null}
                            symbol={underlyingSymbol}
                            loading={loading}
                        />
                        <BalanceCard
                            label="Underlying Value of gTokens"
                            amount={mine?.userUnderlyingValue ?? null}
                            symbol={underlyingSymbol}
                            loading={loading}
                        />
                    </div>
                    {mine && (
                        <>
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                <ActionBtn onClick={() => setShowWrap(true)}>
                                    Wrap {underlyingSymbol} → {mine.symbol}
                                </ActionBtn>
                                <ActionBtn onClick={() => setShowUnwrap(true)}>
                                    Unwrap {mine.symbol} → {underlyingSymbol}
                                </ActionBtn>
                            </div>
                            {poolExists !== true && (
                                <div style={{ display: 'flex', gap: '12px', marginBottom: '28px' }}>
                                    <ActionBtn onClick={() => setShowAddLiquidity(true)}>
                                        + Add Liquidity on MotoSwap
                                    </ActionBtn>
                                </div>
                            )}
                        </>
                    )}
                    {divider}
                </>
            )}

            {/* Protocol stats */}
            <div style={SECTION_LABEL}>Protocol</div>
            {loading ? (
                <div style={{ marginBottom: '28px' }}>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} style={{ background: '#eee', height: '38px', marginBottom: '4px' }} />
                    ))}
                </div>
            ) : mine ? (
                <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #000', marginBottom: '28px' }}>
                    <tbody>
                        {[
                            ['Ratio', mine.ratio.toFixed(6)],
                            ['Total Wrapped', `${formatBalance(mine.underlyingBalance, 18)} ${underlyingSymbol}`],
                            ['gToken Supply', `${formatBalance(mine.totalSupply, 18)} ${mine.symbol}`],
                            ['Wrap Fee', `${(Number(mine.wrapFee) / 10).toFixed(1)}%`],
                            ['Unwrap Fee', `${(Number(mine.unwrapFee) / 10).toFixed(1)}%`],
                        ].map(([k, v]) => (
                            <tr key={k}>
                                <td style={{ border: '1px solid #000', padding: '10px 14px', fontSize: '0.8rem', fontFamily: 'Sometype Mono', color: '#888', width: '40%' }}>{k}</td>
                                <td style={{ border: '1px solid #000', padding: '10px 14px', fontSize: '0.8rem', fontFamily: 'Sometype Mono', color: '#000' }}>{v}</td>
                            </tr>
                        ))}
                        <tr>
                            <td colSpan={2} style={{ border: '1px solid #000', padding: '10px 14px', fontSize: '0.8rem', fontFamily: 'Sometype Mono' }}>
                                <ApyBadge apy={apy} labelColor="#888" valueColor="#000" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            ) : null}

            {/* Liquidity Pool */}
            {divider}
            <div style={SECTION_LABEL}>Liquidity Pool</div>
            {poolInfo.loading ? (
                <div style={{ marginBottom: '28px' }}>
                    {[1, 2].map(i => <div key={i} style={{ background: '#eee', height: '38px', marginBottom: '4px' }} />)}
                </div>
            ) : poolExists ? (
                <div style={{ border: '1px solid #000', marginBottom: '28px' }}>
                    {/* Pool address row */}
                    <div style={{ padding: '10px 14px', borderBottom: '1px solid #000', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'Sometype Mono', fontSize: '0.7rem', color: '#888', flexShrink: 0 }}>Pool</span>
                        <span
                            onClick={() => {
                                navigator.clipboard.writeText(poolInfo.poolAddress).then(() => {
                                    setPoolCopied(true);
                                    setTimeout(() => setPoolCopied(false), 1500);
                                });
                            }}
                            title="Click to copy"
                            style={{ fontFamily: 'Sometype Mono', fontSize: '0.7rem', color: '#555', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            {poolInfo.poolAddress.length > 20
                                ? poolInfo.poolAddress.slice(0, 10) + '…' + poolInfo.poolAddress.slice(-8)
                                : poolInfo.poolAddress}
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
                                <rect x="9" y="9" width="13" height="13" rx="0" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            {poolCopied && <span style={{ color: '#000', fontSize: '0.7rem' }}>✓</span>}
                        </span>
                        <a
                            href={`https://opscan.org/tokens/${poolInfo.poolAddress}?network=op_testnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontFamily: 'Sometype Mono', fontSize: '0.7rem', color: '#000', border: '1px solid #000', padding: '2px 6px', textDecoration: 'none', marginLeft: 'auto' }}
                        >
                            OpScan ↗
                        </a>
                    </div>
                    {/* Reserves */}
                    <div style={{ display: 'flex' }}>
                        <div style={{ flex: 1, padding: '10px 14px', borderRight: '1px solid #000' }}>
                            <div style={{ ...SECTION_LABEL, marginBottom: '4px' }}>Reserve0 ({mine?.symbol ?? 'gToken'})</div>
                            <div style={{ fontFamily: 'Sometype Mono', fontSize: '0.85rem', color: '#000' }}>
                                {formatBalance(poolInfo.reserve0, 18)}
                            </div>
                        </div>
                        <div style={{ flex: 1, padding: '10px 14px' }}>
                            <div style={{ ...SECTION_LABEL, marginBottom: '4px' }}>Reserve1 ({underlyingSymbol})</div>
                            <div style={{ fontFamily: 'Sometype Mono', fontSize: '0.85rem', color: '#000' }}>
                                {formatBalance(poolInfo.reserve1, 18)}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ border: '1px solid #000', padding: '16px 20px', marginBottom: '28px' }}>
                    <div style={{ fontFamily: 'Sometype Mono', fontSize: '0.8rem', color: '#888', marginBottom: '12px' }}>
                        No pool exists for this genome.
                    </div>
                    {isConnected && mine && (
                        <button
                            onClick={() => { void handleCreatePool(); }}
                            disabled={isCreatingPool}
                            style={{
                                border: '1px solid #000',
                                background: '#000',
                                color: '#fff',
                                padding: '10px 18px',
                                fontFamily: 'Sometype Mono',
                                fontSize: '0.85rem',
                                cursor: isCreatingPool ? 'not-allowed' : 'pointer',
                                opacity: isCreatingPool ? 0.6 : 1,
                            }}
                        >
                            {isCreatingPool ? 'Creating Pool...' : 'Create Pool'}
                        </button>
                    )}
                </div>
            )}

            {/* Owner Actions — only for genome owner */}
            {isOwner && mine && (
                <>
                    {divider}
                    <div style={SECTION_LABEL}>Owner Actions</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
                        {/* Inject Rewards */}
                        <div style={{ border: '1px solid #000', padding: '16px 20px' }}>
                            <div style={{ ...SECTION_LABEL, marginBottom: '8px' }}>Inject Rewards</div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    placeholder="Amount"
                                    value={injectAmount}
                                    onChange={e => setInjectAmount(e.target.value)}
                                    disabled={isInjecting}
                                    style={{ flex: 1, border: '1px solid #000', background: '#fff', padding: '8px 12px', fontFamily: 'Sometype Mono', fontSize: '0.85rem', outline: 'none', opacity: isInjecting ? 0.5 : 1 }}
                                />
                                <ActionBtn onClick={() => { void handleInjectRewards(); }}>
                                    {isInjecting ? 'Injecting...' : 'Inject'}
                                </ActionBtn>
                            </div>
                            <div style={{ fontFamily: 'Sometype Mono', fontSize: '0.7rem', color: '#888', marginTop: '6px' }}>
                                Transfer {underlyingSymbol} into the genome pool to increase the ratio
                            </div>
                        </div>
                        {/* Set Wrap Fee */}
                        <div style={{ border: '1px solid #000', padding: '16px 20px' }}>
                            <div style={{ ...SECTION_LABEL, marginBottom: '8px' }}>Set Wrap Fee</div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                                <input
                                    type="number"
                                    min="0"
                                    max="20"
                                    step="0.1"
                                    placeholder={`Current: ${(Number(mine.wrapFee) / 10).toFixed(1)}%`}
                                    value={wrapFeeInput}
                                    onChange={e => setWrapFeeInput(e.target.value)}
                                    disabled={isSettingWrapFee}
                                    style={{ flex: 1, border: '1px solid #000', background: '#fff', padding: '8px 12px', fontFamily: 'Sometype Mono', fontSize: '0.85rem', outline: 'none', opacity: isSettingWrapFee ? 0.5 : 1 }}
                                />
                                <ActionBtn onClick={() => { void handleSetWrapFee(); }}>
                                    {isSettingWrapFee ? 'Saving...' : 'Set'}
                                </ActionBtn>
                            </div>
                            <div style={{ fontFamily: 'Sometype Mono', fontSize: '0.7rem', color: '#888', marginTop: '6px' }}>
                                Enter percentage (0–20). Current: {(Number(mine.wrapFee) / 10).toFixed(1)}%
                            </div>
                        </div>
                        {/* Set Unwrap Fee */}
                        <div style={{ border: '1px solid #000', padding: '16px 20px' }}>
                            <div style={{ ...SECTION_LABEL, marginBottom: '8px' }}>Set Unwrap Fee</div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                                <input
                                    type="number"
                                    min="0"
                                    max="20"
                                    step="0.1"
                                    placeholder={`Current: ${(Number(mine.unwrapFee) / 10).toFixed(1)}%`}
                                    value={unwrapFeeInput}
                                    onChange={e => setUnwrapFeeInput(e.target.value)}
                                    disabled={isSettingUnwrapFee}
                                    style={{ flex: 1, border: '1px solid #000', background: '#fff', padding: '8px 12px', fontFamily: 'Sometype Mono', fontSize: '0.85rem', outline: 'none', opacity: isSettingUnwrapFee ? 0.5 : 1 }}
                                />
                                <ActionBtn onClick={() => { void handleSetUnwrapFee(); }}>
                                    {isSettingUnwrapFee ? 'Saving...' : 'Set'}
                                </ActionBtn>
                            </div>
                            <div style={{ fontFamily: 'Sometype Mono', fontSize: '0.7rem', color: '#888', marginTop: '6px' }}>
                                Enter percentage (0–20). Current: {(Number(mine.unwrapFee) / 10).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </>
            )}

            <div style={SECTION_LABEL}>Genomes</div>

            {showWrap && mineAsInfo && (
                <WrapModal mine={mineAsInfo} onClose={() => setShowWrap(false)} />
            )}
            {showUnwrap && mineAsInfo && (
                <UnwrapModal
                    mine={mineAsInfo}
                    onClose={() => setShowUnwrap(false)}
                    onOpenWrap={() => { setShowUnwrap(false); setShowWrap(true); }}
                />
            )}
            {showAddLiquidity && mineAsInfo && (
                <AddLiquidityModal mine={mineAsInfo} onClose={() => setShowAddLiquidity(false)} />
            )}
        </div>
    );
}
