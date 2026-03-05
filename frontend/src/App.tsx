import { HashRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/ToastContainer';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { MineDetailPage } from './pages/MineDetailPage';
import { WrapPage } from './pages/WrapPage';
import { UnwrapPage } from './pages/UnwrapPage';
import { StakingPage } from './pages/StakingPage';

function App() {
    return (
        <ToastProvider>
            <HashRouter>
                <Layout>
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/mine/:address" element={<MineDetailPage />} />
                        <Route path="/wrap" element={<WrapPage />} />
                        <Route path="/wrap/:address" element={<WrapPage />} />
                        <Route path="/unwrap" element={<UnwrapPage />} />
                        <Route path="/unwrap/:address" element={<UnwrapPage />} />
                        <Route path="/stake" element={<StakingPage />} />
                    </Routes>
                </Layout>
                <ToastContainer />
            </HashRouter>
        </ToastProvider>
    );
}

export default App;
