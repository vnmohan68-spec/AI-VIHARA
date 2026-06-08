import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import LandingPage from './pages/LandingPage';
import ScannerPage from './pages/ScannerPage';
import ChatPage from './pages/ChatPage';
import VoicePage from './pages/VoicePage';
import PlannerPage from './pages/PlannerPage';
import GemsPage from './pages/GemsPage';
import CulturePage from './pages/CulturePage';
import { SavedPage, ProfilePage, SettingsPage } from './pages/ExtraPages';
import WitnessPage from './pages/WitnessPage';
import Navbar from './components/layout/Navbar';
import { AuthProvider } from './hooks/useAuth';

export default function App() {
  const location = useLocation();

  return (
    <AuthProvider>
      <div className="min-h-screen bg-black text-white font-body">
        <Navbar />
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/scan" element={<ScannerPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/voice" element={<VoicePage />} />
            <Route path="/plan" element={<PlannerPage />} />
            <Route path="/gems" element={<GemsPage />} />
            <Route path="/culture" element={<CulturePage />} />
            <Route path="/saved" element={<SavedPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/witness" element={<WitnessPage />} />
          </Routes>
        </AnimatePresence>
      </div>
    </AuthProvider>
  );
}
