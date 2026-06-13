import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ActivityCard from './ActivityCard';
import type { QuarterDisplay, QuarterlyGoal } from '../bindings';

const quarter: QuarterDisplay = {
  quarter: 2,
  year: 2026,
  label: 'Q2 · Apr–Jun',
  start_at: Date.UTC(2026, 3, 1),
  end_at: Date.UTC(2026, 6, 1),
};

const baseGoal: QuarterlyGoal = {
  id: 'goal-1',
  parent: { type: 'SideQuest', concern_id: 'concern-1' },
  due_quarter: 2,
  due_year: 2026,
  text: 'Launch closed beta',
  created_at: Date.UTC(2026, 3, 1),
  waypoints: [{ id: 'w-1', text: 'First milestone', completed_at: null }, null, null],
};

const mainQuestGoal: QuarterlyGoal = {
  ...baseGoal,
  id: 'goal-2',
  parent: { type: 'MainQuest', id: 'mq-1' },
};

describe('ActivityCard', () => {
  it('past: sets data-status', () => {
    const { container } = render(<ActivityCard goal={baseGoal} quarter={quarter} concernColor="#378ADD" status="past" locale="en-US" />);
    expect(container.firstChild).toHaveAttribute('data-status', 'past');
  });

  it('active: sets data-status', () => {
    const { container } = render(<ActivityCard goal={baseGoal} quarter={quarter} concernColor="#378ADD" status="active" locale="en-US" />);
    expect(container.firstChild).toHaveAttribute('data-status', 'active');
  });

  it('future: renders goal text', () => {
    render(<ActivityCard goal={baseGoal} quarter={quarter} concernColor="#378ADD" status="future" locale="en-US" />);
    expect(screen.getByText('Launch closed beta')).toBeInTheDocument();
  });

  it('SideQuest parent: shows side quest badge', () => {
    render(<ActivityCard goal={baseGoal} quarter={quarter} concernColor="#378ADD" status="future" locale="en-US" />);
    expect(screen.getByText('side quest')).toBeInTheDocument();
  });

  it('MainQuest parent: no side quest badge', () => {
    render(<ActivityCard goal={mainQuestGoal} quarter={quarter} concernColor="#378ADD" status="future" locale="en-US" />);
    expect(screen.queryByText('side quest')).not.toBeInTheDocument();
  });
});
