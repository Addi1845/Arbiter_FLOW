import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function PageShell({ title, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('jf-theme');
    return saved || 'dark';
  });
  const marginLeft = collapsed ? '56px' : '220px';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', transition: 'background-color 300ms ease' }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <TopBar title={title} collapsed={collapsed} theme={theme} setTheme={setTheme} />
      <main className="page-enter" style={{
        flex: 1,
        marginLeft,
        marginTop: '48px',
        padding: '32px 40px',
        transition: 'margin-left 200ms ease',
        minHeight: 'calc(100vh - 48px)',
        position: 'relative'
      }}>
        {children}
      </main>
    </div>
  );
}
