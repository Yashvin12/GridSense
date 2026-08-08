// ---------------------------------------------------------------------------
// GridSense — Mock Data Layer
// Matches the FastAPI contract. Coordinates near Pune, Maharashtra.
// ---------------------------------------------------------------------------

export interface FaultData {
  section: string;
  confidence: number;
}

export interface CauseEntry {
  label: string;
  probability: number;
}

// Supporting evidence for cause analysis
export interface CauseEvidence {
  description: string;
  contribution: number; // percentage points contributed
}

export const causeEvidenceMap: Record<string, CauseEvidence[]> = {
  'Vegetation Contact': [
    { description: 'High wind near Pole 43–46', contribution: 18 },
    { description: 'Fault topology matches vegetation pattern', contribution: 11 },
    { description: 'Voltage collapse pattern at DTR-2', contribution: 7 },
    { description: 'Consumer outage reports from Kolvan', contribution: 4 },
  ],
  'Transformer Overload': [
    { description: 'DTR-2 temperature spike to 89°C', contribution: 8 },
    { description: 'Load pattern prior to fault', contribution: 4 },
  ],
  'Broken Conductor': [
    { description: 'Current near zero on Section B', contribution: 5 },
    { description: 'Wind event raises conductor stress', contribution: 3 },
  ],
  'Illegal Tapping': [
    { description: 'No supporting evidence', contribution: 0 },
  ],
};

export interface SwitchingStep {
  action: string;
  status: 'recommended' | 'pending' | 'completed' | 'blocked';
}

export interface CrewStop {
  stop: string;
  order: number;
  status: 'pending' | 'inspecting' | 'fault_found' | 'no_fault';
  lat: number;
  lng: number;
  probability: number;
  reasoning: string[];
}

export interface SectionProbability {
  section: string;
  probability: number;
  color: string;
}

export interface TelemetryPoint {
  timestamp: string;
  current: number;
  voltage: number;
  transformer_temp: number;
}

export interface EvidenceEvent {
  id: string;
  timestamp: string;
  type: 'sensor' | 'meter' | 'crew' | 'weather' | 'complaint';
  title: string;
  location: string;
  evidenceCategory: 'location' | 'cause';
  strength: 'very_strong' | 'strong' | 'moderate' | 'weak';
  impact: string;
  detail: string;
}

export interface BeliefSnapshot {
  timestamp: string;
  sections: Record<string, number>;
  trigger?: string; // what evidence caused this snapshot
}

// Feeder topology nodes for the map
export interface FeederNode {
  id: string;
  type: 'substation' | 'pole' | 'transformer' | 'switch' | 'village' | 'meter';
  label: string;
  lat: number;
  lng: number;
  section: string;
  powered: boolean;
}

export interface FeederEdge {
  from: string;
  to: string;
  section: string;
}

// ---- Coordinates near Mulshi/Lavasa area, west of Pune, Maharashtra ----
// Realistic rural feeder topology along a road corridor

export const feederNodes: FeederNode[] = [
  // Substation
  { id: 'SS1', type: 'substation', label: 'Mulshi 33kV Substation', lat: 18.5120, lng: 73.4680, section: 'source', powered: true },

  // Section A - Poles 40-42 (healthy section near substation)
  { id: 'P40', type: 'pole', label: 'Pole 40', lat: 18.5095, lng: 73.4720, section: 'A', powered: true },
  { id: 'P41', type: 'pole', label: 'Pole 41', lat: 18.5070, lng: 73.4755, section: 'A', powered: true },
  { id: 'T1', type: 'transformer', label: 'DTR-1 (25kVA)', lat: 18.5068, lng: 73.4760, section: 'A', powered: true },
  { id: 'P42', type: 'pole', label: 'Pole 42', lat: 18.5048, lng: 73.4790, section: 'A', powered: true },
  { id: 'SW1', type: 'switch', label: 'Switch S1', lat: 18.5045, lng: 73.4795, section: 'A', powered: true },

  // Section B - Poles 43-46 (FAULT ZONE)
  { id: 'P43', type: 'pole', label: 'Pole 43', lat: 18.5020, lng: 73.4830, section: 'B', powered: false },
  { id: 'P44', type: 'pole', label: 'Pole 44', lat: 18.4995, lng: 73.4865, section: 'B', powered: false },
  { id: 'T2', type: 'transformer', label: 'DTR-2 (63kVA)', lat: 18.4993, lng: 73.4870, section: 'B', powered: false },
  { id: 'P45', type: 'pole', label: 'Pole 45', lat: 18.4970, lng: 73.4900, section: 'B', powered: false },
  { id: 'SW2', type: 'switch', label: 'Switch S2', lat: 18.4968, lng: 73.4905, section: 'B', powered: false },
  { id: 'P46', type: 'pole', label: 'Pole 46', lat: 18.4945, lng: 73.4935, section: 'B', powered: false },

  // Section C - Poles 47-49 (downstream, affected but no fault)
  { id: 'P47', type: 'pole', label: 'Pole 47', lat: 18.4920, lng: 73.4965, section: 'C', powered: false },
  { id: 'T3', type: 'transformer', label: 'DTR-3 (100kVA)', lat: 18.4918, lng: 73.4970, section: 'C', powered: false },
  { id: 'P48', type: 'pole', label: 'Pole 48', lat: 18.4895, lng: 73.5000, section: 'C', powered: false },
  { id: 'P49', type: 'pole', label: 'Pole 49', lat: 18.4870, lng: 73.5030, section: 'C', powered: false },
  { id: 'SW3', type: 'switch', label: 'Tie Switch T4', lat: 18.4868, lng: 73.5035, section: 'C', powered: false },

  // Villages
  { id: 'V_A', type: 'village', label: 'Tamhini', lat: 18.5060, lng: 73.4780, section: 'A', powered: true },
  { id: 'V_B', type: 'village', label: 'Kolvan', lat: 18.4980, lng: 73.4890, section: 'B', powered: false },
  { id: 'V_C', type: 'village', label: 'Bhira', lat: 18.4900, lng: 73.5010, section: 'C', powered: false },
];

