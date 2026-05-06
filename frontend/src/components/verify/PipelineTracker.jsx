import React, { useState, useEffect, useRef } from 'react';
import { getStatus } from '../../api/judgeflow';

const STAGES = [
  {
    key: 'upload',
    label: 'PDF Uploaded',
    sub: 'Document received & parsed',
    icon: '📄',
  },
  {
    key: 'extract',
    label: 'AI Extraction',
    sub: 'Reading case metadata & directives',
    icon: '🔍',
  },
  {
    key: 'research',
    label: 'Research Agent',
    sub: 'Building primary legal case',
    icon: '⚖️',
  },
  {
    key: 'counter',
    label: 'Counter Agent',
    sub: 'Challenging & stress-testing analysis',
    icon: '🔄',
  },
  {
    key: 'synthesis',
    label: 'Synthesis Agent',
    sub: 'Chief Advisor making final decision',
    icon: '🏛️',
  },
  {
    key: 'ready',
    label: 'Ready for Review',
    sub: 'Awaiting human verification',
    icon: '✅',
  },
];

/** Map backend statuses → active pipeline stage index */
function getActiveStage(extractionStatus, agentStatus) {
  if (agentStatus === 'completed') return 6; // all done
  if (agentStatus === 'failed')    return -2; // error state
  if (agentStatus === 'skipped')   return -3; // invalid doc
  if (agentStatus === 'running')   return 3;  // agents running (stage 2,3,4 bundled)

  if (extractionStatus === 'completed') return 2;
  if (extractionStatus === 'extracting') return 1;
  if (extractionStatus === 'invalid_document') return -3;
  if (extractionStatus === 'failed') return -2;

  return 0; // uploaded/pending
}

function getStageStatus(stageIdx, activeIdx) {
  if (activeIdx < 0) {
    if (stageIdx <= 0) return 'done';
    return 'error';
  }
  if (stageIdx < activeIdx) return 'done';
  if (stageIdx === activeIdx) return 'active';
  return 'pending';
}

const COLORS = {
  done:    { color: 'var(--status-low)', bg: 'rgba(72,199,116,0.12)', border: 'rgba(72,199,116,0.3)' },
  active:  { color: 'var(--accent-gold)', bg: 'rgba(212,175,55,0.10)', border: 'rgba(212,175,55,0.4)' },
  pending: { color: 'var(--text-muted)', bg: 'transparent', border: 'transparent' },
  error:   { color: 'var(--status-high)', bg: 'rgba(229,57,46,0.10)', border: 'rgba(229,57,46,0.3)' },
};

