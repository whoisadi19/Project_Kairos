'use client';

import { memo, useEffect, useRef } from 'react';
import { Detection } from '../hooks/useDetectionSocket';

interface MapViewProps {
  detections: Detection[];
}

const MapView = memo(function MapView({ detections }: MapViewProps) {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const heatLayerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (mapRef.current) return;

    const L = (window as any).L;
    if (!L || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: [19.9975, 73.7898],
      zoom: 14,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { subdomains: 'abcd', maxZoom: 18 }
    ).addTo(map);

    mapRef.current = map;

    if (L.heatLayer) {
      heatLayerRef.current = L.heatLayer([], {
        radius: 24,
        blur: 16,
        maxZoom: 17,
        gradient: {
          0.35: '#60A5FA',
          0.65: '#F59E0B',
          1.0: '#EF4444'
        }
      }).addTo(map);
    }
  }, []);

  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!L || !map) return;

    markersRef.current.forEach((marker) => map.removeLayer(marker));
    markersRef.current = [];

    if (heatLayerRef.current) {
      heatLayerRef.current.setLatLngs(
        detections.map((d) => [d.lat, d.lng, d.confidence])
      );
    }

    detections.forEach((det) => {
      const isCritical = det.triage === 'CRITICAL';
      const color = isCritical
        ? '#EF4444'
        : det.class_name === 'person'
          ? '#22C55E'
          : '#60A5FA';

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="
            width:${isCritical ? 13 : 9}px;
            height:${isCritical ? 13 : 9}px;
            border-radius:50%;
            background:${color};
            border:1px solid ${color};
            box-shadow:0 0 ${isCritical ? 14 : 6}px ${color};
            ${isCritical ? 'animation:critical-pulse 1s ease infinite;' : ''}
          "></div>`,
        iconSize: [isCritical ? 13 : 9, isCritical ? 13 : 9],
        iconAnchor: [isCritical ? 6 : 4, isCritical ? 6 : 4]
      });

      const marker = L.marker([det.lat, det.lng], { icon })
        .bindPopup(
          `
          <div style="
            background:#10141b;
            font-family:Inter,system-ui,sans-serif;
            font-size:12px;
            color:#eef3f8;
            padding:8px;
            min-width:150px
          ">
            <div style="color:${color};font-weight:700;margin-bottom:4px">
              ${det.class_name.toUpperCase()}${det.triage ? ' / ' + det.triage : ''}
            </div>
            <div>Confidence: ${Math.round(det.confidence * 100)}%</div>
            <div>Lat: ${det.lat}</div>
            <div>Lng: ${det.lng}</div>
          </div>
        `,
          { className: 'kairos-popup' }
        )
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [detections]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 1000,
          pointerEvents: 'none'
        }}
        className="status-pill"
      >
        Sector Nashik / 19.9975 N 73.7898 E
      </div>
    </div>
  );
});

export default MapView;