export const feederEdges: FeederEdge[] = [
  { from: 'SS1', to: 'P40', section: 'A' },
  { from: 'P40', to: 'P41', section: 'A' },
  { from: 'P41', to: 'T1', section: 'A' },
  { from: 'P41', to: 'P42', section: 'A' },
  { from: 'P42', to: 'SW1', section: 'A' },
  { from: 'T1', to: 'V_A', section: 'A' },
  { from: 'SW1', to: 'P43', section: 'B' },
  { from: 'P43', to: 'P44', section: 'B' },
  { from: 'P44', to: 'T2', section: 'B' },
  { from: 'P44', to: 'P45', section: 'B' },
  { from: 'P45', to: 'SW2', section: 'B' },
  { from: 'SW2', to: 'P46', section: 'B' },
  { from: 'T2', to: 'V_B', section: 'B' },
  { from: 'P46', to: 'P47', section: 'C' },
  { from: 'P47', to: 'T3', section: 'C' },
  { from: 'P47', to: 'P48', section: 'C' },
  { from: 'P48', to: 'P49', section: 'C' },
  { from: 'P49', to: 'SW3', section: 'C' },
  { from: 'T3', to: 'V_C', section: 'C' },
];

// Section color mapping based on probability
export function getSectionColor(probability: number): string {
  if (probability > 0.7) return '#f85149';     // red - high fault probability
  if (probability > 0.3) return '#d29922';     // amber - medium
  if (probability > 0.1) return '#d29922';     // amber - low-medium
  return '#3fb950';                             // green - healthy
}

// Initial fault data
export const initialFaultData: FaultData = {
  section: 'Pole 42–46',
  confidence: 0.91,
};

export const initialCauses: CauseEntry[] = [
  { label: 'Vegetation Contact', probability: 0.74 },
  { label: 'Transformer Overload', probability: 0.15 },
  { label: 'Broken Conductor', probability: 0.08 },
  { label: 'Illegal Tapping', probability: 0.03 },
];

export const affectedVillages = ['Kolvan', 'Bhira'];
export const poweredVillages = ['Tamhini'];

export const switchingPlan: SwitchingStep[] = [
  { action: 'Open Switch S2', status: 'recommended' },
  { action: 'Close Tie Switch T4', status: 'recommended' },
  { action: 'Restore Bhira', status: 'pending' },
];

export const initialCrewPlan: CrewStop[] = [
  {
    stop: 'Pole 44', order: 1, status: 'pending',
    lat: 18.4995, lng: 73.4865, probability: 0.91,
    reasoning: [
      'Highest posterior probability',
      'Adjacent outage evidence',
      'Current collapse nearby',
      'Wind event near section',
    ],
  },
  {
    stop: 'Pole 45', order: 2, status: 'pending',
    lat: 18.4970, lng: 73.4900, probability: 0.67,
    reasoning: [
      'Adjacent to primary suspect',
      'Check if damage extends downstream',
    ],
  },
  {
    stop: 'Pole 43', order: 3, status: 'pending',
    lat: 18.5020, lng: 73.4830, probability: 0.34,
    reasoning: [
      'Lower probability but within fault zone',
      'Verify upstream boundary',
    ],
  },
];

export const initialSectionProbabilities: SectionProbability[] = [
  { section: 'A', probability: 0.03, color: getSectionColor(0.03) },
  { section: 'B', probability: 0.91, color: getSectionColor(0.91) },
  { section: 'C', probability: 0.06, color: getSectionColor(0.06) },
];

export const etaMinutes = 43;

