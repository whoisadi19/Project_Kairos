'use client';

import { Detection } from '../hooks/useDetectionSocket';

interface TriageSummaryProps {
  detections: Detection[];
}

export default function TriageSummary({ detections }: TriageSummaryProps) {
  const rows = [
    {
      label: 'Critical persons',
      count: detections.filter((d) => d.triage === 'CRITICAL').length,
      className: 'severity-critical'
    },
    {
      label: 'Stable persons',
      count: detections.filter((d) => d.triage === 'STABLE').length,
      className: 'severity-stable'
    },
    {
      label: 'Vehicles',
      count: detections.filter((d) => d.class_name === 'vehicle').length,
      className: 'severity-vehicle'
    },
    {
      label: 'Fire/Smoke Hazards',
      count: detections.filter((d) => d.class_name === 'fire' || d.class_name === 'smoke').length,
      className: 'severity-hazard'
    },
    {
      label: 'Debris',
      count: detections.filter((d) => d.class_name === 'debris').length,
      className: 'severity-debris'
    }
  ];

  const total = Math.max(detections.length, 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-header">
        <div>
          <div className="eyebrow">Current frame</div>
          <div className="panel-title">Triage summary</div>
        </div>
      </div>

      <div style={{ padding: 14, display: 'grid', gap: 14 }}>
        {rows.map((row) => (
          <div key={row.label}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 7,
                fontSize: 13
              }}
            >
              <span className={row.className}>{row.label}</span>
              <strong>{row.count}</strong>
            </div>
            <div
              style={{
                height: 6,
                background: 'rgba(255,255,255,0.07)',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${(row.count / total) * 100}%`,
                  height: '100%',
                  background:
                    row.className === 'severity-critical'
                      ? 'var(--critical)'
                      : row.className === 'severity-stable'
                        ? 'var(--stable)'
                        : row.className === 'severity-vehicle'
                          ? 'var(--vehicle)'
                          : row.className === 'severity-hazard'
                            ? 'var(--hazard)'
                            : 'var(--debris)'
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
