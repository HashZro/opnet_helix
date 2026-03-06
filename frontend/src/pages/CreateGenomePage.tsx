import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TransactionFactory, OPNetLimitedProvider, BinaryWriter, Address } from '@btc-vision/transaction';
import { getContract, MotoSwapFactoryAbi, type IMotoswapFactoryContract } from 'opnet';
import { useWallet } from '../hooks/useWallet';
import { useToast } from '../contexts/ToastContext';
import { provider } from '../lib/provider';
import { NETWORK, CONTRACT_ADDRESSES, RPC_URL } from '../config';
import { FACTORY_ABI, MINE_ABI, OP_20_ABI } from '../lib/contracts';

async function computeSelector(sig: string): Promise<number> {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sig));
    return new DataView(hash).getUint32(0, false);
}

async function loadBytecode(): Promise<Uint8Array> {
    const resp = await fetch('./Genome.wasm');
    const buf = await resp.arrayBuffer();
    return new Uint8Array(buf);
}

const labelStyle: React.CSSProperties = {
    fontSize: '0.65rem',
    color: '#888',
    fontFamily: 'Sometype Mono, monospace',
    display: 'block',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid #000',
    background: '#fff',
    color: '#000',
    padding: '10px 12px',
    fontFamily: 'Sometype Mono, monospace',
    fontSize: '0.85rem',
    outline: 'none',
    boxSizing: 'border-box',
};

const disabledInput: React.CSSProperties = {
    ...inputStyle,
    background: '#f5f5f5',
    color: '#aaa',
    borderColor: '#ddd',
    cursor: 'not-allowed',
};

const SECTION_LABEL: React.CSSProperties = {
    fontSize: '0.65rem',
    color: '#888',
    fontFamily: 'Sometype Mono',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    marginBottom: '12px',
};

// ---------------------------------------------------------------------------
// Helpers (mirrors useMines / AddLiquidityModal patterns)
// ---------------------------------------------------------------------------
function extractFirstBigInt(res: unknown): bigint {
    const r = res as Record<string, unknown> | null;
    const props = r?.properties as Record<string, unknown> | undefined;
    if (props) { for (const v of Object.values(props)) { if (v !== null && v !== undefined) return BigInt((v as { toString(): string }).toString()); } }
    const decoded = (r?.decoded as unknown[] | undefined)?.[0];
    if (decoded !== null && decoded !== undefined) return BigInt((decoded as { toString(): string }).toString());
    return 0n;
}

function extractAddressStr(res: unknown): string {
    const r = res as Record<string, unknown> | null;
    const props = r?.properties as Record<string, unknown> | undefined;
    if (props) { for (const v of Object.values(props)) { if (v !== null && v !== undefined) return (v as { toString(): string }).toString?.() ?? ''; } }
    const decoded = (r?.decoded as unknown[] | undefined)?.[0];
    if (decoded !== null && decoded !== undefined) return String(decoded);
    return '';
}

function extractStr(res: unknown, field: string): string {
    const r = res as Record<string, unknown> | null;
    const val = (r?.properties as Record<string, unknown> | undefined)?.[field];
    if (val !== null && val !== undefined) return String(val);
    const decoded = (r?.decoded as unknown[] | undefined)?.[0];
    if (decoded !== null && decoded !== undefined) return String(decoded);
    return '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildMineAtIndexCalldata(factoryContract: any, index: number): string {
    const selectorBuf: Uint8Array = factoryContract.encodeCalldata('getMineAtIndex', []);
    const params = new BinaryWriter();
    params.writeU256(BigInt(index));
    const paramsBuf = params.getBuffer();
    const calldata = new Uint8Array(selectorBuf.length + paramsBuf.length);
    calldata.set(selectorBuf, 0);
    calldata.set(paramsBuf, selectorBuf.length);
    return '0x' + Array.from(calldata).map((b: number) => b.toString(16).padStart(2, '0')).join('');
}

