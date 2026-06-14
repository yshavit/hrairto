import { useState } from 'react';
import type { Concern, DistractionLabel, QuarterlyGoal, WeeklyGoal, WeeklyGoalId } from '../bindings';

export type LocalOutcome = 'hit' | 'miss';

interface GoalRowProps {
  goal: WeeklyGoal;
  outcome: LocalOutcome | undefined;
  onToggle: (id: WeeklyGoalId) => void;
  concerns: Concern[];
  quarterlyGoals: QuarterlyGoal[];
  distractionLabels: DistractionLabel[];
}

function OutcomeIcon({ outcome }: { outcome: LocalOutcome | undefined }) {
  if (outcome === 'hit') {
    return (
      <svg className="midday-goal-toggle-icon" width="20" height="20" viewBox="0 0 20 20">
        <rect rx="4" width="20" height="20" fill="#EAF3DE" />
        <path d="M5 10.5l3.5 3.5 6.5-7" stroke="#3B6D11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }
  if (outcome === 'miss') {
    return (
      <svg className="midday-goal-toggle-icon" width="20" height="20" viewBox="0 0 20 20">
        <rect rx="4" width="20" height="20" fill="#FCEBEB" />
        <path d="M6.5 6.5l7 7M13.5 6.5l-7 7" stroke="#A32D2D" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    );
  }
  return (
    <svg className="midday-goal-toggle-icon" width="20" height="20" viewBox="0 0 20 20">
      <rect rx="4" width="20" height="20" fill="none" stroke="#555" strokeWidth="1.5" />
    </svg>
  );
}

function GoalRow({ goal, outcome, onToggle, concerns, quarterlyGoals, distractionLabels }: GoalRowProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  let detailText: string | null = null;
  const ref = goal.goal_ref;

  if (ref.type === 'Planned') {
    const concern = concerns.find((c) => c.id === ref.concern_id);
    const concernName = concern?.name ?? 'Unknown';

    if (ref.waypoint_id) {
      for (const qg of quarterlyGoals) {
        const wp = qg.waypoints.find((w) => w !== null && w.id === ref.waypoint_id);
        if (wp) {
          detailText = `${concernName} · ${qg.text} · ${wp.text}`;
          break;
        }
      }
      if (!detailText) detailText = concernName;
    } else {
      detailText = concernName;
    }
  } else {
    const labelNames = ref.label_ids
      .map((id) => distractionLabels.find((l) => l.id === id)?.text)
      .filter(Boolean)
      .join(', ');
    detailText = labelNames || 'Distraction';
  }

  return (
    <li className="midday-goal-row">
      <div className="midday-goal-row__main">
        <button className="midday-goal-row__toggle" onClick={() => onToggle(goal.id)} aria-label="Toggle outcome">
          <OutcomeIcon outcome={outcome} />
        </button>
        <span className={`midday-goal-row__text${outcome === 'hit' ? ' midday-goal-row__text--hit' : ''}`}>
          {goal.text}
        </span>
        <button
          className={`midday-goal-row__info-btn${detailOpen ? ' midday-goal-row__info-btn--open' : ''}`}
          onClick={() => setDetailOpen((o) => !o)}
          aria-label="Toggle detail"
          aria-expanded={detailOpen}
        >
          ⓘ
        </button>
      </div>
      {detailOpen && <div className="midday-goal-row__detail">{detailText}</div>}
    </li>
  );
}

interface Props {
  goals: WeeklyGoal[];
  outcomes: Map<WeeklyGoalId, LocalOutcome>;
  onToggle: (id: WeeklyGoalId) => void;
  concerns: Concern[];
  quarterlyGoals: QuarterlyGoal[];
  distractionLabels: DistractionLabel[];
}

export default function TodaysGoals({ goals, outcomes, onToggle, concerns, quarterlyGoals, distractionLabels }: Props) {
  return (
    <ul className="midday-goals-list">
      {goals.map((goal) => (
        <GoalRow
          key={goal.id}
          goal={goal}
          outcome={outcomes.get(goal.id)}
          onToggle={onToggle}
          concerns={concerns}
          quarterlyGoals={quarterlyGoals}
          distractionLabels={distractionLabels}
        />
      ))}
    </ul>
  );
}
