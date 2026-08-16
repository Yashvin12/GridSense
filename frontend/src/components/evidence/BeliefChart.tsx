// BeliefChart — posterior probability over time, Bayesian update visualization
// Redesigned: evidence event markers, endpoint annotation, line hierarchy, subtle grid
// Story: EVIDENCE ARRIVES → BELIEF CHANGES → FAULT PROBABILITY CONVERGES
//
// DATA ARCHITECTURE (single source of truth):
//   beliefHistory (BeliefSnapshot[]) — oldest-first array from GridContext
//   Each snapshot: { timestamp, sections: {A,B,C}, trigger? }
//   Chart data points are indexed 0…N-1 (numeric).
//   XAxis uses this numeric index so each snapshot maps to a unique, unambiguous
//   x-coordinate — no string-collision risk when multiple snapshots share the same
//   HH:MM prefix.  The tooltip reads A/B/C values from the hovered data point,
//   which are derived directly from the corresponding BeliefSnapshot.

import { useRef, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { useGrid } from '../../context/GridContext';

// ---- Design tokens (local) ----------------------------------------
const COLOR = {
  B: '#f85149',   // primary — fault section, red
  A: '#3fb950',   // subordinate — healthy, green
  C: '#d29922',   // subordinate — affected, amber
  gridLine: 'rgba(255,255,255,0.025)',  // barely-there horizontal grid
  eventLine: 'rgba(139, 148, 158, 0.18)', // subtle vertical event divider
};

// Trigger → human label mapping used in tooltip
const TRIGGER_LABELS: Record<string, string> = {
  'Uniform prior':     'Uniform prior (no evidence)',
  'Relay trip':        'Relay trip detected at substation',
  'Last-gasp signals': 'Smart-meter last-gasp signals received',
  'Voltage collapse':  'Phase voltage collapse — Section B',
  'Wind alert':        'Wind event above threshold',
  'Complaints':        'Consumer complaint cluster — Section B',
  'Temp spike':        'Transformer temperature spike',
  'Current near zero': 'Phase current near zero — Section B',
  'Current zero':      'Phase current near zero — Section B',
};

// ---- Chart data point type ----------------------------------------
// Each point corresponds to exactly one BeliefSnapshot entry.
// `x` is the numeric snapshot index (0, 1, 2, …) — used as the XAxis
// dataKey so that no two points ever share the same x-coordinate, even
// when their wall-clock timestamps are close together.
interface ChartPoint {
  x: number;        // snapshot index — unambiguous x-coordinate
  time: string;     // HH:MM:SS — used for display only (ticks, tooltip label)
  A: number;        // posterior × 100
  B: number;
  C: number;
  trigger: string;  // trigger label from BeliefSnapshot
}

// ---- Custom tooltip --------------------------------------------------
function BeliefTooltip({
  active,
  payload,
  chartData,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; payload?: ChartPoint }>;
  label?: number;   // numeric x-index; we read metadata from payload instead
  chartData: ChartPoint[];
}) {
  if (!active || !payload || payload.length === 0) return null;

  // The payload entries all reference the same chart data point — pick the first.
  const point = payload[0]?.payload as ChartPoint | undefined;
  if (!point) return null;

  // Derive the full timestamp from chartData by index (belt-and-suspenders)
  const snap = chartData[point.x];
  const timeLabel = snap?.time ?? point.time;

  const trigger = point.trigger;
  const humanLabel = trigger ? (TRIGGER_LABELS[trigger] || trigger) : null;

  // Order: B first (primary), then A, then C
  const ordered = ['B', 'A', 'C']
    .map((key) => payload.find((p) => p.dataKey === key))
    .filter(Boolean) as Array<{ value: number; dataKey: string }>;

  return (
    <div
      style={{
        backgroundColor: '#1c2128',
        border: '1px solid rgba(48,54,61,0.9)',
        borderRadius: 3,
        padding: '8px 11px',
        fontSize: 11,
        minWidth: 196,
        boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
      }}
    >
      {/* Timestamp */}
      <div
        style={{
          color: '#8b949e',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 10,
          marginBottom: humanLabel ? 5 : 6,
          letterSpacing: '0.02em',
        }}
      >
        {timeLabel}
      </div>

      {/* Evidence received */}
      {humanLabel && (
        <div
          style={{
            color: '#d29922',
            fontSize: 10,
            fontWeight: 600,
            marginBottom: 7,
            letterSpacing: '0.03em',
            borderLeft: '2px solid rgba(210,153,34,0.45)',
            paddingLeft: 6,
            lineHeight: 1.4,
          }}
        >
          Evidence: {humanLabel}
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: 'rgba(48,54,61,0.6)', marginBottom: 6 }} />

      {/* Section posteriors — values come directly from the hovered chart point,
          which is derived from the corresponding BeliefSnapshot in beliefHistory */}
      {ordered.map((entry) => {
        const isPrimary = entry.dataKey === 'B';
        const col =
          entry.dataKey === 'B' ? COLOR.B :
          entry.dataKey === 'A' ? COLOR.A : COLOR.C;
        return (
          <div
            key={entry.dataKey}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              marginBottom: 4,
              opacity: isPrimary ? 1 : 0.72,
            }}
          >
            <span
              style={{
                width: isPrimary ? 10 : 8,
                height: isPrimary ? 2 : 1.5,
                backgroundColor: col,
                display: 'inline-block',
                borderRadius: 1,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                color: '#8b949e',
                fontFamily: 'IBM Plex Sans, sans-serif',
                fontSize: 10,
                minWidth: 64,
              }}
            >
              Section {entry.dataKey}
              {isPrimary && (
                <span style={{ color: '#6e7681', marginLeft: 3, fontSize: 9 }}>
                  primary
                </span>
              )}
            </span>
            <span
              style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontWeight: isPrimary ? 700 : 500,
                color: isPrimary ? '#e6edf3' : '#8b949e',
                marginLeft: 'auto',
              }}
            >
              {entry.value.toFixed(1)}%
            </span>
            <span style={{ fontSize: 9, color: '#6e7681', fontFamily: 'IBM Plex Sans' }}>
              posterior
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---- Custom evidence event label (SVG text) -------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EventLabel({ viewBox, label }: { viewBox?: any; label: string }) {
  if (!viewBox) return null;
  const { x, y } = viewBox as { x: number; y: number };
  return (
    <text
      x={x + 3}
      y={y + 13}
      fill="#6e7681"
      fontSize={8.5}
      fontFamily="IBM Plex Mono, monospace"
      dominantBaseline="middle"
      style={{ userSelect: 'none' }}
    >
      {label}
    </text>
  );
}

// ---- Endpoint annotation --------------------------------------------
function EndpointAnnotation({ probability }: { probability: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        right: 4,
        top: '38%',           // approximate vertical position of B line at ~91%
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 0,
      }}
    >
      {/* Short connecting tick */}
      <div
        style={{
          width: 8,
          height: 1,
          backgroundColor: 'rgba(248,81,73,0.4)',
          marginBottom: 2,
        }}
      />
      <div
        style={{
          backgroundColor: 'rgba(22,27,34,0.96)',
          border: '1px solid rgba(248,81,73,0.3)',
          borderRadius: 2,
          padding: '3px 7px 4px',
        }}
      >
        <div
          style={{
            fontFamily: 'IBM Plex Sans, sans-serif',
            fontSize: 9,
            color: '#8b949e',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            fontWeight: 500,
            marginBottom: 1,
          }}
        >
          Section B
        </div>
        <div
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 15,
            fontWeight: 700,
            color: COLOR.B,
            lineHeight: 1,
          }}
        >
          {probability.toFixed(0)}%
        </div>
        <div
          style={{
            fontFamily: 'IBM Plex Sans, sans-serif',
            fontSize: 9,
            color: '#6e7681',
            marginTop: 1,
          }}
        >
          posterior
        </div>
      </div>
    </div>
  );
}

