import type { DistractionLabel, Swimlane, SwimlanePlanningContext, WeeklyGoal, WeeklyGoalId } from '../bindings';

interface Props {
  goals: WeeklyGoal[];
  outcomes: Map<WeeklyGoalId, LocalOutcome>;
  onToggle: (id: WeeklyGoalId) => void;
  swimlanes: Swimlane[];
  quarterContext: SwimlanePlanningContext[];
  distractionLabels: DistractionLabel[];
}

export type LocalOutcome = 'unmarked' | 'hit' | 'miss';

export function initialOutcome(goal: WeeklyGoal): LocalOutcome {
  if (!goal.outcome) return 'unmarked';
  return goal.outcome.type === 'Hit' ? 'hit' : 'miss';
}

export function nextOutcome(current: LocalOutcome): LocalOutcome {
  if (current === 'unmarked') return 'hit';
  if (current === 'hit') return 'miss';
  return 'hit';
}

const DISTRACTIONS_COLOR = '#B4B2A9';

interface GoalMeta {
  chipLabel: string;
  chipColor: string;
  detail: string | null;
}

function goalMeta(goal: WeeklyGoal, swimlanes: Swimlane[], quarterContext: SwimlanePlanningContext[], distractionLabels: DistractionLabel[]): GoalMeta {
  const ref = goal.goal_ref;
  if (ref.type === 'Planned') {
    const sw = swimlanes.find((s) => s.id === ref.swimlane_id);
    let detail: string | null = null;
    if (ref.waypoint_id) {
      for (const ctx of quarterContext) {
        const wp = ctx.quarterly_goal?.waypoints.find((w) => w.id === ref.waypoint_id);
        if (wp) {
          detail = wp.text;
          break;
        }
      }
    }
    return { chipLabel: sw?.name ?? 'Unknown', chipColor: sw?.color ?? '#666', detail };
  }
  const labelNames =
    ref.label_ids
      .map((id) => distractionLabels.find((l) => l.id === id)?.text)
      .filter(Boolean)
      .join(', ') || null;
  return { chipLabel: 'Distraction', chipColor: DISTRACTIONS_COLOR, detail: labelNames };
}

function OutcomeIcon({ outcome }: { outcome: LocalOutcome }) {
  if (outcome === 'hit') {
    return (
      <svg className="goal-toggle-icon" width="20" height="20" viewBox="0 0 20 20">
        <rect rx="4" width="20" height="20" fill="#EAF3DE" />
        <path d="M5 10.5l3.5 3.5 6.5-7" stroke="#3B6D11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }
  if (outcome === 'miss') {
    return (
      <svg className="goal-toggle-icon" width="20" height="20" viewBox="0 0 20 20">
        <rect rx="4" width="20" height="20" fill="#FCEBEB" />
        <path d="M6.5 6.5l7 7M13.5 6.5l-7 7" stroke="#A32D2D" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    );
  }
  return (
    <svg className="goal-toggle-icon" width="20" height="20" viewBox="0 0 20 20">
      <rect rx="4" width="20" height="20" fill="none" stroke="#555" strokeWidth="1.5" />
    </svg>
  );
}

export default function PastGoalsList({ goals, outcomes, onToggle, swimlanes, quarterContext, distractionLabels }: Props) {
  const hitCount = [...outcomes.values()].filter((o) => o === 'hit').length;
  const missCount = [...outcomes.values()].filter((o) => o === 'miss').length;
  const unmarkedCount = goals.length - hitCount - missCount;

  return (
    <div className="past-goals-list">
      <div className="past-goals-list__stats">
        <div className="past-goals-stat">
          <span className="past-goals-stat__label">Goals set</span>
          <span className="past-goals-stat__value">{goals.length}</span>
        </div>
        <div className="past-goals-stat">
          <span className="past-goals-stat__label">Hit</span>
          <span className="past-goals-stat__value past-goals-stat__value--hit">{hitCount}</span>
        </div>
        <div className="past-goals-stat">
          <span className="past-goals-stat__label">Missed</span>
          <span className="past-goals-stat__value past-goals-stat__value--miss">{missCount}</span>
        </div>
        {unmarkedCount > 0 && (
          <div className="past-goals-stat">
            <span className="past-goals-stat__label">Unmarked</span>
            <span className="past-goals-stat__value past-goals-stat__value--unmarked">{unmarkedCount}</span>
          </div>
        )}
      </div>

      <ul className="past-goals-list__goals">
        {goals.map((goal) => {
          const outcome = outcomes.get(goal.id) ?? 'unmarked';
          const meta = goalMeta(goal, swimlanes, quarterContext, distractionLabels);
          return (
            <li key={goal.id} className="past-goal-row">
              <button className="past-goal-row__toggle" onClick={() => onToggle(goal.id)} aria-label="Toggle outcome">
                <OutcomeIcon outcome={outcome} />
              </button>
              <span className="past-goal-row__chip" style={{ '--chip-color': meta.chipColor } as React.CSSProperties}>
                {meta.chipLabel}
              </span>
              <span className={`past-goal-row__text${outcome === 'hit' ? ' past-goal-row__text--hit' : ''}`}>{goal.text}</span>
              {meta.detail && <span className="past-goal-row__detail">{meta.detail}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
