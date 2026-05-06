import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getVerifyDetail, getStatus, approveJudgment, editJudgment, rejectJudgment } from '../api/judgeflow';
import PDFViewer from '../components/verify/PDFViewer';
import PipelineTracker from '../components/verify/PipelineTracker';
import DebatePanel from '../components/verify/DebatePanel';
import DirectivesList from '../components/verify/DirectivesList';
import ActionItemsTable from '../components/verify/ActionItemsTable';
import ConfidenceMeter from '../components/ui/ConfidenceMeter';
import PriorityBadge from '../components/ui/PriorityBadge';
import CountdownTimer from '../components/ui/CountdownTimer';
import SkeletonRow from '../components/ui/SkeletonRow';

export default function VerifyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [isRejectModalOpen, setRejectModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);

  const [editForm, setEditForm] = useState({
    final_recommendation: 'COMPLY',
    priority: 'MEDIUM',
    deadline_date: '',
    responsible_department: '',
    reviewer_notes: ''
  });

  const [rejectForm, setRejectForm] = useState({
    rejection_category: 'WRONG_DOCUMENT',
    rejection_reason: ''
  });

  const { data: detail, isLoading, error, refetch } = useQuery({
    queryKey: ['verifyDetail', id],
    queryFn: () => getVerifyDetail(id)
  });

  // Populate edit form once data loads
  useEffect(() => {
    if (detail) {
      setEditForm({
        final_recommendation: detail.ai_recommendation?.final_recommendation || 'COMPLY',
        priority:             detail.ai_recommendation?.priority              || 'MEDIUM',
        deadline_date:        detail.ai_recommendation?.deadline_date         || '',
        responsible_department: detail.ai_recommendation?.responsible_department || '',
        reviewer_notes: ''
      });
    }
  }, [detail]);

  const approveMutation = useMutation({
    mutationFn: (payload) => approveJudgment(id, payload),
    onSuccess: () => navigate('/dashboard')
  });

  const editMutation = useMutation({
    mutationFn: (payload) => editJudgment(id, payload),
    onSuccess: () => navigate('/dashboard')
  });

  const rejectMutation = useMutation({
    mutationFn: (payload) => rejectJudgment(id, payload),
    onSuccess: () => navigate('/verify')
  });

  if (isLoading) return (
    <div style={{ padding: '32px' }}>
      <SkeletonRow height="80px" />
      <div style={{ marginTop: '16px' }}><SkeletonRow height="300px" /></div>
      <div style={{ marginTop: '16px' }}><SkeletonRow height="200px" /></div>
    </div>
  );

  if (error) return (
    <div style={{ padding: '32px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--status-high)', marginBottom: '16px' }}>
        Failed to load judgment: {error.message}
      </div>
      <button onClick={refetch} style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '8px 20px', background: 'var(--accent-teal)', border: 'none', color: '#000', cursor: 'pointer' }}>
        RETRY
      </button>
    </div>
  );

  if (!detail) return (
    <div style={{ padding: '32px', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>
      Judgment not found.
    </div>
  );

  // Pipeline still processing — show live tracker
  const pipelineRunning =
    detail.verification_status === 'pending' &&
    (detail.ai_recommendation?.final_recommendation === 'N/A' ||
     !detail.ai_recommendation?.final_recommendation ||
     detail.ai_recommendation?.final_recommendation === '');

  if (pipelineRunning) {
    return (
      <div style={{ padding: '32px', maxWidth: '520px', margin: '0 auto' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ cursor: 'pointer', color: 'var(--accent-teal)' }} onClick={() => navigate('/verify')}>
            &larr; Back to Queue
          </span>
          <span>/</span>
          <span>{id}</span>
        </div>
        <PipelineTracker
          judgmentId={id}
          extractionStatus={null}
          agentStatus={null}
          onComplete={refetch}
        />
        <div style={{ marginTop: '16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
          This page refreshes automatically when the pipeline completes.
        </div>
      </div>
    );
  }

  const rec = detail.ai_recommendation;
  const recColor = rec?.final_recommendation === 'COMPLY'
    ? 'var(--status-comply)'
    : rec?.final_recommendation === 'APPEAL'
      ? 'var(--accent-gold)'
      : 'var(--status-escalate)';

  const handleApprove = async () => {
    if (!window.confirm("Approve this judgment? It will appear on the dashboard.")) return;
    try {
      await approveJudgment(id, { verified_by: 'Reviewer', notes: 'Approved via dashboard' });
      alert('\u2713 Judgment approved and sent to dashboard');
      navigate('/verify');
    } catch (err) {
      alert('Failed to approve: ' + (err?.response?.data?.detail || err.message));
    }
  };

  const handleRejectSubmit = () => {
    if (rejectForm.rejection_reason.length < 10) { alert("Reason must be at least 10 characters"); return; }
    rejectMutation.mutate({
      rejection_category: rejectForm.rejection_category,
      rejection_reason:   rejectForm.rejection_reason,
      verified_by:        'Admin User'
    });
  };

  const handleEditSubmit = () => {
    editMutation.mutate({
      verified_by: 'Admin User',
      notes: editForm.reviewer_notes,
      edited_data: {
        final_recommendation:   editForm.final_recommendation,
        priority:               editForm.priority,
        deadline_date:          editForm.deadline_date,
        responsible_department: editForm.responsible_department
      }
    });
  };

  const recChanged = rec?.final_recommendation !== editForm.final_recommendation;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 96px)', gap: '24px' }}>

      {/* Left: PDF viewer */}
      <div style={{ flex: '0 0 45%', height: '100%', overflow: 'hidden' }}>
        <PDFViewer
          url={detail.document_info?.storage_url}
          pageCount={detail.document_info?.total_pages}
          digitalPages={detail.document_info?.digital_pages}
          ocrPages={detail.document_info?.ocr_pages}
        />
      </div>

      {/* Right: Analysis panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--border-primary)', marginBottom: '24px' }}>
          {['OVERVIEW', 'DIRECTIVES', 'DEBATE', 'ACTION PLAN'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: 'none', border: 'none', padding: '12px 0',
              color: activeTab === tab ? 'var(--accent-gold)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--accent-gold)' : '2px solid transparent',
              fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: '500',
              letterSpacing: '1px', cursor: 'pointer'
            }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px', paddingRight: '8px' }}>

          {activeTab === 'OVERVIEW' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* Invalid document banner */}
              {detail.case_details?.subject_matter?.startsWith('INVALID:') && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  backgroundColor: 'rgba(229,57,46,0.10)',
                  border: '1px solid rgba(229,57,46,0.4)',
                  padding: '12px 16px', marginBottom: '4px', borderRadius: '3px'
                }}>
                  <span style={{ color: 'var(--status-high)', fontSize: '18px' }}>&#9888;</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--status-high)' }}>
                    This document does not appear to be a court judgment. AI scores are unreliable.
                  </span>
                </div>
              )}

              {/* Priority bar */}
              {(() => {
                const deadlineDate = rec?.deadline_date || detail?.deadline_date || '';
                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-elevated)', padding: '16px 24px', border: '1px solid var(--border-accent)' }}>
                    {deadlineDate ? (
                      <CountdownTimer deadlineDate={deadlineDate} />
                    ) : (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                        Deadline: Calculate 90 days from{' '}
                        <strong>{detail?.case_details?.date_of_order || '—'}</strong>
                      </span>
                    )}
                    <PriorityBadge priority={rec?.priority} />
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                      DEPT: <span style={{ color: 'var(--text-primary)' }}>{rec?.responsible_department || '—'}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Case details grid */}
              <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-primary)', padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  {[
                    ['CASE NO.', detail.case_details?.case_number],
                    ['COURT',   detail.case_details?.court_name],
                    ['PETITIONER', detail.case_details?.petitioner],
                    ['RESPONDENT', detail.case_details?.respondent],
                    ['DATE OF ORDER', detail.case_details?.date_of_order],
                    ['DEPARTMENT', detail.case_details?.department],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-primary)' }}>{value || '—'}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>SUBJECT MATTER</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-primary)' }}>{detail.case_details?.subject_matter || '—'}</div>
                </div>
              </div>

              {/* AI Recommendation */}
              <div style={{ border: '1px solid var(--border-accent)', padding: '32px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>AI RECOMMENDATION</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '48px', fontWeight: '700', color: recColor, marginBottom: '24px' }}>
                  {rec?.final_recommendation || '—'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <ConfidenceMeter confidence={rec?.final_confidence ?? 0} />
                </div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-primary)', marginBottom: '16px', textAlign: 'left' }}>
                  {rec?.decision_reasoning || '—'}
                </p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontStyle: 'italic', color: 'var(--text-secondary)', textAlign: 'left' }}>
                  {rec?.final_verdict_summary || ''}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'DIRECTIVES' && (
            <DirectivesList directives={detail?.directives || []} />
          )}

          {activeTab === 'DEBATE' && (
            <DebatePanel data={detail} />
          )}

          {activeTab === 'ACTION PLAN' && (
            <ActionItemsTable
              actionPlan={{ action_items: rec?.action_items || [], overall_deadline: rec?.deadline_date, responsible_department: rec?.responsible_department }}
              recommendation={rec?.final_recommendation}
            />
          )}
        </div>

        {/* Action bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 20 }}>
          <button onClick={() => setRejectModalOpen(true)} style={{ border: '1px solid var(--status-escalate)', color: 'var(--status-escalate)', background: 'transparent', padding: '10px 24px', fontFamily: 'var(--font-mono)', fontSize: '12px', cursor: 'pointer' }}>
            REJECT
          </button>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button onClick={() => setEditModalOpen(true)} style={{ border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', background: 'transparent', padding: '10px 24px', fontFamily: 'var(--font-mono)', fontSize: '12px', cursor: 'pointer' }}>
              EDIT & APPROVE
            </button>
            <button onClick={handleApprove} disabled={approveMutation.isPending} style={{ border: 'none', background: 'var(--accent-teal)', color: '#000', padding: '10px 32px', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
              {approveMutation.isPending ? 'APPROVING...' : 'APPROVE AS IS'}
            </button>
          </div>
        </div>
      </div>

      {/* Reject modal */}
      {isRejectModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--bg-elevated)', borderTop: '2px solid var(--status-escalate)', width: '500px', padding: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--status-escalate)', fontSize: '20px', marginBottom: '24px' }}>REJECT JUDGMENT</h2>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>REASON CATEGORY</label>
            <select value={rejectForm.rejection_category} onChange={e => setRejectForm({...rejectForm, rejection_category: e.target.value})}
              style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', marginBottom: '24px', fontFamily: 'var(--font-body)' }}>
              <option value="WRONG_DOCUMENT">Wrong Document</option>
              <option value="POOR_EXTRACTION">Poor Extraction</option>
              <option value="AGENT_ERROR">Agent Error</option>
              <option value="OTHER">Other</option>
            </select>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>DETAILED REASON (Min 10 chars)</label>
            <textarea value={rejectForm.rejection_reason} onChange={e => setRejectForm({...rejectForm, rejection_reason: e.target.value})} rows={4}
              style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', marginBottom: '32px', fontFamily: 'var(--font-body)' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
              <button onClick={() => setRejectModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>CANCEL</button>
              <button onClick={handleRejectSubmit} disabled={rejectMutation.isPending} style={{ background: 'var(--status-escalate)', border: 'none', color: '#fff', padding: '8px 16px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                {rejectMutation.isPending ? 'REJECTING...' : 'CONFIRM REJECTION'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {isEditModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--bg-elevated)', borderTop: '2px solid var(--accent-gold)', width: '600px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '20px', marginBottom: '8px' }}>EDIT AI RECOMMENDATION</h2>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>Your changes will be tracked in audit trail</p>

            <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>FINAL RECOMMENDATION</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['COMPLY', 'APPEAL', 'ESCALATE'].map(r => (
                    <button key={r} onClick={() => setEditForm({...editForm, final_recommendation: r})}
                      style={{ flex: 1, padding: '8px', background: editForm.final_recommendation === r ? 'var(--bg-surface)' : 'transparent', border: `1px solid ${editForm.final_recommendation === r ? 'var(--accent-gold)' : 'var(--border-primary)'}`, color: editForm.final_recommendation === r ? 'var(--accent-gold)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px', cursor: 'pointer' }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>PRIORITY</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['HIGH', 'MEDIUM', 'LOW'].map(p => (
                    <button key={p} onClick={() => setEditForm({...editForm, priority: p})}
                      style={{ flex: 1, padding: '8px', background: editForm.priority === p ? 'var(--bg-surface)' : 'transparent', border: `1px solid ${editForm.priority === p ? 'var(--accent-gold)' : 'var(--border-primary)'}`, color: editForm.priority === p ? 'var(--accent-gold)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px', cursor: 'pointer' }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>DEADLINE DATE</label>
                <input type="date" value={editForm.deadline_date?.split('T')[0] || ''} onChange={e => setEditForm({...editForm, deadline_date: e.target.value})}
                  style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>DEPT</label>
                <input type="text" value={editForm.responsible_department} onChange={e => setEditForm({...editForm, responsible_department: e.target.value})}
                  style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }} />
              </div>
            </div>

            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>REVIEWER NOTES</label>
            <textarea value={editForm.reviewer_notes} onChange={e => setEditForm({...editForm, reviewer_notes: e.target.value})} rows={3}
              style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', marginBottom: '16px', fontFamily: 'var(--font-body)' }} />

            {recChanged && (
              <div style={{ padding: '12px', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', marginBottom: '24px' }}>
                AI said {rec?.final_recommendation} → You changed to {editForm.final_recommendation}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
              <button onClick={() => setEditModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>CANCEL</button>
              <button onClick={handleEditSubmit} disabled={editMutation.isPending} style={{ background: 'var(--accent-gold)', border: 'none', color: '#000', padding: '8px 16px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: '600' }}>
                {editMutation.isPending ? 'SAVING...' : 'SAVE & APPROVE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
