// ---------------------------------------------------------------------------
// GridMind AI  -  API Abstraction Layer
// Currently returns mock data. Structured so real fetch() calls to the
// FastAPI backend can drop in with minimal changes.
// ---------------------------------------------------------------------------

import {
  initialFaultData,
  initialCauses,
  initialSectionProbabilities,
  initialTelemetryHistory,
  initialCrewPlan,
  affectedVillages,
  switchingPlan,
  etaMinutes,
  initialEvidenceLog,
  initialBeliefHistory,
  feederNodes,
  feederEdges,
} from './mockData';

// When the real backend is ready, replace these with:
//   const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
//   return fetch(`${BASE_URL}/fault`).then(r => r.json());

export const api = {
  getFaultData: async () => initialFaultData,
  getCauses: async () => initialCauses,
  getSectionProbabilities: async () => initialSectionProbabilities,
  getTelemetry: async () => initialTelemetryHistory,
  getCrewPlan: async () => initialCrewPlan,
  getAffectedVillages: async () => affectedVillages,
  getSwitchingPlan: async () => switchingPlan,
  getEta: async () => etaMinutes,
  getEvidenceLog: async () => initialEvidenceLog,
  getBeliefHistory: async () => initialBeliefHistory,
  getFeederNodes: async () => feederNodes,
  getFeederEdges: async () => feederEdges,
};
