import React from 'react';
import { AlertTriangle, Minus, ArrowDown } from 'lucide-react';

const PRIORITY_CONFIG = {
  HIGH: { icon: AlertTriangle, color: 'var(--status-high)', pulse: true },
  MEDIUM: { icon: Minus, color: 'var(--status-medium)', pulse: false },
  LOW: { icon: ArrowDown, color: 'var(--status-low)', pulse: false }
};

export default function PriorityBadge({ priority }) {
  const normPriority = (priority || 'LOW').toUpperCase();
  const config = PRIORITY_CONFIG[normPriority] || PRIORITY_CONFIG.LOW;
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
      <Icon size={12} className={config.pulse ? "pulse-anim" : ""} />
      <span>{normPriority}</span>
    </div>
  );
}
