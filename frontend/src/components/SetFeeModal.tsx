import { useState, useCallback } from 'react';
import { getContract } from 'opnet';
import { useWallet } from '../hooks/useWallet';
import { useToast } from '../contexts/ToastContext';
import { provider } from '../lib/provider';
import { NETWORK } from '../config';
import { GENOME_ABI } from '../lib/contracts';
import { TransactionButton } from './TransactionButton';
import { parseContractError } from '../lib/helpers';
import type { MineInfo } from '../hooks/useMines';

interface SetFeeModalProps {
    mine: MineInfo;
    feeType: 'wrap' | 'unwrap';
    onClose: () => void;
    onSuccess?: () => void;
}

export function SetFeeModal({ mine, feeType, onClose, onSuccess }: SetFeeModalProps) {
    const { senderAddress, address: walletAddress } = useWallet();
    const toast = useToast();

    const currentFeeBps = feeType === 'wrap' ? mine.wrapFee : mine.unwrapFee;
    const currentPct = (Number(currentFeeBps) / 10).toFixed(1);
    const label = feeType === 'wrap' ? 'Wrap Fee' : 'Unwrap Fee';

    const [input, setInput] = useState('');

    const pct = parseFloat(input);
    const isValid = input !== '' && !isNaN(pct) && pct >= 0 && pct <= 20;
    const newFeeBps = isValid ? Math.round(pct * 10) : null;

    const handleSet = useCallback(async () => {
        if (!senderAddress || !walletAddress || newFeeBps === null) throw new Error('Invalid input');
        const feeBps = BigInt(newFeeBps);
        try {
            console.log(`[${feeType === 'wrap' ? 'setWrapFee' : 'setUnwrapFee'}]`, { feeBps: feeBps.toString() });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const genomeContract = getContract<any>(mine.address, GENOME_ABI as any, provider, NETWORK, senderAddress);
            const sim = feeType === 'wrap'
                ? await genomeContract.setWrapFee(feeBps)
                : await genomeContract.setUnwrapFee(feeBps);
            if ('error' in (sim as object)) throw new Error(String((sim as { error: unknown }).error));
            toast.info(`Setting ${feeType} fee...`);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (sim as any).sendTransaction({ signer: null, mldsaSigner: null, refundTo: walletAddress });
            toast.success(`${label} updated to ${pct.toFixed(1)}%`);
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error(`[set${feeType === 'wrap' ? 'Wrap' : 'Unwrap'}Fee] error:`, err);
            toast.error(parseContractError(err));
            throw err;
        }
    }, [senderAddress, walletAddress, mine, feeType, newFeeBps, pct, label, toast, onClose, onSuccess]);

    // Quick-select presets
    const presets = [0, 0.5, 1, 2, 5, 10];

    return (
        <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={onClose}
        >
            <div
                style={{ background: '#fff', border: '1px solid #000', padding: '32px', maxWidth: '460px', width: '90%' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <h2 style={{ fontFamily: 'Mulish, sans-serif', fontWeight: 700, fontSize: '1.2rem', color: '#000' }}>
                        Set {label}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem', color: '#888', padding: '4px 8px' }}
                    >
                        ×
                    </button>
                </div>

                <p style={{ fontFamily: 'Sometype Mono, monospace', fontSize: '0.75rem', color: '#888', marginBottom: '20px' }}>
                    {mine.name} ({mine.symbol}) — current {feeType} fee: <strong style={{ color: '#000' }}>{currentPct}%</strong>
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Input */}
                    <div style={{ border: '1px solid #000' }}>
                        <div style={{ borderBottom: '1px solid #000', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontFamily: 'Mulish', fontWeight: 700, fontSize: '1rem', color: '#000' }}>{label}</span>
                            <span style={{ fontFamily: 'Sometype Mono', fontSize: '0.75rem', color: '#888' }}>0% – 20%</span>
                        </div>
                        <div style={{ padding: '14px 14px 0' }}>
                            <div style={{ border: '1px solid #000', display: 'flex', alignItems: 'stretch' }}>
                                <input
                                    type="number"
                                    min={0}
                                    max={20}
                                    step={0.1}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={currentPct}
                                    style={{
                                        flex: 1,
                                        background: 'transparent',
                                        border: 'none',
                                        outline: 'none',
                                        padding: '10px 12px',
                                        color: '#000',
                                        fontFamily: 'Sometype Mono, monospace',
                                        fontSize: '1rem',
                                    }}
                                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span style={{ padding: '10px 12px', fontFamily: 'Sometype Mono', fontSize: '1rem', color: '#888', borderLeft: '1px solid #000' }}>%</span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={20}
                                step={0.1}
                                value={isValid ? pct : Number(currentPct)}
                                onChange={(e) => setInput(e.target.value)}
                                style={{ width: '100%', margin: '12px 0 4px', accentColor: '#000', cursor: 'pointer' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Sometype Mono, monospace', fontSize: '0.65rem', color: '#aaa', paddingBottom: '10px' }}>
                                <span>0%</span>
                                <span>20%</span>
                            </div>
                        </div>
                        {/* Preset buttons */}
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${presets.length}, 1fr)`, gap: '1px', background: '#000', borderTop: '1px solid #000', marginTop: '10px' }}>
                            {presets.map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setInput(String(p))}
                                    style={{
                                        background: input === String(p) ? '#000' : '#fff',
                                        color: input === String(p) ? '#fff' : '#000',
                                        border: 'none',
                                        padding: '10px 0',
                                        fontFamily: 'Sometype Mono, monospace',
                                        fontSize: '0.78rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {p}%
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div style={{ border: '1px solid #000', padding: '16px' }}>
                        <p style={{ fontSize: '0.65rem', color: '#888', fontFamily: 'Sometype Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Preview</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ color: '#888', fontSize: '0.85rem' }}>Current {feeType} fee</span>
                            <span style={{ color: '#000', fontSize: '0.85rem' }}>{currentPct}%</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#888', fontSize: '0.85rem' }}>New {feeType} fee</span>
                            <span style={{ color: '#000', fontSize: '0.85rem' }}>{isValid ? pct.toFixed(1) + '%' : '—'}</span>
                        </div>
                    </div>

                    <TransactionButton
                        label={`Set ${label} to ${isValid ? pct.toFixed(1) + '%' : '...'}`}
                        onClick={handleSet}
                        disabled={!isValid}
                    />
                </div>
            </div>
        </div>
    );
}
