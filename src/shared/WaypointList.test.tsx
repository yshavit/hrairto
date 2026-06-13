import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import WaypointList from './WaypointList';
import type { QuarterDisplay, Waypoint } from '../bindings';

const quarter: QuarterDisplay = {
  quarter: 2,
  year: 2026,
  label: 'Q2 · Apr–Jun',
  start_at: Date.UTC(2026, 3, 1),
  end_at: Date.UTC(2026, 6, 1),
};

function wp(id: string, completedAt: number | null = null): Waypoint {
  return { id, text: `${id} milestone`, completed_at: completedAt };
}

const waypoints: [Waypoint | null, Waypoint | null, Waypoint | null] = [wp('w-1', Date.UTC(2026, 3, 25)), wp('w-2'), wp('w-3')];

describe('WaypointList', () => {
  it('active quarter: completed / current / future states', () => {
    const { container } = render(<WaypointList waypoints={waypoints} quarter={quarter} isActiveQuarter={true} locale="en-US" />);
    const items = container.querySelectorAll('.waypoint-item');
    expect(items[0]).toHaveAttribute('data-state', 'completed');
    expect(items[1]).toHaveAttribute('data-state', 'current');
    expect(items[2]).toHaveAttribute('data-state', 'future');
  });

  it('inactive quarter: no waypoint is current', () => {
    const { container } = render(<WaypointList waypoints={waypoints} quarter={quarter} isActiveQuarter={false} locale="en-US" />);
    const items = container.querySelectorAll('.waypoint-item');
    expect(items[0]).toHaveAttribute('data-state', 'completed');
    expect(items[1]).toHaveAttribute('data-state', 'future');
    expect(items[2]).toHaveAttribute('data-state', 'future');
  });

  it('renders month labels derived from quarter + slot', () => {
    const { container } = render(<WaypointList waypoints={waypoints} quarter={quarter} isActiveQuarter={true} locale="en-US" />);
    const months = container.querySelectorAll('.waypoint-month');
    expect(months[0].textContent).toBe('Apr');
    expect(months[1].textContent).toBe('May');
    expect(months[2].textContent).toBe('Jun');
  });

  it('null slots are not rendered', () => {
    const sparse: [Waypoint | null, Waypoint | null, Waypoint | null] = [wp('w-1'), null, null];
    const { container } = render(<WaypointList waypoints={sparse} quarter={quarter} isActiveQuarter={false} locale="en-US" />);
    expect(container.querySelectorAll('.waypoint-item')).toHaveLength(1);
  });
});
