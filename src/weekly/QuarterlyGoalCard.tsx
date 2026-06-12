import { type CSSProperties } from 'react';
import type { QuarterDisplay, QuarterlyGoal } from '../bindings';
import WaypointList from '../shared/WaypointList';

interface Props {
  goal: QuarterlyGoal;
  quarter: QuarterDisplay;
  locale: string;
  color: string;
}

export default function QuarterlyGoalCard({ goal, quarter, locale, color }: Props) {
  return (
    <div className="quarterly-goal-card" style={{ '--concern-color': color } as CSSProperties}>
      <p className="quarterly-goal-card__text">{goal.text}</p>
      <WaypointList waypoints={goal.waypoints} quarter={quarter} isActiveQuarter locale={locale} />
    </div>
  );
}
