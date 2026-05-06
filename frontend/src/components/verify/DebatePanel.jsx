import React from 'react';
import ConfidenceMeter from '../ui/ConfidenceMeter';
import PriorityBadge from '../ui/PriorityBadge';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export default function DebatePanel({ data }) {
  if (!data) return null;

  // data is the full normalized detail object — debate lives at data.debate
  const debate  = data?.debate          || {};
  const research = debate?.research     || {};
  const counter  = debate?.counter      || {};
  const rec      = data?.ai_recommendation || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--accent-gold)', letterSpacing: '2px', margin: '0 0 8px 0' }}>
          ADVERSARIAL AGENT DEBATE
        </h3>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: 'var(--text-muted)', margin: 0 }}>
          Two AI agents argued both sides before the final recommendation
        </p>
      </div>

      {/* Research vs Counter */}
      <div style={{ display: 'flex', gap: '24px', position: 'relative' }}>

        {/* Research Agent */}
        <div style={{ flex: 1, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-primary)', borderTop: '3px solid #3B82F6', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 8px 0' }}>RESEARCH AGENT 🔵</h4>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {research.recommendation || '—'}
              </div>
            </div>
            <div style={{ width: '100px' }}>
              <ConfidenceMeter confidence={research.confidence ?? 0} />
            </div>
          </div>

          {(research.key_points || []).length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h5 style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '1px', marginBottom: '12px' }}>KEY POINTS</h5>
              <ol style={{ paddingLeft: '16px', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {research.key_points.map((pt, i) => <li key={i}>{pt}</li>)}
              </ol>
            </div>
          )}

          {research.summary && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>
              "{research.summary}"
            </p>
          )}

          {!research.recommendation && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>No research data available</p>
          )}
        </div>

        {/* VS badge */}
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '40px', height: '40px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '18px', fontStyle: 'italic', color: 'var(--accent-gold)', zIndex: 10 }}>
          VS
        </div>

        {/* Counter Agent */}
        <div style={{ flex: 1, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-primary)', borderTop: '3px solid #EF4444', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 8px 0' }}>COUNTER AGENT 🔴</h4>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {counter.recommendation || '—'}
              </div>
            </div>
            <div style={{ width: '100px' }}>
              <ConfidenceMeter confidence={counter.confidence ?? 0} />
            </div>
          </div>

          {(counter.weaknesses_found || []).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <h5 style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '1px', marginBottom: '4px' }}>WEAKNESSES FOUND</h5>
              {counter.weaknesses_found.map((wk, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--status-escalate)' }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{wk}</span>
                </div>
              ))}
            </div>
          )}

          {(counter.counter_points || []).length > 0 && (
            <ol style={{ paddingLeft: '16px', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {counter.counter_points.map((pt, i) => <li key={i}>{pt}</li>)}
            </ol>
          )}

          {counter.summary && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>
              "{counter.summary}"
            </p>
          )}

          {!counter.recommendation && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>No counter data available</p>
          )}
        </div>
      </div>

      {/* Synthesis verdict */}
      <div style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-accent)', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-gold)', margin: '0 0 8px 0' }}>SYNTHESIS VERDICT</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {rec.final_recommendation || '—'}
              </div>
              <PriorityBadge priority={rec.priority} />
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>CONFIDENCE</div>
            <ConfidenceMeter confidence={rec.final_confidence ?? 0} />
          </div>
        </div>

        {/* Comply vs Appeal arguments */}
        <div style={{ display: 'flex', gap: '32px', marginBottom: '24px' }}>
          <div style={{ flex: 1 }}>
            <h5 style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>FOR COMPLYING</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(debate.comply_arguments || []).map((pt, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <CheckCircle2 size={14} color="var(--status-low)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px' }}>{pt}</span>
                </div>
              ))}
              {!(debate.comply_arguments || []).length && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>—</span>}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <h5 style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>FOR APPEALING</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(debate.appeal_arguments || []).map((pt, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <CheckCircle2 size={14} color="var(--accent-gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px' }}>{pt}</span>
                </div>
              ))}
              {!(debate.appeal_arguments || []).length && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>—</span>}
            </div>
          </div>
        </div>

        <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: debate.agents_agreed ? 'var(--status-low)' : 'var(--accent-gold)', textAlign: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-primary)' }}>
          {debate.agents_agreed
            ? '✓ Both agents reached the same conclusion'
            : '⚔ Agents disagreed — synthesis resolved the conflict'}
        </div>
      </div>
    </div>
  );
}
