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
