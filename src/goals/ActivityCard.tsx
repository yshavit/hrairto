import type { CSSProperties } from 'react';
import type { QuarterDisplay, QuarterlyGoal } from '../bindings';
import WaypointList from '../shared/WaypointList';

type Status = 'past' | 'active' | 'future';

interface Props {
  goal: QuarterlyGoal;
  quarter: QuarterDisplay;
  concernColor: string;
  status: Status;
  locale: string;
}

export default function ActivityCard({ goal, quarter, concernColor, status, locale }: Props) {
  const isSideQuest = goal.parent.type === 'SideQuest';
  return (
    <div
      className="activity-card"
      data-status={status}
      style={{ '--concern-color': concernColor } as CSSProperties}
    >
      <div className="activity-card__header">
        <span className="activity-card__goal-text">{goal.text}</span>
        {isSideQuest && <span className="activity-card__side-quest-badge">side quest</span>}
      </div>
      <WaypointList
        waypoints={goal.waypoints}
        quarter={quarter}
        isActiveQuarter={status === 'active'}
        locale={locale}
      />
    </div>
  );
}