// ---- Main component --------------------------------------------------
export function BeliefChart({ compact = false }: { compact?: boolean }) {
  const { state } = useGrid();
  const { beliefHistory, sectionProbabilities } = state;
  const containerRef = useRef<HTMLDivElement>(null);

  const topSection = [...sectionProbabilities].sort((a, b) => b.probability - a.probability)[0];

  // Transform belief history into chart data points.
  //
  // KEY DESIGN DECISION: `x` is a numeric snapshot index (0, 1, 2, …), NOT a
  // timestamp string.  This guarantees every data point has a unique x-coordinate
  // in Recharts — even when two snapshots fall within the same minute or second.
  // Without this, Recharts resolves the hovered point by matching the x-axis
  // *string value*, causing multiple snapshots that share a "HH:MM" prefix to all
  // map to the first matching point, showing the wrong (e.g. uniform prior)
  // posterior in the tooltip.
  const data: ChartPoint[] = beliefHistory.map((snapshot, i) => {
    // Extract HH:MM:SS from ISO string for display purposes only
    let timeLabel = '';
    try {
      const match = snapshot.timestamp.match(/T(\d{2}:\d{2}:\d{2})/);
      if (match) {
        timeLabel = match[1]; // HH:MM:SS — all 8 chars, distinguishes close events
      } else {
        const d = new Date(snapshot.timestamp);
        timeLabel = d.toLocaleTimeString('en-IN', {
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          hour12: false, timeZone: 'Asia/Kolkata',
        });
      }
    } catch {
      timeLabel = snapshot.timestamp;
    }
    return {
      x: i,                                                    // ← unique numeric key
      time: timeLabel,                                         // ← display only
      A: Number((snapshot.sections.A * 100).toFixed(1)),
      B: Number((snapshot.sections.B * 100).toFixed(1)),
      C: Number((snapshot.sections.C * 100).toFixed(1)),
      trigger: snapshot.trigger || '',
    };
  });

  const lastPoint = data[data.length - 1];

  // Indices with evidence triggers (skip index 0 = uniform prior)
  const annotationIndices = data
    .map((d, i) => (i > 0 && d.trigger ? i : -1))
    .filter((i) => i >= 0);

  // Custom X tick — show HH:MM:SS label for the snapshot at this numeric index.
  // We show all 8 chars so e.g. 14:22:15 and 14:22:20 are visually distinct.
  // On a compact chart there are few data points so this never crowds the axis.
  const renderTick = useCallback(
    ({ x, y, payload }: { x: number; y: number; payload: { value: number } }) => {
      const pt = data[payload.value];
      return (
        <text
          x={x}
          y={y + 10}
          textAnchor="middle"
          fill="#6e7681"
          fontSize={9}
          fontFamily="IBM Plex Mono, monospace"
        >
          {pt ? pt.time : ''}
        </text>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
  );

  return (
    <div
      ref={containerRef}
      className="h-full flex flex-col"
      style={{ padding: compact ? '8px 0 0 0' : 0 }}
    >
      {/* ---- Header ---- */}
      <div className="flex items-start justify-between px-3 mb-1">
        <div>
          <div className="gs-section-label">Belief evolution</div>
          {!compact && (
            <div
              style={{
                color: '#6e7681',
                fontSize: 10,
                marginTop: 2,
                fontFamily: 'IBM Plex Sans, sans-serif',
                letterSpacing: '0.01em',
              }}
            >
              Evidence arrivals → posterior probability updates
            </div>
          )}
          {compact && (
            <div className="text-[10px] mt-0.5 font-mono" style={{ color: '#8b949e' }}>
              Section {topSection?.section}{' '}
              <span style={{ color: COLOR.B, fontWeight: 700 }}>
                {Math.round((topSection?.probability || 0) * 100)}%
              </span>{' '}
              posterior
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 14, height: 2, backgroundColor: COLOR.B, display: 'inline-block', borderRadius: 1 }} />
            <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: '#8b949e' }}>B</span>
            <span style={{ fontSize: 9, color: '#6e7681', fontFamily: 'IBM Plex Sans' }}>primary</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 1.5, backgroundColor: COLOR.A, display: 'inline-block', borderRadius: 1, opacity: 0.7 }} />
            <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: '#6e7681' }}>A</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 1.5, backgroundColor: COLOR.C, display: 'inline-block', borderRadius: 1, opacity: 0.7 }} />
            <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: '#6e7681' }}>C</span>
          </div>
        </div>
      </div>

      {/* ---- Chart area ---- */}
      <div className="flex-1" style={{ minHeight: 0, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: compact ? 6 : 18, right: compact ? 14 : 74, bottom: 0, left: 0 }}
          >
            {/* Subtle horizontal-only grid */}
            <CartesianGrid
              stroke={COLOR.gridLine}
              strokeDasharray="0"
              vertical={false}
            />

            {/*
              XAxis uses the numeric snapshot index as dataKey.
              This ensures each snapshot has a unique x-coordinate regardless of
              how close together their wall-clock timestamps are.
              The tick renderer maps the index back to the HH:MM:SS display label.
            */}
            <XAxis
              dataKey="x"
              type="number"
              domain={[0, data.length - 1]}
              ticks={data.map((_, i) => i)}
              tick={renderTick as never}
              axisLine={false}
              tickLine={false}
              interval={0}
            />

            <YAxis
              tick={{ fontSize: 9, fill: '#6e7681', fontFamily: 'IBM Plex Mono' }}
              axisLine={false}
              tickLine={false}
              width={32}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tickCount={5}
            />

            {/*
              Tooltip: the `payload` entries come from the hovered chart data point,
              which is the direct 1-to-1 mapping of a BeliefSnapshot entry.
              We pass `chartData` so the tooltip can look up the display timestamp
              by numeric index if needed.
            */}
            <Tooltip
              content={(props) => {
                type TooltipEntry = { value: number; dataKey: string; payload?: ChartPoint };
                const payload = (props.payload ?? []) as unknown as TooltipEntry[];
                return (
                  <BeliefTooltip
                    active={props.active}
                    payload={payload}
                    label={props.label as number}
                    chartData={data}
                  />
                );
              }}
              cursor={{
                stroke: 'rgba(139,148,158,0.14)',
                strokeWidth: 1,
                strokeDasharray: '4 3',
              }}
            />

            {/* Evidence event vertical markers — full mode only.
                ReferenceLine x={idx} uses the numeric snapshot index, which
                aligns exactly with the chart data point for that snapshot. */}
            {!compact &&
              annotationIndices.map((idx) => {
                const pt = data[idx];
                if (!pt) return null;
                return (
                  <ReferenceLine
                    key={idx}
                    x={idx}
                    stroke={COLOR.eventLine}
                    strokeWidth={1}
                    strokeDasharray="3 4"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label={<EventLabel label={pt.trigger} /> as any}
                  />
                );
              })}

            {/* A — subordinate, thin, low opacity */}
            <Line
              type="monotone"
              dataKey="A"
              stroke={COLOR.A}
              strokeWidth={1}
              strokeOpacity={0.55}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0, fill: COLOR.A }}
              isAnimationActive={false}
            />

            {/* C — subordinate, thin, low opacity */}
            <Line
              type="monotone"
              dataKey="C"
              stroke={COLOR.C}
              strokeWidth={1}
              strokeOpacity={0.55}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0, fill: COLOR.C }}
              isAnimationActive={false}
            />

            {/* B — PRIMARY, rendered last → draws on top */}
            <Line
              type="monotone"
              dataKey="B"
              stroke={COLOR.B}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: COLOR.B }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Endpoint annotation at latest timestamp */}
        {!compact && lastPoint && (
          <EndpointAnnotation probability={lastPoint.B} />
        )}
      </div>
    </div>
  );
}
