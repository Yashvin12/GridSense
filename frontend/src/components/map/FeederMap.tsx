// FeederMap — Leaflet map with probabilistic feeder visualization
// Section probability communicated via line weight and color
// Professional utility GIS style — restrained, no neon, no glow
// Section labels use GIS-style: SECT B identifier + probability on separate line

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

const CENTER: [number, number] = [18.4990, 73.4850];
const ZOOM = 15;

// Node type visual config — restrained industrial palette
const nodeConfig: Record<string, { radius: number; fillColor: string; weight: number }> = {
  substation:  { radius: 9,  fillColor: '#e6edf3', weight: 2 },
  pole:        { radius: 3,  fillColor: '#6e7681', weight: 1 },
  transformer: { radius: 6,  fillColor: '#d29922', weight: 1.5 },
  switch:      { radius: 5,  fillColor: '#58a6ff', weight: 1.5 },
  village:     { radius: 8,  fillColor: '#3fb950', weight: 1.5 },
  meter:       { radius: 3,  fillColor: '#6e7681', weight: 1 },
};

// Section label positions (midpoint of each section)
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

// GIS-style section labels: section ID on top, posterior probability below
function SectionLabels({ probMap }: { probMap: Record<string, number> }) {
  const map = useMap();

  useEffect(() => {
    const markers: L.Marker[] = [];

    Object.entries(sectionLabelPositions).forEach(([section, pos]) => {
      const prob = probMap[section] || 0;
      const pct = Math.round(prob * 100);
      const isHigh = prob > 0.5;
      const color = isHigh ? '#f85149' : prob > 0.1 ? '#d29922' : '#6e7681';

      const icon = L.divIcon({
        className: 'gs-map-label',
        html: `
          <div style="text-align:center; line-height:1.3;">
            <div style="color:#8b949e; font-size:9px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase;">SECT ${section}</div>
            <div style="color:${color}; font-size:${isHigh ? '13px' : '11px'}; font-weight:${isHigh ? '700' : '500'}; font-family:'IBM Plex Mono',monospace;">${pct}%</div>
            <div style="color:#6e7681; font-size:8px;">posterior</div>
          </div>
        `,
        iconSize: [60, 36],
        iconAnchor: [30, 18],
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

// Map legend — restrained, GIS utility style
function MapLegend() {
  const map = useMap();

  useEffect(() => {
    const legend = new L.Control({ position: 'bottomleft' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'gs-map-legend');
      div.innerHTML = `
        <div style="font-weight:600; margin-bottom:5px; color:#e6edf3; font-size:10px; text-transform:uppercase; letter-spacing:0.05em;">Feeder State</div>
        <div style="display:flex; align-items:center; gap:5px; margin-bottom:2px;"><span style="display:inline-block;width:18px;height:2px;background:#3fb950;"></span> Section A — Energized</div>
        <div style="display:flex; align-items:center; gap:5px; margin-bottom:2px;"><span style="display:inline-block;width:18px;height:4px;background:#f85149;"></span> Section B — Fault zone (posterior &gt;70%)</div>
        <div style="display:flex; align-items:center; gap:5px; margin-bottom:6px;"><span style="display:inline-block;width:18px;height:2px;background:#d29922;"></span> Section C — Downstream / isolated</div>
        <div style="color:#6e7681; font-size:9px; border-top:1px solid rgba(48,54,61,0.6); padding-top:4px;">Line weight proportional to posterior probability</div>
      `;
      return div;
    };
    legend.addTo(map);
    return () => { legend.remove(); };
  }, [map]);

  return null;
}

export function FeederMap({ compact = false }: { compact?: boolean }) {
  const { state } = useGrid();
  const { feederNodes, feederEdges, sectionProbabilities } = state;

  // Section probability lookup
  const probMap: Record<string, number> = {};
  sectionProbabilities.forEach((sp) => { probMap[sp.section] = sp.probability; });

  const getEdgeColor = (section: string): string => {
    const prob = probMap[section] || 0;
    if (prob > 0.7) return '#f85149';
    if (prob > 0.3) return '#d29922';
    if (prob > 0.1) return '#d29922';
    return '#3fb950';
  };

  // Line weight encodes posterior probability — primary visual encoding
  const getEdgeWeight = (section: string): number => {
    const prob = probMap[section] || 0;
    if (prob > 0.7) return 5;
    if (prob > 0.3) return 3;
    if (prob > 0.1) return 2.5;
    return 2;
  };

  const getEdgeOpacity = (section: string): number => {
    const prob = probMap[section] || 0;
    if (prob > 0.5) return 0.9;
    if (prob > 0.1) return 0.65;
    return 0.5;
  };

  const nodeMap = new Map(feederNodes.map((n) => [n.id, n]));

  return (
    <div className="w-full h-full overflow-hidden"
      style={{ border: '1px solid var(--gs-border)', borderRadius: 2 }}
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

        {/* Feeder edges — line weight encodes posterior probability */}
        {feederEdges.map((edge) => {
          const from = nodeMap.get(edge.from);
          const to = nodeMap.get(edge.to);
          if (!from || !to) return null;
          return (
            <Polyline
              key={`${edge.from}-${edge.to}`}
              positions={[[from.lat, from.lng], [to.lat, to.lng]]}
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
          const prob = probMap[node.section] || 0;
          const isFaultZone = prob > 0.5;

          let fillColor = config.fillColor;
          if (!isPowered && node.type === 'village') fillColor = '#f85149';
          else if (!isPowered && node.type !== 'substation') fillColor = '#484f58';

          return (
            <CircleMarker
              key={node.id}
              center={[node.lat, node.lng]}
              radius={config.radius}
              pathOptions={{
                fillColor,
                fillOpacity: 0.9,
                color: isFaultZone ? 'rgba(248,81,73,0.5)' : 'rgba(255,255,255,0.08)',
                weight: isFaultZone ? 1.5 : config.weight,
              }}
            >
              <Popup>
                <div style={{ minWidth: 148, fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{node.label}</div>
                  <div style={{ color: '#8b949e', textTransform: 'capitalize', marginBottom: 4 }}>{node.type}</div>
                  <div style={{ marginBottom: 2 }}>
                    Section:{' '}
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>{node.section}</span>
                  </div>
                  <div style={{ marginBottom: prob > 0 ? 4 : 0 }}>
                    Supply:{' '}
                    <span style={{ color: isPowered ? '#3fb950' : '#f85149', fontWeight: 500 }}>
                      {isPowered ? 'Energized' : 'Offline'}
                    </span>
                  </div>
                  {prob > 0 && (
                    <div style={{ borderTop: '1px solid rgba(48,54,61,0.6)', paddingTop: 4 }}>
                      <div style={{ color: '#6e7681', fontSize: 10, marginBottom: 1 }}>Section posterior</div>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: getEdgeColor(node.section) }}>
                        {Math.round(prob * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Section labels — GIS style */}
        {!compact && <SectionLabels probMap={probMap} />}

        {/* Legend */}
        {!compact && <MapLegend />}
      </MapContainer>
    </div>
  );
}
