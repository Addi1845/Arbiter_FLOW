import React, { useEffect, useState } from 'react';

export default function ConfidenceMeter({ confidence }) {
  const [width, setWidth] = useState(0);
  const confValue = Math.min(Math.max(Number(confidence) || 0, 0), 1);
  const percentage = Math.round(confValue * 100);
  
  let color = 'var(--status-escalate)'; // red
  if (confValue >= 0.8) color = 'var(--accent-teal)';
  else if (confValue >= 0.6) color = 'var(--accent-gold)';

  useEffect(() => {
    const timer = setTimeout(() => setWidth(percentage), 50);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
      <div style={{
        width: '120px',
        height: '4px',
        backgroundColor: 'var(--bg-elevated)',
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${width}%`,
          height: '100%',
          backgroundColor: color,
          transition: 'width 600ms cubic-bezier(0.4, 0, 0.2, 1)'
        }} />
      </div>
      <span style={{ 
        fontFamily: 'var(--font-mono)', 
        fontSize: '11px', 
        color,
        minWidth: '32px',
        textAlign: 'right'
      }}>
        {percentage}%
      </span>
    </div>
  );
}
