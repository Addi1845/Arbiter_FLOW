import React from 'react';

export default function EmptyState({ icon: Icon, title, message, actionLabel, onAction }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px',
      border: '1px dashed var(--border-primary)',
      backgroundColor: 'var(--bg-secondary)',
      textAlign: 'center',
      height: '100%'
    }}>
      {Icon && <Icon size={48} color="var(--accent-gold)" style={{ marginBottom: '16px', opacity: 0.8 }} />}
      <h3 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '20px',
        color: 'var(--text-primary)',
        marginBottom: '8px'
      }}>
        {title}
      </h3>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '13px',
        color: 'var(--text-muted)',
        marginBottom: actionLabel ? '24px' : '0',
        maxWidth: '400px'
      }}>
        {message}
      </p>
      
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid var(--accent-teal)',
            color: 'var(--accent-teal)',
            padding: '8px 16px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            cursor: 'pointer',
            transition: 'all 200ms ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-teal)';
            e.currentTarget.style.color = '#000';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--accent-teal)';
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
