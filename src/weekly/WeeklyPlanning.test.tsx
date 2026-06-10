import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { weeklySessionData } from '../mockData';
import FocusSplitBar from '../shared/FocusSplitBar';
import PastGoalsList, { initialOutcome } from './PastGoalsList';
import PlanSection from './PlanSection';
import ReflectSection from './ReflectSection';
import ReflectionNotes, { buildReflectionPrompt } from './ReflectionNotes';
import WaypointHealthList from './WaypointHealthList';
import WeeklyPlanning from './WeeklyPlanning';

// Variant with no quarterly goals → WaypointHealthList renders nothing,
// so health validation doesn't interfere with tests targeting other conditions.
const noWaypointData = {
  ...weeklySessionData,
  quarter_context: weeklySessionData.quarter_context.map((ctx) => ({ ...ctx, quarterly_goal: null })),
};

// Drive WeeklyPlanning through the reflection phase so tests can start in planning.
function completeReflection(container: HTMLElement) {
  Array.from(container.querySelectorAll('.past-goal-row--unmarked')).forEach((row) => {
    fireEvent.click(row.querySelector('.past-goal-row__toggle')!);
  });
  fireEvent.change(container.querySelector('.reflection-notes__textarea')!, { target: { value: 'Test notes' } });
  fireEvent.click(screen.getByRole('button', { name: 'on track' }));
  fireEvent.click(screen.getByRole('button', { name: /Done reflecting/i }));
}

// ── PastGoalsList ─────────────────────────────────────────────────────────────

describe('PastGoalsList', () => {
  const outcomes = new Map(weeklySessionData.past_goals.map((g) => [g.id, initialOutcome(g)]));
  const baseProps = {
    goals: weeklySessionData.past_goals,
    outcomes,
    onToggle: vi.fn(),
    swimlanes: weeklySessionData.swimlanes,
    quarterContext: weeklySessionData.quarter_context,
    distractionLabels: weeklySessionData.distraction_labels,
  };

  it('--unmarked class present on unmarked goals, removed after marking', () => {
    const onToggle = vi.fn();
    const localOutcomes = new Map(weeklySessionData.past_goals.map((g) => [g.id, initialOutcome(g)]));
    const { container, rerender } = render(<PastGoalsList {...baseProps} outcomes={localOutcomes} onToggle={onToggle} />);

    // Goals 1-3 are unmarked (goal 0 is already 'hit')
    const unmarkedRows = container.querySelectorAll('.past-goal-row--unmarked');
    expect(unmarkedRows.length).toBe(3);

    // Simulate marking goal 1 as hit
    const goal1Id = weeklySessionData.past_goals[1].id;
    const updatedOutcomes = new Map(localOutcomes).set(goal1Id, 'hit' as const);
    rerender(<PastGoalsList {...baseProps} outcomes={updatedOutcomes} onToggle={onToggle} />);

    expect(container.querySelectorAll('.past-goal-row--unmarked').length).toBe(2);
  });

  it('outcome cycling: click cycles unmarked→hit→miss→hit, never back to unmarked', () => {
    const onToggle = vi.fn();
    const { container, rerender } = render(<PastGoalsList {...baseProps} onToggle={onToggle} />);

    const goal2Id = weeklySessionData.past_goals[1].id; // was unmarked
    const row = container.querySelectorAll('.past-goal-row--unmarked')[0];
    fireEvent.click(row.querySelector('.past-goal-row__toggle')!);
    expect(onToggle).toHaveBeenCalledWith(goal2Id);

    // Simulate the state change: unmarked → hit
    const afterHit = new Map(outcomes).set(goal2Id, 'hit' as const);
    rerender(<PastGoalsList {...baseProps} outcomes={afterHit} onToggle={onToggle} />);
    expect(container.querySelector(`[data-goal-id="${goal2Id}"]`)).not.toBeInTheDocument();

    // Simulate: hit → miss
    const afterMiss = new Map(outcomes).set(goal2Id, 'miss' as const);
    rerender(<PastGoalsList {...baseProps} outcomes={afterMiss} onToggle={onToggle} />);

    // At no point is it back to unmarked
    const ids = Array.from(container.querySelectorAll('.past-goal-row--unmarked')).map((el) => el.getAttribute('data-goal-id'));
    expect(ids).not.toContain(goal2Id);
  });
});

// ── ReflectionNotes ───────────────────────────────────────────────────────────

describe('ReflectionNotes', () => {
  it('buildReflectionPrompt — missed-goals placeholder', () => {
    const text = buildReflectionPrompt(2, false, null, null, [], []);
    expect(text).toContain('You missed 2 goals');
  });

  it('buildReflectionPrompt — all-hit placeholder', () => {
    const text = buildReflectionPrompt(0, true, null, null, [], []);
    expect(text).toContain('You hit everything');
  });

  it('--invalid class present when empty, removed when filled, returns when cleared', () => {
    const onChange = vi.fn();
    const baseNoteProps = {
      missedCount: 0,
      allHit: false,
      prevPlan: null,
      reflection: null,
      pastGoals: [],
      distractionLabels: [],
      invalid: false,
      onChange,
    };

    const { container, rerender } = render(<ReflectionNotes {...baseNoteProps} value="" />);
    const textarea = container.querySelector('.reflection-notes__textarea')!;
    expect(textarea).toHaveClass('reflection-notes__textarea--invalid');

    rerender(<ReflectionNotes {...baseNoteProps} value="some text" />);
    expect(textarea).not.toHaveClass('reflection-notes__textarea--invalid');

    rerender(<ReflectionNotes {...baseNoteProps} value="" />);
    expect(textarea).toHaveClass('reflection-notes__textarea--invalid');
  });
});

