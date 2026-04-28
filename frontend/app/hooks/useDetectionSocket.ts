import { useCallback, useEffect, useRef, useState } from 'react';

export interface Detection {
  class_name: string;
  confidence: number;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  triage: string | null;
  lat: number;
  lng: number;
  frame_id: number;
  track_id: string;
}

export interface FrameMessage {
  type: 'frame' | 'signal_lost';
  frame_id: number;
  frame?: string;
  detections?: Detection[];
  mode?: string;
}

export interface SystemHealth {
  status: string;
  mode: string;
  fps: number;
  frame_id: number;
  stream_ok: boolean;
  stream_source: string;
  stream_error: string | null;
  db_ok: boolean;
  db_error: string | null;
  device: string;
  model_path: string;
  model_classes: string[];
  enabled_classes: string[];
  cuda_available: boolean;
}

interface UseDetectionSocketReturn {
  detections: Detection[];
  currentFrame: string | null;
  isConnected: boolean;
  isSignalLost: boolean;
  fps: number;
  frameId: number;
  health: SystemHealth | null;
  apiUrl: string;
}

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const DEFAULT_WS_URL = `${API_URL.replace(/^http/, 'ws')}/ws/kairos`;
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || DEFAULT_WS_URL;
const FLUSH_INTERVAL_MS = 100;
const FPS_WINDOW = 30;

export function useDetectionSocket(): UseDetectionSocketReturn {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSignalLost, setIsSignalLost] = useState(false);
  const [fps, setFps] = useState(0);
  const [frameId, setFrameId] = useState(0);
  const [health, setHealth] = useState<SystemHealth | null>(null);

  const messageBuffer = useRef<FrameMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const flushIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const healthIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);
  const frameTimestamps = useRef<number[]>([]);

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setIsSignalLost(false);
    };

    ws.onmessage = (event) => {
      messageBuffer.current = JSON.parse(event.data);
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsSignalLost(true);
      if (shouldReconnectRef.current) {
        reconnectTimeoutRef.current = setTimeout(connect, 2000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();

    flushIntervalRef.current = setInterval(() => {
      const msg = messageBuffer.current;
      if (!msg) return;
      messageBuffer.current = null;

      if (msg.type === 'signal_lost') {
        setIsSignalLost(true);
        return;
      }

      setIsSignalLost(false);

      if (msg.frame) {
        setCurrentFrame(`data:image/jpeg;base64,${msg.frame}`);
      }

      if (msg.detections) {
        setDetections(msg.detections);
      }

      setFrameId(msg.frame_id);

      const now = performance.now();
      frameTimestamps.current.push(now);
      if (frameTimestamps.current.length > FPS_WINDOW) {
        frameTimestamps.current.shift();
      }
      if (frameTimestamps.current.length >= 2) {
        const elapsed =
          (frameTimestamps.current[frameTimestamps.current.length - 1] -
            frameTimestamps.current[0]) /
          1000;
        setFps(Math.round((frameTimestamps.current.length - 1) / elapsed));
      }
    }, FLUSH_INTERVAL_MS);

    const fetchHealth = async () => {
      try {
        const response = await fetch(`${API_URL}/health`);
        if (response.ok) {
          setHealth(await response.json());
        }
      } catch {
        setHealth(null);
      }
    };

    fetchHealth();
    healthIntervalRef.current = setInterval(fetchHealth, 3000);

    return () => {
      shouldReconnectRef.current = false;
      if (flushIntervalRef.current) clearInterval(flushIntervalRef.current);
      if (healthIntervalRef.current) clearInterval(healthIntervalRef.current);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  return {
    detections,
    currentFrame,
    isConnected,
    isSignalLost,
    fps,
    frameId,
    health,
    apiUrl: API_URL
  };
}
