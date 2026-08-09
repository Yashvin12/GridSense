// ---------------------------------------------------------------------------
// GridSense — API Abstraction Layer
// Now calls the real FastAPI backend running at http://localhost:8000
// ---------------------------------------------------------------------------

import type {
  FaultData,
  CauseEntry,
  SectionProbability,
  TelemetryPoint,
  CrewStop,
  SwitchingStep,
  EvidenceEvent,
  BeliefSnapshot,
  FeederNode,
  FeederEdge,
} from './mockData';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  getFaultData: () => getJSON<FaultData>('/api/fault'),
  getCauses: () => getJSON<CauseEntry[]>('/api/causes'),
  getSectionProbabilities: () => getJSON<SectionProbability[]>('/api/sections'),
  getTelemetry: () => getJSON<TelemetryPoint[]>('/api/telemetry'),
  getCrewPlan: () => getJSON<CrewStop[]>('/api/crew-plan'),
  getAffectedVillages: () => getJSON<string[]>('/api/villages'),
  getSwitchingPlan: () => getJSON<SwitchingStep[]>('/api/switching-plan'),
  getEta: () => getJSON<number>('/api/eta'),
  getEvidenceLog: () => getJSON<EvidenceEvent[]>('/api/evidence'),
  getBeliefHistory: () => getJSON<BeliefSnapshot[]>('/api/belief-history'),
  getFeederNodes: () => getJSON<FeederNode[]>('/api/feeder/nodes'),
  getFeederEdges: () => getJSON<FeederEdge[]>('/api/feeder/edges'),

  confirmCrewStop: async (stop: string, found: boolean): Promise<CrewStop[]> => {
    const res = await fetch(`${BASE_URL}/api/crew/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stop, found }),
    });
    if (!res.ok) {
      throw new Error(`POST /api/crew/confirm failed: ${res.status} ${res.statusText}`);
    }
    return res.json();
  },
};
