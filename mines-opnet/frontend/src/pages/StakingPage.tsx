import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useMines } from '../hooks/useMines';
import { useWallet } from '../hooks/useWallet';
import { StakingPanel } from '../components/StakingPanel';
import { formatBalance } from '../lib/helpers';

export function StakingPage() {
    const { address: urlAddress } = useParams<{ address: string }>();
    const [selectedMine, setSelectedMine] = useState<string>(urlAddress ?? '');
    const { mines, loading: minesLoading } = useMines();
    const { isConnected } = useWallet();

    // Sync urlAddress → selectedMine when route param is present
    useEffect(() => {
        if (urlAddress) setSelectedMine(urlAddress);
    }, [urlAddress]);

    // Auto-select first mine if none selected and mines are loaded
    useEffect(() => {
        if (!selectedMine && mines.length > 0) {
            setSelectedMine(mines[0].address);
        }
    }, [selectedMine, mines]);

    const selectedMineInfo = mines.find((m) => m.address === selectedMine) ?? null;

    // Exchange ratio: totalSupply / underlyingBalance (how many xTokens per 1 underlying)
    const ratio =
        selectedMineInfo && selectedMineInfo.underlyingBalance > 0n && selectedMineInfo.totalSupply > 0n
            ? (Number(selectedMineInfo.totalSupply) / Number(selectedMineInfo.underlyingBalance)).toFixed(4)
            : '1.0000';

    // Underlying symbol from xToken symbol (xMINER → MINER)
    const underlyingSymbol = selectedMineInfo
        ? selectedMineInfo.symbol.startsWith('x')
            ? selectedMineInfo.symbol.slice(1)
            : selectedMineInfo.symbol
        : 'TOKEN';

    return (
        <div className="max-w-lg mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Staking</h1>

            {/* Mine selector */}
            <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-1">Select Mine</label>
                <select
                    value={selectedMine}
                    onChange={(e) => setSelectedMine(e.target.value)}
                    disabled={minesLoading}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white focus:border-gray-500 outline-none disabled:opacity-50"
                >
                    <option value="">— Select a mine —</option>
                    {mines.map((m) => (
                        <option key={m.address} value={m.address}>
                            {m.name} ({m.symbol})
                        </option>
                    ))}
                </select>
            </div>

            {/* Loading mines */}
            {minesLoading && (
                <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {!isConnected && !minesLoading && (
                <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-700/40 rounded-lg text-yellow-400 text-sm text-center">
                    Connect your wallet to stake
                </div>
            )}

            {selectedMine && selectedMineInfo && (
                <>
                    {/* Mine stats */}
                    <div className="mb-6 bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Mine Stats</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-800 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">Exchange Ratio</p>
                                <p className="text-sm font-medium text-white">
                                    1 {underlyingSymbol} ≈ {ratio} {selectedMineInfo.symbol}
                                </p>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">Total Underlying</p>
                                <p className="text-sm font-medium text-white">
                                    {formatBalance(selectedMineInfo.underlyingBalance, 18)} {underlyingSymbol}
                                </p>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">Wrap Fee</p>
                                <p className="text-sm font-medium text-purple-400">
                                    {(Number(selectedMineInfo.wrapFee) / 10).toFixed(1)}%
                                </p>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">Unwrap Fee</p>
                                <p className="text-sm font-medium text-purple-400">
                                    {(Number(selectedMineInfo.unwrapFee) / 10).toFixed(1)}%
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Staking panel */}
                    <StakingPanel mineAddress={selectedMine} />
                </>
            )}
        </div>
    );
}
