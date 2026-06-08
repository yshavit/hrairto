import type { Swimlane, WeeklyGoal } from '../bindings';

interface Props {
  goals: WeeklyGoal[];
  swimlanes: Swimlane[];
}

function GhostPill({ goal, swimlanes }: { goal: WeeklyGoal; swimlanes: Swimlane[] }) {
  const ref = goal.goal_ref;
  if (ref.type === 'Planned') {
    const sw = swimlanes.find((s) => s.id === ref.swimlane_id);
    if (sw) {
      return (
        <span className="swimlane-quarter-context__pill" style={{ '--swimlane-color': sw.color } as React.CSSProperties}>
          {sw.name}
        </span>
      );
    }
  }
  return <span className="missed-goal-ghost__distraction-pill">Distraction</span>;
}

export default function MissedGoalGhosts({ goals, swimlanes }: Props) {
  if (goals.length === 0) return null;
  return (
    <div className="missed-goal-ghosts">
      <p className="missed-goal-ghosts__label">missed last week</p>
      {goals.map((g) => (
        <div key={g.id} className="missed-goal-ghost">
          <GhostPill goal={g} swimlanes={swimlanes} />
          {g.text}
        </div>
      ))}
    </div>
  );
}
