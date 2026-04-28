'use client';

import { Detection } from '../hooks/useDetectionSocket';

interface AlertBannerProps {
  detections: Detection[];
}

export default function AlertBanner({ detections }: AlertBannerProps) {
  const criticals = detections.filter((d) => d.triage === 'CRITICAL');
  const hazards = detections.filter((d) => d.class_name === 'fire' || d.class_name === 'smoke');

  if (criticals.length === 0 && hazards.length === 0) {
    return <div style={{ display: 'none' }} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {hazards.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '9px 16px',
            background: 'rgba(249, 115, 22, 0.13)',
            borderBottom: '1px solid rgba(249, 115, 22, 0.38)',
            color: 'rgb(249, 115, 22)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: 'uppercase'
          }}
        >
          <span className="status-dot live-blink" style={{ background: 'rgb(249, 115, 22)' }} />
          Hazard detected: {hazards.map(h => h.class_name).join(' & ')} observed in sector.
        </div>
      )}
      {criticals.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '9px 16px',
            background: 'rgba(239, 68, 68, 0.13)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.38)',
            color: 'var(--critical)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: 'uppercase'
          }}
        >
          <span className="status-dot bad live-blink" />
          {criticals.length} motionless person
          {criticals.length > 1 ? 's' : ''} detected. Immediate response required.
        </div>
      )}
    </div>
  );
}
