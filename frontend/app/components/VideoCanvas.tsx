'use client';

import { useEffect, useRef } from 'react';
import { Detection } from '../hooks/useDetectionSocket';

interface VideoCanvasProps {
  frame: string | null;
  detections: Detection[];
  isSignalLost: boolean;
}

const TRIAGE_COLORS: Record<string, string> = {
  CRITICAL: '#EF4444',
  STABLE: '#22C55E'
};

const CLASS_COLORS: Record<string, string> = {
  fire:    '#f59e0b',
  smoke:   '#94a3b8',
  debris:  '#6b7280',
  vehicle: '#60A5FA',
};

function getBoxColor(det: Detection): string {
  if (det.class_name === 'person' && det.triage) {
    return TRIAGE_COLORS[det.triage] || '#22C55E';
  }
  return CLASS_COLORS[det.class_name] ?? '#60A5FA';
}

export default function VideoCanvas({
  frame,
  detections,
  isSignalLost
}: VideoCanvasProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const detectionsRef = useRef<Detection[]>([]);

  detectionsRef.current = detections;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function draw() {
      const img = imgRef.current;
      if (!img || !canvas || !ctx) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const naturalW = img.naturalWidth || 1920;
      const naturalH = img.naturalHeight || 1080;
      const viewW = img.clientWidth || naturalW;
      const viewH = img.clientHeight || naturalH;

      // Keep canvas resolution aligned with rendered size.
      canvas.width = viewW;
      canvas.height = viewH;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Mirror object-contain geometry so boxes match the video.
      const scale = Math.min(viewW / naturalW, viewH / naturalH);
      const drawW = naturalW * scale;
      const drawH = naturalH * scale;
      const offsetX = (viewW - drawW) / 2;
      const offsetY = (viewH - drawH) / 2;

      for (const det of detectionsRef.current) {
        const color = getBoxColor(det);
        const isCritical = det.triage === 'CRITICAL';

        const x = offsetX + det.x * scale;
        const y = offsetY + det.y * scale;
        const w = det.w * scale;
        const h = det.h * scale;

        ctx.shadowColor = color;
        ctx.shadowBlur = isCritical ? 12 : 3;
        ctx.strokeStyle = color;
        ctx.lineWidth = isCritical ? 3 : 2;
        ctx.strokeRect(x, y, w, h);

        const label =
          det.class_name === 'person' && det.triage
            ? `${det.triage} PERSON`
            : det.class_name.toUpperCase();

        ctx.shadowBlur = 0;
        ctx.font = 'bold 13px Manrope, sans-serif';
        const textW = ctx.measureText(label).width;
        const labelY = Math.max(0, y - 24);

        ctx.fillStyle = color;
        ctx.fillRect(x, labelY, textW + 14, 22);

        ctx.fillStyle = '#081018';
        ctx.fillText(label, x + 7, labelY + 15);

        ctx.fillStyle = color;
        ctx.font = '11px JetBrains Mono, monospace';
        ctx.fillText(
          `${Math.round(det.confidence * 100)}%`,
          x + 4,
          y + h - 6
        );
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#030507'
      }}
    >
      {frame ? (
        <img
          ref={imgRef}
          src={frame}
          alt="Kairos feed"
          className="w-full h-full object-contain"
          style={{ display: 'block' }}
        />
      ) : (
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: 1
          }}
        >
          Awaiting stream
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-contain"
        style={{ pointerEvents: 'none' }}
      />

      {isSignalLost && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: 'rgba(3, 5, 7, 0.78)'
          }}
        >
          <div className="status-pill">
            <span className="status-dot warn live-blink" />
            Signal waiting
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            The backend is reachable, but no frame is currently available.
          </div>
        </div>
      )}

      <div
        className="status-pill"
        style={{ position: 'absolute', left: 12, top: 12 }}
      >
        Live feed
      </div>
    </div>
  );
}
