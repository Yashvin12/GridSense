// ---------------------------------------------------------------------------
// GridSense — Global State (React Context + useReducer)
// Single source of truth for fault data, probabilities, telemetry, crew plan.
// All components subscribe here; crew actions dispatch updates globally.
// ---------------------------------------------------------------------------

import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
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
  type SwitchingStep,
} from '../data/mockData';

import {
  confirmFault,
  denyFault,
  updateCausesOnConfirm,
  updateCausesOnDeny,
  generateTelemetryPoint,
  createBeliefSnapshot,
  createCrewEvidenceEvent,
} from '../data/mockEngine';

// ---- State Shape ----
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
}

// ---- Actions ----
type GridAction =
  | { type: 'CONFIRM_FAULT'; stopName: string }
  | { type: 'DENY_FAULT'; stopName: string }
  | { type: 'ADD_TELEMETRY' }
  | { type: 'SET_VIEW'; view: GridState['activeView'] };

// ---- Reducer ----
function gridReducer(state: GridState, action: GridAction): GridState {
  switch (action.type) {
    case 'CONFIRM_FAULT': {
      const newProbs = confirmFault(state.sectionProbabilities, action.stopName);
      const newCauses = updateCausesOnConfirm(state.causes);
      const topProb = Math.max(...newProbs.map((p) => p.probability));
      const event = createCrewEvidenceEvent(action.stopName, true);
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      return {
        ...state,
        sectionProbabilities: newProbs,
        causes: newCauses,
        fault: { ...state.fault, confidence: topProb },
        crewPlan: state.crewPlan.map((s) =>
          s.stop === action.stopName ? { ...s, status: 'fault_found' as const } : s
        ),
        evidenceLog: [event, ...state.evidenceLog],
        beliefHistory: [...state.beliefHistory, createBeliefSnapshot(newProbs, `Crew: fault at ${action.stopName}`)],
        lastBeliefUpdate: timeStr,
        evidenceCount: state.evidenceCount + 1,
      };
    }

    case 'DENY_FAULT': {
      const newProbs = denyFault(state.sectionProbabilities, action.stopName);
      const newCauses = updateCausesOnDeny(state.causes);
      const topProb = Math.max(...newProbs.map((p) => p.probability));
      const event = createCrewEvidenceEvent(action.stopName, false);
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      return {
        ...state,
        sectionProbabilities: newProbs,
        causes: newCauses,
        fault: { ...state.fault, confidence: topProb },
        crewPlan: state.crewPlan.map((s) =>
          s.stop === action.stopName ? { ...s, status: 'no_fault' as const } : s
        ),
        evidenceLog: [event, ...state.evidenceLog],
        beliefHistory: [...state.beliefHistory, createBeliefSnapshot(newProbs, `Crew: clear at ${action.stopName}`)],
        lastBeliefUpdate: timeStr,
        evidenceCount: state.evidenceCount + 1,
      };
    }

    case 'ADD_TELEMETRY': {
      const newPoint = generateTelemetryPoint();
      const updated = [...state.telemetry.slice(-59), newPoint];
      return { ...state, telemetry: updated };
    }

    case 'SET_VIEW':
      return { ...state, activeView: action.view };

    default:
      return state;
  }
}

// ---- Initial State ----
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
};

// ---- Context ----
interface GridContextValue {
  state: GridState;
  dispatch: React.Dispatch<GridAction>;
  confirmStop: (stopName: string) => void;
  denyStop: (stopName: string) => void;
  setView: (view: GridState['activeView']) => void;
}

const GridContext = createContext<GridContextValue | null>(null);

export function GridProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gridReducer, initialState);

  // Live telemetry feed every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'ADD_TELEMETRY' });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const confirmStop = useCallback((stopName: string) => {
    dispatch({ type: 'CONFIRM_FAULT', stopName });
  }, []);

  const denyStop = useCallback((stopName: string) => {
    dispatch({ type: 'DENY_FAULT', stopName });
  }, []);

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
