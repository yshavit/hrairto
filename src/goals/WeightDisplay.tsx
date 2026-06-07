import type { Swimlane, SwimlaneWeightEntry } from '../bindings';

interface Props {
  entries: SwimlaneWeightEntry[];
  swimlanes: Swimlane[];
}

function entryColor(entry: SwimlaneWeightEntry, swimlanes: Swimlane[]): string {
  const { target } = entry;
  if (target.type === 'Swimlane') {
    return swimlanes.find((s) => s.id === target.id)?.color ?? '#555';
  }
  return '#555';
}

function entryLabel(entry: SwimlaneWeightEntry, swimlanes: Swimlane[]): string {
  const { target } = entry;
  if (target.type === 'Swimlane') {
    return swimlanes.find((s) => s.id === target.id)?.name ?? 'Unknown';
  }
  return 'Distractions';
}

const CX = 24,
  CY = 24,
  R = 18;
const GAP_RAD = 0.04;

function arcPath(startAngle: number, endAngle: number): string {
  const x1 = CX + R * Math.cos(startAngle);
  const y1 = CY + R * Math.sin(startAngle);
  const x2 = CX + R * Math.cos(endAngle);
  const y2 = CY + R * Math.sin(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`;
}

export default function WeightDisplay({ entries, swimlanes }: Props) {
  const arcs: { path: string; color: string }[] = [];
  let angle = -Math.PI / 2;

  for (const entry of entries) {
    const span = entry.weight * 2 * Math.PI;
    arcs.push({
      path: arcPath(angle + GAP_RAD / 2, angle + span - GAP_RAD / 2),
      color: entryColor(entry, swimlanes),
    });
    angle += span;
  }

  return (
    <div className="weight-display">
      <svg width="40" height="40" viewBox="0 0 48 48">
        {arcs.map((arc, i) => (
          <path key={i} d={arc.path} fill="none" stroke={arc.color} strokeWidth="7" strokeLinecap="round" />
        ))}
      </svg>
      <div className="weight-legend">
        {entries.map((entry, i) => (
          <div key={i} className="weight-legend-item">
            <div className="weight-legend-dot" style={{ background: entryColor(entry, swimlanes) }} />
            {Math.round(entry.weight * 100)}% {entryLabel(entry, swimlanes)}
          </div>
        ))}
      </div>
    </div>
  );
}