// Generate realistic telemetry history (last 60 readings, 30s apart)
function generateTelemetryHistory(): TelemetryPoint[] {
  const points: TelemetryPoint[] = [];
  const now = Date.now();
  for (let i = 59; i >= 0; i--) {
    const ts = now - i * 30000;
    const isFaultZone = i < 20; // fault started ~10 min ago
    points.push({
      timestamp: new Date(ts).toISOString(),
      current: isFaultZone
        ? 2.1 + Math.random() * 0.8  // abnormally low after fault
        : 45 + Math.random() * 12,    // normal load current
      voltage: isFaultZone
        ? 180 + Math.random() * 30    // voltage sag
        : 230 + Math.random() * 5,    // normal voltage
      transformer_temp: isFaultZone
        ? 78 + Math.random() * 15     // overheating
        : 52 + Math.random() * 8,     // normal temp
    });
  }
  return points;
}

export const initialTelemetryHistory = generateTelemetryHistory();

// Evidence log — enriched with structured fields
export const initialEvidenceLog: EvidenceEvent[] = [
  {
    id: 'e1', timestamp: '14:22:15', type: 'sensor',
    title: 'Overcurrent Relay Tripped',
    location: 'Mulshi Substation',
    evidenceCategory: 'location', strength: 'very_strong',
    impact: 'Section B +18%',
    detail: 'Relay trip indicates fault downstream of substation',
  },
  {
    id: 'e2', timestamp: '14:22:18', type: 'meter',
    title: 'Last-Gasp Signals Received',
    location: 'Kolvan (14 meters)',
    evidenceCategory: 'location', strength: 'strong',
    impact: 'Section B +7%',
    detail: 'Supports downstream fault affecting Kolvan supply',
  },
  {
    id: 'e3', timestamp: '14:22:20', type: 'meter',
    title: 'Last-Gasp Signals Received',
    location: 'Bhira (8 meters)',
    evidenceCategory: 'location', strength: 'moderate',
    impact: 'Section C +3%',
    detail: 'Downstream propagation from fault in B or C',
  },
  {
    id: 'e4', timestamp: '14:23:01', type: 'sensor',
    title: 'Voltage Collapse Detected',
    location: 'DTR-2 (63kVA)',
    evidenceCategory: 'location', strength: 'strong',
    impact: 'Section B +9%',
    detail: 'Matches Section B topology — fault likely upstream of DTR-2',
  },
  {
    id: 'e5', timestamp: '14:23:45', type: 'weather',
    title: 'High Wind Detected',
    location: 'Pole 43–46',
    evidenceCategory: 'cause', strength: 'strong',
    impact: 'Vegetation contact +12%',
    detail: '47 km/h gusts raise vegetation-contact probability',
  },
  {
    id: 'e6', timestamp: '14:24:12', type: 'complaint',
    title: 'Consumer Complaints',
    location: 'Kolvan (3 reports)',
    evidenceCategory: 'location', strength: 'moderate',
    impact: 'Section B +4%',
    detail: 'Outage complaints confirm supply loss in Kolvan area',
  },
  {
    id: 'e7', timestamp: '14:25:00', type: 'sensor',
    title: 'Transformer Temperature Spike',
    location: 'DTR-2 reading 89°C',
    evidenceCategory: 'cause', strength: 'moderate',
    impact: 'Transformer overload +5%',
    detail: 'Temperature above normal operating range',
  },
  {
    id: 'e8', timestamp: '14:26:30', type: 'sensor',
    title: 'Current Near Zero',
    location: 'Section B feeders',
    evidenceCategory: 'location', strength: 'strong',
    impact: 'Section B +6%',
    detail: 'Confirms loss of supply on Section B conductors',
  },
];

// Evidence triggers matching belief history for annotation
export const evidenceTriggers: Record<number, string> = {
  0: 'Prior',
  1: 'Relay trip',
  2: 'Last-gasp',
  3: 'Voltage collapse',
  4: 'Wind alert',
  5: 'Complaints',
  6: 'Temp spike',
  7: 'Current zero',
};

// Initial belief history (probability over time)
export function generateInitialBeliefHistory(): BeliefSnapshot[] {
  const snapshots: BeliefSnapshot[] = [];
  const now = Date.now();

  // Simulate belief evolution: starts uncertain, converges on section B
  const trajectory = [
    { A: 0.33, B: 0.34, C: 0.33, trigger: 'Uniform prior' },
    { A: 0.28, B: 0.42, C: 0.30, trigger: 'Relay trip +18%' },
    { A: 0.20, B: 0.55, C: 0.25, trigger: 'Last-gasp +7%' },
    { A: 0.15, B: 0.65, C: 0.20, trigger: 'Voltage collapse +9%' },
    { A: 0.10, B: 0.75, C: 0.15, trigger: 'Wind alert +12%' },
    { A: 0.07, B: 0.82, C: 0.11, trigger: 'Complaints +4%' },
    { A: 0.05, B: 0.87, C: 0.08, trigger: 'Temp spike +5%' },
    { A: 0.03, B: 0.91, C: 0.06, trigger: 'Current zero +6%' },
  ];

  trajectory.forEach((t, i) => {
    snapshots.push({
      timestamp: new Date(now - (trajectory.length - 1 - i) * 60000).toISOString(),
      sections: { A: t.A, B: t.B, C: t.C },
      trigger: t.trigger,
    });
  });

  return snapshots;
}

export const initialBeliefHistory = generateInitialBeliefHistory();
