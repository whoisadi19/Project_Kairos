'use client';

import { useEffect, useState } from 'react';
import { SystemHealth } from '../hooks/useDetectionSocket';

interface TopBarProps {
  isConnected: boolean;
  fps: number;
  frameId: number;
  mode: string;
  onModeSwitch: (mode: string) => void;
  criticalCount: number;
  activeAlerts: number;
  totalDetections: number;
  health: SystemHealth | null;
}

export default function TopBar({
  isConnected,
  fps,
  frameId,
  mode,
  onModeSwitch,
  criticalCount,
  activeAlerts,
  totalDetections,
  health
}: TopBarProps) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => setTime(new Date().toTimeString().slice(0, 8));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const streamOk = health?.stream_ok ?? false;
  const dbOk = health?.db_ok ?? false;
  const missionStatus = criticalCount > 0 ? 'Critical' : activeAlerts > 0 ? 'Warning' : 'Nominal';
  const missionColor = criticalCount > 0 ? 'var(--critical)' : activeAlerts > 0 ? 'var(--hazard)' : 'var(--stable)';

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        padding: '0 18px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(10, 13, 18, 0.92)'
      }}
    >
      <div style={{ minWidth: 180 }}>
        <div
          style={{
            fontSize: 17,
            fontWeight: 800,
            letterSpacing: 0.4,
            color: 'var(--text)'
          }}
        >
          Kairos
        </div>
        <div className="eyebrow">Drone response dashboard</div>
      </div>

      <div className="status-pill">
        <span className={`status-dot ${isConnected ? 'ok' : 'bad'}`} />
        {isConnected ? 'Socket online' : 'Socket offline'}
      </div>

      <div className="status-pill">
        <span className={`status-dot ${streamOk ? 'ok' : 'warn'}`} />
        {streamOk ? 'Stream active' : 'Stream waiting'}
      </div>

      <div className="status-pill">
        <span className={`status-dot ${dbOk ? 'ok' : 'bad'}`} />
        {dbOk ? 'DB ready' : 'DB issue'}
      </div>

      <div
        className="status-pill"
        style={{
          borderColor: missionColor,
          color: missionColor
        }}
      >
        Mission {missionStatus}
      </div>

      <div style={{ flex: 1 }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11
        }}
      >
        <span>{fps} FPS</span>
        <span>/</span>
        <span>{health?.fps ?? 0} API FPS</span>
        <span>/</span>
        <span>Frame {frameId}</span>
        <span>/</span>
        <span>{totalDetections} objects</span>
        {activeAlerts > 0 && (
          <>
            <span>/</span>
            <span className="severity-critical">{activeAlerts} alerts</span>
          </>
        )}
      </div>

      <div style={{ display: 'flex', border: '1px solid var(--border)' }}>
        {['recorded', 'live'].map((item) => (
          <button
            key={item}
            onClick={() => onModeSwitch(item)}
            style={{
              border: 0,
              borderRight: item === 'recorded' ? '1px solid var(--border)' : 0,
              background:
                mode === item ? 'rgba(125, 211, 252, 0.12)' : 'transparent',
              color: mode === item ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer',
              padding: '8px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              textTransform: 'uppercase'
            }}
          >
            {item === 'recorded' ? 'Demo' : 'Live'}
          </button>
        ))}
      </div>

      <div
        style={{
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          minWidth: 72,
          textAlign: 'right'
        }}
      >
        {time}
      </div>
    </header>
  );
}
