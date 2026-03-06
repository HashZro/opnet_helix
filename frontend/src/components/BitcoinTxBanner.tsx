export function BitcoinTxBanner() {
    return (
        <div style={{
            border: '1px solid #f0c000',
            background: '#fffbe6',
            padding: '10px 16px',
            marginBottom: '24px',
            fontFamily: 'Sometype Mono, monospace',
            fontSize: '0.75rem',
            color: '#7a6000',
            lineHeight: 1.5,
        }}>
            ⚠ Helix runs on Bitcoin L1 via OPNet. Transactions are confirmed on-chain and may take up to <strong>30 minutes</strong> — average is around <strong>10 minutes</strong>. Plan accordingly.
        </div>
    );
}