// ── WaypointHealthList ────────────────────────────────────────────────────────

describe('WaypointHealthList', () => {
  const healthProps = {
    swimlanes: weeklySessionData.swimlanes,
    quarterContext: weeklySessionData.quarter_context,
    locale: weeklySessionData.calendar.locale,
  };

  it('cards have --unselected class initially, removed after selecting confidence', () => {
    const { container } = render(<WaypointHealthList {...healthProps} />);
    expect(container.querySelector('.waypoint-health-card--unselected')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'on track' }));

    expect(container.querySelector('.waypoint-health-card--unselected')).not.toBeInTheDocument();
  });

  it('error message shown when invalid=true with unselected card, not when invalid=false', () => {
    const { rerender } = render(<WaypointHealthList {...healthProps} invalid={false} />);
    expect(screen.queryByText(/Rate your confidence/)).not.toBeInTheDocument();

    rerender(<WaypointHealthList {...healthProps} invalid={true} />);
    expect(screen.getByText(/Rate your confidence for each waypoint/)).toBeInTheDocument();
  });
});

// ── ReflectSection ────────────────────────────────────────────────────────────

describe('ReflectSection', () => {
  const baseReflectProps = {
    phase: 'reflecting' as const,
    onDone: vi.fn(),
    onEdit: vi.fn(),
  };

  it('Done reflecting blocked when goals unmarked', () => {
    const onDone = vi.fn();
    const { container } = render(<ReflectSection {...baseReflectProps} data={noWaypointData} onDone={onDone} />);

    // Fill notes but don't mark goals
    fireEvent.change(container.querySelector('.reflection-notes__textarea')!, { target: { value: 'Notes' } });
    fireEvent.click(screen.getByRole('button', { name: /Done reflecting/i }));

    expect(screen.getByText(/Mark every goal/)).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('Done reflecting blocked when notes empty', () => {
    const onDone = vi.fn();
    const { container } = render(<ReflectSection {...baseReflectProps} data={noWaypointData} onDone={onDone} />);

    // Mark all unmarked goals but leave notes empty
    Array.from(container.querySelectorAll('.past-goal-row--unmarked')).forEach((row) => {
      fireEvent.click(row.querySelector('.past-goal-row__toggle')!);
    });
    fireEvent.click(screen.getByRole('button', { name: /Done reflecting/i }));

    expect(screen.getByText(/Reflection notes are required/)).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('Done reflecting blocked when waypoint health not selected', () => {
    const onDone = vi.fn();
    const { container } = render(<ReflectSection {...baseReflectProps} data={weeklySessionData} onDone={onDone} />);

    // Mark all goals and fill notes, but skip health selection
    Array.from(container.querySelectorAll('.past-goal-row--unmarked')).forEach((row) => {
      fireEvent.click(row.querySelector('.past-goal-row__toggle')!);
    });
    fireEvent.change(container.querySelector('.reflection-notes__textarea')!, { target: { value: 'Notes' } });
    fireEvent.click(screen.getByRole('button', { name: /Done reflecting/i }));

    expect(screen.getByText(/Rate your confidence for each waypoint/)).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('Done reflecting succeeds when there are no waypoint health cards', () => {
    const onDone = vi.fn();
    const { container } = render(<ReflectSection {...baseReflectProps} data={noWaypointData} onDone={onDone} />);

    Array.from(container.querySelectorAll('.past-goal-row--unmarked')).forEach((row) => {
      fireEvent.click(row.querySelector('.past-goal-row__toggle')!);
    });
    fireEvent.change(container.querySelector('.reflection-notes__textarea')!, { target: { value: 'Notes' } });
    fireEvent.click(screen.getByRole('button', { name: /Done reflecting/i }));

    expect(onDone).toHaveBeenCalledWith([]);
  });

  it('Done reflecting succeeds when all goals marked, notes filled, health selected', () => {
    const onDone = vi.fn();
    const { container } = render(<ReflectSection {...baseReflectProps} data={weeklySessionData} onDone={onDone} />);

    Array.from(container.querySelectorAll('.past-goal-row--unmarked')).forEach((row) => {
      fireEvent.click(row.querySelector('.past-goal-row__toggle')!);
    });
    fireEvent.change(container.querySelector('.reflection-notes__textarea')!, { target: { value: 'Notes' } });
    fireEvent.click(screen.getByRole('button', { name: 'on track' }));
    fireEvent.click(screen.getByRole('button', { name: /Done reflecting/i }));

    // All remaining goals were marked hit, no misses
    expect(onDone).toHaveBeenCalledWith([]);
  });
});

// ── PlanSection ───────────────────────────────────────────────────────────────

describe('PlanSection', () => {
  const basePlanProps = {
    data: weeklySessionData,
    phase: 'planning' as const,
    missedGoals: [],
  };

  it('Set Plan calls onSave with Plan payload after adding a goal', () => {
    const onSave = vi.fn();
    const { container } = render(<PlanSection {...basePlanProps} onSave={onSave} />);

    // Add a goal to the Team section
    fireEvent.click(screen.getAllByText('+ Add goal')[0]);
    fireEvent.change(container.querySelector('.add-goal-form__input')!, { target: { value: 'Ship the thing' } });
    fireEvent.click(container.querySelector('.add-goal-form__submit')!);

    fireEvent.click(screen.getByRole('button', { name: 'Set Plan' }));

    expect(onSave).toHaveBeenCalledOnce();
    const req = onSave.mock.calls[0][0];
    expect(req.type).toBe('Plan');
    expect(req.goals).toHaveLength(1);
    expect(req.goals[0].text).toBe('Ship the thing');
    expect(req.focus.weights.reduce((sum: number, w: { weight: number }) => sum + w.weight, 0)).toBeCloseTo(1.0, 2);
  });

  it('No plan confirmation flow: confirm calls onSave with NoPlan payload', () => {
    const onSave = vi.fn();
    const { container } = render(<PlanSection {...basePlanProps} onSave={onSave} />);

    // No goals → "No plan for next week." button shown
    fireEvent.click(screen.getByText('No plan for next week.'));
    expect(container.querySelector('.no-plan-confirm')).toBeInTheDocument();
    expect(screen.queryByText('No plan for next week.')).not.toBeInTheDocument();

    fireEvent.change(container.querySelector('.no-plan-confirm__reason')!, { target: { value: 'On vacation' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm: no plan/i }));

    expect(onSave).toHaveBeenCalledWith({ type: 'NoPlan', reason: 'On vacation' });
  });

  it('No plan — Cancel dismisses confirmation panel', () => {
    const onSave = vi.fn();
    const { container } = render(<PlanSection {...basePlanProps} onSave={onSave} />);

    fireEvent.click(screen.getByText('No plan for next week.'));
    expect(container.querySelector('.no-plan-confirm')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(container.querySelector('.no-plan-confirm')).not.toBeInTheDocument();
    expect(screen.getByText('No plan for next week.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});

// ── WeeklyPlanning (phase transitions) ───────────────────────────────────────

describe('WeeklyPlanning', () => {
  it('Edit re-collapses planning section', () => {
    const { container } = render(<WeeklyPlanning data={weeklySessionData} onSave={vi.fn()} />);

    completeReflection(container);

    const planCollapse = screen.getByText('Plan this week').closest('.weekly-section')!.querySelector('.weekly-section__collapse')!;
    expect(planCollapse).toHaveClass('weekly-section__collapse--open');

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(planCollapse).not.toHaveClass('weekly-section__collapse--open');
  });

  it('plan data survives edit/re-complete cycle', () => {
    const { container } = render(<WeeklyPlanning data={weeklySessionData} onSave={vi.fn()} />);

    completeReflection(container);

    // Add a goal in planning
    fireEvent.click(screen.getAllByText('+ Add goal')[0]);
    fireEvent.change(container.querySelector('.add-goal-form__input')!, { target: { value: 'Persistent goal' } });
    fireEvent.click(container.querySelector('.add-goal-form__submit')!);
    expect(screen.getByText('Persistent goal')).toBeInTheDocument();

    // Edit → re-complete reflection
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: /Done reflecting/i }));

    // Goal survives
    expect(screen.getByText('Persistent goal')).toBeInTheDocument();
  });
});

// ── FocusSplitBar ─────────────────────────────────────────────────────────────

describe('FocusSplitBar', () => {
  it('drag updates weights that always sum to 100%', () => {
    const onChange = vi.fn();
    const { container } = render(
      <FocusSplitBar swimlanes={weeklySessionData.swimlanes} weights={weeklySessionData.prev_plan!.focus.weights} isEditable onChange={onChange} />,
    );

    const bar = container.querySelector('.focus-split-bar') as HTMLElement;
    const handle = container.querySelector('.focus-split-bar__handle') as HTMLElement;

    // Mock getBoundingClientRect so the drag math works in jsdom
    vi.spyOn(bar, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      width: 400,
      top: 0,
      height: 20,
      right: 400,
      bottom: 20,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    handle.setPointerCapture = vi.fn();

    // Start drag on the first divider (at 65%)
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 260 });

    // Move to 70% of the bar width
    handle.dispatchEvent(new PointerEvent('pointermove', { clientX: 280, bubbles: true }));
    handle.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    expect(onChange).toHaveBeenCalled();
    const weights: { weight: number }[] = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    const total = weights.reduce((sum, w) => sum + w.weight, 0);
    expect(total).toBeCloseTo(1.0, 2);
  });
});
