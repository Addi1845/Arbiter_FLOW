import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Swords, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { isAuthenticated } from '../utils/auth';

/* ── tiny CSS ─────────────────────────────────────────────────────── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes agentPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%       { transform: scale(1.4); opacity: 0.5; }
}
.hero-left  { animation: fadeInUp 400ms ease forwards; }
.hero-right { animation: fadeInUp 400ms ease 150ms forwards; opacity: 0; }

.agent-dot-1 { animation: agentPulse 1.4s ease-in-out 0ms    infinite; }
.agent-dot-2 { animation: agentPulse 1.4s ease-in-out 200ms  infinite; }
.agent-dot-3 { animation: agentPulse 1.4s ease-in-out 400ms  infinite; }

.cta-btn { transition: all 150ms ease; }
.cta-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
`;

export default function Hero() {
  const navigate = useNavigate();

  // If already logged in, redirect to app
  useEffect(() => {
    if (isAuthenticated()) navigate('/upload', { replace: true });
  }, [navigate]);

  return (
    <>
      <style>{css}</style>

      {/* Full viewport wrapper */}
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary, #0B1120)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'IBM Plex Sans', sans-serif",
        color: 'var(--text-primary, #EDE8DC)',
      }}>

        {/* ── MAIN SPLIT ───────────────────────────────────────────── */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '55% 45%',
          maxWidth: '1280px',
          width: '100%',
          margin: '0 auto',
          padding: '0 80px',
          alignItems: 'center',
          minHeight: 'calc(100vh - 60px)',
        }}>

          {/* ── LEFT ─────────────────────────────────────────────── */}
          <div className="hero-left" style={{ paddingRight: '48px', paddingTop: '80px', paddingBottom: '80px' }}>

            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center',
              backgroundColor: 'rgba(212,160,23,0.1)',
              border: '1px solid rgba(212,160,23,0.3)',
              padding: '6px 14px',
              borderRadius: '2px',
              marginBottom: '32px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '10px',
              color: '#D4A017',
              letterSpacing: '2px',
            }}>
              AI FOR BHARAT — HACKATHON 2026
            </div>

            {/* Heading */}
            <div style={{ marginBottom: '24px' }}>
              {[
                { text: 'From Court', style: {} },
                { text: 'Judgments to', style: {} },
                { text: 'Verified Action', style: { color: '#D4A017' } },
                { text: 'Plans.', style: { fontStyle: 'italic' } },
              ].map((line, i) => (
                <div key={i} style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 'clamp(36px, 4vw, 52px)',
                  fontWeight: '700',
                  lineHeight: '1.15',
                  color: 'var(--text-primary, #EDE8DC)',
                  ...line.style,
                }}>
                  {line.text}
                </div>
              ))}
            </div>

            {/* Subtext */}
            <p style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: '16px',
              lineHeight: '1.7',
              color: 'rgba(237,232,220,0.65)',
              maxWidth: '460px',
              marginBottom: '40px',
              margin: '0 0 40px 0',
            }}>
              JudgeFlow AI reads High Court judgment PDFs,
              reasons through them using adversarial AI agents,
              and delivers human-verified action plans to
              government officials — in minutes, not days.
            </p>

            {/* Feature Pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '48px' }}>
              {[
                { icon: FileText, label: 'PDF Extraction' },
                { icon: Swords, label: 'Agent Debate' },
                { icon: ShieldCheck, label: 'Human Verified' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '8px 14px',
                  borderRadius: '2px',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: '13px',
                  color: 'rgba(237,232,220,0.75)',
                }}>
                  <Icon size={14} color="#D4A017" />
                  {label}
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              className="cta-btn"
              onClick={() => navigate('/login')}
              style={{
                backgroundColor: 'var(--accent-teal, #0ECFC0)',
                color: '#0B1120',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: '14px',
                fontWeight: '600',
                padding: '14px 32px',
                border: 'none',
                borderRadius: '2px',
                cursor: 'pointer',
                letterSpacing: '0.5px',
              }}
            >
              Access System →
            </button>

            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '11px',
              color: 'rgba(237,232,220,0.4)',
              marginTop: '12px',
            }}>
              Authorized government personnel only
            </div>
          </div>

          {/* ── RIGHT — Terminal Card ──────────────────────────────── */}
          <div className="hero-right" style={{ display: 'flex', justifyContent: 'center', paddingTop: '80px', paddingBottom: '80px' }}>
            <div style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
              overflow: 'hidden',
            }}>

              {/* Card Header */}
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                {/* Mac dots */}
                <div style={{ display: 'flex', gap: '5px' }}>
                  {['#E5392E', '#C8971A', '#2D7D4F'].map(c => (
                    <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: c }} />
                  ))}
                </div>
                <div style={{ flex: 1, textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'rgba(237,232,220,0.4)', letterSpacing: '1px' }}>
                  AGENT PIPELINE — LIVE
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '20px' }}>

                {/* Stage 1 — DONE */}
                <PipelineStage
                  state="done"
                  label="PDF PARSED"
                  sub="12 pages — Digital extraction"
                />

                {/* Stage 2 — DONE */}
                <PipelineStage
                  state="done"
                  label="AI EXTRACTION"
                  sub="8 directives found — Conf. 0.87"
                />

                {/* Stage 3 — ACTIVE */}
                <div style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    border: '1.5px solid #0ECFC0',
                    backgroundColor: 'rgba(14,207,192,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px'
                  }}>
                    <Loader2 size={13} color="#0ECFC0" style={{ animation: 'spin 1.2s linear infinite' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: '#0ECFC0', marginBottom: '4px' }}>AGENT PIPELINE</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {[
                        { cls: 'agent-dot-1', color: '#4A9EFF', label: 'Research Agent...' },
                        { cls: 'agent-dot-2', color: '#E5392E', label: 'Counter Agent...' },
                        { cls: 'agent-dot-3', color: '#2D7D4F', label: 'Synthesis Agent...' },
                      ].map(a => (
                        <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div className={a.cls} style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: a.color, flexShrink: 0 }} />
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'rgba(237,232,220,0.45)' }}>{a.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Stage 4 — PENDING */}
                <PipelineStage
                  state="pending"
                  label="HUMAN REVIEW"
                  sub="Pending agent completion"
                />

                {/* Recommendation Preview */}
                <div style={{
                  marginTop: '16px',
                  backgroundColor: 'rgba(212,160,23,0.06)',
                  border: '1px solid rgba(212,160,23,0.2)',
                  padding: '14px 16px',
                  borderRadius: '2px',
                }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#D4A017', letterSpacing: '2px', marginBottom: '4px' }}>
                    AI RECOMMENDATION
                  </div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: '700', color: '#D4A017', lineHeight: 1 }}>
                    COMPLY
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'rgba(237,232,220,0.4)', marginTop: '6px' }}>
                    Confidence: 87% · Deadline: 23 days
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* ── FOOTER STRIP ─────────────────────────────────────────── */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '20px 80px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'rgba(237,232,220,0.35)' }}>
            © 2026 JudgeFlow AI — Centre for e-Governance
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'rgba(237,232,220,0.35)' }}>
            Built for AI for Bharat Hackathon · HackerEarth
          </span>
        </div>

      </div>
    </>
  );
}

/* ── Pipeline Stage sub-component ──────────────────────────────────── */
function PipelineStage({ state, label, sub }) {
  const isDone = state === 'done';
  return (
    <div style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'flex-start' }}>
      <div style={{
        width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0, marginTop: '2px',
        backgroundColor: isDone ? 'rgba(45,125,79,0.15)' : 'transparent',
        border: isDone ? '1.5px solid #2D7D4F' : '1.5px solid rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isDone && <CheckCircle2 size={13} color="#2D7D4F" />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: isDone ? 'rgba(237,232,220,0.75)' : 'rgba(237,232,220,0.3)', marginBottom: '2px' }}>
          {label}
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'rgba(237,232,220,0.35)' }}>
          {sub}
        </div>
      </div>
      {isDone && (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: '#2D7D4F', flexShrink: 0 }}>✓</div>
      )}
    </div>
  );
}
