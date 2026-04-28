'use client';

import { SystemHealth } from '../hooks/useDetectionSocket';

interface SystemStatusProps {
  isConnected: boolean;
  fps: number;
  mode: string;
  health: SystemHealth | null;
}

function statusClass(ok: boolean | null) {
  if (ok === null) return 'warn';
  return ok ? 'ok' : 'bad';
}

export default function SystemStatus({
  isConnected,
  fps,
  mode,
  health
}: SystemStatusProps) {
  const systems = [
    {
      label: 'Model',
      value: health?.enabled_classes?.join(', ') || 'Waiting for API',
      detail: health?.enabled_classes
        ? `Loaded model exposes ${health.model_classes.length} classes`
        : 'Health poll pending',
      ok: Boolean(health)
    },
    {
      label: 'Compute',
      value: health?.device || 'Unknown',
      detail: health?.cuda_available ? 'CUDA available' : 'CPU fallback',
      ok: health ? health.cuda_available || health.device === 'cpu' : null
    },
    {
      label: 'Stream',
      value: mode === 'live' ? 'Pi RTSP' : 'Recorded feed',
      detail: health?.stream_error || health?.stream_source || 'No source yet',
      ok: health ? health.stream_ok : null
    },
    {
      label: 'WebSocket',
      value: isConnected ? 'Online' : 'Offline',
      detail: `${fps} client FPS`,
      ok: isConnected
    },
    {
      label: 'Database',
      value: health?.db_ok ? 'SQLite ready' : 'Unavailable',
      detail: health?.db_error || 'Detection history logging',
      ok: health ? health.db_ok : null
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-header">
        <div>
          <div className="eyebrow">Readiness</div>
          <div className="panel-title">System status</div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gap: 10,
          padding: 12,
          overflow: 'auto'
        }}
      >
        {systems.map((system) => (
          <div
            key={system.label}
            style={{
              border: '1px solid var(--border)',
              background: 'rgba(255,255,255,0.025)',
              padding: 12
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12
              }}
            >
              <div className="eyebrow">{system.label}</div>
              <span className={`status-dot ${statusClass(system.ok)}`} />
            </div>
            <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700 }}>
              {system.value}
            </div>
            <div
              style={{
                marginTop: 5,
                color: 'var(--text-muted)',
                fontSize: 12,
                lineHeight: 1.4
              }}
            >
              {system.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
