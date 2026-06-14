import { useRef } from 'react';
import type { Concern, Epoch, WeeklyGoal } from '../bindings';

const DISTRACTIONS_COLOR = '#B4B2A9';
const MIN_SEGMENT_PCT = 5;
const MIN_LABEL_PCT = 12;

interface Props {
  goals: WeeklyGoal[];
  concerns: Concern[];
  /** One weight per goal + one for distractions at the end. Sum = 1.0. */
  weights: number[];
  onChange: (weights: number[]) => void;
  checkinAt: Epoch;
  lastCheckinAt: Epoch | null;
}

function segmentColors(goals: WeeklyGoal[], concerns: Concern[]): string[] {
  const seen = new Map<string, number>();
  const colors = goals.map((goal) => {
    const ref = goal.goal_ref;
    if (ref.type === 'Distraction') return DISTRACTIONS_COLOR;
    const concern = concerns.find((c) => c.id === ref.concern_id);
    if (!concern) return '#666';
    const count = seen.get(ref.concern_id) ?? 0;
    seen.set(ref.concern_id, count + 1);
    // Second occurrence of the same concern: 60% opacity via hex alpha
    return count === 0 ? concern.color : concern.color + '99';
  });
  colors.push(DISTRACTIONS_COLOR);
  return colors;
}

function formatElapsed(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  const hrs = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (min === 0) return `~${hrs} hrs`;
  if (min === 30) return `~${hrs}.5 hrs`;
  return `~${hrs}h ${min}m`;
}

function legendLabel(goal: WeeklyGoal | null): string {
  if (!goal) return 'Distractions';
  return goal.text;
}

export default function TimeSplitBar({ goals, concerns, weights, onChange, checkinAt, lastCheckinAt }: Props) {
  const barRef = useRef<HTMLDivElement>(null);

  const colors = segmentColors(goals, concerns);
  const pcts = weights.map((w) => Math.round(w * 100));

  // Divider positions between segments
  const dividerPositions: number[] = [];
  let cum = 0;
  for (let i = 0; i < pcts.length - 1; i++) {
    cum += pcts[i];
    dividerPositions.push(cum);
  }

  // All segments: goals + distractions
  const segments = [...goals.map((g) => g), null as WeeklyGoal | null];

  function startDrag(e: React.PointerEvent<HTMLDivElement>, dividerIndex: number) {
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);

    const barRect = barRef.current!.getBoundingClientRect();
    const capturedPcts = [...pcts];
    const cumLeft = capturedPcts.slice(0, dividerIndex).reduce((a, b) => a + b, 0);
    const cumRight = capturedPcts.slice(dividerIndex + 2).reduce((a, b) => a + b, 0);
    const minPos = cumLeft + MIN_SEGMENT_PCT;
    const maxPos = 100 - cumRight - MIN_SEGMENT_PCT;

    function onMove(me: PointerEvent) {
      const rawPct = ((me.clientX - barRect.left) / barRect.width) * 100;
      const snapped = Math.round(rawPct / 5) * 5;
      const clamped = Math.max(minPos, Math.min(snapped, maxPos));

      const newPcts = [...capturedPcts];
      newPcts[dividerIndex] = clamped - cumLeft;
      newPcts[dividerIndex + 1] = 100 - cumRight - clamped;

      onChange(newPcts.map((p) => p / 100));
    }

    function onUp() {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
    }

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
  }

  const elapsedLabel = lastCheckinAt !== null ? formatElapsed(checkinAt - lastCheckinAt) : null;

  return (
    <div className="time-split-bar">
      <div className="time-split-bar__above">
        <span className="time-split-bar__hint">Drag the handles to adjust</span>
        {elapsedLabel && <span className="time-split-bar__elapsed">{elapsedLabel}</span>}
      </div>

      <div className="time-split-bar__track-wrap" ref={barRef}>
        <div className="time-split-bar__track">
          {segments.map((seg, i) => (
            <div
              key={seg?.id ?? '__distractions__'}
              className="time-split-bar__segment"
              style={{ width: `${pcts[i]}%`, background: colors[i] }}
            >
              {pcts[i] >= MIN_LABEL_PCT && (
                <span className="time-split-bar__segment-pct">{pcts[i]}%</span>
              )}
            </div>
          ))}
        </div>

        {dividerPositions.map((pos, i) => (
          <div
            key={i}
            className="time-split-bar__handle"
            style={{ left: `${pos}%` }}
            onPointerDown={(e) => startDrag(e, i)}
          />
        ))}
      </div>

      <div className="time-split-bar__legend">
        {segments.map((seg, i) => (
          <div key={seg?.id ?? '__distractions__'} className="time-split-bar__legend-item">
            <span className="time-split-bar__dot" style={{ background: colors[i] }} />
            <span className="time-split-bar__legend-label">{legendLabel(seg)}</span>
            <span className="time-split-bar__legend-pct">{pcts[i]}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
