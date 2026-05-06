import React, { useState, useEffect } from 'react';
import { Scale, CheckCircle2, CircleDashed, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { uploadPDF, getStatus, triggerExtraction, getExtraction, runAgents, listJudgments } from '../api/judgeflow';
import StatusBadge from '../components/ui/StatusBadge';
import PriorityBadge from '../components/ui/PriorityBadge';
import CountdownTimer from '../components/ui/CountdownTimer';

export default function Upload() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [pipelineStage, setPipelineStage] = useState(0); 
  const [uploadStatus, setUploadStatus] = useState(null);
  const [extractStatus, setExtractStatus] = useState(null);
  const navigate = useNavigate();

  const { data: recentJudgments, refetch: refetchRecent } = useQuery({
    queryKey: ['recentJudgments'],
    queryFn: listJudgments
  });

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (selectedFile) => {
    if (selectedFile.type !== 'application/pdf') {
      alert("Only PDF files are allowed.");
      return;
    }
    setFile(selectedFile);
    setUploading(true);
    try {
      const res = await uploadPDF(selectedFile);
      setCurrentId(res.judgment_id);
      setPipelineStage(1);
      
      fetchStatusAndContinue(res.judgment_id);
    } catch (err) {
      alert("Upload failed: " + err.message);
      setUploading(false);
    }
  };

  const fetchStatusAndContinue = async (id) => {
    const sRes = await getStatus(id);
    setUploadStatus(sRes.metadata);
    setPipelineStage(2);
    
    await triggerExtraction(id);
    
    let extDone = false;
    while (!extDone) {
      await new Promise(r => setTimeout(r, 3000));
      const eRes = await getExtraction(id);
      if (eRes.extraction_status === 'completed' || eRes.extraction_status === 'failed') {
        extDone = true;
        setExtractStatus(eRes.data);
      }
    }
    
    setPipelineStage(3);
    
    await runAgents(id);
    let agDone = false;
    while (!agDone) {
      await new Promise(r => setTimeout(r, 5000));
      const aRes = await getStatus(id);
      if (aRes.agent_status === 'completed' || aRes.agent_status === 'failed') {
        agDone = true;
      }
    }
    
    setPipelineStage(4);
    setUploading(false);
    refetchRecent();
  };

  useEffect(() => {
    document.title = "Upload — ArbiterFlow AI";
  }, []);

  /* --- Helper: Stage icon --- */
  const StageIcon = ({ stage, current }) => {
    if (current > stage) {
      // Completed
      return (
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%',
          backgroundColor: 'rgba(45,125,79,0.15)',
          border: '1px solid var(--status-comply)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <CheckCircle2 size={16} color="var(--status-comply)" />
        </div>
      );
    }
    if (current === stage) {
      // Active
      return (
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%',
          backgroundColor: 'rgba(14,207,192,0.10)',
          border: '1px solid var(--accent-teal)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Loader2 size={16} color="var(--accent-teal)" className="spin-anim" />
        </div>
      );
    }
    // Pending
    return (
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%',
        backgroundColor: 'transparent',
        border: '1px solid rgba(255,255,255,0.15)',
        flexShrink: 0
      }} />
    );
  };

  /* --- Helper: Stage title style --- */
  const stageTitle = (stage, current, label) => {
    if (current > stage) {
      return (
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
          {label} <span style={{ color: 'var(--status-comply)' }}>✓</span>
        </span>
      );
    }
    if (current === stage) {
      return <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{label}</span>;
    }
    return <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: '400', color: 'var(--text-muted)' }}>{label}</span>;
  };

  /* --- Helper: Agent dot --- */
  const AgentDot = ({ color, label, active, done }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
      <div
        className={active ? 'agent-pulse' : ''}
        style={{
          width: '7px', height: '7px', borderRadius: '50%',
          backgroundColor: color,
          color: color,
          flexShrink: 0,
          opacity: done ? 0.4 : 1
        }}
      />
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)',
        textDecoration: done ? 'line-through' : 'none',
        opacity: done ? 0.5 : 1
      }}>
        {label}
      </span>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', animation: 'fadeIn 200ms ease forwards' }}>
      {/* Left column */}
      <div>
        {/* Section label */}
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '3px',
          color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '20px'
        }}>
          JUDGMENT INTAKE
        </div>

        {/* Drop zone */}
        {!currentId && (
          <>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('pdf-upload').click()}
              style={{
                border: isDragging ? '2px dashed var(--accent-gold)' : '2px dashed rgba(255,255,255,0.12)',
                borderRadius: '4px',
                backgroundColor: isDragging ? 'rgba(212,160,23,0.04)' : 'rgba(255,255,255,0.02)',
                padding: '48px 32px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 200ms ease',
                textAlign: 'center',
                marginBottom: '12px',
                transform: isDragging ? 'scale(1.01)' : 'scale(1)'
              }}
            >
              <input
                type="file"
                id="pdf-upload"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <Scale size={48} color="var(--accent-gold)" style={{ marginBottom: '16px', opacity: 0.7 }} />
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                {isDragging ? 'Release to upload' : 'Drop Court Judgment PDF'}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)',
                letterSpacing: '1px', textTransform: 'uppercase'
              }}>
                PDF ONLY — MAX 50MB — CCMS COMPATIBLE
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => document.getElementById('pdf-upload').click()}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-teal)',
                  padding: '4px 0', textDecoration: 'none'
                }}
                onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
              >
                or browse files
              </button>
            </div>
          </>
        )}

        {/* Uploading initial state */}
        {uploading && pipelineStage === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', border: '1px solid var(--border-primary)', borderRadius: '4px' }}>
            <Loader2 size={24} color="var(--accent-gold)" className="spin-anim" style={{ marginBottom: '12px' }} />
            <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)', fontSize: '12px', letterSpacing: '1px' }}>UPLOADING...</p>
          </div>
        )}

        {/* Pipeline card */}
        {currentId && pipelineStage > 0 && (
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '4px',
            padding: '28px 32px',
            maxWidth: '640px'
          }}>
            {/* Pipeline header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingBottom: '16px', marginBottom: '24px',
              borderBottom: '1px solid rgba(212,160,23,0.2)'
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '2px' }}>
                PROCESSING PIPELINE
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-gold)', letterSpacing: '2px' }}>
                {currentId}
              </span>
            </div>

            {/* Stage 1: PDF Parsed */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '14px 0', borderBottom: '1px solid var(--border-faint)' }}>
              <StageIcon stage={1} current={pipelineStage} />
              <div>
                {stageTitle(1, pipelineStage, 'PDF PARSED')}
                {uploadStatus && pipelineStage > 1 && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {uploadStatus.page_count} pages — {uploadStatus.digital_pages} digital, {uploadStatus.ocr_pages} OCR
                  </div>
                )}
              </div>
            </div>

            {/* Stage 2: AI Extraction */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '14px 0', borderBottom: '1px solid var(--border-faint)' }}>
              <StageIcon stage={2} current={pipelineStage} />
              <div>
                {stageTitle(2, pipelineStage, 'AI EXTRACTION')}
                {pipelineStage === 2 && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Analyzing {uploadStatus?.page_count || 0} pages with Llama 3.3 70B...
                  </div>
                )}
                {extractStatus && pipelineStage > 2 && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {extractStatus.total_directives || 0} directives extracted
                  </div>
                )}
              </div>
            </div>

            {/* Stage 3: Agent Pipeline */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '14px 0', borderBottom: '1px solid var(--border-faint)' }}>
              <StageIcon stage={3} current={pipelineStage} />
              <div>
                {stageTitle(3, pipelineStage, 'AGENT PIPELINE')}
                {pipelineStage === 3 && (
                  <div style={{ marginTop: '4px' }}>
                    <AgentDot color="var(--agent-research)" label="Research Agent — analyzing..." active={true} done={false} />
                    <AgentDot color="var(--agent-counter)" label="Counter Agent — challenging..." active={false} done={false} />
                    <AgentDot color="var(--agent-synthesis)" label="Synthesis Agent — deciding..." active={false} done={false} />
                  </div>
                )}
                {pipelineStage > 3 && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Adversarial debate concluded. Synthesis complete.
                  </div>
                )}
              </div>
            </div>

            {/* Stage 4: Ready for Review */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '14px 0' }}>
              <StageIcon stage={4} current={pipelineStage} />
              <div>
                {stageTitle(4, pipelineStage, 'READY FOR REVIEW')}
                {pipelineStage >= 4 && (
                  <div style={{ marginTop: '10px' }}>
                    <button
                      onClick={() => navigate(`/verify/${currentId}/detail`)}
                      style={{
                        backgroundColor: 'var(--accent-teal)',
                        color: '#0B1120',
                        border: 'none',
                        padding: '8px 20px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        letterSpacing: '1px',
                        borderRadius: '2px',
                        transition: 'opacity 150ms ease'
                      }}
                      onMouseEnter={(e) => e.target.style.opacity = '0.85'}
                      onMouseLeave={(e) => e.target.style.opacity = '1'}
                    >
                      REVIEW NOW →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right column: Recent Uploads */}
      <div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '3px',
          color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '20px'
        }}>
          RECENT JUDGMENTS
        </div>

        <div style={{
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '0'
        }} />

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {recentJudgments?.items?.map(j => (
            <div
              key={j.judgment_id}
              onClick={() => navigate(`/verify/${j.judgment_id}/detail`)}
              style={{
                padding: '12px 0',
                borderBottom: '1px solid var(--border-faint)',
                cursor: 'pointer',
                transition: 'background 150ms ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                marginBottom: '6px'
              }}>
                {j.filename}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-gold)' }}>
                  {j.judgment_id}
                </span>
                <StatusBadge status={j.verification_status || j.agent_status || j.extraction_status || 'pending'} />
              </div>
            </div>
          ))}
          {!recentJudgments?.items?.length && (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '12px', padding: '32px 0', fontFamily: 'var(--font-mono)' }}>
              No recent uploads
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
