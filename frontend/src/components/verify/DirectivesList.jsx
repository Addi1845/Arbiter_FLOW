import React from 'react';
import ConfidenceMeter from '../ui/ConfidenceMeter';

export default function DirectivesList({ directives }) {
  if (!directives || directives.length === 0) {
    return <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No directives extracted.</div>;
  }

  const flaggedCount = directives.filter(d => d.requires_human_review).length;

  return (
    <div>
      {flaggedCount > 0 && (
        <div style={{ 
          padding: '12px 16px', 
          backgroundColor: 'rgba(212, 160, 23, 0.1)', 
          border: '1px solid var(--border-accent)',
          color: 'var(--accent-gold)',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          marginBottom: '24px'
        }}>
          ⚠ {flaggedCount} of {directives.length} directives require attention
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {directives.map((dir, i) => (
          <div key={i} style={{
            display: 'flex',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-primary)',
            borderLeft: dir.requires_human_review ? '3px solid var(--accent-gold)' : '1px solid var(--border-primary)',
            padding: '16px',
            gap: '16px'
          }}>
            <div style={{ width: '4px', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ 
                width: '100%', 
                height: '100%', 
                backgroundColor: dir.confidence_score >= 0.8 ? 'var(--accent-teal)' : (dir.confidence_score >= 0.6 ? 'var(--accent-gold)' : 'var(--status-escalate)'),
                opacity: 0.5
              }}></div>
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', lineHeight: 1.6, color: 'var(--text-primary)', marginBottom: '12px' }}>
                {dir.clause_text}
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                  CONFIDENCE: {(dir.confidence_score * 100).toFixed(0)}%
                </span>
                {dir.requires_human_review && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-gold)' }}>
                    ⚠ REQUIRES REVIEW
                  </span>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', width: '120px' }}>
              <div style={{ 
                padding: '2px 6px', 
                backgroundColor: 'var(--bg-elevated)', 
                border: '1px solid var(--border-primary)',
                fontFamily: 'var(--font-mono)', 
                fontSize: '10px', 
                color: 'var(--text-secondary)' 
              }}>
                {dir.action_type}
              </div>
              <div style={{ 
                padding: '2px 6px', 
                backgroundColor: 'var(--bg-elevated)', 
                border: '1px solid var(--border-primary)',
                fontFamily: 'var(--font-mono)', 
                fontSize: '10px', 
                color: dir.urgency === 'HIGH' ? 'var(--status-high)' : 'var(--text-secondary)'
              }}>
                {dir.urgency} URGENCY
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
