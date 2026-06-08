import type { DistractionLabel, Swimlane, SwimlaneWeight, WeeklyGoal, WeeklyPlan, WeeklyReflection } from '../bindings';

interface Props {
  prevPlan: WeeklyPlan | null;
  reflection: WeeklyReflection | null;
  swimlanes: Swimlane[];
  pastGoals: WeeklyGoal[];
  distractionLabels: DistractionLabel[];
}

const DISTRACTIONS_COLOR = '#B4B2A9';
const DISTRACTIONS_KEY = '__distractions__';
const MIN_LABEL_PCT = 12;

interface Segment {
  key: string;
  color: string;
  pct: number;
  text: string;
  tooltip?: string;
}

function weightKey(w: SwimlaneWeight): string {
  return w.target.type === 'Swimlane' ? w.target.id : DISTRACTIONS_KEY;
}

function buildSegments(weights: SwimlaneWeight[], swimlanes: Swimlane[], roundToFive: boolean, plannedPcts?: Map<string, number>): Segment[] {
  return weights.map((w) => {
    const pct = w.weight * 100;
    const displayPct = roundToFive ? Math.round(pct / 5) * 5 : Math.round(pct);
    const text = `${roundToFive ? '~' : ''}${displayPct}%`;
    const target = w.target;
    const key = weightKey(w);

    let tooltip: string | undefined;
    if (plannedPcts) {
      const planned = plannedPcts.get(key);
      if (planned !== undefined) {
        const delta = Math.round(pct - planned);
        if (delta !== 0) {
          tooltip = `${delta > 0 ? '+' : ''}${delta}% from planned`;
        }
      }
    }

    if (target.type === 'Swimlane') {
      const sw = swimlanes.find((s) => s.id === target.id);
      return { key, color: sw?.color ?? '#666', pct, text, tooltip };
    }
    return { key, color: DISTRACTIONS_COLOR, pct, text, tooltip };
  });
}

interface LegendEntry {
  key: string;
  color: string;
  name: string;
  filled: boolean;
}

function buildLegend(weights: SwimlaneWeight[], swimlanes: Swimlane[]): LegendEntry[] {
  return weights.map((w) => {
    const target = w.target;
    if (target.type === 'Swimlane') {
      const sw = swimlanes.find((s) => s.id === target.id);
      return { key: target.id, color: sw?.color ?? '#666', name: sw?.name ?? 'Unknown', filled: true };
    }
    return { key: DISTRACTIONS_KEY, color: DISTRACTIONS_COLOR, name: 'Distractions', filled: false };
  });
}

function countDistractionLabels(pastGoals: WeeklyGoal[], distractionLabels: DistractionLabel[]): { label: DistractionLabel; count: number }[] {
  // TODO (Phase 2): replace with actual split metadata from backend; backend will
  // track distraction instances separately from planned goals.
  const counts = new Map<string, number>();
  for (const goal of pastGoals) {
    if (goal.goal_ref.type === 'Distraction') {
      for (const id of goal.goal_ref.label_ids) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
  }
  return distractionLabels.map((label) => ({ label, count: counts.get(label.id) ?? 0 })).filter(({ count }) => count > 0);
}

function Bar({ segments, label }: { segments: Segment[]; label: string }) {
  return (
    <div className="time-split-bar-row">
      <span className="time-split-bar-row__label">{label}</span>
      <div className="time-split-bar-row__track">
        {segments.map((seg) => (
          <div key={seg.key} className="time-split-bar-row__segment" style={{ width: `${seg.pct}%`, background: seg.color }} title={seg.tooltip}>
            {seg.pct >= MIN_LABEL_PCT && <span className="time-split-bar-row__segment-text">{seg.text}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TimeSplitBars({ prevPlan, reflection, swimlanes, pastGoals, distractionLabels }: Props) {
  const plannedSegments = prevPlan ? buildSegments(prevPlan.focus.weights, swimlanes, false) : null;

  const plannedPcts: Map<string, number> | undefined = plannedSegments ? new Map(plannedSegments.map((s) => [s.key, s.pct])) : undefined;

  const actualSegments = reflection ? buildSegments(reflection.actual_split.weights, swimlanes, true, plannedPcts) : null;

  const legendWeights = prevPlan?.focus.weights ?? reflection?.actual_split.weights ?? [];
  const legend = buildLegend(legendWeights, swimlanes);

  const pills = countDistractionLabels(pastGoals, distractionLabels);

  return (
    <div className="time-split-bars">
      {plannedSegments && <Bar segments={plannedSegments} label="Planned" />}
      {actualSegments && <Bar segments={actualSegments} label="Actual" />}
      <div className="time-split-bars__footer">
        <div className="time-split-bars__legend">
          {legend.map((entry) => (
            <span key={entry.key} className="time-split-bars__legend-item">
              <svg width="9" height="9" viewBox="0 0 9 9">
                <circle cx="4.5" cy="4.5" r="4" fill={entry.filled ? entry.color : 'none'} stroke={entry.color} strokeWidth="1.2" />
              </svg>
              {entry.name}
            </span>
          ))}
        </div>
        {pills.length > 0 && (
          <div className="time-split-bars__pills">
            {pills.map(({ label, count }) => (
              <span key={label.id} className="time-split-bars__pill">
                {label.text} ×{count}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
