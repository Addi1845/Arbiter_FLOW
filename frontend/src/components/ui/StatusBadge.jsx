import React from 'react';
import { Clock, Loader2, CheckCircle2, XCircle, ShieldCheck, ShieldX, PenLine } from 'lucide-react';

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'var(--text-muted)' },
  extracting: { icon: Loader2, color: 'var(--accent-teal)', spin: true },
  completed: { icon: CheckCircle2, color: 'var(--status-comply)' },
  failed: { icon: XCircle, color: 'var(--status-escalate)' },
  approved: { icon: ShieldCheck, color: 'var(--status-comply)' },
  rejected: { icon: ShieldX, color: 'var(--status-escalate)' },
  edited: { icon: PenLine, color: 'var(--accent-gold)' }
};

export default function StatusBadge({ status }) {
  const normStatus = (status || 'pending').toLowerCase();
  const config = STATUS_CONFIG[normStatus] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '3px 8px',
      border: `1px solid ${config.color}`,
      borderRadius: '2px',
      color: config.color,
      backgroundColor: `${config.color}15`,
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      letterSpacing: '1px',
      textTransform: 'uppercase',
      lineHeight: 1
    }}>
      <Icon size={12} className={config.spin ? "pulse-anim" : ""} style={config.spin ? { animation: 'spin 2s linear infinite' } : {}} />
      <span>{normStatus}</span>
      {config.spin && (
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      )}
    </div>
  );
}
