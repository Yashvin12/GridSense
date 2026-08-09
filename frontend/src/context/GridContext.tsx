// ---------------------------------------------------------------------------
// GridSense -- Global State (React Context + useReducer)
//
// Data source: FastAPI backend (http://localhost:8000/api/*)
// Fallback:    mockData.ts (when VITE_USE_MOCK=true or backend unreachable)
//
// On mount: fetches all state from the backend (fault, sections, causes,
//           evidence, belief-history, telemetry, crew-plan, feeder topology).
// Live:     telemetry updates every 2s via GET /api/telemetry poll.
// Actions:  confirmStop / denyStop POST to /api/crew/confirm and update state
//           from the API response (real Bayesian posteriors -- Learning Loop).
// ---------------------------------------------------------------------------

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

import {
  type FaultData,
  type CauseEntry,
  type SectionProbability,
  type TelemetryPoint,
  type CrewStop,
  type EvidenceEvent,
  type BeliefSnapshot,
  type FeederNode,
  type FeederEdge,
  type SwitchingStep,
  // Fallback mock data (used when VITE_USE_MOCK=true)
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
  getSectionColor,
} from '../data/mockData';

import { generateTelemetryPoint, createCrewEvidenceEvent } from '../data/mockEngine';

// ---------------------------------------------------------------------------
// API base URL -- set VITE_API_URL in .env.development
// ---------------------------------------------------------------------------
const API_URL = (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:8000';
const USE_MOCK = (import.meta.env.VITE_USE_MOCK as string) === 'true';

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`API ${path} returned ${res.status}`);
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------
export interface GridState {
  fault: FaultData;
  causes: CauseEntry[];
  sectionProbabilities: SectionProbability[];
  telemetry: TelemetryPoint[];
  crewPlan: CrewStop[];
  affectedVillages: string[];
  switchingPlan: SwitchingStep[];
  etaMinutes: number;
  evidenceLog: EvidenceEvent[];
  beliefHistory: BeliefSnapshot[];
  feederNodes: FeederNode[];
  feederEdges: FeederEdge[];
  activeView: 'dashboard' | 'evidence' | 'crew' | 'analysis';
  lastBeliefUpdate: string;
  evidenceCount: number;
  backendConnected: boolean;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
type GridAction =
  | { type: 'SET_ALL'; payload: Partial<GridState> }
  | { type: 'SET_SECTIONS'; sections: SectionProbability[]; causes: CauseEntry[]; fault: FaultData; evidenceCount: number }
  | { type: 'SET_TELEMETRY'; telemetry: TelemetryPoint[] }
  | { type: 'ADD_TELEMETRY_POINT' }
  | { type: 'CONFIRM_FAULT'; stopName: string }
  | { type: 'DENY_FAULT'; stopName: string }
  | { type: 'SET_CREW_STATUS'; stopName: string; status: CrewStop['status'] }
  | { type: 'ADD_EVIDENCE'; event: EvidenceEvent }
  | { type: 'SET_VIEW'; view: GridState['activeView'] }
  | { type: 'SET_BACKEND_CONNECTED'; connected: boolean };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------
function gridReducer(state: GridState, action: GridAction): GridState {
  switch (action.type) {
    case 'SET_ALL':
      return { ...state, ...action.payload };

    case 'SET_SECTIONS': {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      return {
        ...state,
        sectionProbabilities: action.sections,
        causes: action.causes,
        fault: action.fault,
        evidenceCount: action.evidenceCount,
        lastBeliefUpdate: timeStr,
      };
    }

    case 'SET_TELEMETRY':
      return { ...state, telemetry: action.telemetry };

    case 'ADD_TELEMETRY_POINT': {
      const newPoint = generateTelemetryPoint();
      return { ...state, telemetry: [...state.telemetry.slice(-59), newPoint] };
    }

    case 'CONFIRM_FAULT':
      return {
        ...state,
        crewPlan: state.crewPlan.map((s) =>
          s.stop === action.stopName ? { ...s, status: 'fault_found' as const } : s
        ),
      };

    case 'DENY_FAULT':
      return {
        ...state,
        crewPlan: state.crewPlan.map((s) =>
          s.stop === action.stopName ? { ...s, status: 'no_fault' as const } : s
        ),
      };

    case 'SET_CREW_STATUS':
      return {
        ...state,
        crewPlan: state.crewPlan.map((s) =>
          s.stop === action.stopName ? { ...s, status: action.status } : s
        ),
      };

    case 'ADD_EVIDENCE':
      return {
        ...state,
        evidenceLog: [action.event, ...state.evidenceLog],
        evidenceCount: state.evidenceCount + 1,
      };

    case 'SET_VIEW':
      return { ...state, activeView: action.view };

    case 'SET_BACKEND_CONNECTED':
      return { ...state, backendConnected: action.connected };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Initial state (mock fallback values)
// ---------------------------------------------------------------------------
const initialState: GridState = {
  fault: initialFaultData,
  causes: initialCauses,
  sectionProbabilities: initialSectionProbabilities,
  telemetry: initialTelemetryHistory,
  crewPlan: initialCrewPlan,
  affectedVillages,
  switchingPlan,
  etaMinutes,
  evidenceLog: initialEvidenceLog,
  beliefHistory: initialBeliefHistory,
  feederNodes,
  feederEdges,
  activeView: 'dashboard',
  lastBeliefUpdate: '14:26:38',
  evidenceCount: 8,
  backendConnected: false,
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
interface GridContextValue {
  state: GridState;
  dispatch: React.Dispatch<GridAction>;
  confirmStop: (stopName: string) => void;
  denyStop: (stopName: string) => void;
  setView: (view: GridState['activeView']) => void;
}

const GridContext = createContext<GridContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function GridProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gridReducer, initialState);

  // ── On mount: load all state from FastAPI (or fallback to mock) ───────────
  useEffect(() => {
    if (USE_MOCK) return;  // respect env flag

    let cancelled = false;

    async function loadFromBackend() {
      try {
        const [
          fault,
          sections,
          causes,
          evidence,
          beliefHistory,
          telemetry,
          crewPlan,
          switchingPlanData,
          eta,
          villages,
          nodes,
          edges,
        ] = await Promise.all([
          apiFetch<FaultData>('/api/fault'),
          apiFetch<SectionProbability[]>('/api/sections'),
          apiFetch<CauseEntry[]>('/api/causes'),
          apiFetch<EvidenceEvent[]>('/api/evidence'),
          apiFetch<BeliefSnapshot[]>('/api/belief-history'),
          apiFetch<TelemetryPoint[]>('/api/telemetry'),
          apiFetch<CrewStop[]>('/api/crew-plan'),
          apiFetch<SwitchingStep[]>('/api/switching-plan'),
          apiFetch<number>('/api/eta'),
          apiFetch<string[]>('/api/villages'),
          apiFetch<FeederNode[]>('/api/feeder/nodes'),
          apiFetch<FeederEdge[]>('/api/feeder/edges'),
        ]);

        if (cancelled) return;

        dispatch({
          type: 'SET_ALL',
          payload: {
            fault,
            sectionProbabilities: sections,
            causes,
            evidenceLog: evidence,
            beliefHistory,
            telemetry,
            crewPlan,
            switchingPlan: switchingPlanData,
            etaMinutes: eta,
            affectedVillages: villages,
            feederNodes: nodes,
            feederEdges: edges,
            backendConnected: true,
          },
        });

        dispatch({ type: 'SET_BACKEND_CONNECTED', connected: true });
      } catch (err) {
        console.warn('[GridContext] Backend unreachable, using mock data:', err);
        dispatch({ type: 'SET_BACKEND_CONNECTED', connected: false });
      }
    }

    loadFromBackend();
    return () => { cancelled = true; };
  }, []);

  // ── Live telemetry: poll API every 3s if connected, else generate locally ─
  useEffect(() => {
    if (USE_MOCK || !state.backendConnected) {
      // Fallback: generate synthetic telemetry locally
      const interval = setInterval(() => {
        dispatch({ type: 'ADD_TELEMETRY_POINT' });
      }, 2000);
      return () => clearInterval(interval);
    }

    const interval = setInterval(async () => {
      try {
        const telemetry = await apiFetch<TelemetryPoint[]>('/api/telemetry');
        dispatch({ type: 'SET_TELEMETRY', telemetry });
      } catch {
        dispatch({ type: 'ADD_TELEMETRY_POINT' });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [state.backendConnected]);

  // ── Crew actions (Learning Loop -- PS-B13 Module 8) ──────────────────────
  const confirmStop = useCallback(async (stopName: string) => {
    const event = createCrewEvidenceEvent(stopName, true);
    dispatch({ type: 'CONFIRM_FAULT', stopName });
    dispatch({ type: 'ADD_EVIDENCE', event });

    if (USE_MOCK || !state.backendConnected) return;

    try {
      const res = await fetch(`${API_URL}/api/crew/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stop: stopName, found: true }),
      });
      if (!res.ok) return;
      const data = await res.json() as {
        sections: SectionProbability[];
        causes: CauseEntry[];
        fault: { section: string; confidence: number };
        evidence_count: number;
      };

      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      dispatch({
        type: 'SET_ALL',
        payload: {
          sectionProbabilities: data.sections.map((s) => ({
            ...s,
            color: getSectionColor(s.probability),
          })),
          causes: data.causes,
          fault: { section: data.fault.section, confidence: data.fault.confidence },
          evidenceCount: data.evidence_count,
          lastBeliefUpdate: timeStr,
        },
      });
    } catch (err) {
      console.warn('[GridContext] crew confirm POST failed:', err);
    }
  }, [state.backendConnected]);

  const denyStop = useCallback(async (stopName: string) => {
    const event = createCrewEvidenceEvent(stopName, false);
    dispatch({ type: 'DENY_FAULT', stopName });
    dispatch({ type: 'ADD_EVIDENCE', event });

    if (USE_MOCK || !state.backendConnected) return;

    try {
      const res = await fetch(`${API_URL}/api/crew/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stop: stopName, found: false }),
      });
      if (!res.ok) return;
      const data = await res.json() as {
        sections: SectionProbability[];
        causes: CauseEntry[];
        fault: { section: string; confidence: number };
        evidence_count: number;
      };

      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      dispatch({
        type: 'SET_ALL',
        payload: {
          sectionProbabilities: data.sections.map((s) => ({
            ...s,
            color: getSectionColor(s.probability),
          })),
          causes: data.causes,
          fault: { section: data.fault.section, confidence: data.fault.confidence },
          evidenceCount: data.evidence_count,
          lastBeliefUpdate: timeStr,
        },
      });
    } catch (err) {
      console.warn('[GridContext] crew deny POST failed:', err);
    }
  }, [state.backendConnected]);

  const setView = useCallback((view: GridState['activeView']) => {
    dispatch({ type: 'SET_VIEW', view });
  }, []);

  return (
    <GridContext.Provider value={{ state, dispatch, confirmStop, denyStop, setView }}>
      {children}
    </GridContext.Provider>
  );
}

export function useGrid() {
  const ctx = useContext(GridContext);
  if (!ctx) throw new Error('useGrid must be used within GridProvider');
  return ctx;
}
