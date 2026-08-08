// ---------------------------------------------------------------------------
// GridSense — Mock Bayesian Engine
// Simulates probability updates when crew confirms/denies fault at a location.
// Also generates live telemetry points for the real-time feed.
// ---------------------------------------------------------------------------

import {
  type SectionProbability,
  type CauseEntry,
  type TelemetryPoint,
  type BeliefSnapshot,
  type EvidenceEvent,
  getSectionColor,
} from './mockData';

// Map crew stop names to sections
const stopToSection: Record<string, string> = {
  'Pole 44': 'B',
  'Pole 45': 'B',
  'Pole 43': 'B',
};

/**
 * Bayesian-style update when crew confirms fault at a stop.
 * Shifts probability toward that stop's section, reduces others proportionally.
 */
export function confirmFault(
  currentProbs: SectionProbability[],
  stopName: string
): SectionProbability[] {
  const faultSection = stopToSection[stopName] || 'B';

  return currentProbs.map((sp) => {
    let newProb: number;
    if (sp.section === faultSection) {
      // Boost to near-certainty
      newProb = Math.min(0.97, sp.probability + 0.05);
    } else {
      // Reduce proportionally
      newProb = Math.max(0.01, sp.probability * 0.4);
    }
    return {
      ...sp,
      probability: newProb,
      color: getSectionColor(newProb),
    };
  });
}

/**
 * Bayesian-style update when crew finds NO fault at a stop.
 * Shifts probability away from that section, redistributes to others.
 */
export function denyFault(
  currentProbs: SectionProbability[],
  stopName: string
): SectionProbability[] {
  const clearSection = stopToSection[stopName] || 'B';
  const cleared = currentProbs.find((s) => s.section === clearSection);
  if (!cleared) return currentProbs;

  const freedProb = cleared.probability * 0.6;
  const otherSections = currentProbs.filter((s) => s.section !== clearSection);
  const otherTotal = otherSections.reduce((sum, s) => sum + s.probability, 0);

  return currentProbs.map((sp) => {
    let newProb: number;
    if (sp.section === clearSection) {
      newProb = Math.max(0.02, sp.probability - freedProb);
    } else {
      // Distribute freed probability proportionally
      const share = otherTotal > 0 ? sp.probability / otherTotal : 0.5;
      newProb = Math.min(0.97, sp.probability + freedProb * share);
    }
    return {
      ...sp,
      probability: newProb,
      color: getSectionColor(newProb),
    };
  });
}

/**
 * Update cause probabilities after a fault confirmation.
 * Vegetation contact increases, others decrease.
 */
export function updateCausesOnConfirm(causes: CauseEntry[]): CauseEntry[] {
  return causes.map((c) => {
    if (c.label === 'Vegetation Contact') {
      return { ...c, probability: Math.min(0.92, c.probability + 0.08) };
    }
    return { ...c, probability: Math.max(0.01, c.probability * 0.7) };
  }).sort((a, b) => b.probability - a.probability);
}

/**
 * Update cause probabilities after "no fault" - shifts away from vegetation.
 */
export function updateCausesOnDeny(causes: CauseEntry[]): CauseEntry[] {
  return causes.map((c) => {
    if (c.label === 'Vegetation Contact') {
      return { ...c, probability: Math.max(0.15, c.probability - 0.12) };
    }
    if (c.label === 'Transformer Overload') {
      return { ...c, probability: Math.min(0.55, c.probability + 0.10) };
    }
    return { ...c, probability: Math.min(0.40, c.probability + 0.04) };
  }).sort((a, b) => b.probability - a.probability);
}

/**
 * Generate a new telemetry reading for the live feed.
 */
export function generateTelemetryPoint(): TelemetryPoint {
  return {
    timestamp: new Date().toISOString(),
    current: 1.8 + Math.random() * 1.2,        // still in fault state
    voltage: 175 + Math.random() * 35,
    transformer_temp: 75 + Math.random() * 18,
  };
}

/**
 * Create a new belief snapshot from current probabilities.
 */
export function createBeliefSnapshot(probs: SectionProbability[], trigger?: string): BeliefSnapshot {
  const sections: Record<string, number> = {};
  probs.forEach((p) => {
    sections[p.section] = p.probability;
  });
  return {
    timestamp: new Date().toISOString(),
    sections,
    trigger,
  };
}

/**
 * Generate an enriched evidence event for crew actions.
 */
let evidenceCounter = 100;
export function createCrewEvidenceEvent(
  stopName: string,
  found: boolean
): EvidenceEvent {
  evidenceCounter++;
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

  if (found) {
    return {
      id: `e${evidenceCounter}`,
      timestamp: timeStr,
      type: 'crew',
      title: 'Crew Confirmed Fault',
      location: stopName,
      evidenceCategory: 'location',
      strength: 'very_strong',
      impact: 'Section B +5%',
      detail: `Vegetation contact on conductor confirmed at ${stopName}`,
    };
  }

  return {
    id: `e${evidenceCounter}`,
    timestamp: timeStr,
    type: 'crew',
    title: 'Crew Inspection Clear',
    location: stopName,
    evidenceCategory: 'location',
    strength: 'strong',
    impact: 'Section redistributed',
    detail: `No fault found at ${stopName} — probability redistributed`,
  };
}
