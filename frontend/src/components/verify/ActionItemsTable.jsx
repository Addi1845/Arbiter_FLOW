import React from 'react';
import PriorityBadge from '../ui/PriorityBadge';
import { CheckCircle2 } from 'lucide-react';

export default function ActionItemsTable({ actionPlan, recommendation }) {
  if (!actionPlan) return null;

  return (
    <div>
      <div style={{ border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-surface)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)' }}>
              <th style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>ACTION</th>
              <th style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>OWNER</th>
              <th style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>DUE DATE</th>
              <th style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>PRIORITY</th>
            </tr>
          </thead>
          <tbody>
            {actionPlan.immediate_actions?.map((action, i) => (
              <tr key={`imm-${i}`} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                <td style={{ padding: '16px', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: '500' }}>{action.task}</td>
                <td style={{ padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>{action.owner}</td>
                <td style={{ padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)' }}>{action.deadline}</td>
                <td style={{ padding: '16px' }}><PriorityBadge priority="HIGH" /></td>
              </tr>
            ))}
            {actionPlan.long_term_actions?.map((action, i) => (
              <tr key={`lt-${i}`} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                <td style={{ padding: '16px', fontFamily: 'var(--font-body)', fontSize: '13px' }}>{action.task}</td>
                <td style={{ padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>{action.owner}</td>
                <td style={{ padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)' }}>{action.deadline}</td>
                <td style={{ padding: '16px' }}><PriorityBadge priority="MEDIUM" /></td>
              </tr>
            ))}
            {(!actionPlan.immediate_actions?.length && !actionPlan.long_term_actions?.length) && (
              <tr>
                <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No actions generated.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(actionPlan.comply_arguments?.length > 0 || actionPlan.appeal_arguments?.length > 0) && (
        <div style={{ marginTop: '32px', padding: '24px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-surface)' }}>
          <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)', marginBottom: '16px' }}>
            {recommendation === 'COMPLY' ? 'COMPLY ARGUMENTS' : 'APPEAL ARGUMENTS'}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(recommendation === 'COMPLY' ? actionPlan.comply_arguments : actionPlan.appeal_arguments)?.map((arg, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <CheckCircle2 size={16} color={recommendation === 'COMPLY' ? "var(--status-low)" : "var(--accent-gold)"} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-secondary)' }}>{arg}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
