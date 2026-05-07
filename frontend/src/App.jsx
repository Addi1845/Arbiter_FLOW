import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Hero from './pages/Hero';
import Login from './pages/Login';
import Upload from './pages/Upload';
import Verify from './pages/Verify';
import VerifyDetail from './pages/VerifyDetail';
import Dashboard from './pages/Dashboard';
import PageShell from './components/layout/PageShell';
import ProtectedRoute from './components/ProtectedRoute';
import { isAuthenticated } from './utils/auth';

export default function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (!isAuthenticated()) return;

      switch (e.key.toLowerCase()) {
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
      {/* Public routes */}
      <Route path="/" element={<Hero />} />
      <Route path="/login" element={<Login />} />

      {/* Protected routes */}
      <Route path="/upload" element={
        <ProtectedRoute>
          <PageShell title="Upload Judgment"><Upload /></PageShell>
        </ProtectedRoute>
      } />
      <Route path="/verify" element={
        <ProtectedRoute>
          <PageShell title="Review Queue"><Verify /></PageShell>
        </ProtectedRoute>
      } />
      <Route path="/verify/:id/detail" element={
        <ProtectedRoute>
          <PageShell title="Judgment Review"><VerifyDetail /></PageShell>
        </ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <PageShell title="Action Dashboard"><Dashboard /></PageShell>
        </ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
