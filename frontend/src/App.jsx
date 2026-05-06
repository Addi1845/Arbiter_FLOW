import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Upload from './pages/Upload';
import Verify from './pages/Verify';
import VerifyDetail from './pages/VerifyDetail';
import Dashboard from './pages/Dashboard';
import PageShell from './components/layout/PageShell';

export default function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      switch(e.key.toLowerCase()) {
        case 'u': navigate('/upload'); break;
        case 'r': navigate('/verify'); break;
        case 'd': navigate('/dashboard'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/upload" replace />} />
      <Route path="/upload" element={<PageShell title="Upload Judgment"><Upload /></PageShell>} />
      <Route path="/verify" element={<PageShell title="Review Queue"><Verify /></PageShell>} />
      <Route path="/verify/:id/detail" element={<PageShell title="Judgment Review"><VerifyDetail /></PageShell>} />
      <Route path="/dashboard" element={<PageShell title="Action Dashboard"><Dashboard /></PageShell>} />
    </Routes>
  );
}
