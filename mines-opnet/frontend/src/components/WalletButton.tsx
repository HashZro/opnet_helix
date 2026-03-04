import { useWallet } from '../hooks/useWallet';
import { truncateAddress } from '../lib/helpers';

export function WalletButton() {
    const { address, isConnected, connect, disconnect } = useWallet();

    if (isConnected && address) {
        return (
            <button
                onClick={disconnect}
                className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm font-medium hover:bg-gray-700 hover:border-gray-600 transition-colors"
            >
                {truncateAddress(address)}
            </button>
        );
    }

    return (
        <button
            onClick={connect}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg shadow-purple-900/30"
        >
            Connect Wallet
        </button>
    );
}
