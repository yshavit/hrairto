import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import WaypointList from './WaypointList';
import type { Waypoint } from '../bindings';

const QG_ID = 'goal-1';

const waypoints: Waypoint[] = [
  {
    id: 'w-1',
    quarterly_goal_id: QG_ID,
    target_month: 4,
    target_year: 2026,
    text: 'Apr milestone',
    completed_at: Date.UTC(2026, 3, 25),
  },
  {
    id: 'w-2',
    quarterly_goal_id: QG_ID,
    target_month: 5,
    target_year: 2026,
    text: 'May milestone',
    completed_at: null,
  },
  {
    id: 'w-3',
    quarterly_goal_id: QG_ID,
    target_month: 6,
    target_year: 2026,
    text: 'Jun milestone',
    completed_at: null,
  },
];

describe('WaypointList', () => {
  it('active quarter: completed / current / future states', () => {
    const { container } = render(<WaypointList waypoints={waypoints} isActiveQuarter={true} locale="en-US" />);
    const items = container.querySelectorAll('.waypoint-item');
    expect(items[0]).toHaveAttribute('data-state', 'completed');
    expect(items[1]).toHaveAttribute('data-state', 'current');
    expect(items[2]).toHaveAttribute('data-state', 'future');
  });

  it('inactive quarter: no waypoint is current', () => {
    const { container } = render(<WaypointList waypoints={waypoints} isActiveQuarter={false} locale="en-US" />);
    const items = container.querySelectorAll('.waypoint-item');
    expect(items[0]).toHaveAttribute('data-state', 'completed');
    expect(items[1]).toHaveAttribute('data-state', 'future');
    expect(items[2]).toHaveAttribute('data-state', 'future');
  });

  it('renders month labels via Intl', () => {
    const { container } = render(<WaypointList waypoints={waypoints} isActiveQuarter={true} locale="en-US" />);
    const months = container.querySelectorAll('.waypoint-month');
    expect(months[0].textContent).toBe('Apr');
    expect(months[1].textContent).toBe('May');
    expect(months[2].textContent).toBe('Jun');
  });
});
