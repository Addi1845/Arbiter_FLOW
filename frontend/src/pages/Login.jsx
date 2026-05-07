import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { login, isAuthenticated } from '../utils/auth';

const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

.login-input {
  width: 100%;
  box-sizing: border-box;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 2px;
  padding: 11px 14px;
  color: #EDE8DC;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
  outline: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.login-input::placeholder { color: rgba(237,232,220,0.3); }
.login-input:focus {
  border-color: #0ECFC0;
  box-shadow: 0 0 0 2px rgba(14,207,192,0.1);
}

.login-btn {
  width: 100%;
  background: #D4A017;
  color: #0B1120;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  padding: 13px;
  border: none;
  border-radius: 2px;
  cursor: pointer;
  letter-spacing: 1px;
  margin-top: 24px;
  transition: filter 150ms ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.login-btn:hover:not(:disabled) { filter: brightness(1.1); }
.login-btn:disabled { opacity: 0.7; cursor: not-allowed; }

@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
.login-card { animation: fadeIn 300ms ease forwards; }
`;

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) navigate('/upload', { replace: true });
  }, [navigate]);

  function handleLogin() {
    if (!email || !password) return;
    setError(false);
    setLoading(true);

    setTimeout(() => {
      const success = login(email, password);
      if (success) {
        navigate('/upload');
      } else {
        setError(true);
        setLoading(false);
      }
    }, 800);
  }

  return (
    <>
      <style>{css}</style>

      {/* Full-viewport background with grid */}
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0B1120',
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'IBM Plex Sans', sans-serif",
        color: '#EDE8DC',
        padding: '24px',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '28px',
            fontWeight: '700',
            color: '#EDE8DC',
          }}>
            JudgeFlow<span style={{ color: '#0ECFC0' }}> AI</span>
          </div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '9px',
            color: 'rgba(237,232,220,0.4)',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            marginTop: '4px',
          }}>
            COURT INTELLIGENCE SYSTEM
          </div>
        </div>

        {/* Ministry line */}
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '10px',
          color: 'rgba(237,232,220,0.35)',
          marginBottom: '40px',
        }}>
          Ministry of Law &amp; Justice · Government of India
        </div>

        {/* Login Card */}
        <div className="login-card" style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderTop: '2px solid #D4A017',
          borderRadius: '4px',
          padding: '36px 32px',
        }}>

          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '20px',
            fontStyle: 'italic',
            fontWeight: '700',
            color: '#EDE8DC',
            marginBottom: '6px',
          }}>
            Authorized Access Only
          </div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
            color: 'rgba(237,232,220,0.4)',
            marginBottom: '28px',
          }}>
            Government personnel credentials required
          </div>

          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '10px',
              color: 'rgba(237,232,220,0.5)',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}>
              Employee ID / Email
            </div>
            <input
              className="login-input"
              type="text"
              placeholder="admin@judgeflow.gov.in"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(false); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoFocus
            />
          </div>

          {/* Password */}
          <div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '10px',
              color: 'rgba(237,232,220,0.5)',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}>
              Access Code
            </div>
            <input
              className="login-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(false); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            <div style={{
              textAlign: 'right',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '10px',
              color: 'rgba(237,232,220,0.3)',
              marginTop: '4px',
            }}>
              Demo: admin / admin123
            </div>
          </div>

          {/* Button */}
          <button
            className="login-btn"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                AUTHENTICATING...
              </>
            ) : 'ACCESS SYSTEM'}
          </button>

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(229,57,46,0.1)',
              border: '1px solid rgba(229,57,46,0.3)',
              padding: '10px 14px',
              borderRadius: '2px',
              marginTop: '12px',
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: '13px',
              color: '#E5392E',
            }}>
              <AlertTriangle size={14} />
              Invalid credentials. Access denied.
            </div>
          )}
        </div>

        {/* Secure badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginTop: '20px',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '10px',
          color: 'rgba(237,232,220,0.3)',
        }}>
          <ShieldCheck size={12} color="#2D7D4F" />
          Secure Government Portal · Encrypted Connection
        </div>

      </div>
    </>
  );
}
