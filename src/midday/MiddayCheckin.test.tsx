import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { middayCheckinData } from '../mockData';
import MiddayCheckin from './MiddayCheckin';
import TodaysGoals from './TodaysGoals';
import TimeSplitBar from './TimeSplitBar';

const noop = vi.fn();

// ── MiddayHeader ──────────────────────────────────────────────────────────────

describe('MiddayHeader', () => {
  it('shows "First check-in today" when last_checkin_at is null', () => {
    render(
      <MiddayCheckin
        data={{ ...middayCheckinData, last_checkin_at: null }}
        onSave={noop}
      />,
    );
    expect(screen.getByText('First check-in today')).toBeInTheDocument();
  });

  it('shows last check-in time and next check-in when last_checkin_at is set', () => {
    render(<MiddayCheckin data={middayCheckinData} onSave={noop} />);
    expect(screen.queryByText('First check-in today')).not.toBeInTheDocument();
    expect(screen.getByText(/next check-in at/i)).toBeInTheDocument();
  });
});

// ── GoalRow ───────────────────────────────────────────────────────────────────

describe('GoalRow (via TodaysGoals)', () => {
  function renderGoals(overrideOutcomes = new Map()) {
    const onToggle = vi.fn();
    render(
      <TodaysGoals
        goals={middayCheckinData.todays_goals}
        outcomes={overrideOutcomes}
        onToggle={onToggle}
        concerns={middayCheckinData.concerns}
        quarterlyGoals={middayCheckinData.quarterly_goals}
        distractionLabels={middayCheckinData.distraction_labels}
      />,
    );
    return { onToggle };
  }

  it('first click on an unmarked toggle calls onToggle', () => {
    const { onToggle } = renderGoals();
    const toggles = screen.getAllByRole('button', { name: /toggle outcome/i });
    fireEvent.click(toggles[0]);
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(middayCheckinData.todays_goals[0].id);
  });

  it('shows strikethrough on hit, not on miss', () => {
    const goalId = middayCheckinData.todays_goals[0].id;
    const { rerender } = render(
      <TodaysGoals
        goals={middayCheckinData.todays_goals}
        outcomes={new Map([[goalId, 'hit' as const]])}
        onToggle={noop}
        concerns={middayCheckinData.concerns}
        quarterlyGoals={middayCheckinData.quarterly_goals}
        distractionLabels={middayCheckinData.distraction_labels}
      />,
    );
    const texts = document.querySelectorAll('.midday-goal-row__text');
    expect(texts[0]).toHaveClass('midday-goal-row__text--hit');

    rerender(
      <TodaysGoals
        goals={middayCheckinData.todays_goals}
        outcomes={new Map([[goalId, 'miss' as const]])}
        onToggle={noop}
        concerns={middayCheckinData.concerns}
        quarterlyGoals={middayCheckinData.quarterly_goals}
        distractionLabels={middayCheckinData.distraction_labels}
      />,
    );
    expect(texts[0]).not.toHaveClass('midday-goal-row__text--hit');
  });

  it('ⓘ toggle reveals and hides detail', () => {
    renderGoals();
    const infoBtns = screen.getAllByRole('button', { name: /toggle detail/i });

    // Hidden initially
    expect(document.querySelector('.midday-goal-row__detail')).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(infoBtns[0]);
    expect(document.querySelector('.midday-goal-row__detail')).toBeInTheDocument();

    // Click to close
    fireEvent.click(infoBtns[0]);
    expect(document.querySelector('.midday-goal-row__detail')).not.toBeInTheDocument();
  });

  it('planned goal detail includes concern name and waypoint text', () => {
    renderGoals();
    const infoBtns = screen.getAllByRole('button', { name: /toggle detail/i });
    // First goal: planned FizzBuzz, waypoint W('52')
    fireEvent.click(infoBtns[0]);
    const detail = document.querySelector('.midday-goal-row__detail');
    expect(detail?.textContent).toContain('Team');
    expect(detail?.textContent).toContain('Closed beta sign-up flow');
  });

  it('distraction goal detail shows label text', () => {
    renderGoals();
    const infoBtns = screen.getAllByRole('button', { name: /toggle detail/i });
    // Third goal: distraction (support rotation)
    fireEvent.click(infoBtns[2]);
    const detail = document.querySelector('.midday-goal-row__detail');
    expect(detail?.textContent).toContain('support rotation');
  });
});

