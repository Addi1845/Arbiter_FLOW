import React from 'react';

export default function PDFViewer({ url, pageCount, digitalPages, ocrPages }) {
  if (!url) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        color: 'var(--text-muted)'
      }}>
        No PDF Source Available
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ 
        padding: '12px 16px', 
        backgroundColor: 'var(--bg-elevated)', 
        border: '1px solid var(--border-primary)',
        borderBottom: 'none',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)', letterSpacing: '1px' }}>
          SOURCE DOCUMENT
        </div>
        <button 
          onClick={() => window.open(url, '_blank')}
          style={{
            background: 'none',
            border: '1px solid var(--accent-teal)',
            color: 'var(--accent-teal)',
            padding: '4px 8px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          OPEN EXTERNALLY
        </button>
      </div>
      
      <div style={{ flex: 1, border: '1px solid var(--border-primary)' }}>
        <iframe 
          src={`${url}#view=FitH`} 
          width="100%" 
          height="100%" 
          style={{ border: 'none', backgroundColor: '#fff' }}
          title="PDF Viewer"
        />
      </div>

      <div style={{ 
        padding: '12px 16px', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        border: '1px solid var(--border-primary)',
        borderTop: 'none',
        backgroundColor: 'var(--bg-elevated)'
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
          {pageCount} PAGES ({digitalPages} DIGITAL, {ocrPages} OCR)
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-teal)' }}>
          FETCHED VIA CCMS API
        </div>
      </div>
    </div>
  );
}