export function CreateGenomePage() {
    const { address: walletAddress, senderAddress, isConnected } = useWallet();
    const toast = useToast();

    const [underlyingAddress, setUnderlyingAddress] = useState('');
    const [underlyingInfo, setUnderlyingInfo] = useState<{ name: string; symbol: string } | null>(null);
    const [underlyingFetching, setUnderlyingFetching] = useState(false);
    const [wrapFee, setWrapFee] = useState(50);
    const [unwrapFee, setUnwrapFee] = useState(50);
    const [isBusy, setIsBusy] = useState(false);
    const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
    const [registered, setRegistered] = useState(false);

    // resolved after deployment

    // pool creation (step 3)
    const [poolCreated, setPoolCreated] = useState(false);
    const [createdPoolAddress, setCreatedPoolAddress] = useState<string | null>(null);

    // pool existence check
    const [poolCheckLoading, setPoolCheckLoading] = useState(false);
    const [poolExistsForUnderlying, setPoolExistsForUnderlying] = useState(false);

    const derivedName = underlyingInfo ? 'g' + underlyingInfo.symbol.toUpperCase() : '';
    const derivedSymbol = underlyingInfo ? 'g' + underlyingInfo.symbol.toUpperCase() : '';


    // -----------------------------------------------------------------------
    // Pool existence check — fires when underlying address changes
    // -----------------------------------------------------------------------
    useEffect(() => {
        const addr = underlyingAddress.trim();
        if (!addr || addr.length < 10) { setPoolExistsForUnderlying(false); setPoolCheckLoading(false); return; }
        let cancelled = false;
        setPoolCheckLoading(true);
        const check = async () => {
            try {
                // 1. Resolve underlying pubkey
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const code = await (provider as any).getCode(addr);
                const rawPubkey = code?.contractPublicKey;
                if (!rawPubkey) { if (!cancelled) { setPoolExistsForUnderlying(false); setPoolCheckLoading(false); } return; }
                const underlyingPubkeyStr: string = rawPubkey instanceof Uint8Array
                    ? '0x' + Array.from(rawPubkey as Uint8Array).map((b: number) => b.toString(16).padStart(2, '0')).join('')
                    : String(rawPubkey);

                // 2. Get all mine addresses from Factory
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const factoryContract = getContract<any>(CONTRACT_ADDRESSES.factory, FACTORY_ABI as any, provider, NETWORK);
                const countRes = await factoryContract.getMineCount();
                const count = Number(extractFirstBigInt(countRes));
                if (count === 0) { if (!cancelled) { setPoolExistsForUnderlying(false); setPoolCheckLoading(false); } return; }

                const calldatas = Array.from({ length: count }, (_, i) => buildMineAtIndexCalldata(factoryContract, i));
                const addrResults = await Promise.all(calldatas.map(cd => provider.call(CONTRACT_ADDRESSES.factory, cd as any)));
                const mineAddresses = addrResults
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map(res => (res as any)?.result?.readAddress?.()?.toString?.() ?? '')
                    .filter(Boolean);

                // 3. For each mine, check if underlying matches → check MotoSwap pool
                const motoFactory = getContract<any>(
                    Address.fromString(CONTRACT_ADDRESSES.motoswapFactory),
                    MotoSwapFactoryAbi as any,
                    provider,
                    NETWORK
                );
                const underlyingAddr = Address.fromString(underlyingPubkeyStr);

                for (const mineAddr of mineAddresses) {
                    if (cancelled) return;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const mineContract = getContract<any>(mineAddr, MINE_ABI as any, provider, NETWORK);
                    const underlyingRes = await mineContract.getUnderlying();
                    const mineUnderlyingStr = extractAddressStr(underlyingRes);
                    const matches = mineUnderlyingStr && (
                        mineUnderlyingStr.toLowerCase() === underlyingPubkeyStr.toLowerCase() ||
                        mineUnderlyingStr.toLowerCase() === addr.toLowerCase()
                    );
                    if (!matches) continue;

                    // Found a mine wrapping this underlying — get its pubkey
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const mineCode = await (provider as any).getCode(mineAddr);
                    const mineRaw = mineCode?.contractPublicKey;
                    const minePubkeyStr: string = mineRaw instanceof Uint8Array
                        ? '0x' + Array.from(mineRaw as Uint8Array).map((b: number) => b.toString(16).padStart(2, '0')).join('')
                        : String(mineRaw ?? '');

                    const poolRes = await motoFactory.getPool(underlyingAddr, Address.fromString(minePubkeyStr));
                    const poolStr = extractAddressStr(poolRes);
                    const exists = poolStr !== '' && !poolStr.match(/^0x0+$/) && poolStr !== '0x';
                    if (exists) {
                        if (!cancelled) { setPoolExistsForUnderlying(true); setPoolCheckLoading(false); }
                        return;
                    }
                }

                if (!cancelled) { setPoolExistsForUnderlying(false); setPoolCheckLoading(false); }
            } catch (e) {
                console.warn('[CreateGenome] pool check error:', e);
                if (!cancelled) { setPoolExistsForUnderlying(false); setPoolCheckLoading(false); }
            }
        };
        void check();
        return () => { cancelled = true; };
    }, [underlyingAddress]);

    // -----------------------------------------------------------------------
    // Fetch underlying token name + symbol when address changes
    // -----------------------------------------------------------------------
    useEffect(() => {
        const addr = underlyingAddress.trim();
        if (!addr || addr.length < 10) { setUnderlyingInfo(null); setUnderlyingFetching(false); return; }
        let cancelled = false;
        setUnderlyingFetching(true);
        setUnderlyingInfo(null);
        const run = async () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const uc = getContract<any>(addr, OP_20_ABI as any, provider, NETWORK);
                const [nameRes, symbolRes] = await Promise.all([uc.name(), uc.symbol()]);
                if (cancelled) return;
                const name = extractStr(nameRes, 'name');
                const symbol = extractStr(symbolRes, 'symbol');
                if (!cancelled) setUnderlyingInfo(name || symbol ? { name, symbol } : null);
            } catch {
                if (!cancelled) setUnderlyingInfo(null);
            } finally {
                if (!cancelled) setUnderlyingFetching(false);
            }
        };
        void run();
        return () => { cancelled = true; };
    }, [underlyingAddress]);

    const disabled = isBusy || !isConnected || poolExistsForUnderlying;

    const handleDeploy = async () => {
        if (!isConnected || !walletAddress) { toast.error('Connect wallet first'); return; }
        if (!underlyingAddress.trim()) { toast.error('Enter underlying token address'); return; }
        if (!derivedName || !derivedSymbol) { toast.error('Underlying token info not loaded yet'); return; }

        setIsBusy(true);
        try {
            const bytecode = await loadBytecode();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const code = await (provider as any).getCode(underlyingAddress.trim());
            const rawPubkey = code?.contractPublicKey;
            const underlyingPubkey: string = rawPubkey instanceof Uint8Array
                ? '0x' + Array.from(rawPubkey as Uint8Array).map((b: number) => b.toString(16).padStart(2, '0')).join('')
                : String(rawPubkey);
            console.log('[CreateGenome] underlying pubkey:', underlyingPubkey);

            const writer = new BinaryWriter();
            writer.writeAddress(Address.fromString(underlyingPubkey));
            writer.writeU8(18);
            writer.writeStringWithLength(derivedName);
            writer.writeStringWithLength(derivedSymbol);
            writer.writeU256(BigInt(wrapFee));
            writer.writeU256(BigInt(unwrapFee));
            writer.writeU256(BigInt(wrapFee));
            writer.writeU256(BigInt(unwrapFee));
            const calldata = new Uint8Array(writer.getBuffer());

            const utxoProvider = new OPNetLimitedProvider(RPC_URL);
            const utxos = await utxoProvider.fetchUTXOMultiAddr({
                addresses: [walletAddress],
                minAmount: 330n,
                requestedAmount: 100_000_000n,
                optimized: true,
                usePendingUTXO: true,
            });
            if (!utxos.length) throw new Error('No UTXOs — fund your wallet with testnet BTC');

            const challenge = await provider.getChallenge();
            const factory = new TransactionFactory();
            const result = await factory.signDeployment({
                bytecode,
                calldata,
                challenge,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                signer: null as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                mldsaSigner: null as any,
                network: NETWORK,
                utxos,
                from: walletAddress,
                feeRate: 50,
                priorityFee: 0n,
                gasSatFee: 10_000n,
            });

            const [fundingTxHex, deployTxHex] = result.transaction;
            toast.info('Broadcasting funding transaction...');
            const fundingResp = await utxoProvider.broadcastTransaction(fundingTxHex, false);
            if (!fundingResp?.success) throw new Error(`Funding tx failed: ${fundingResp?.error ?? 'unknown'}`);

            toast.info('Broadcasting deployment transaction...');
            const deployResp = await utxoProvider.broadcastTransaction(deployTxHex, false);
            if (!deployResp?.success) throw new Error(`Deploy tx failed: ${deployResp?.error ?? 'unknown'}`);

            const contractAddr = String(result.contractAddress);
            const contractPubKey = String(result.contractPubKey);
            setDeployedAddress(contractAddr);
            toast.success(`Genome deployed: ${contractAddr}`);

            // Register in Factory
            toast.info('Registering Genome in Factory...');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const factoryCode = await (provider as any).getCode(CONTRACT_ADDRESSES.factory);
            const factoryRaw = factoryCode?.contractPublicKey;
            const factoryPubkeyHex: string = factoryRaw instanceof Uint8Array
                ? '0x' + Array.from(factoryRaw as Uint8Array).map((b: number) => b.toString(16).padStart(2, '0')).join('')
                : String(factoryRaw);

            const registerSelector = await computeSelector('registerGenome()');
            const regWriter = new BinaryWriter();
            regWriter.writeSelector(registerSelector);
            regWriter.writeAddress(Address.fromString(underlyingPubkey));
            regWriter.writeAddress(Address.fromString(contractPubKey));
            const regCalldata = new Uint8Array(regWriter.getBuffer());

            const freshUtxos = await utxoProvider.fetchUTXOMultiAddr({
                addresses: [walletAddress],
                minAmount: 330n,
                requestedAmount: 100_000_000n,
                optimized: true,
                usePendingUTXO: true,
            });
            if (!freshUtxos.length) throw new Error('No UTXOs for register transaction');

            const freshChallenge = await provider.getChallenge();
            const regFactory = new TransactionFactory();
            const regResult = await regFactory.signInteraction({
                to: CONTRACT_ADDRESSES.factory,
                from: walletAddress,
                contract: factoryPubkeyHex,
                calldata: regCalldata,
                utxos: freshUtxos,
                challenge: freshChallenge,
                network: NETWORK,
                feeRate: 50,
                priorityFee: 0n,
                gasSatFee: 10_000n,
            });

            const { fundingTransaction: regFunding, interactionTransaction: regInteraction } = regResult as {
                fundingTransaction: string;
                interactionTransaction: string;
            };
            const regFundResp = await utxoProvider.broadcastTransaction(regFunding, false);
            if (!regFundResp?.success) throw new Error(`Register funding failed: ${regFundResp?.error ?? 'unknown'}`);
            const regResp = await utxoProvider.broadcastTransaction(regInteraction, false);
            if (!regResp?.success) throw new Error(`Register tx failed: ${regResp?.error ?? 'unknown'}`);

            setRegistered(true);
            toast.success('Genome registered in Factory!');

            // Step 3: Create MotoSwap pool
            toast.info('Creating liquidity pool on MotoSwap...');
            try {
                const motoFactory = getContract<IMotoswapFactoryContract>(
                    Address.fromString(CONTRACT_ADDRESSES.motoswapFactory),
                    MotoSwapFactoryAbi as any,
                    provider,
                    NETWORK,
                    senderAddress!,
                );
                const poolSim = await motoFactory.createPool(
                    Address.fromString(contractPubKey),
                    Address.fromString(underlyingPubkey),
                );
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const poolSimAny = poolSim as any;
                if ('error' in poolSimAny) throw new Error(String(poolSimAny.error));
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const poolResult = await poolSimAny.sendTransaction({
                    refundTo: walletAddress,
                    maximumAllowedSatToSpend: BigInt(100_000),
                    feeRate: 10,
                    network: NETWORK,
                    minGas: BigInt(100_000),
                });
                console.log('[CreateGenome] createPool result:', poolResult);
                const poolAddr = extractAddressStr(poolResult);
                setCreatedPoolAddress(poolAddr || null);
                setPoolCreated(true);
                toast.success('Liquidity pool created!');
            } catch (poolErr) {
                console.error('[CreateGenome] createPool error:', poolErr);
                toast.error(`Pool creation failed: ${poolErr instanceof Error ? poolErr.message : String(poolErr)} (genome is still registered)`);
                // Do not block — genome is already registered
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err));
        } finally {
            setIsBusy(false);
        }
    };

    const divider = (
        <div style={{ backgroundImage: 'repeating-linear-gradient(to right, #000 0px, #000 1px, transparent 1px, transparent 6px)', height: '12px', width: '100%', margin: '28px 0' }} />
    );

    return (
        <div style={{ padding: '48px 0', maxWidth: '560px' }}>
            <div style={{ marginBottom: '28px' }}>
                <Link to="/" style={{ fontFamily: 'Sometype Mono', fontSize: '0.75rem', color: '#888', textDecoration: 'none', display: 'inline-block', marginBottom: '12px' }}>
                    ← Explore
                </Link>
                <h1 style={{ fontFamily: 'Mulish', fontWeight: 700, fontSize: '1.5rem', color: '#000', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontFamily: 'Sometype Mono', fontWeight: 400, fontSize: '1rem' }}>&#9651;</span>
                    Create Genome
                </h1>
                <p style={{ fontFamily: 'Sometype Mono', fontSize: '0.75rem', color: '#888', marginTop: '6px' }}>
                    Deploy a new gToken genome and register it on-chain.
                </p>
            </div>

            {!isConnected && (
                <div style={{ border: '1px solid #000', padding: '12px 16px', marginBottom: '24px', fontFamily: 'Sometype Mono', fontSize: '0.8rem', color: '#888' }}>
                    [!] Connect your wallet to deploy a Genome.
                </div>
            )}

            {/* Success state */}
            {deployedAddress && (
                <>
                    <div style={{ border: '1px solid #000', padding: '16px 20px', marginBottom: '24px' }}>
                        <div style={SECTION_LABEL}>Genome deployed {registered ? '& registered' : ''}</div>
                        <div style={{ fontFamily: 'Sometype Mono', fontSize: '0.75rem', color: '#555', wordBreak: 'break-all', marginBottom: '8px' }}>
                            {deployedAddress}
                        </div>
                        {registered && (
                            <div style={{ fontFamily: 'Sometype Mono', fontSize: '0.75rem', color: '#888' }}>
                                ✓ Registered in Factory — it will appear on Explore shortly.
                            </div>
                        )}
                        {poolCreated && (
                            <div style={{ fontFamily: 'Sometype Mono', fontSize: '0.75rem', color: '#555', marginTop: '6px' }}>
                                ✓ MotoSwap pool created{createdPoolAddress ? `: ${createdPoolAddress}` : ''}.
                            </div>
                        )}
                    </div>


                    {divider}
                </>
            )}

            {/* Form — hide after success */}
            {!deployedAddress && (
                <>
                    <div style={SECTION_LABEL}>Underlying Token</div>
                    <div style={{ marginBottom: '12px' }}>
                        <label style={labelStyle}>Contract address (opt1sq...)</label>
                        <input
                            type="text"
                            value={underlyingAddress}
                            onChange={(e) => setUnderlyingAddress(e.target.value)}
                            placeholder="opt1sq..."
                            style={isBusy || !isConnected ? disabledInput : inputStyle}
                            disabled={isBusy || !isConnected}
                        />
                    </div>

                    {/* Underlying token preview */}
                    {underlyingFetching && underlyingAddress.trim().length > 10 && (
                        <div style={{ fontFamily: 'Sometype Mono', fontSize: '0.72rem', color: '#888', marginBottom: '16px' }}>
                            Fetching token info...
                        </div>
                    )}
                    {underlyingInfo && !underlyingFetching && (
                        <div style={{ border: '1px solid #000', padding: '14px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                            <div>
                                <div style={{ fontFamily: 'Mulish', fontWeight: 700, fontSize: '1rem', color: '#000' }}>{underlyingInfo.name}</div>
                                <div style={{ fontFamily: 'Sometype Mono', fontSize: '0.75rem', color: '#888', marginTop: '2px' }}>{underlyingInfo.symbol}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontFamily: 'Sometype Mono', fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>gToken will be</div>
                                <div style={{ fontFamily: 'Mulish', fontWeight: 700, fontSize: '1rem', color: '#000' }}>{derivedName}</div>
                                <div style={{ fontFamily: 'Sometype Mono', fontSize: '0.75rem', color: '#888' }}>{derivedSymbol}</div>
                            </div>
                        </div>
                    )}
                    {!underlyingInfo && !underlyingFetching && underlyingAddress.trim().length > 10 && (
                        <div style={{ fontFamily: 'Sometype Mono', fontSize: '0.72rem', color: '#888', marginBottom: '16px' }}>
                            Could not resolve token — check the address.
                        </div>
                    )}

                    {poolCheckLoading && underlyingAddress.trim().length > 10 && (
                        <div style={{ fontFamily: 'Sometype Mono', fontSize: '0.72rem', color: '#888', marginBottom: '16px' }}>
                            Checking for existing pool...
                        </div>
                    )}
                    {poolExistsForUnderlying && (
                        <div style={{ border: '1px solid #000', padding: '10px 14px', marginBottom: '20px', fontFamily: 'Sometype Mono', fontSize: '0.75rem', color: '#000' }}>
                            [!] A Genome with an active MotoSwap pool already exists for this token. Choose a different underlying.
                        </div>
                    )}

                    {divider}

                    <div style={SECTION_LABEL}>Fees</div>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Wrap fee (bps)</label>
                            <input
                                type="number"
                                min={0}
                                max={200}
                                value={wrapFee}
                                onChange={(e) => setWrapFee(Number(e.target.value))}
                                style={disabled ? disabledInput : inputStyle}
                                disabled={disabled}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Unwrap fee (bps)</label>
                            <input
                                type="number"
                                min={0}
                                max={200}
                                value={unwrapFee}
                                onChange={(e) => setUnwrapFee(Number(e.target.value))}
                                style={disabled ? disabledInput : inputStyle}
                                disabled={disabled}
                            />
                        </div>
                    </div>
                    <div style={{ fontFamily: 'Sometype Mono', fontSize: '0.7rem', color: '#888', marginBottom: '28px' }}>
                        {wrapFee / 10}% wrap · {unwrapFee / 10}% unwrap · max 200 bps (20%)
                    </div>

                    <DeployButton onClick={handleDeploy} busy={isBusy} disabled={!isConnected || !underlyingInfo || poolExistsForUnderlying} />
                </>
            )}

            {deployedAddress && (
                <Link
                    to="/"
                    style={{ display: 'block', border: '1px solid #000', padding: '12px', fontFamily: 'Sometype Mono', fontSize: '0.85rem', textAlign: 'center', textDecoration: 'none', color: '#000', background: '#fff' }}
                >
                    ← Back to Explore
                </Link>
            )}
        </div>
    );
}

function DeployButton({ onClick, busy, disabled }: { onClick: () => void; busy: boolean; disabled: boolean }) {
    const [hovered, setHovered] = useState(false);
    const isDisabled = busy || disabled;
    return (
        <button
            onClick={onClick}
            disabled={isDisabled}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                width: '100%',
                border: '1px solid #000',
                background: isDisabled ? '#888' : hovered ? '#fff' : '#000',
                color: isDisabled ? '#ccc' : hovered ? '#000' : '#fff',
                padding: '13px',
                fontFamily: 'Sometype Mono, monospace',
                fontSize: '0.85rem',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                transition: 'background 0.1s, color 0.1s',
            }}
        >
            {busy ? 'Deploying & Registering...' : 'Deploy Genome'}
        </button>
    );
}
