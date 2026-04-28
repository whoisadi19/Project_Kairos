'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

import { API_URL, Detection, useDetectionSocket } from './hooks/useDetectionSocket';
import AlertBanner from './components/AlertBanner';
import DetectionLog from './components/DetectionLog';
import IncidentQueue from './components/IncidentQueue';
import SystemStatus from './components/SystemStatus';
import TopBar from './components/TopBar';
import TriageSummary from './components/TriageSummary';
import VideoCanvas from './components/VideoCanvas';

const MapView = dynamic(() => import('./components/MapView'), { ssr: false });

export default function KairosPage() {
  const {
    detections,
    currentFrame,
    isConnected,
    isSignalLost,
    fps,
    frameId,
    health
  } = useDetectionSocket();

  const [mode, setMode] = useState('recorded');
  const [classFilter, setClassFilter] = useState<'all' | 'person' | 'vehicle'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'stable'>('all');
  const [minConfidence, setMinConfidence] = useState(20);

  useEffect(() => {
    if (health?.mode) {
      setMode(health.mode);
    }
  }, [health?.mode]);

  const metrics = useMemo(() => {
    const critical = detections.filter((d) => d.triage === 'CRITICAL').length;
    const stable = detections.filter((d) => d.triage === 'STABLE').length;
    const vehicles = detections.filter((d) => d.class_name === 'vehicle').length;
    const persons = detections.filter((d) => d.class_name === 'person').length;

    return { critical, stable, vehicles, persons };
  }, [detections]);

  const activeAlerts = useMemo(
    () =>
      detections.filter(
        (d) =>
          d.triage === 'CRITICAL' ||
          d.class_name === 'fire' ||
          d.class_name === 'smoke'
      ).length,
    [detections]
  );

  const filteredDetections = useMemo(() => {
    return detections.filter((d) => {
      if (classFilter !== 'all' && d.class_name !== classFilter) return false;
      if (severityFilter === 'critical' && d.triage !== 'CRITICAL') return false;
      if (severityFilter === 'stable' && d.triage !== 'STABLE') return false;
      return d.confidence * 100 >= minConfidence;
    });
  }, [detections, classFilter, severityFilter, minConfidence]);

  const handleModeSwitch = async (newMode: string) => {
    const previousMode = mode;
    setMode(newMode);
    try {
      const response = await fetch(`${API_URL}/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode })
      });

      if (!response.ok) {
        setMode(previousMode);
      }
    } catch (error) {
      console.error('Mode switch failed:', error);
      setMode(previousMode);
    }
  };

  return (
    <div className="dashboard-root">
      <TopBar
        isConnected={isConnected}
        fps={fps}
        frameId={frameId}
        mode={mode}
        onModeSwitch={handleModeSwitch}
        criticalCount={metrics.critical}
        activeAlerts={activeAlerts}
        totalDetections={detections.length}
        health={health}
      />

      <AlertBanner detections={detections} />

      <div className="control-strip">
        <div className="status-pill">Filters</div>
        <div className="filter-group">
          {(['all', 'person', 'vehicle'] as const).map((value) => (
            <button
              key={value}
              className={`filter-button ${classFilter === value ? 'active' : ''}`}
              onClick={() => setClassFilter(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="filter-group">
          {(['all', 'critical', 'stable'] as const).map((value) => (
            <button
              key={value}
              className={`filter-button ${severityFilter === value ? 'active' : ''}`}
              onClick={() => setSeverityFilter(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="confidence-control">
          <span className="eyebrow">Min confidence</span>
          <input
            type="range"
            min={10}
            max={90}
            step={5}
            value={minConfidence}
            onChange={(event) => setMinConfidence(Number(event.target.value))}
          />
          <span>{minConfidence}%</span>
        </div>
        <div className="status-pill">{filteredDetections.length} visible</div>
      </div>

      <main className="dashboard-shell">
        <section className="panel feed-panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">Aerial observation</div>
              <div className="panel-title">
                {mode === 'live' ? 'Live drone feed' : 'Recorded mission feed'}
              </div>
            </div>
            <div className="status-pill">
              <span
                className={`status-dot ${
                  isSignalLost ? 'warn' : isConnected ? 'ok' : 'bad'
                }`}
              />
              {isSignalLost ? 'Waiting for frames' : isConnected ? 'Receiving' : 'Offline'}
            </div>
          </div>

          <div className="feed-stage">
            <VideoCanvas
              frame={currentFrame}
              detections={filteredDetections}
              isSignalLost={isSignalLost}
            />
          </div>

          <div className="feed-strip">
            <Metric label="Persons" value={metrics.persons} />
            <Metric label="Critical" value={metrics.critical} tone="critical" />
            <Metric label="Stable" value={metrics.stable} tone="stable" />
            <Metric label="Vehicles" value={metrics.vehicles} tone="vehicle" />
          </div>
        </section>

        <section className="panel map-panel">
          <MapView detections={filteredDetections} />
        </section>

        <aside className="panel side-panel">
          <IncidentQueue detections={filteredDetections} />
        </aside>

        <section className="panel status-panel">
          <SystemStatus
            isConnected={isConnected}
            fps={fps}
            mode={mode}
            health={health}
          />
        </section>

        <section className="panel triage-panel">
          <TriageSummary detections={filteredDetections} />
        </section>

        <section className="panel event-panel">
          <DetectionLog detections={filteredDetections} />
        </section>
      </main>
    </div>
  );
}

function Metric({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone?: 'critical' | 'stable' | 'vehicle';
}) {
  const color =
    tone === 'critical'
      ? 'var(--critical)'
      : tone === 'stable'
        ? 'var(--stable)'
        : tone === 'vehicle'
          ? 'var(--vehicle)'
          : 'var(--text)';

  return (
    <div className="metric">
      <div className="metric-value" style={{ color }}>
        {value}
      </div>
      <div className="metric-label">{label}</div>
    </div>
  );
}
