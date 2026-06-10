import type { DistractionLabel, WeeklyGoal, WeeklyPlan, WeeklyReflection } from '../bindings';

interface Props {
  missedCount: number;
  allHit: boolean;
  prevPlan: WeeklyPlan | null;
  reflection: WeeklyReflection | null;
  pastGoals: WeeklyGoal[];
  distractionLabels: DistractionLabel[];
  invalid: boolean;
  value: string;
  onChange: (value: string) => void;
}

function topDistractionLabel(pastGoals: WeeklyGoal[], distractionLabels: DistractionLabel[]): string | null {
  const counts = new Map<string, number>();
  for (const goal of pastGoals) {
    if (goal.goal_ref.type === 'Distraction') {
      for (const id of goal.goal_ref.label_ids) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
  }
  let topId: string | null = null;
  let topCount = 0;
  for (const [id, count] of counts) {
    if (count > topCount) {
      topId = id;
      topCount = count;
    }
  }
  return topId ? (distractionLabels.find((l) => l.id === topId)?.text ?? null) : null;
}

export function buildReflectionPrompt(
  missedCount: number,
  allHit: boolean,
  prevPlan: WeeklyPlan | null,
  reflection: WeeklyReflection | null,
  pastGoals: WeeklyGoal[],
  distractionLabels: DistractionLabel[],
): string {
  const lines: string[] = [];

  if (missedCount > 0) {
    lines.push(`• You missed ${missedCount} goal${missedCount === 1 ? '' : 's'} — what got in the way?`);
  }

  if (reflection && prevPlan) {
    const actualPct = (reflection.actual_split.weights.find((w) => w.target.type === 'Distractions')?.weight ?? 0) * 100;
    const plannedPct = (prevPlan.focus.weights.find((w) => w.target.type === 'Distractions')?.weight ?? 0) * 100;
    if (actualPct - plannedPct > 10) {
      const rounded = Math.round(actualPct / 5) * 5;
      const label = topDistractionLabel(pastGoals, distractionLabels) ?? 'interruptions';
      lines.push(`• Distractions took ~${rounded}%, mostly ${label}. Was that avoidable?`);
    }
  }

  if (allHit) {
    lines.push('• You hit everything — was planning accurate, or could you have aimed higher?');
  }

  lines.push("• What's one thing you'd do differently next week?");

  return `A few things to consider:\n${lines.join('\n')}`;
}

export default function ReflectionNotes({ missedCount, allHit, prevPlan, reflection, pastGoals, distractionLabels, invalid, value, onChange }: Props) {
  const placeholder = buildReflectionPrompt(missedCount, allHit, prevPlan, reflection, pastGoals, distractionLabels);

  return (
    <div className="reflection-notes">
      <textarea
        className={`reflection-notes__textarea${invalid ? ' reflection-notes__textarea--invalid' : ''}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
      />
      {invalid && <p className="reflection-notes__error">Reflection notes are required before continuing.</p>}
    </div>
  );
}
