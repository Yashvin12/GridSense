// FeederMap — Leaflet map with probabilistic feeder visualization
// Section probability communicated via line weight, opacity, and labels
// Professional utility GIS style — no neon, no glow

import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useGrid } from '../../context/GridContext';

// Fix Leaflet default icon issue
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

// Node type visual config — restrained industrial palette
const nodeConfig: Record<string, { radius: number; fillColor: string; weight: number }> = {
  substation: { radius: 9, fillColor: '#e6edf3', weight: 2 },
  pole:       { radius: 3, fillColor: '#6e7681', weight: 1 },
  transformer:{ radius: 6, fillColor: '#d29922', weight: 1.5 },
  switch:     { radius: 5, fillColor: '#58a6ff', weight: 1.5 },
  village:    { radius: 8, fillColor: '#3fb950', weight: 1.5 },
  meter:      { radius: 3, fillColor: '#6e7681', weight: 1 },
};

// Section label positions (approximate midpoint of each section)
const sectionLabelPositions: Record<string, [number, number]> = {
  A: [18.5068, 73.4745],
  B: [18.4980, 73.4870],
  C: [18.4895, 73.4990],
};

function MapInvalidator() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
  }, [map]);
  return null;
}

// Component to render section probability labels on the map
function SectionLabels({ probMap }: { probMap: Record<string, number> }) {
  const map = useMap();

  useEffect(() => {
    const markers: L.Marker[] = [];

    Object.entries(sectionLabelPositions).forEach(([section, pos]) => {
      const prob = probMap[section] || 0;
      const pct = Math.round(prob * 100);
      const isHigh = prob > 0.5;

      const icon = L.divIcon({
        className: 'gs-map-label',
        html: `<span style="color: ${isHigh ? '#f85149' : prob > 0.1 ? '#d29922' : '#6e7681'}; font-size: ${isHigh ? '13px' : '11px'}; font-weight: ${isHigh ? '700' : '500'};">${section}: ${pct}%</span>`,
        iconSize: [50, 16],
        iconAnchor: [25, 8],
      });

      const marker = L.marker(pos, { icon, interactive: false }).addTo(map);
      markers.push(marker);
    });

    return () => {
      markers.forEach((m) => m.remove());
    };
  }, [map, probMap]);

  return null;
}

// Map legend control
function MapLegend() {
  const map = useMap();

  useEffect(() => {
    const legend = new L.Control({ position: 'bottomleft' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'gs-map-legend');
      div.innerHTML = `
        <div style="font-weight:600; margin-bottom:4px; color:#e6edf3; font-size:10px; text-transform:uppercase; letter-spacing:0.05em;">Feeder State</div>
        <div style="display:flex; align-items:center; gap:5px;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#3fb950;"></span> Energized</div>
        <div style="display:flex; align-items:center; gap:5px;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#f85149;"></span> Suspected fault</div>
        <div style="display:flex; align-items:center; gap:5px;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#6e7681;"></span> Isolated</div>
        <div style="display:flex; align-items:center; gap:5px;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#d29922;"></span> Candidate section</div>
        <div style="margin-top:4px; font-size:10px; color:#6e7681;">Line weight = fault probability</div>
      `;
      return div;
    };
    legend.addTo(map);
    return () => {
      legend.remove();
    };
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
    if (prob > 0.7) return '#f85149';
    if (prob > 0.3) return '#d29922';
    if (prob > 0.1) return '#d29922';
    return '#3fb950';
  };

  // Line weight varies by probability (key visual encoding)
  const getEdgeWeight = (section: string): number => {
    const prob = probMap[section] || 0;
    if (prob > 0.7) return 6;
    if (prob > 0.3) return 4;
    if (prob > 0.1) return 3;
    return 2;
  };

  const getEdgeOpacity = (section: string): number => {
    const prob = probMap[section] || 0;
    if (prob > 0.5) return 0.95;
    if (prob > 0.1) return 0.7;
    return 0.5;
  };

  // Build coordinate lookup
  const nodeMap = new Map(feederNodes.map((n) => [n.id, n]));

  return (
    <div className="w-full h-full overflow-hidden"
      style={{ border: '1px solid var(--gs-border)', borderRadius: 3 }}
    >
      <MapContainer
        center={CENTER}
        zoom={ZOOM}
        className="w-full h-full"
        zoomControl={!compact}
        attributionControl={false}
        style={{ background: '#0d1117' }}
      >
        <MapInvalidator />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        />

        {/* Feeder edges (power lines) — weight encodes probability */}
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
            fillColor = '#f85149';
          } else if (!isPowered && node.type !== 'substation') {
            fillColor = '#484f58';
          }

          // Fault zone indicator
          const prob = probMap[node.section] || 0;
          const isFaultZone = prob > 0.5;

          return (
            <CircleMarker
              key={node.id}
              center={[node.lat, node.lng]}
              radius={config.radius}
              pathOptions={{
                fillColor,
                fillOpacity: 0.9,
                color: isFaultZone ? '#f85149' : 'rgba(255,255,255,0.1)',
                weight: isFaultZone ? 2 : config.weight,
              }}
            >
              <Popup>
                <div className="text-xs" style={{ minWidth: 140, fontFamily: 'IBM Plex Sans, sans-serif' }}>
                  <div className="font-semibold text-sm mb-1">{node.label}</div>
                  <div style={{ color: '#8b949e', textTransform: 'capitalize' }}>{node.type}</div>
                  <div className="mt-1">
                    Section: <span className="font-mono font-semibold">{node.section}</span>
                  </div>
                  <div>
                    Status:{' '}
                    <span style={{ color: isPowered ? '#3fb950' : '#f85149', fontWeight: 500 }}>
                      {isPowered ? 'Energized' : 'Offline'}
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

        {/* Section probability labels on map */}
        {!compact && <SectionLabels probMap={probMap} />}

        {/* Map legend */}
        {!compact && <MapLegend />}
      </MapContainer>
    </div>
  );
}
