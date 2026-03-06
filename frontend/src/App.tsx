import { HashRouter, Routes, Route } from 'react-router-dom';
import { WalletConnectProvider } from '@btc-vision/walletconnect';
import { ToastProvider } from './contexts/ToastContext';
import { BalancesProvider } from './contexts/BalancesContext';
import { ToastContainer } from './components/ToastContainer';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { MineDetailPage } from './pages/MineDetailPage';
import { CreateGenomePage } from './pages/CreateGenomePage';
import { MyGenomesPage } from './pages/MyGenomesPage';
function App() {
    return (
        <WalletConnectProvider>
            <ToastProvider>
                <BalancesProvider>
                    <HashRouter>
                        <Layout>
                            <Routes>
                                <Route path="/" element={<HomePage />} />
                                <Route path="/mine/:address" element={<MineDetailPage />} />
                                <Route path="/create" element={<CreateGenomePage />} />
                                <Route path="/my-genomes" element={<MyGenomesPage />} />
                            </Routes>
                        </Layout>
                        <ToastContainer />
                    </HashRouter>
                </BalancesProvider>
            </ToastProvider>
        </WalletConnectProvider>
    );
}

export default App;
