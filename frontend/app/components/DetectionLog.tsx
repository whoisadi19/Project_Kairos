'use client';

import { useEffect, useRef } from 'react';
import { Detection } from '../hooks/useDetectionSocket';

interface DetectionLogProps {
  detections: Detection[];
}

function severity(det: Detection) {
  if (det.triage === 'CRITICAL') return 'critical';
  if (det.triage === 'STABLE') return 'stable';
  return 'vehicle';
}

export default function DetectionLog({
  detections
}: DetectionLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const allDetections = detections
    .filter((det, index, arr) => arr.findIndex((d) => d.track_id === det.track_id) === index)
    .slice(0, 30);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [allDetections.length]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-header">
        <div>
          <div className="eyebrow">Event feed</div>
          <div className="panel-title">Detections</div>
        </div>
        <div className="status-pill">{allDetections.length} entries</div>
      </div>

      <div
        ref={scrollRef}
        style={{
          minHeight: 0,
          overflow: 'auto',
          padding: 8
        }}
      >
        {allDetections.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 16 }}>
            No detections in the current frame.
          </div>
        ) : (
          allDetections.map((det, index) => {
            const sev = severity(det);
            const label =
              det.class_name === 'person' && det.triage
                ? `${det.triage.toLowerCase()} person`
                : det.class_name;

            return (
              <div
                key={`${det.frame_id}-${det.track_id}-${index}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '9px 1fr auto',
                  gap: 10,
                  alignItems: 'center',
                  padding: '10px 8px',
                  borderBottom: '1px solid var(--border)'
                }}
              >
                <span
                  className={`status-dot ${
                    sev === 'critical'
                      ? 'bad'
                      : sev === 'stable'
                        ? 'ok'
                        : 'warn'
                  }`}
                />
                <div>
                  <div
                    className={
                      sev === 'critical'
                        ? 'severity-critical'
                        : sev === 'stable'
                          ? 'severity-stable'
                          : 'severity-vehicle'
                    }
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      textTransform: 'capitalize'
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      marginTop: 3,
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10
                    }}
                  >
                    {det.lat}, {det.lng} / frame {det.frame_id}
                  </div>
                </div>
                <div
                  style={{
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11
                  }}
                >
                  {Math.round(det.confidence * 100)}%
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
