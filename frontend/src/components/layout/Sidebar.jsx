import React from 'react';
import { Upload, ClipboardCheck, LayoutDashboard, ChevronLeft, ChevronRight } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAlertsSummary } from '../../api/judgeflow';

export default function Sidebar({ collapsed, setCollapsed }) {
  const toggle = () => setCollapsed(!collapsed);

  const { data: alertsData } = useQuery({
    queryKey: ['alertsSummary'],
    queryFn: getAlertsSummary,
    refetchInterval: 30000
  });

  const urgentCount = (alertsData?.critical_count || 0) + (alertsData?.urgent_count || 0);

  const navItems = [
    { to: "/upload", icon: Upload, label: "Upload" },
    { to: "/verify", icon: ClipboardCheck, label: "Review", badge: urgentCount > 0 ? urgentCount : 0 },
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" }
  ];

  return (
    <div style={{
      width: collapsed ? '56px' : '220px',
      backgroundColor: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-subtle)',
      transition: 'width 200ms ease',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50
    }}>
      {/* Logo area */}
      <div style={{
        padding: collapsed ? '20px 8px' : '20px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: collapsed ? 'center' : 'flex-start'
      }}>
        {collapsed ? (
          <div style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-gold)', fontSize: '20px', fontWeight: '700' }}>AF</div>
        ) : (
          <>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '700', lineHeight: '1.2' }}>
              ArbiterFlow <span style={{ color: 'var(--accent-teal)' }}>AI</span>
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--text-muted)',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginTop: '4px'
            }}>
              Court Intelligence System
            </div>
          </>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '10px 0' : '10px 16px',
              margin: collapsed ? '2px 4px' : '2px 8px',
              borderRadius: '3px',
              textDecoration: 'none',
              color: isActive ? 'var(--accent-gold)' : 'var(--text-secondary)',
              borderLeft: isActive ? '3px solid var(--accent-gold)' : '3px solid transparent',
              marginLeft: isActive && !collapsed ? '5px' : (collapsed ? '4px' : '8px'),
              backgroundColor: isActive ? 'rgba(212,160,23,0.10)' : 'transparent',
              transition: 'all 150ms ease',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              fontWeight: '500',
              gap: '12px'
            })}
            onMouseEnter={(e) => {
              if (!e.currentTarget.classList.contains('active')) {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
          >
            <item.icon size={18} />
            {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
            {item.badge > 0 && !collapsed && (
              <span style={{ 
                backgroundColor: 'var(--status-high)', color: '#fff', 
                padding: '2px 6px', borderRadius: '10px', 
                fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 'bold' 
              }}>
                {item.badge}
              </span>
            )}
            {item.badge > 0 && collapsed && (
              <div style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', backgroundColor: 'var(--status-high)', borderRadius: '50%' }} />
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: collapsed ? 'center' : 'flex-start',
        gap: '10px'
      }}>
        <button onClick={toggle} style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%'
        }}>
          {collapsed ? <ChevronRight size={16} /> : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase' }}>Collapse</span>
              <ChevronLeft size={16} />
            </div>
          )}
        </button>

        {!collapsed && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                backgroundColor: 'var(--status-low)'
              }} className="green-pulse"></div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--status-low)', letterSpacing: '1px' }}>CCMS LIVE</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>
              {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
