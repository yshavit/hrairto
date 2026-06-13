import type { Concern, MainQuest, WeightEntry } from '../bindings';

interface Props {
  entries: WeightEntry[];
  mainQuests: MainQuest[];
  concerns: Concern[];
}

const SIDE_QUESTS_COLOR = '#8B8680';
const DISTRACTIONS_COLOR = '#555';

function entryColor(entry: WeightEntry, mainQuests: MainQuest[], concerns: Concern[]): string {
  const { activity } = entry;
  if (activity.type === 'MainQuest') {
    const mq = mainQuests.find((m) => m.id === activity.id);
    return concerns.find((c) => c.id === mq?.concern_id)?.color ?? '#666';
  }
  if (activity.type === 'SideQuests') return SIDE_QUESTS_COLOR;
  return DISTRACTIONS_COLOR;
}

function entryLabel(entry: WeightEntry, mainQuests: MainQuest[]): string {
  const { activity } = entry;
  if (activity.type === 'MainQuest') {
    return mainQuests.find((m) => m.id === activity.id)?.text ?? 'Unknown';
  }
  if (activity.type === 'SideQuests') return 'Side quests';
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

export default function WeightDisplay({ entries, mainQuests, concerns }: Props) {
  const arcs: { path: string; color: string }[] = [];
  let angle = -Math.PI / 2;

  for (const entry of entries) {
    const span = entry.weight * 2 * Math.PI;
    arcs.push({
      path: arcPath(angle + GAP_RAD / 2, angle + span - GAP_RAD / 2),
      color: entryColor(entry, mainQuests, concerns),
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
            <div className="weight-legend-dot" style={{ background: entryColor(entry, mainQuests, concerns) }} />
            {Math.round(entry.weight * 100)}% {entryLabel(entry, mainQuests)}
          </div>
        ))}
      </div>
    </div>
  );
}
