export function formatBalance(raw: bigint, decimals: number): string {
    if (raw === 0n) return '0';
    const factor = 10n ** BigInt(decimals);
    const whole = raw / factor;
    const frac = raw % factor;
    if (frac === 0n) return whole.toString();
    const fracStr = frac.toString().padStart(decimals, '0').slice(0, 4).replace(/0+$/, '');
    return fracStr ? `${whole}.${fracStr}` : whole.toString();
}

export function truncateAddress(addr: string): string {
    if (addr.length <= 14) return addr;
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

export function parseAmount(input: string, decimals: number): bigint {
    if (!input || input.trim() === '') return 0n;
    const [wholePart, fracPart = ''] = input.trim().split('.');
    const whole = BigInt(wholePart || '0');
    const truncFrac = fracPart.slice(0, decimals).padEnd(decimals, '0');
    const frac = BigInt(truncFrac);
    const factor = 10n ** BigInt(decimals);
    return whole * factor + frac;
}

export function toHex(bytes: Uint8Array): string {
    return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Known revert message → human-readable label
const REVERT_MESSAGES: Array<[string, string]> = [
    ['zero amount', 'Amount must be greater than zero'],
    ['not owner', 'Only the contract owner can perform this action'],
    ['not authorized', 'You are not authorized to perform this action'],
    ['no fee', 'No fees have accrued yet'],
    ['no rewards', 'No rewards to claim at this time'],
    ['insufficient balance', 'Insufficient balance for this operation'],
    ['not enough balance', 'Insufficient balance for this operation'],
    ['insufficient utxos', 'Insufficient wallet balance — add more BTC to cover transaction fees'],
    ['insufficient utxo', 'Insufficient wallet balance — add more BTC to cover transaction fees'],
    ['not staked', 'No staked balance found'],
    ['already staked', 'Already staked in this mine'],
];

/**
 * Extract a human-readable error message from any error shape thrown by
 * contract simulation or sendTransaction.
 */
export function parseContractError(err: unknown): string {
    // Gather raw message text from various error shapes
    let raw = '';
    if (err instanceof Error) {
        raw = err.message;
    } else if (typeof err === 'string') {
        raw = err;
    } else if (err && typeof err === 'object') {
        const e = err as Record<string, unknown>;
        raw = String(e['message'] ?? e['error'] ?? e['reason'] ?? e['msg'] ?? JSON.stringify(err));
    } else {
        raw = String(err);
    }

    const lower = raw.toLowerCase();

    // Check known revert messages (case-insensitive substring match)
    for (const [key, label] of REVERT_MESSAGES) {
        if (lower.includes(key)) return label;
    }

    // Trim long raw messages to keep toasts readable
    return raw.length > 120 ? raw.slice(0, 120) + '…' : raw;
}
