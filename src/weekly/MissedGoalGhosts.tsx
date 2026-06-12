import { type CSSProperties } from 'react';
import type { Concern, WeeklyGoal } from '../bindings';
import '../shared/concern-pill.css';

interface Props {
  goals: WeeklyGoal[];
  concerns: Concern[];
}

function GhostPill({ goal, concerns }: { goal: WeeklyGoal; concerns: Concern[] }) {
  const ref = goal.goal_ref;
  if (ref.type === 'Planned') {
    const concern = concerns.find((c) => c.id === ref.concern_id);
    if (concern) {
      return (
        <span className="concern-pill" style={{ '--concern-color': concern.color } as CSSProperties}>
          {concern.name}
        </span>
      );
    }
  }
  return (
    <span className="concern-pill" style={{ '--concern-color': '#b4b2a9' } as CSSProperties}>
      Distraction
    </span>
  );
}

export default function MissedGoalGhosts({ goals, concerns }: Props) {
  if (goals.length === 0) return null;
  return (
    <div className="missed-goal-ghosts">
      <p className="missed-goal-ghosts__label">
        missed last week
        <svg className="missed-goal-ghosts__icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <circle cx="8" cy="8" r="7" />
          <text x="8" y="12" textAnchor="middle">
            !
          </text>
        </svg>
      </p>
      {goals.map((g) => (
        <div key={g.id} className="missed-goal-ghost">
          <GhostPill goal={g} concerns={concerns} />
          {g.text}
        </div>
      ))}
    </div>
  );
}
