import { useRef } from 'react';
import type { Swimlane, SwimlaneWeight } from '../bindings';
import './FocusSplitBar.css';

export const DISTRACTIONS_COLOR = '#B4B2A9';
export const DISTRACTIONS_KEY = '__distractions__';
const MIN_LABEL_PCT = 12;
const MIN_SEGMENT_PCT = 5;

export function weightKey(w: SwimlaneWeight): string {
  const target = w.target;
  return target.type === 'Swimlane' ? target.id : DISTRACTIONS_KEY;
}

export function segmentColor(w: SwimlaneWeight, swimlanes: Swimlane[]): string {
  const target = w.target;
  if (target.type === 'Swimlane') {
    return swimlanes.find((s) => s.id === target.id)?.color ?? '#666';
  }
  return DISTRACTIONS_COLOR;
}

interface Props {
  swimlanes: Swimlane[];
  weights: SwimlaneWeight[];
  isEditable?: boolean;
  onChange?: (weights: SwimlaneWeight[]) => void;
  approximate?: boolean;
  tooltips?: Record<string, string>;
}

export default function FocusSplitBar({ swimlanes, weights, isEditable, onChange, approximate, tooltips }: Props) {
  const barRef = useRef<HTMLDivElement>(null);

  const pcts = weights.map((w) => Math.round(w.weight * 100));

  // Cumulative positions for dividers — one between each adjacent pair
  const dividerPositions: number[] = [];
  let cumSum = 0;
  for (let i = 0; i < pcts.length - 1; i++) {
    cumSum += pcts[i];
    dividerPositions.push(cumSum);
  }

  function startDrag(e: React.PointerEvent<HTMLDivElement>, dividerIndex: number) {
    if (!onChange) return;
    const emit = onChange;
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

      emit(weights.map((w, i) => ({ ...w, weight: newPcts[i] / 100 })));
    }

    function onUp() {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
    }

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
  }

  return (
    <div className={`focus-split-bar${isEditable ? ' focus-split-bar--editable' : ''}`} ref={barRef}>
      {weights.map((w, i) => {
        const pct = pcts[i];
        const color = segmentColor(w, swimlanes);
        const key = weightKey(w);
        return (
          <div key={key} className="focus-split-bar__segment" style={{ width: `${pct}%`, background: color }} title={tooltips?.[key]}>
            {pct >= MIN_LABEL_PCT && (
              <span className="focus-split-bar__segment-text">
                {approximate ? '~' : ''}
                {pct}%
              </span>
            )}
          </div>
        );
      })}

      {isEditable &&
        dividerPositions.map((pos, i) => (
          <div key={i} className="focus-split-bar__handle" style={{ left: `${pos}%` }} onPointerDown={(e) => startDrag(e, i)} />
        ))}
    </div>
  );
}
