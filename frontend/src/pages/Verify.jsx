import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Scale, ClipboardCheck } from 'lucide-react';
import { getPending } from '../api/judgeflow';
import StatusBadge from '../components/ui/StatusBadge';
import PriorityBadge from '../components/ui/PriorityBadge';
import ConfidenceMeter from '../components/ui/ConfidenceMeter';
import CountdownTimer from '../components/ui/CountdownTimer';
import SkeletonRow from '../components/ui/SkeletonRow';
import EmptyState from '../components/ui/EmptyState';

export default function Verify() {
  const navigate = useNavigate();
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [recFilter, setRecFilter] = useState('ALL');

  const { data, isLoading, error } = useQuery({
    queryKey: ['pending'],
    queryFn: getPending
  });

  useEffect(() => {
    document.title = "Review Queue — ArbiterFlow AI";
  }, []);

  if (error) return <div style={{ padding: '24px', color: 'var(--status-escalate)' }}>Error: {error.message}</div>;

  const items = data?.items || [];
  
  const filteredItems = items.filter(item => {
    if (priorityFilter !== 'ALL' && item.ai_priority !== priorityFilter) return false;
    if (recFilter !== 'ALL' && item.ai_recommendation !== recFilter) return false;
    return true;
  });

  const highCount = items.filter(i => i.ai_priority === 'HIGH').length;
  const agreedCount = items.filter(i => i.agents_agreed).length;
  const avgConf = items.length ? (items.reduce((acc, i) => acc + (i.ai_confidence || 0), 0) / items.length) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 200ms ease forwards' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {[
          { label: 'TOTAL PENDING', val: items.length },
          { label: 'HIGH PRIORITY', val: highCount, color: 'var(--status-high)' },
          { label: 'AGENTS AGREED', val: agreedCount },
          { label: 'AVG CONFIDENCE', val: `${(avgConf * 100).toFixed(0)}%` }
        ].map((stat, i) => (
          <div key={i} style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-primary)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '32px', color: stat.color || 'var(--text-primary)' }}>
              {stat.val}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginRight: '8px' }}>PRIORITY:</span>
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
            <button key={p} onClick={() => setPriorityFilter(p)} style={{
              background: priorityFilter === p ? 'var(--bg-elevated)' : 'transparent',
              border: `1px solid ${priorityFilter === p ? 'var(--accent-gold)' : 'var(--border-primary)'}`,
              color: priorityFilter === p ? 'var(--accent-gold)' : 'var(--text-muted)',
              padding: '4px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              cursor: 'pointer',
              borderRadius: '16px'
            }}>
              {p}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginRight: '8px' }}>RECOMMENDATION:</span>
          {['ALL', 'COMPLY', 'APPEAL', 'ESCALATE'].map(p => (
            <button key={p} onClick={() => setRecFilter(p)} style={{
              background: recFilter === p ? 'var(--bg-elevated)' : 'transparent',
              border: `1px solid ${recFilter === p ? 'var(--accent-gold)' : 'var(--border-primary)'}`,
              color: recFilter === p ? 'var(--accent-gold)' : 'var(--text-muted)',
              padding: '4px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              cursor: 'pointer',
              borderRadius: '16px'
            }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '56px', width: '100%' }} />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 20px', border: '1px dashed var(--border-primary)', backgroundColor: 'var(--bg-surface)' }}>
            <ClipboardCheck size={64} color="var(--accent-teal)" opacity={0.3} style={{ marginBottom: '24px' }} />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontStyle: 'italic', margin: '0 0 12px 0', color: 'var(--text-primary)' }}>All Caught Up</h3>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-muted)', margin: '0 0 24px 0', maxWidth: '300px', textAlign: 'center' }}>
              No judgments pending review. Upload new PDFs to begin.
            </p>
            <button onClick={() => navigate('/upload')} style={{
              background: 'transparent', border: '1px solid var(--accent-teal)', color: 'var(--accent-teal)',
              padding: '10px 24px', fontFamily: 'var(--font-mono)', fontSize: '12px', cursor: 'pointer', letterSpacing: '1px'
            }}>UPLOAD JUDGMENT</button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                  <th style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>JUDGMENT ID</th>
                  <th style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>CASE</th>
                  <th style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>STATUS</th>
                  <th style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>AI SAYS</th>
                  <th style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>PRIORITY</th>
                  <th style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>DEADLINE</th>
                  <th style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>CONFIDENCE</th>
                  <th style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, idx) => {
                  const isReady = item.final_recommendation && item.final_recommendation !== 'N/A';
                  const isInvalid = item.subject_matter?.startsWith('INVALID:');
                  const statusPill = isInvalid
                    ? { label: '⚠ Invalid', color: 'var(--status-high)', bg: 'rgba(229,57,46,0.1)' }
                    : isReady
                      ? { label: '✓ Ready', color: 'var(--status-low)', bg: 'rgba(72,199,116,0.1)' }
                      : { label: '⚙ Processing', color: 'var(--accent-gold)', bg: 'rgba(212,175,55,0.1)' };

                  return (
                  <tr key={item.judgment_id} style={{
                    borderBottom: '1px solid var(--border-primary)',
                    backgroundColor: 'var(--bg-primary)',
                    transition: 'background-color 150ms ease',
                    borderLeft: item.priority === 'HIGH' ? '3px solid var(--status-high)' : '3px solid transparent',
                    animation: `fadeInUp 200ms ease forwards ${idx * 30}ms`, opacity: 0
                  }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}>
                    <td style={{ padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-gold)' }}>{item.judgment_id}</td>
                    <td style={{ padding: '16px', fontFamily: 'var(--font-body)', fontSize: '13px' }}>{item.case_number || 'Unknown'}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '10px',
                        padding: '4px 10px', borderRadius: '20px',
                        color: statusPill.color, backgroundColor: statusPill.bg,
                        border: `1px solid ${statusPill.color}40`,
                        whiteSpace: 'nowrap'
                      }}>
                        {statusPill.label}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', color: item.final_recommendation === 'COMPLY' ? 'var(--status-low)' : (item.final_recommendation === 'ESCALATE' ? 'var(--status-escalate)' : 'var(--accent-gold)') }}>
                        {item.final_recommendation || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}><PriorityBadge priority={item.priority} /></td>
                    <td style={{ padding: '16px' }}><CountdownTimer deadlineDate={item.deadline_date} /></td>
                    <td style={{ padding: '16px', width: '150px' }}><ConfidenceMeter confidence={item.final_confidence} /></td>
                    <td style={{ padding: '16px' }}>
                      <button
                        onClick={() => navigate(`/verify/${item.judgment_id}/detail`)}
                        style={{
                          background: 'transparent',
                          border: `1px solid ${isReady ? 'var(--accent-teal)' : 'var(--border-primary)'}`,
                          color: isReady ? 'var(--accent-teal)' : 'var(--text-muted)',
                          padding: '6px 12px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}>
                        {isReady ? 'REVIEW' : 'VIEW STATUS'}
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
