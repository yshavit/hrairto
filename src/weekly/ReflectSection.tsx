import { useState } from 'react';
import type { WeeklyGoal, WeeklyGoalId, WeeklySessionData } from '../bindings';
import { type LocalOutcome, initialOutcome, nextOutcome } from './PastGoalsList';
import TimeSplitBars from './TimeSplitBars';
import PastGoalsList from './PastGoalsList';
import WaypointHealthList from './WaypointHealthList';
import ReflectionNotes from './ReflectionNotes';

interface Props {
  data: WeeklySessionData;
  phase: 'reflecting' | 'planning';
  onDone: (missedGoals: WeeklyGoal[]) => void;
  onEdit: () => void;
}

function RefreshIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M12 7.5A4.5 4.5 0 1 1 9.5 3.5" stroke="#888" strokeWidth="1.5" strokeLinecap="round" />
      <polyline points="9,1.5 11.5,3.5 9,5.5" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ReflectSection({ data, phase, onDone, onEdit }: Props) {
  const [outcomes, setOutcomes] = useState<Map<WeeklyGoalId, LocalOutcome>>(() => new Map(data.past_goals.map((g) => [g.id, initialOutcome(g)])));
  const [notes, setNotes] = useState('');
  const [notesInvalid, setNotesInvalid] = useState(false);
  const [goalsInvalid, setGoalsInvalid] = useState(false);
  function toggle(id: WeeklyGoalId) {
    setOutcomes((prev) => new Map(prev).set(id, nextOutcome(prev.get(id) ?? 'unmarked')));
    setGoalsInvalid(false);
  }

  const hitCount = [...outcomes.values()].filter((o) => o === 'hit').length;
  const missedCount = [...outcomes.values()].filter((o) => o === 'miss').length;
  const unmarkedCount = [...outcomes.values()].filter((o) => o === 'unmarked').length;
  const allHit = hitCount === data.past_goals.length && data.past_goals.length > 0;

  function handleDone() {
    const hasUnmarked = unmarkedCount > 0;
    const hasNotes = notes.trim().length > 0;
    setGoalsInvalid(hasUnmarked);
    setNotesInvalid(!hasNotes);
    if (!hasUnmarked && hasNotes) {
      const missed = data.past_goals.filter((g) => outcomes.get(g.id) === 'miss');
      onDone(missed);
    }
  }

  const isReflecting = phase === 'reflecting';

  return (
    <section className="weekly-section">
      <div className="weekly-section-header">
        <div className="weekly-section-header__left">
          <RefreshIcon />
          <span className="weekly-section-header__title">Reflect on past week</span>
        </div>
        <div className="weekly-section-header__right">
          {isReflecting ? (
            <span className="weekly-section-header__status">In progress</span>
          ) : (
            <>
              <span className="weekly-section-header__status weekly-section-header__status--done">Done</span>
              <button className="weekly-section-header__edit-btn" onClick={onEdit}>
                Edit
              </button>
            </>
          )}
        </div>
      </div>

      <div className={`weekly-section__collapse${isReflecting ? ' weekly-section__collapse--open' : ''}`}>
        <div className="weekly-section__collapse-inner">
          <div className="weekly-section__body">
            <p className="weekly-step-label">How did the week go?</p>
            <PastGoalsList
              goals={data.past_goals}
              outcomes={outcomes}
              onToggle={toggle}
              swimlanes={data.swimlanes}
              quarterContext={data.quarter_context}
              distractionLabels={data.distraction_labels}
            />
            {goalsInvalid && <p className="weekly-validation-error">Mark every goal as hit or missed before continuing.</p>}

            <p className="weekly-step-label">Time split</p>
            <TimeSplitBars
              prevPlan={data.prev_plan ?? null}
              reflection={data.reflection ?? null}
              swimlanes={data.swimlanes}
              pastGoals={data.past_goals}
              distractionLabels={data.distraction_labels}
            />

            <p className="weekly-step-label">Quarterly waypoint health</p>
            <WaypointHealthList swimlanes={data.swimlanes} quarterContext={data.quarter_context} locale={data.calendar.locale} />

            <p className="weekly-step-label">Reflection</p>
            <ReflectionNotes
              missedCount={missedCount}
              allHit={allHit}
              prevPlan={data.prev_plan ?? null}
              reflection={data.reflection ?? null}
              pastGoals={data.past_goals}
              distractionLabels={data.distraction_labels}
              invalid={notesInvalid}
              value={notes}
              onChange={(v) => {
                setNotes(v);
                setNotesInvalid(false);
              }}
            />

            <button className="reflect-done-btn" onClick={handleDone}>
              Done reflecting — start planning
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
