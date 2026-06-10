import { type CSSProperties } from 'react';
import type { QuarterlyGoal } from '../bindings';
import WaypointList from '../shared/WaypointList';

interface Props {
  goal: QuarterlyGoal;
  locale: string;
  color: string;
}

export default function QuarterlyGoalCard({ goal, locale, color }: Props) {
  return (
    <div className="quarterly-goal-card" style={{ '--swimlane-color': color } as CSSProperties}>
      <p className="quarterly-goal-card__text">{goal.text}</p>
      <WaypointList waypoints={goal.waypoints} isActiveQuarter locale={locale} />
    </div>
  );
}
