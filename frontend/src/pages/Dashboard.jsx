import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVerified, getAudit, getAlertsSummary, getAnalyticsOverview } from '../api/judgeflow';
import PriorityBadge from '../components/ui/PriorityBadge';
import CountdownTimer from '../components/ui/CountdownTimer';
import SkeletonRow from '../components/ui/SkeletonRow';
import { formatDate } from '../utils/formatters';
import { AlertTriangle, Gavel, Scale, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function CountUp({ end, duration = 1000 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    let startTime = null;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration]);

  return <span>{count}</span>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [department, setDepartment] = useState('ALL');
  const [priority, setPriority] = useState('ALL');
  const [recommendation, setRecommendation] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showClearBanner, setShowClearBanner] = useState(true);
  const [auditId, setAuditId] = useState(null);

  useEffect(() => {
    document.title = "Dashboard — ArbiterFlow AI";
    const timer = setTimeout(() => setShowClearBanner(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const { data: alertsData } = useQuery({
    queryKey: ['alertsSummary'],
    queryFn: getAlertsSummary
  });

  const { data: analyticsData } = useQuery({
    queryKey: ['analyticsOverview'],
    queryFn: getAnalyticsOverview
  });

  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['verified', department, priority, recommendation],
    queryFn: async () => {
      const data = await getVerified({
        department: department !== 'ALL' ? department : undefined,
        priority: priority !== 'ALL' ? priority : undefined,
        recommendation: recommendation !== 'ALL' ? recommendation : undefined
      });
      return data;
    }
  });

  const { data: auditData } = useQuery({
    queryKey: ['audit', auditId],
    queryFn: () => getAudit(auditId),
    enabled: !!auditId
  });

  const items = dashboardData?.items || dashboardData?.records || [];
  const metrics = dashboardData?.metrics || {
    total_verified: dashboardData?.total_verified || 0,
    comply_count: dashboardData?.comply_count || 0,
    appeal_count: dashboardData?.appeal_count || 0,
    escalate_count: dashboardData?.escalate_count || 0,
    human_edited_count: dashboardData?.edited_count || 0
  };
  const departments = dashboardData?.departments || [];

  const filteredItems = items.filter(item => {
    if (search && !item.case_number?.toLowerCase().includes(search.toLowerCase()) && !item.judgment_id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const urgentItems = items.filter(item => {
    if (item.priority !== 'HIGH') return false;
    if (!item.deadline) return false;
    const diff = (new Date(item.deadline) - new Date()) / (1000 * 60 * 60 * 24);
    return diff <= 14;
  });

  // Analytics UI Helpers
  const accuracyColor = analyticsData?.verification_quality?.ai_accuracy_proxy > 0.8 ? 'var(--accent-teal)' : analyticsData?.verification_quality?.ai_accuracy_proxy > 0.6 ? 'var(--accent-gold)' : 'var(--status-high)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', animation: 'fadeIn 200ms ease forwards' }}>
      
      {/* Alert Banner */}
      {alertsData?.has_critical ? (
        <div style={{
          backgroundColor: 'rgba(229,57,46,0.12)', borderBottom: '2px solid var(--status-high)',
          padding: '10px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={18} color="var(--status-high)" style={{ animation: 'pulse-dot 1.2s infinite' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--status-high)', fontWeight: 'bold' }}>
              {alertsData.critical_count} CRITICAL — deadline within 3 days
            </span>
          </div>
          <button onClick={() => window.scrollTo({ top: 300, behavior: 'smooth' })} style={{
            background: 'none', border: '1px solid var(--status-high)', color: 'var(--status-high)',
            padding: '4px 12px', fontFamily: 'var(--font-mono)', fontSize: '10px', cursor: 'pointer'
          }}>VIEW URGENT</button>
        </div>
      ) : alertsData?.urgent_count > 0 ? (
        <div style={{
          backgroundColor: 'rgba(212,175,55,0.12)', borderBottom: '2px solid var(--accent-gold)',
          padding: '10px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={18} color="var(--accent-gold)" />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--accent-gold)', fontWeight: 'bold' }}>
              {alertsData.urgent_count} judgments require action within 7 days
            </span>
          </div>
          <button onClick={() => window.scrollTo({ top: 300, behavior: 'smooth' })} style={{
            background: 'none', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)',
            padding: '4px 12px', fontFamily: 'var(--font-mono)', fontSize: '10px', cursor: 'pointer'
          }}>VIEW URGENT</button>
        </div>
      ) : showClearBanner && alertsData ? (
        <div style={{
          backgroundColor: 'rgba(72,199,116,0.12)', borderBottom: '2px solid var(--status-low)',
          padding: '10px 40px', display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <CheckCircle size={18} color="var(--status-low)" />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--status-low)' }}>All deadlines on track</span>
        </div>
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-primary)', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', margin: '0 0 4px 0' }}>ACTION DASHBOARD</h2>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Displaying verified records only</div>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--accent-gold)' }}>
          {new Date().toLocaleDateString()}
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="skeleton" style={{ flex: 1, height: '100px' }} />
          <div className="skeleton" style={{ flex: 1, height: '100px' }} />
          <div className="skeleton" style={{ flex: 1, height: '100px' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          {[
            { label: 'TOTAL VERIFIED', val: metrics.total_verified },
            { label: 'COMPLY', val: metrics.comply_count, color: 'var(--status-comply)' },
            { label: 'APPEAL', val: metrics.appeal_count, color: 'var(--status-appeal)' },
            { label: 'ESCALATE', val: metrics.escalate_count, color: 'var(--status-escalate)' },
            { label: 'HUMAN EDITED', val: metrics.human_edited_count, color: 'var(--accent-gold)' }
          ].map((m, i) => (
            <div key={i} style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-primary)', padding: '20px', animation: `fadeInUp 300ms ease forwards ${i * 60}ms`, opacity: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '32px', color: m.color || 'var(--text-primary)', marginBottom: '8px' }}>
                <CountUp end={m.val} />
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px' }}>
                {m.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Analytics Intelligence Section */}
      {analyticsData && (
        <>
          <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-muted)', letterSpacing: '1px', marginTop: '16px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '8px' }}>SYSTEM INTELLIGENCE</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            
            {/* Card 1: AI Accuracy */}
            <div style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '16px' }}>AI ACCEPTANCE RATE</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', color: accuracyColor }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '48px', fontWeight: 'bold' }}>
                  <CountUp end={Math.round(analyticsData.verification_quality.ai_accuracy_proxy * 100)} />
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '24px' }}>%</span>
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Recommendations accepted without edit
              </div>
            </div>

            {/* Card 2: Pipeline Progress */}
            <div style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-primary)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '16px' }}>PIPELINE FUNNEL</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: "Uploaded", val: analyticsData.pipeline_stats.total_uploaded },
                  { label: "Extracted", val: analyticsData.pipeline_stats.extraction_completed },
                  { label: "Agents Run", val: analyticsData.pipeline_stats.agents_completed },
                  { label: "Verified", val: analyticsData.pipeline_stats.total_verified }
                ].map((step, idx, arr) => {
                  const prev = idx === 0 ? step.val : arr[idx-1].val;
                  const pct = prev > 0 ? Math.round((step.val / prev) * 100) : 0;
                  return (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{step.label}</span>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <span style={{ color: 'var(--accent-gold)' }}><CountUp end={step.val} /></span>
                        <span style={{ color: 'var(--text-muted)', width: '30px', textAlign: 'right' }}>{idx === 0 ? '—' : `${pct}%`}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card 3: Department Activity */}
            <div style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-primary)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '16px' }}>TOP DEPARTMENTS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {analyticsData.department_breakdown.slice(0, 5).map((dept, i) => {
                  const max = analyticsData.department_breakdown[0].count;
                  const width = `${Math.max(5, (dept.count / max) * 100)}%`;
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{dept.department}</span>
                        <span><CountUp end={dept.count} /></span>
                      </div>
                      <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.06)', width: '100%' }}>
                        <div style={{ height: '100%', width, backgroundColor: 'var(--accent-teal)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </>
      )}

      {urgentItems.length > 0 && (
        <div>
          <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--status-escalate)', letterSpacing: '1px', marginBottom: '16px' }}>
            REQUIRES IMMEDIATE ATTENTION
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {urgentItems.map((item, idx) => (
              <div key={item.judgment_id} style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--status-escalate)', boxShadow: '0 0 10px rgba(229,57,46,0.1)', padding: '20px', cursor: 'pointer', animation: `fadeInUp 200ms ease forwards ${idx * 30}ms`, opacity: 0 }} onClick={() => setAuditId(item.judgment_id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-gold)' }}>{item.judgment_id}</div>
                  <PriorityBadge priority={item.priority} />
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  {item.case_number} | {formatDate(item.verified_at)}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', textAlign: 'center', margin: '16px 0', padding: '12px 0', borderTop: '1px solid var(--border-primary)', borderBottom: '1px solid var(--border-primary)' }}>
                  {item.recommendation === 'APPEAL' && <Gavel size={16} style={{ marginRight: '8px', verticalAlign: 'middle', color: 'var(--accent-gold)' }} />}
                  {item.recommendation}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '4px 8px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)' }}>
                    {item.department}
                  </div>
                  <CountdownTimer deadlineDate={item.deadline} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', backgroundColor: 'var(--bg-surface)', padding: '16px', border: '1px solid var(--border-primary)' }}>
        <input 
          type="text" 
          placeholder="Search Case or ID..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px', width: '200px' }}
        />
        
        <select value={department} onChange={e => setDepartment(e.target.value)} style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
          <option value="ALL">ALL DEPARTMENTS</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
            <button key={p} onClick={() => setPriority(p)} style={{
              background: priority === p ? 'var(--bg-elevated)' : 'transparent',
              border: `1px solid ${priority === p ? 'var(--accent-gold)' : 'var(--border-primary)'}`,
              color: priority === p ? 'var(--accent-gold)' : 'var(--text-muted)',
              padding: '6px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              cursor: 'pointer'
            }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '56px', width: '100%' }} />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 20px', border: '1px dashed var(--border-primary)', backgroundColor: 'var(--bg-surface)' }}>
          <Scale size={64} color="var(--accent-gold)" opacity={0.3} style={{ marginBottom: '24px' }} />
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontStyle: 'italic', margin: '0 0 12px 0', color: 'var(--text-primary)' }}>No Verified Records Yet</h3>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-muted)', margin: '0 0 24px 0', maxWidth: '300px', textAlign: 'center' }}>
            Judgments approved through the verification process will appear here.
          </p>
          <button onClick={() => navigate('/verify')} style={{
            background: 'transparent', border: '1px solid var(--accent-teal)', color: 'var(--accent-teal)',
            padding: '10px 24px', fontFamily: 'var(--font-mono)', fontSize: '12px', cursor: 'pointer', letterSpacing: '1px'
          }}>GO TO REVIEW QUEUE</button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid var(--border-primary)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: 'var(--bg-surface)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)' }}>
                <th style={{ padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>CASE / COURT</th>
                <th style={{ padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>DEPT</th>
                <th style={{ padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>DECISION</th>
                <th style={{ padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>PRIORITY</th>
                <th style={{ padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>DEADLINE</th>
                <th style={{ padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>VERIFIED BY</th>
                <th style={{ padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>EDITED</th>
                <th style={{ padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, idx) => {
                const diff = item.deadline_date ? (new Date(item.deadline_date) - new Date()) / (1000 * 60 * 60 * 24) : 999;
                let rowBorder = 'none';
                let deadlineColor = 'inherit';
                if (diff <= 7) {
                  rowBorder = '2px solid var(--status-high)';
                  deadlineColor = 'var(--status-high)';
                } else if (diff <= 14) {
                  rowBorder = '2px solid var(--accent-gold)';
                  deadlineColor = 'var(--accent-gold)';
                }

                return (
                  <tr key={item.judgment_id} style={{ borderBottom: '1px solid var(--border-primary)', borderLeft: rowBorder, animation: `fadeInUp 200ms ease forwards ${idx * 30}ms`, opacity: 0 }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{item.case_number}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{item.court_name}</div>
                    </td>
                    <td style={{ padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{item.department}</td>
                    <td style={{ padding: '16px', fontFamily: 'var(--font-display)', fontWeight: '700', color: item.recommendation === 'COMPLY' ? 'var(--status-low)' : (item.recommendation === 'ESCALATE' ? 'var(--status-escalate)' : 'var(--accent-gold)') }}>
                      {item.recommendation === 'APPEAL' && <Gavel size={14} style={{ marginRight: '6px', verticalAlign: 'middle', color: 'var(--accent-gold)' }} />}
                      {item.recommendation}
                    </td>
                    <td style={{ padding: '16px' }}><PriorityBadge priority={item.priority} /></td>
                    <td style={{ padding: '16px', color: deadlineColor, animation: diff <= 7 ? 'pulse-dot 1.2s infinite' : 'none' }}>
                      <CountdownTimer deadlineDate={item.deadline_date || item.deadline} />
                    </td>
                    <td style={{ padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>{item.verified_by}</td>
                    <td style={{ padding: '16px' }}>
                      {item.is_edited ? <span style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>✏ Edited</span> : <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>AI Verified</span>}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <button onClick={() => setAuditId(item.judgment_id)} style={{ background: 'transparent', border: '1px solid var(--accent-teal)', color: 'var(--accent-teal)', padding: '6px 12px', fontFamily: 'var(--font-mono)', fontSize: '10px', cursor: 'pointer' }}>
                        AUDIT
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {auditId && (
        <>
          <div onClick={() => setAuditId(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100 }} />
          <div style={{ 
            position: 'fixed', top: 0, right: 0, bottom: 0, width: '400px', 
            backgroundColor: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-primary)', 
            zIndex: 101, display: 'flex', flexDirection: 'column', 
            transform: 'translateX(0)', transition: 'transform 300ms ease'
          }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', letterSpacing: '1px', margin: 0 }}>AUDIT TRAIL</h3>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-gold)' }}>{auditId}</div>
              </div>
              <button onClick={() => setAuditId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {!auditData ? <div className="skeleton" style={{ height: '100%', width: '100%' }} /> : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {auditData.timeline.map((event, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '16px', position: 'relative', paddingBottom: '24px' }}>
                      {idx !== auditData.timeline.length - 1 && (
                        <div style={{ position: 'absolute', left: '7px', top: '20px', bottom: 0, width: '2px', backgroundColor: 'var(--border-accent)' }} />
                      )}
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'var(--accent-gold)', flexShrink: 0, marginTop: '4px' }} />
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>{event.stage.toUpperCase()}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px' }}>{formatDate(event.timestamp)}</div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)' }}>{event.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