export default function PipelineTracker({ judgmentId, extractionStatus, agentStatus, onComplete }) {
  const [localExt, setLocalExt]   = useState(extractionStatus || 'pending');
  const [localAgent, setLocalAgent] = useState(agentStatus || 'pending');
  const [elapsed, setElapsed]     = useState(0);
  const intervalRef = useRef(null);
  const elapsedRef  = useRef(null);

  const activeIdx = getActiveStage(localExt, localAgent);
  const isDone    = activeIdx === 6;
  const isError   = activeIdx === -2;
  const isInvalid = activeIdx === -3;
  const isTerminal = isDone || isError || isInvalid;

  // Sync props → local state
  useEffect(() => {
    setLocalExt(extractionStatus || 'pending');
    setLocalAgent(agentStatus || 'pending');
  }, [extractionStatus, agentStatus]);

  // Poll backend every 4 seconds while processing
  useEffect(() => {
    if (!judgmentId || isTerminal) return;

    intervalRef.current = setInterval(async () => {
      try {
        const data = await getStatus(judgmentId);
        setLocalExt(data.extraction_status  || 'pending');
        setLocalAgent(data.agent_status     || 'pending');
        if (data.agent_status === 'completed' && onComplete) {
          onComplete();
        }
      } catch (e) {
        // silent — backend may be temporarily unavailable
      }
    }, 4000);

    return () => clearInterval(intervalRef.current);
  }, [judgmentId, isTerminal]);

  // Elapsed timer
  useEffect(() => {
    if (isTerminal) { clearInterval(elapsedRef.current); return; }
    elapsedRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(elapsedRef.current);
  }, [isTerminal]);

  const formatElapsed = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-primary)',
      borderRadius: '4px',
      padding: '20px 24px',
      fontFamily: 'var(--font-mono)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            AI Pipeline Status
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {judgmentId}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {!isTerminal && (
            <div style={{ fontSize: '10px', color: 'var(--accent-gold)' }}>
              ⏱ {formatElapsed(elapsed)}
            </div>
          )}
          {isDone && (
            <div style={{ fontSize: '11px', color: 'var(--status-low)', fontWeight: 600 }}>
              ✓ COMPLETE
            </div>
          )}
          {isError && (
            <div style={{ fontSize: '11px', color: 'var(--status-high)', fontWeight: 600 }}>
              ✗ FAILED
            </div>
          )}
          {isInvalid && (
            <div style={{ fontSize: '11px', color: 'var(--status-high)', fontWeight: 600 }}>
              ⚠ INVALID DOC
            </div>
          )}
        </div>
      </div>

      {/* Stages */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {STAGES.map((stage, idx) => {
          const status = isError
            ? getStageStatus(idx, 1)   // show first stage done, rest error
            : isInvalid
              ? (idx === 0 ? 'done' : idx === 1 ? 'error' : 'pending')
              : getStageStatus(idx, activeIdx);

          const c = COLORS[status];
          const isActive = status === 'active';

          return (
            <div
              key={stage.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                backgroundColor: c.bg,
                border: `1px solid ${c.border}`,
                borderRadius: '3px',
                transition: 'all 0.4s ease',
              }}
            >
              {/* Icon / Spinner */}
              <div style={{ fontSize: '16px', width: '20px', textAlign: 'center', flexShrink: 0 }}>
                {status === 'done'    && <span style={{ color: 'var(--status-low)' }}>✓</span>}
                {status === 'active'  && <Spinner />}
                {status === 'error'   && <span style={{ color: 'var(--status-high)' }}>✗</span>}
                {status === 'pending' && <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>○</span>}
              </div>

              {/* Labels */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: isActive ? 600 : 400,
                  color: c.color,
                  letterSpacing: '0.5px',
                }}>
                  {stage.icon} {stage.label}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {status === 'active'  ? stage.sub : ''}
                  {status === 'done'    ? 'Completed' : ''}
                  {status === 'error'   ? 'Failed' : ''}
                  {status === 'pending' ? 'Waiting...' : ''}
                </div>
              </div>

              {/* Status dot */}
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                backgroundColor: c.color,
                opacity: isActive ? 1 : 0.5,
                flexShrink: 0,
                animation: isActive ? 'pulse-dot 1.2s infinite' : 'none',
              }} />
            </div>
          );
        })}
      </div>

      {/* Error message */}
      {isError && (
        <div style={{
          marginTop: '12px', padding: '10px 14px',
          backgroundColor: 'rgba(229,57,46,0.08)',
          border: '1px solid rgba(229,57,46,0.3)',
          fontSize: '11px', color: 'var(--status-high)',
          borderRadius: '3px',
        }}>
          ⚠ Pipeline failed. Check that the backend is running and the PDF is valid.
          Refresh the page to retry.
        </div>
      )}

      {isInvalid && (
        <div style={{
          marginTop: '12px', padding: '10px 14px',
          backgroundColor: 'rgba(229,57,46,0.08)',
          border: '1px solid rgba(229,57,46,0.3)',
          fontSize: '11px', color: 'var(--status-high)',
          borderRadius: '3px',
        }}>
          ⚠ Document rejected — this does not appear to be a court judgment.
          Upload a valid PDF.
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block',
      width: '14px', height: '14px',
      border: '2px solid rgba(212,175,55,0.3)',
      borderTopColor: 'var(--accent-gold)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      verticalAlign: 'middle',
    }} />
  );
}
