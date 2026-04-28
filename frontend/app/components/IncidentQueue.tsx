'use client';

import { useMemo, useState } from 'react';
import { Detection } from '../hooks/useDetectionSocket';

type IncidentStatus = 'new' | 'acknowledged' | 'snoozed' | 'escalated';

interface IncidentQueueProps {
  detections: Detection[];
}

const STATUS_COLOR: Record<IncidentStatus, string> = {
  new: '#ef4444',
  acknowledged: '#22c55e',
  snoozed: '#f59e0b',
  escalated: '#fb7185'
};

export default function IncidentQueue({ detections }: IncidentQueueProps) {
  const [incidentStatus, setIncidentStatus] = useState<Record<string, IncidentStatus>>({});

  const incidents = useMemo(() => {
    return detections
      .filter((det) => det.triage === 'CRITICAL' || det.class_name === 'fire' || det.class_name === 'smoke')
      .slice(0, 20);
  }, [detections]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-header">
        <div>
          <div className="eyebrow">Action center</div>
          <div className="panel-title">Active incidents</div>
        </div>
        <div className="status-pill">{incidents.length} active</div>
      </div>

      <div style={{ overflow: 'auto', padding: 10, display: 'grid', gap: 10 }}>
        {incidents.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 8 }}>
            No active incidents in current frame.
          </div>
        )}

        {incidents.map((incident) => {
          const status = incidentStatus[incident.track_id] || 'new';
          const label =
            incident.class_name === 'person'
              ? `${incident.triage} PERSON`
              : `${incident.class_name.toUpperCase()} HAZARD`;
          return (
            <div key={incident.track_id} className="incident-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{label}</div>
                <span
                  style={{
                    color: STATUS_COLOR[status],
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    textTransform: 'uppercase'
                  }}
                >
                  {status}
                </span>
              </div>

              <div style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 12 }}>
                Conf {Math.round(incident.confidence * 100)}% / frame {incident.frame_id}
              </div>

              <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                <button className="incident-action" onClick={() => setIncidentStatus((prev) => ({ ...prev, [incident.track_id]: 'acknowledged' }))}>
                  Ack
                </button>
                <button className="incident-action" onClick={() => setIncidentStatus((prev) => ({ ...prev, [incident.track_id]: 'snoozed' }))}>
                  Snooze
                </button>
                <button className="incident-action danger" onClick={() => setIncidentStatus((prev) => ({ ...prev, [incident.track_id]: 'escalated' }))}>
                  Escalate
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
