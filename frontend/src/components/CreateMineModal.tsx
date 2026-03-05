import { useState } from 'react';
import { TransactionFactory, OPNetLimitedProvider, BinaryWriter, Address } from '@btc-vision/transaction';
import { useWallet } from '../hooks/useWallet';
import { useToast } from '../contexts/ToastContext';
import { provider } from '../lib/provider';
import { NETWORK, CONTRACT_ADDRESSES } from '../config';

const RPC_URL = 'https://testnet.opnet.org';

async function computeSelector(sig: string): Promise<number> {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sig));
    return new DataView(hash).getUint32(0, false);
}

async function loadBytecode(): Promise<Uint8Array> {
    const resp = await fetch('./Mine.wasm');
    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    console.log('Mine.wasm loaded, byte length:', bytes.length);
    return bytes;
}

interface CreateMineModalProps {
    onClose: () => void;
    onMineCreated?: () => void;
}

export function CreateMineModal({ onClose, onMineCreated }: CreateMineModalProps) {
    const { address: walletAddress, isConnected } = useWallet();
    const toast = useToast();

    const [underlyingAddress, setUnderlyingAddress] = useState('');
    const [xTokenName, setXTokenName] = useState('');
    const [xTokenSymbol, setXTokenSymbol] = useState('');
    const [wrapFee, setWrapFee] = useState(50);
    const [unwrapFee, setUnwrapFee] = useState(50);
    const [isDeploying, setIsDeploying] = useState(false);
    const [deployedContractAddress, setDeployedContractAddress] = useState<string | null>(null);
    const [deployedContractPubKey, setDeployedContractPubKey] = useState<string | null>(null);

    const labelStyle: React.CSSProperties = {
        fontSize: '0.7rem',
        color: '#888',
        fontFamily: 'Sometype Mono, monospace',
        display: 'block',
        marginBottom: '4px',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
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
        appearance: 'none' as const,
    };

    const fieldStyle: React.CSSProperties = {
        marginBottom: '16px',
    };

    const handleDeploy = async () => {
        if (!isConnected || !walletAddress) {
            toast.error('Connect wallet first');
            return;
        }
        if (!underlyingAddress.trim()) {
            toast.error('Enter underlying token address');
            return;
        }
        if (!xTokenName.trim() || !xTokenSymbol.trim()) {
            toast.error('Enter xToken name and symbol');
            return;
        }

        setIsDeploying(true);
        try {
            // 1. Load Mine.wasm bytecode
            const bytecode = await loadBytecode();

            // 2. Resolve underlying token pubkey
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const code = await (provider as any).getCode(underlyingAddress.trim());
            const rawPubkey = code?.contractPublicKey;
            const underlyingPubkey: string =
                rawPubkey instanceof Uint8Array
                    ? '0x' + Array.from(rawPubkey as Uint8Array).map((b: number) => b.toString(16).padStart(2, '0')).join('')
                    : String(rawPubkey);
            console.log('Underlying pubkey:', underlyingPubkey);

            // 3. Build calldata
            const writer = new BinaryWriter();
            writer.writeAddress(Address.fromString(underlyingPubkey));
            writer.writeU8(18);
            writer.writeStringWithLength(xTokenName.trim());
            writer.writeStringWithLength(xTokenSymbol.trim());
            writer.writeU256(BigInt(wrapFee));
            writer.writeU256(BigInt(unwrapFee));
            writer.writeU256(BigInt(wrapFee));
            writer.writeU256(BigInt(unwrapFee));
            const calldata = new Uint8Array(writer.getBuffer());
            console.log('Calldata length:', calldata.length);

            // 4. Fetch UTXOs
            const utxoProvider = new OPNetLimitedProvider(RPC_URL);
            const utxos = await utxoProvider.fetchUTXOMultiAddr({
                addresses: [walletAddress],
                minAmount: 330n,
                requestedAmount: 100_000_000n,
                optimized: true,
                usePendingUTXO: true,
            });
            if (!utxos.length) throw new Error('No UTXOs found — fund your wallet with testnet BTC');

            // 5. Get epoch challenge
            const challenge = await provider.getChallenge();

            // 6. Sign deployment (null signers — wallet extension signs)
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

            console.log('Contract address:', result.contractAddress);
            console.log('Contract pubkey:', result.contractPubKey);

            const [fundingTxHex, deployTxHex] = result.transaction;

            // 7. Broadcast funding tx first, then deployment tx
            toast.info('Broadcasting funding transaction...');
            const fundingResp = await utxoProvider.broadcastTransaction(fundingTxHex, false);
            if (!fundingResp?.success) {
                throw new Error(`Funding tx failed: ${fundingResp?.error ?? 'unknown'}`);
            }
            console.log('Funding tx:', fundingResp.result);

            toast.info('Broadcasting deployment transaction...');
            const deployResp = await utxoProvider.broadcastTransaction(deployTxHex, false);
            if (!deployResp?.success) {
                throw new Error(`Deploy tx failed: ${deployResp?.error ?? 'unknown'}`);
            }
            console.log('Deploy tx:', deployResp.result);

            // 8. Store results and show deploy success
            const contractAddr = String(result.contractAddress);
            const contractPubKey = String(result.contractPubKey);
            setDeployedContractAddress(contractAddr);
            setDeployedContractPubKey(contractPubKey);
            toast.success(`Mine deployed: ${contractAddr}`);

            // 9. Register Mine in Factory
            toast.info('Registering Mine in Factory...');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const factoryCode = await (provider as any).getCode(CONTRACT_ADDRESSES.factory);
            const factoryRaw = factoryCode?.contractPublicKey;
            const factoryPubkeyHex: string =
                factoryRaw instanceof Uint8Array
                    ? '0x' + Array.from(factoryRaw as Uint8Array).map((b: number) => b.toString(16).padStart(2, '0')).join('')
                    : String(factoryRaw);

            const registerSelector = await computeSelector('registerMine');
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
                challenge: freshChallenge,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                signer: null as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                mldsaSigner: null as any,
                network: NETWORK,
                utxos: freshUtxos,
                feeRate: 50,
                priorityFee: 0n,
                gasSatFee: 10_000n,
            });

            if (!regResult.fundingTransaction || !regResult.interactionTransaction) {
                throw new Error('Missing register transactions');
            }

            toast.info('Broadcasting register funding transaction...');
            const regFundingResp = await utxoProvider.broadcastTransaction(regResult.fundingTransaction, false);
            if (!regFundingResp?.success) {
                throw new Error(`Register funding failed: ${regFundingResp?.error ?? 'unknown'}`);
            }

            toast.info('Broadcasting register transaction...');
            const regInteractionResp = await utxoProvider.broadcastTransaction(regResult.interactionTransaction, false);
            if (!regInteractionResp?.success) {
                throw new Error(`Register interaction failed: ${regInteractionResp?.error ?? 'unknown'}`);
            }

            toast.success(`Mine registered: tx ${String(regInteractionResp.result)}`);
            onMineCreated?.();
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Deploy failed';
            toast.error(msg);
            console.error('Deploy error:', err);
        } finally {
            setIsDeploying(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9998,
                    background: 'rgba(0,0,0,0.5)',
                }}
            />

            {/* Modal box */}
            <div
                style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 9999,
                    background: '#fff',
                    border: '1px solid #000',
                    padding: '24px',
                    maxWidth: '480px',
                    width: 'calc(100% - 32px)',
                    fontFamily: 'Sometype Mono, monospace',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 style={{
                    fontFamily: 'Mulish, sans-serif',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    color: '#000',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                }}>
                    <span style={{ fontFamily: 'Sometype Mono, monospace', fontWeight: 400, fontSize: '0.9rem' }}>+</span>
                    Create Wrapper
                </h2>

                {deployedContractAddress ? (
                    <div style={{ marginBottom: '24px' }}>
                        <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '8px' }}>DEPLOYED CONTRACT</p>
                        <p style={{ fontSize: '0.8rem', color: '#000', wordBreak: 'break-all', marginBottom: '4px' }}>{deployedContractAddress}</p>
                        <p style={{ fontSize: '0.7rem', color: '#888', wordBreak: 'break-all' }}>{deployedContractPubKey}</p>
                    </div>
                ) : (
                    <>
                        <div style={fieldStyle}>
                            <label style={labelStyle}>Underlying token address</label>
                            <input
                                type="text"
                                value={underlyingAddress}
                                onChange={(e) => setUnderlyingAddress(e.target.value)}
                                placeholder="opt1sq... token address"
                                style={inputStyle}
                                disabled={isDeploying}
                            />
                        </div>

                        <div style={fieldStyle}>
                            <label style={labelStyle}>xToken name</label>
                            <input
                                type="text"
                                value={xTokenName}
                                onChange={(e) => setXTokenName(e.target.value)}
                                placeholder="xFoo"
                                style={inputStyle}
                                disabled={isDeploying}
                            />
                        </div>

                        <div style={fieldStyle}>
                            <label style={labelStyle}>xToken symbol</label>
                            <input
                                type="text"
                                value={xTokenSymbol}
                                onChange={(e) => setXTokenSymbol(e.target.value)}
                                placeholder="xFOO"
                                style={inputStyle}
                                disabled={isDeploying}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Wrap fee (bps)</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={200}
                                    value={wrapFee}
                                    onChange={(e) => setWrapFee(Number(e.target.value))}
                                    style={inputStyle}
                                    disabled={isDeploying}
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
                                    style={inputStyle}
                                    disabled={isDeploying}
                                />
                            </div>
                        </div>

                        <p style={{ fontSize: '0.7rem', color: '#888', marginBottom: '20px' }}>
                            Fees in basis points (50 bps = 5%)
                        </p>
                    </>
                )}

                <div style={{ display: 'flex', gap: '12px' }}>
                    {!deployedContractAddress && (
                        <button
                            style={{
                                flex: 1,
                                border: '1px solid #000',
                                background: isDeploying ? '#888' : '#000',
                                color: '#fff',
                                padding: '10px 16px',
                                fontFamily: 'Sometype Mono, monospace',
                                fontSize: '0.8rem',
                                cursor: isDeploying ? 'not-allowed' : 'pointer',
                            }}
                            onClick={handleDeploy}
                            disabled={isDeploying}
                        >
                            {isDeploying ? 'Deploying...' : 'Deploy Mine'}
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            border: '1px solid #000',
                            background: '#fff',
                            color: '#000',
                            padding: '10px 16px',
                            fontFamily: 'Sometype Mono, monospace',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                        }}
                    >
                        {deployedContractAddress ? 'Close' : 'Cancel'}
                    </button>
                </div>
            </div>
        </>
    );
}