// ── TimeSplitBar ──────────────────────────────────────────────────────────────

describe('TimeSplitBar', () => {
  const goals = middayCheckinData.todays_goals;
  const concerns = middayCheckinData.concerns;
  const segCount = goals.length + 1; // 3 goals + distractions = 4

  function renderBar(weights = Array(segCount).fill(1 / segCount), onChange = vi.fn()) {
    render(
      <TimeSplitBar
        goals={goals}
        concerns={concerns}
        weights={weights}
        onChange={onChange}
      />,
    );
    return { onChange };
  }

  it('segments sum to 100% on initial render', () => {
    renderBar();
    const segments = document.querySelectorAll('.time-split-bar__segment');
    expect(segments).toHaveLength(segCount);
    const totalPct = [...segments].reduce((sum, seg) => {
      const w = (seg as HTMLElement).style.width;
      return sum + parseFloat(w);
    }, 0);
    expect(Math.round(totalPct)).toBe(100);
  });

  it('renders one drag handle per divider (segments - 1)', () => {
    renderBar();
    const handles = document.querySelectorAll('.time-split-bar__handle');
    expect(handles).toHaveLength(segCount - 1);
  });

  it('legend items match segment count', () => {
    renderBar();
    const legendItems = document.querySelectorAll('.time-split-bar__legend-item');
    expect(legendItems).toHaveLength(segCount);
  });

  it('legend shows "Distractions" as the last item', () => {
    renderBar();
    const labels = document.querySelectorAll('.time-split-bar__legend-label');
    expect(labels[segCount - 1].textContent).toBe('Distractions');
  });

  it('omits elapsed time label when last_checkin_at is null', () => {
    render(<MiddayCheckin data={{ ...middayCheckinData, last_checkin_at: null }} onSave={noop} />);
    expect(document.querySelector('.time-split-bar__elapsed')).not.toBeInTheDocument();
  });

  it('shows elapsed time label when last_checkin_at is set', () => {
    render(<MiddayCheckin data={middayCheckinData} onSave={noop} />);
    expect(document.querySelector('.time-split-bar__elapsed')).toBeInTheDocument();
  });
});

// ── SaveButton ────────────────────────────────────────────────────────────────

describe('SaveButton', () => {
  it('saves with no goals marked and no note', () => {
    const onSave = vi.fn();
    render(<MiddayCheckin data={middayCheckinData} onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: /Done/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const result = onSave.mock.calls[0][0];
    expect(result.goal_outcomes).toHaveLength(0);
    expect(result.note).toBeNull();
  });

  it('includes touched goal outcomes and time split in saved result', () => {
    const onSave = vi.fn();
    render(<MiddayCheckin data={middayCheckinData} onSave={onSave} />);

    // Toggle first goal (unmarked → hit)
    const toggles = screen.getAllByRole('button', { name: /toggle outcome/i });
    fireEvent.click(toggles[0]);

    fireEvent.click(screen.getByRole('button', { name: /Done/i }));

    const result = onSave.mock.calls[0][0];
    expect(result.goal_outcomes).toHaveLength(1);
    expect(result.goal_outcomes[0].outcome.type).toBe('Hit');
    expect(result.time_split.goal_weights).toHaveLength(middayCheckinData.todays_goals.length);
    expect(result.time_split.distraction_weight).toBeGreaterThan(0);
  });
});

// ── MiddayHeader elapsed label (TimeSplitBar) ─────────────────────────────────

describe('TimeSplitBar elapsed label', () => {
  it('absent when last_checkin_at is null', () => {
    render(
      <MiddayCheckin
        data={{ ...middayCheckinData, last_checkin_at: null }}
        onSave={noop}
      />,
    );
    expect(document.querySelector('.time-split-bar__elapsed')).not.toBeInTheDocument();
  });
});
