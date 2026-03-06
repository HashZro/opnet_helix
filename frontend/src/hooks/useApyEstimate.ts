import { useState, useEffect } from 'react';

interface Snapshot {
    ratio: number;
    timestamp: number;
}

const MIN_TIME_MS = 60 * 60 * 1000; // need at least 1h of data before showing anything

function key(mineAddress: string) {
    return `helix_apy_${mineAddress}`;
}

/**
 * Estimates APY by comparing the current ratio against the first-ever
 * observed ratio stored in localStorage. Annualises linearly.
 *
 * Returns null until at least 1 hour of data has been collected.
 */
export function useApyEstimate(mineAddress: string, currentRatio: number): number | null {
    const [apy, setApy] = useState<number | null>(null);

    useEffect(() => {
        if (!mineAddress || currentRatio <= 0) return;

        const now = Date.now();

        try {
            const raw = localStorage.getItem(key(mineAddress));

            if (!raw) {
                // First visit — store baseline, no estimate yet
                localStorage.setItem(key(mineAddress), JSON.stringify({ ratio: currentRatio, timestamp: now } satisfies Snapshot));
                setApy(null);
                return;
            }

            const snap: Snapshot = JSON.parse(raw);
            const elapsedMs = now - snap.timestamp;

            if (elapsedMs < MIN_TIME_MS || snap.ratio <= 0) {
                setApy(null);
                return;
            }

            const elapsedYears = elapsedMs / (1000 * 60 * 60 * 24 * 365);
            const growth = currentRatio - snap.ratio;

            // Linear annualisation: (growth / baseRatio) / years
            const estimate = growth <= 0 ? 0 : (growth / snap.ratio) / elapsedYears * 100;
            setApy(estimate);
        } catch {
            setApy(null);
        }
    }, [mineAddress, currentRatio]);

    return apy;
}
