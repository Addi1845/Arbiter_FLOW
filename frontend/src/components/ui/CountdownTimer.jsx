import React from 'react';

function parseDeadline(dateStr) {
  if (!dateStr) return null;

  // Try DD-MM-YYYY
  const ddmmyyyy = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    if (!isNaN(date.getTime())) return date;
  }

  // Try DD/MM/YYYY
  const ddmmslash = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmslash) {
    const [, d, m, y] = ddmmslash;
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    if (!isNaN(date.getTime())) return date;
  }

  // Try ISO YYYY-MM-DD
  const iso = new Date(dateStr);
  if (!isNaN(iso.getTime())) return iso;

  return null;
}

export default function CountdownTimer({ deadlineDate }) {
  // Guard: empty / invalid / placeholder strings
  if (
    !deadlineDate ||
    deadlineDate === '' ||
    deadlineDate === 'N/A' ||
    deadlineDate.startsWith('Calculate') ||
    deadlineDate.startsWith('Verify date')
  ) {
    return (
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
        No deadline set
      </span>
    );
  }

  const deadline = parseDeadline(deadlineDate);

  if (!deadline) {
    return (
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
        {deadlineDate}
      </span>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);

  const diffMs = deadline.getTime() - today.getTime();
  const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return (
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
        <span style={{ color: 'var(--status-escalate)', fontWeight: 600 }}>
          DEADLINE PASSED ({Math.abs(daysRemaining)}d ago)
        </span>
        <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
          {deadlineDate}
        </span>
      </div>
    );
  }

  if (daysRemaining === 0) {
    return (
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--status-escalate)', fontWeight: 700 }}>
        🔴 DUE TODAY
      </span>
    );
  }

  const color = daysRemaining <= 7
    ? 'var(--status-escalate)'
    : daysRemaining <= 14
      ? '#E07B39'
      : daysRemaining <= 30
        ? 'var(--status-medium)'
        : 'var(--status-low)';

  const prefix = daysRemaining <= 7 ? '⚠ ' : '';

  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
      <span style={{ color, fontWeight: daysRemaining <= 14 ? 600 : 400 }}>
        {prefix}{daysRemaining} days remaining
      </span>
      <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
        {deadlineDate}
      </span>
    </div>
  );
}
