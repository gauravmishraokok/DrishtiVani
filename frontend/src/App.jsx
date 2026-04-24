import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import OnboardingPage from './pages/OnboardingPage';
import LearningPage from './pages/LearningPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import Sidebar from './components/Sidebar';
import { useGlobalVoice } from './hooks/useGlobalVoice';

function AppContent() {
  const location = useLocation();
  const isOnboarding = location.pathname === '/' || location.pathname === '/onboarding';
  const isLearning = location.pathname.startsWith('/learn/');
  
  // Disable global spacebar listener on onboarding and learning pages
  useGlobalVoice(null, !isOnboarding && !isLearning);
  
  return (
    <div className="flex bg-background min-h-screen text-bright overflow-x-hidden">
      {!isOnboarding && <Sidebar />}
      <main className="flex-1 min-h-0 relative">
        <Routes>
          <Route path="/" element={<OnboardingPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/learn" element={<Navigate to="/dashboard" replace />} />
          <Route path="/learn/:subjectId/:chapterId?" element={<LearningPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
