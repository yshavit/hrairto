import type { Waypoint } from '../bindings';
import { getMonthInfo } from '../utils/calendar';
import './WaypointList.css';

interface Props {
  waypoints: Waypoint[];
  isActiveQuarter: boolean;
  locale: string;
}

export default function WaypointList({ waypoints, isActiveQuarter, locale }: Props) {
  const firstIncompleteIdx = isActiveQuarter ? waypoints.findIndex((w) => w.completed_at === null) : -1;

  return (
    <div className="waypoint-list">
      {waypoints.map((w, i) => {
        const state = w.completed_at !== null ? 'completed' : i === firstIncompleteIdx ? 'current' : 'future';
        const { label } = getMonthInfo(w.target_month, w.target_year, locale);

        return (
          <div key={w.id} className="waypoint-item" data-state={state}>
            <div className="waypoint-check">{state === 'completed' && '✓'}</div>
            <span className="waypoint-month">{label}</span>
            <span className="waypoint-label">{w.text}</span>
          </div>
        );
      })}
    </div>
  );
}
