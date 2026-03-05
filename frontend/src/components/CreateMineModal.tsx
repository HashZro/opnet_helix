import { useState } from 'react';

async function loadBytecode(): Promise<Uint8Array> {
    const resp = await fetch('./Mine.wasm');
    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    console.log('Mine.wasm loaded, byte length:', bytes.length);
    return bytes;
}

interface CreateMineModalProps {
    onClose: () => void;
}

export function CreateMineModal({ onClose }: CreateMineModalProps) {
    const [underlyingAddress, setUnderlyingAddress] = useState('');
    const [xTokenName, setXTokenName] = useState('');
    const [xTokenSymbol, setXTokenSymbol] = useState('');
    const [wrapFee, setWrapFee] = useState(50);
    const [unwrapFee, setUnwrapFee] = useState(50);

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

                <div style={fieldStyle}>
                    <label style={labelStyle}>Underlying token address</label>
                    <input
                        type="text"
                        value={underlyingAddress}
                        onChange={(e) => setUnderlyingAddress(e.target.value)}
                        placeholder="opt1sq... token address"
                        style={inputStyle}
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
                        />
                    </div>
                </div>

                <p style={{ fontSize: '0.7rem', color: '#888', marginBottom: '20px' }}>
                    Fees in basis points (50 bps = 5%)
                </p>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        style={{
                            flex: 1,
                            border: '1px solid #000',
                            background: '#000',
                            color: '#fff',
                            padding: '10px 16px',
                            fontFamily: 'Sometype Mono, monospace',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                        }}
                        onClick={async () => {
                            const bytecode = await loadBytecode();
                            // Transaction logic will be added in S120
                            console.log('Deploy Mine:', { underlyingAddress, xTokenName, xTokenSymbol, wrapFee, unwrapFee, byteLength: bytecode.length });
                        }}
                    >
                        Deploy Mine
                    </button>
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
                        Cancel
                    </button>
                </div>
            </div>
        </>
    );
}
