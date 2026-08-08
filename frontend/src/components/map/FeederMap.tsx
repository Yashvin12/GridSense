// FeederMap - Leaflet map with feeder topology and fault probability heatmap

import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useGrid } from '../../context/GridContext';

// Fix Leaflet default icon issue
import L from 'leaflet';
// @ts-expect-error Leaflet icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Center on the feeder network (Mulshi area, Pune)
const CENTER: [number, number] = [18.4990, 73.4850];
const ZOOM = 15;

// Node type visual config
const nodeConfig: Record<string, { radius: number; fillColor: string; weight: number }> = {
  substation: { radius: 10, fillColor: '#8b5cf6', weight: 2 },
  pole: { radius: 4, fillColor: '#94a3b8', weight: 1 },
  transformer: { radius: 7, fillColor: '#f59e0b', weight: 2 },
  switch: { radius: 6, fillColor: '#06b6d4', weight: 2 },
  village: { radius: 9, fillColor: '#10b981', weight: 2 },
  meter: { radius: 3, fillColor: '#64748b', weight: 1 },
};

function MapInvalidator() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
  }, [map]);
  return null;
}

export function FeederMap({ compact = false }: { compact?: boolean }) {
  const { state } = useGrid();
  const { feederNodes, feederEdges, sectionProbabilities } = state;

  // Build section probability lookup
  const probMap: Record<string, number> = {};
  sectionProbabilities.forEach((sp) => {
    probMap[sp.section] = sp.probability;
  });

  // Get edge color from section probability
  const getEdgeColor = (section: string): string => {
    const prob = probMap[section] || 0;
    if (prob > 0.7) return '#ef4444';
    if (prob > 0.3) return '#f59e0b';
    if (prob > 0.1) return '#eab308';
    return '#10b981';
  };

  const getEdgeWeight = (section: string): number => {
    const prob = probMap[section] || 0;
    if (prob > 0.7) return 5;
    if (prob > 0.3) return 4;
    return 3;
  };

  const getEdgeOpacity = (section: string): number => {
    const prob = probMap[section] || 0;
    if (prob > 0.5) return 0.9;
    return 0.6;
  };

  // Build coordinate lookup
  const nodeMap = new Map(feederNodes.map((n) => [n.id, n]));

  return (
    <div className={`w-full ${compact ? 'h-64' : 'h-full'} rounded-xl overflow-hidden`}
      style={{ border: '1px solid rgba(30, 58, 95, 0.3)' }}
    >
      <MapContainer
        center={CENTER}
        zoom={ZOOM}
        className="w-full h-full"
        zoomControl={!compact}
        attributionControl={false}
        style={{ background: '#0a0e17' }}
      >
        <MapInvalidator />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        />

        {/* Feeder edges (power lines) */}
        {feederEdges.map((edge) => {
          const from = nodeMap.get(edge.from);
          const to = nodeMap.get(edge.to);
          if (!from || !to) return null;

          return (
            <Polyline
              key={`${edge.from}-${edge.to}`}
              positions={[
                [from.lat, from.lng],
                [to.lat, to.lng],
              ]}
              pathOptions={{
                color: getEdgeColor(edge.section),
                weight: getEdgeWeight(edge.section),
                opacity: getEdgeOpacity(edge.section),
                dashArray: edge.section === 'source' ? '5, 10' : undefined,
              }}
            />
          );
        })}

        {/* Feeder nodes */}
        {feederNodes.map((node) => {
          const config = nodeConfig[node.type] || nodeConfig.pole;
          const isPowered = node.powered;

          // Override color for unpowered nodes
          let fillColor = config.fillColor;
          if (!isPowered && node.type === 'village') {
            fillColor = '#ef4444';
          } else if (!isPowered && node.type !== 'substation') {
            fillColor = '#475569';
          }

          // Fault zone glow
          const prob = probMap[node.section] || 0;
          const isFaultZone = prob > 0.5;

          return (
            <CircleMarker
              key={node.id}
              center={[node.lat, node.lng]}
              radius={config.radius}
              pathOptions={{
                fillColor,
                fillOpacity: 0.85,
                color: isFaultZone ? '#ef4444' : 'rgba(255,255,255,0.15)',
                weight: isFaultZone ? 2 : config.weight,
              }}
            >
              <Popup>
                <div className="text-xs" style={{ minWidth: 140 }}>
                  <div className="font-semibold text-sm mb-1">{node.label}</div>
                  <div className="text-gray-600 capitalize">{node.type}</div>
                  <div className="mt-1">
                    Section: <span className="font-mono font-semibold">{node.section}</span>
                  </div>
                  <div>
                    Status:{' '}
                    <span className={isPowered ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {isPowered ? 'Powered' : 'Offline'}
                    </span>
                  </div>
                  {prob > 0 && (
                    <div className="mt-1">
                      Fault probability:{' '}
                      <span className="font-mono font-bold">{Math.round(prob * 100)}%</span>
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
