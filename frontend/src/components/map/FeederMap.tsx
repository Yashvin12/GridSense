// FeederMap — Probabilistic utility network visualization
// Primary visual story: posterior probability encoded in line weight + color
// Evidence events annotated at their geographic source
// No glow, no gradient, no decorative elements

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

const CENTER: [number, number] = [18.4990, 73.4858];
const ZOOM = 15;

// Evidence source → map coordinate mapping
// These correspond to known infrastructure positions from the topology
interface EvidenceMarker {
  id: string;
  lat: number;
  lng: number;
  type: 'sensor' | 'meter' | 'weather' | 'complaint' | 'crew';
  title: string;
  location: string;
  strength: string;
  timestamp: string;
}

const EVIDENCE_POSITIONS: Record<string, [number, number]> = {
  'e1': [18.5120, 73.4680],   // Overcurrent Relay — Mulshi Substation
  'e2': [18.4980, 73.4890],   // Last-gasp signals — Kolvan (V_B)
  'e3': [18.4855, 73.4860],   // Last-gasp signals — Bhira (V_C)
  'e4': [18.4993, 73.4870],   // Voltage Collapse — DTR-2 (T2)
  'e5': [18.4983, 73.4883],   // High Wind — Pole 43–46 corridor (midpoint)
  'e6': [18.4980, 73.4895],   // Consumer Complaints — Kolvan (offset)
  'e7': [18.4993, 73.4875],   // Temp Spike — DTR-2 (offset)
  'e8': [18.4960, 73.4920],   // Current near zero — Section B mid (SW2 area)
};

// Section visual encoding — posterior probability determines all line properties
function getSectionLineStyle(section: string, prob: number) {
  if (section === 'source') {
    return { color: '#3fb950', weight: 2, opacity: 0.55, dashArray: '6 10' };
  }
  if (prob > 0.7) {
    // FAULT ZONE — maximum visual weight, high contrast red
    return { color: '#f85149', weight: 6, opacity: 0.95 };
  }
  if (prob > 0.1) {
    // Candidate / moderate — amber, reduced weight
    return { color: '#d29922', weight: 2.5, opacity: 0.55 };
  }
  // Healthy — green, minimal weight
  return { color: '#3fb950', weight: 2.5, opacity: 0.6 };
}

// Node visual config — topology markers, not diagnostic
const nodeConfig: Record<string, { radius: number; color: string; weight: number; fillOpacity: number }> = {
  substation:  { radius: 7,  color: '#e6edf3', weight: 2,   fillOpacity: 0.95 },
  pole:        { radius: 2,  color: '#484f58', weight: 1,   fillOpacity: 0.7  },
  transformer: { radius: 5,  color: '#d29922', weight: 1.5, fillOpacity: 0.85 },
  switch:      { radius: 4,  color: '#58a6ff', weight: 1.5, fillOpacity: 0.85 },
  village:     { radius: 0,  color: 'transparent', weight: 0, fillOpacity: 0 },  // Village handled by label overlay
  meter:       { radius: 2,  color: '#484f58', weight: 1,   fillOpacity: 0.7  },
};

// Evidence type → minimal marker shape mapping
// Sensor = square ◼ | Meter = diamond ◆ | Weather = triangle ▲ | Complaint = circle ●
function getEvidenceMarkerHtml(type: string, strength: string): string {
  const strengthColors: Record<string, string> = {
    very_strong: '#f85149',
    strong: '#d29922',
    moderate: '#8b949e',
    weak: '#6e7681',
  };
  const color = strengthColors[strength] || '#6e7681';

  const shapes: Record<string, string> = {
    sensor: `<div style="width:8px;height:8px;background:${color};transform:rotate(45deg);border:1px solid rgba(0,0,0,0.4);"></div>`,
    meter: `<div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:9px solid ${color};opacity:0.9;"></div>`,
    weather: `<div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:9px solid ${color};opacity:0.9;"></div>`,
    complaint: `<div style="width:7px;height:7px;border-radius:50%;background:${color};border:1px solid rgba(0,0,0,0.4);"></div>`,
    crew: `<div style="width:7px;height:7px;border-radius:50%;background:#58a6ff;border:1px solid rgba(0,0,0,0.4);"></div>`,
  };

  return `<div style="display:flex;align-items:center;justify-content:center;width:12px;height:12px;">${shapes[type] || shapes.sensor}</div>`;
}

