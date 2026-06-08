import type { Swimlane, WeeklyGoal } from '../bindings';
import '../shared/swimlane-pill.css';

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
        <span className="swimlane-pill" style={{ '--swimlane-color': sw.color } as React.CSSProperties}>
          {sw.name}
        </span>
      );
    }
  }
  return (
    <span className="swimlane-pill" style={{ '--swimlane-color': '#b4b2a9' } as React.CSSProperties}>
      Distraction
    </span>
  );
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
