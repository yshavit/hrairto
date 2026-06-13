import type { QuarterDisplay, Waypoint } from '../bindings';
import { getMonthInfo } from '../utils/calendar';
import './WaypointList.css';

interface Props {
  waypoints: [Waypoint | null, Waypoint | null, Waypoint | null];
  quarter: QuarterDisplay;
  isActiveQuarter: boolean;
  locale: string;
}

function slotToMonth(quarter: QuarterDisplay, slot: number): { month: number; year: number } {
  const d = new Date(quarter.start_at);
  const totalMonth = d.getUTCMonth() + slot;
  return { month: (totalMonth % 12) + 1, year: d.getUTCFullYear() + Math.floor(totalMonth / 12) };
}

export default function WaypointList({ waypoints, quarter, isActiveQuarter, locale }: Props) {
  const present = waypoints.map((wp, slot) => (wp !== null ? { wp, slot } : null)).filter((x): x is { wp: Waypoint; slot: number } => x !== null);

  const firstIncompleteIdx = isActiveQuarter ? present.findIndex(({ wp }) => wp.completed_at === null) : -1;

  return (
    <div className="waypoint-list">
      {present.map(({ wp, slot }, i) => {
        const state = wp.completed_at !== null ? 'completed' : i === firstIncompleteIdx ? 'current' : 'future';
        const { month, year } = slotToMonth(quarter, slot);
        const { label } = getMonthInfo(month, year, locale);
        return (
          <div key={wp.id} className="waypoint-item" data-state={state}>
            <div className="waypoint-check">{state === 'completed' && '✓'}</div>
            <span className="waypoint-month">{label}</span>
            <span className="waypoint-label">{wp.text}</span>
          </div>
        );
      })}
    </div>
  );
}
