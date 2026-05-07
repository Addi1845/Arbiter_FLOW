import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { getUser } from '../../utils/auth';

export default function TopBar({ title, collapsed, theme, setTheme }) {
  const marginLeft = collapsed ? '56px' : '220px';
  // TopBar stays dark-ish in both modes — always use light text
  const topbarText = 'rgba(160,180,210,0.75)';
  const topbarDivider = 'rgba(255,255,255,0.1)';

  const user = getUser();
  const initials = user.slice(0, 2).toUpperCase();

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('jf-theme', next);
  };

  return (
    <div style={{
      height: '48px',
      marginLeft,
      backgroundColor: 'var(--bg-topbar)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'fixed',
      top: 0,
      right: 0,
      left: 0,
      zIndex: 40,
      transition: 'margin-left 200ms ease, background-color 300ms ease'
    }}>
      {/* Left: breadcrumb — always light text since topbar is always dark */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontStyle: 'italic',
          fontSize: '18px', fontWeight: '600', margin: 0,
          color: '#EDE8DC'
        }}>
          {title}
        </h1>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: topbarText }}>/</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: topbarText, textTransform: 'uppercase', letterSpacing: '1px' }}>
          {title.toUpperCase()}
        </span>
      </div>

      {/* Right: status + ministry + theme toggle + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
        {/* Operational status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#2D7D4F' }}></div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: topbarText, textTransform: 'uppercase', letterSpacing: '0.5px' }}>OPERATIONAL</span>
        </div>

        <div style={{ width: '1px', height: '20px', backgroundColor: topbarDivider, margin: '0 16px' }}></div>

        {/* Ministry */}
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: topbarText }}>
          Ministry of Law & Justice
        </div>

        <div style={{ width: '1px', height: '20px', backgroundColor: topbarDivider, margin: '0 16px' }}></div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '4px',
            width: '30px', height: '30px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            color: '#D4A017',
            transition: 'all 200ms ease',
            padding: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#D4A017';
            e.currentTarget.style.backgroundColor = 'rgba(212,160,23,0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        <div style={{ width: '1px', height: '20px', backgroundColor: topbarDivider, margin: '0 16px' }}></div>

        {/* Avatar */}
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%',
          backgroundColor: 'rgba(212,160,23,0.18)',
          border: '1px solid #D4A017',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          color: '#D4A017',
          fontSize: '11px',
          fontWeight: '500'
        }}>
          {initials}
        </div>
      </div>
    </div>
  );
}