function MapInvalidator() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
  }, [map]);
  return null;
}

// Section B primary annotation — operational map label
function SectionBAnnotation({ prob }: { prob: number }) {
  const map = useMap();

  useEffect(() => {
    const pct = Math.round(prob * 100);
    // Placed at Section B midpoint, offset to not overlap the line
    const pos: [number, number] = [18.4990, 73.4920];

    const icon = L.divIcon({
      className: '',
      html: `
        <div style="
          font-family:'IBM Plex Mono',monospace;
          text-align:left;
          line-height:1.4;
          padding:4px 6px;
          background:rgba(13,17,23,0.88);
          border:1px solid rgba(248,81,73,0.5);
          border-left:2px solid #f85149;
        ">
          <div style="color:#8b949e;font-size:8px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">SECTION B</div>
          <div style="color:#f85149;font-size:13px;font-weight:700;">${pct}%</div>
          <div style="color:#6e7681;font-size:8px;letter-spacing:0.04em;">POSTERIOR</div>
        </div>
      `,
      iconSize: [64, 42],
      iconAnchor: [0, 21],
    });

    const marker = L.marker(pos, { icon, interactive: false }).addTo(map);
    return () => { marker.remove(); };
  }, [map, prob]);

  return null;
}

// Quiet section labels for A and C
function SectionQuietLabels({ probMap }: { probMap: Record<string, number> }) {
  const map = useMap();

  useEffect(() => {
    const positions: Record<string, [number, number]> = {
      A: [18.5060, 73.4738],
      C: [18.4872, 73.4998],
    };
    const markers: L.Marker[] = [];

    Object.entries(positions).forEach(([section, pos]) => {
      const prob = probMap[section] || 0;
      const pct = Math.round(prob * 100);

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="
            font-family:'IBM Plex Mono',monospace;
            text-align:left;
            line-height:1.4;
            padding:3px 5px;
            background:rgba(13,17,23,0.7);
            border:1px solid rgba(48,54,61,0.5);
          ">
            <div style="color:#6e7681;font-size:8px;font-weight:600;letter-spacing:0.1em;">SECT ${section}</div>
            <div style="color:#8b949e;font-size:11px;font-weight:600;">${pct}%</div>
          </div>
        `,
        iconSize: [52, 34],
        iconAnchor: [0, 17],
      });

      const marker = L.marker(pos, { icon, interactive: false }).addTo(map);
      markers.push(marker);
    });

    return () => { markers.forEach((m) => m.remove()); };
  }, [map, probMap]);

  return null;
}

// Village text labels — subordinate to topology
function VillageLabels({ nodes }: { nodes: { id: string; label: string; lat: number; lng: number; powered: boolean }[] }) {
  const map = useMap();

  useEffect(() => {
    const markers: L.Marker[] = [];

    nodes.forEach((node) => {
      const color = node.powered ? '#3fb950' : '#6e7681';
      const icon = L.divIcon({
        className: '',
        html: `
          <div style="
            font-family:'IBM Plex Sans',sans-serif;
            font-size:10px;
            font-weight:500;
            color:${color};
            white-space:nowrap;
            text-shadow:0 1px 3px rgba(0,0,0,0.9);
            letter-spacing:0.02em;
          ">${node.label}</div>
        `,
        iconSize: [80, 14],
        iconAnchor: [40, -6],
      });

      const marker = L.marker([node.lat, node.lng], { icon, interactive: false }).addTo(map);
      markers.push(marker);
    });

    return () => { markers.forEach((m) => m.remove()); };
  }, [map, nodes]);

  return null;
}

// Evidence markers — geographic evidence sources
function EvidenceOverlay({ markers }: { markers: EvidenceMarker[] }) {
  const map = useMap();

  useEffect(() => {
    const leafletMarkers: L.Marker[] = [];

    markers.forEach((ev) => {
      const markerHtml = getEvidenceMarkerHtml(ev.type, ev.strength);
      const strengthLabels: Record<string, string> = {
        very_strong: 'VERY STRONG', strong: 'STRONG',
        moderate: 'MODERATE', weak: 'WEAK',
      };
      const strengthColors: Record<string, string> = {
        very_strong: '#f85149', strong: '#d29922',
        moderate: '#8b949e', weak: '#6e7681',
      };

      const icon = L.divIcon({
        className: '',
        html: markerHtml,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const marker = L.marker([ev.lat, ev.lng], { icon }).addTo(map);
      marker.bindPopup(`
        <div style="min-width:160px;font-family:'IBM Plex Sans',sans-serif;font-size:12px;line-height:1.5;">
          <div style="font-weight:600;font-size:12px;margin-bottom:2px;color:#e6edf3;">${ev.title}</div>
          <div style="color:#6e7681;font-size:10px;margin-bottom:4px;font-style:italic;">${ev.timestamp} · ${ev.location}</div>
          <div style="display:flex;align-items:center;gap:4px;">
            <span style="font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:700;color:${strengthColors[ev.strength]};letter-spacing:0.05em;">${strengthLabels[ev.strength] || ev.strength}</span>
          </div>
        </div>
      `, { maxWidth: 200 });

      leafletMarkers.push(marker);
    });

    return () => { leafletMarkers.forEach((m) => m.remove()); };
  }, [map, markers]);

  return null;
}

// Operational legend — explains encoding, does not decorate
function MapLegend() {
  const map = useMap();

  useEffect(() => {
    const legend = new L.Control({ position: 'bottomleft' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'gs-map-legend');
      div.innerHTML = `
        <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8b949e;margin-bottom:6px;border-bottom:1px solid rgba(48,54,61,0.6);padding-bottom:4px;">Feeder State</div>
        <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:6px;">
          <div style="display:flex;align-items:center;gap:7px;">
            <span style="display:inline-block;width:20px;height:2.5px;background:#3fb950;opacity:0.7;flex-shrink:0;"></span>
            <span style="color:#6e7681;font-size:9px;">ENERGIZED</span>
          </div>
          <div style="display:flex;align-items:center;gap:7px;">
            <span style="display:inline-block;width:20px;height:6px;background:#f85149;flex-shrink:0;"></span>
            <span style="color:#e6edf3;font-size:9px;font-weight:600;">FAULT ZONE</span>
          </div>
          <div style="display:flex;align-items:center;gap:7px;">
            <span style="display:inline-block;width:20px;height:2.5px;background:#d29922;opacity:0.6;flex-shrink:0;"></span>
            <span style="color:#6e7681;font-size:9px;">ISOLATED</span>
          </div>
          <div style="display:flex;align-items:center;gap:7px;">
            <span style="display:inline-block;width:20px;height:2.5px;background:#d29922;flex-shrink:0;"></span>
            <span style="color:#6e7681;font-size:9px;">CANDIDATE</span>
          </div>
        </div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8b949e;margin-bottom:4px;border-top:1px solid rgba(48,54,61,0.6);padding-top:5px;">Evidence</div>
        <div style="display:flex;flex-direction:column;gap:3px;">
          <div style="display:flex;align-items:center;gap:7px;">
            <div style="width:8px;height:8px;background:#8b949e;transform:rotate(45deg);flex-shrink:0;"></div>
            <span style="color:#6e7681;font-size:9px;">Sensor / Relay</span>
          </div>
          <div style="display:flex;align-items:center;gap:7px;">
            <div style="width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:8px solid #8b949e;flex-shrink:0;"></div>
            <span style="color:#6e7681;font-size:9px;">Meter / Complaint</span>
          </div>
        </div>
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
  const { feederNodes, feederEdges, sectionProbabilities, evidenceLog } = state;

  // Section probability lookup
  const probMap: Record<string, number> = {};
  sectionProbabilities.forEach((sp) => { probMap[sp.section] = sp.probability; });

  // Build node lookup
  const nodeMap = new Map(feederNodes.map((n) => [n.id, n]));

  // Village nodes for label overlay
  const villageNodes = feederNodes.filter((n) => n.type === 'village');

  // Non-village, non-meter nodes for topology rendering
  const topologyNodes = feederNodes.filter((n) => n.type !== 'village' && n.type !== 'meter');

  // Map evidence events to geographic positions
  const evidenceMarkers: EvidenceMarker[] = evidenceLog
    .filter((ev) => EVIDENCE_POSITIONS[ev.id])
    .map((ev) => ({
      id: ev.id,
      lat: EVIDENCE_POSITIONS[ev.id][0],
      lng: EVIDENCE_POSITIONS[ev.id][1],
      type: ev.type,
      title: ev.title,
      location: ev.location,
      strength: ev.strength,
      timestamp: ev.timestamp,
    }));

  return (
    <div
      className="w-full h-full overflow-hidden"
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

        {/* ── Feeder edges ── line weight/opacity directly encodes posterior probability */}
        {feederEdges.map((edge) => {
          const from = nodeMap.get(edge.from);
          const to = nodeMap.get(edge.to);
          if (!from || !to) return null;
          const prob = probMap[edge.section] || 0;
          const style = getSectionLineStyle(edge.section, prob);
          return (
            <Polyline
              key={`${edge.from}-${edge.to}`}
              positions={[[from.lat, from.lng], [to.lat, to.lng]]}
              pathOptions={style}
            />
          );
        })}

        {/* ── Topology nodes — substation, poles, transformers, switches ── */}
        {topologyNodes.map((node) => {
          const config = nodeConfig[node.type] || nodeConfig.pole;
          if (config.radius === 0) return null;

          const prob = probMap[node.section] || 0;
          const isFaultZone = prob > 0.5;

          // Node fill: powered state
          let fillColor = config.color;
          if (!node.powered && node.type !== 'substation' && node.type !== 'switch') {
            fillColor = '#363c45'; // offline — de-energized gray
          }

          return (
            <CircleMarker
              key={node.id}
              center={[node.lat, node.lng]}
              radius={config.radius}
              pathOptions={{
                fillColor,
                fillOpacity: config.fillOpacity,
                color: isFaultZone ? 'rgba(248,81,73,0.45)' : 'rgba(255,255,255,0.06)',
                weight: isFaultZone ? 1.5 : config.weight,
              }}
            >
              <Popup>
                <div style={{ minWidth: 148, fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: '#e6edf3' }}>{node.label}</div>
                  <div style={{ color: '#6e7681', textTransform: 'capitalize', marginBottom: 4, fontSize: 11 }}>{node.type}</div>
                  <div style={{ marginBottom: 2 }}>
                    Section: <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>{node.section}</span>
                  </div>
                  <div style={{ marginBottom: prob > 0 ? 4 : 0 }}>
                    Supply:{' '}
                    <span style={{ color: node.powered ? '#3fb950' : '#f85149', fontWeight: 500 }}>
                      {node.powered ? 'Energized' : 'Offline'}
                    </span>
                  </div>
                  {prob > 0 && (
                    <div style={{ borderTop: '1px solid rgba(48,54,61,0.6)', paddingTop: 4 }}>
                      <div style={{ color: '#6e7681', fontSize: 10, marginBottom: 1 }}>Section posterior</div>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: prob > 0.5 ? '#f85149' : '#d29922' }}>
                        {Math.round(prob * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* ── Evidence event overlays — positioned at source geography ── */}
        {!compact && <EvidenceOverlay markers={evidenceMarkers} />}

        {/* ── Village text labels — subordinate to feeder topology ── */}
        <VillageLabels nodes={villageNodes} />

        {/* ── Section B primary annotation ── */}
        {!compact && <SectionBAnnotation prob={probMap['B'] || 0} />}

        {/* ── Quiet labels for sections A and C ── */}
        {!compact && <SectionQuietLabels probMap={probMap} />}

        {/* ── Operational legend ── */}
        {!compact && <MapLegend />}

      </MapContainer>
    </div>
  );
}
