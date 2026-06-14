import { useState } from 'react';
import type { MiddayCheckinData, MiddayCheckinResult } from '../bindings';
import './MiddayCheckin.css';
import MiddayHeader from './MiddayHeader';
import TodaysGoals, { type LocalOutcome } from './TodaysGoals';
import TimeSplitBar from './TimeSplitBar';

interface Props {
  data: MiddayCheckinData;
  onSave: (result: MiddayCheckinResult) => void;
}

export default function MiddayCheckin({ data, onSave }: Props) {
  const segCount = data.todays_goals.length + 1;
  const [outcomes, setOutcomes] = useState<Map<string, LocalOutcome>>(new Map());
  const [weights, setWeights] = useState<number[]>(() => Array(segCount).fill(1 / segCount));
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  function toggleOutcome(id: string) {
    setOutcomes((prev) => {
      const next = new Map(prev);
      const cur = next.get(id);
      next.set(id, cur === 'hit' ? 'miss' : 'hit');
      return next;
    });
  }

  function handleSave() {
    const now = Date.now();
    const result: MiddayCheckinResult = {
      checkin_at: data.checkin_at,
      last_checkin_at: data.last_checkin_at,
      goal_outcomes: [...outcomes.entries()].map(([goal_id, outcome]) => ({
        goal_id,
        outcome: outcome === 'hit' ? { type: 'Hit', at: now } : { type: 'Miss', at: now },
      })),
      time_split: {
        goal_weights: data.todays_goals.map((goal, i) => ({
          goal_id: goal.id,
          weight: weights[i],
        })),
        distraction_weight: weights[data.todays_goals.length],
      },
      note: note.trim() || null,
    };
    console.log('Midday check-in saved:', result);
    onSave(result);
    setSaved(true);
  }

  return (
    <div className="midday-checkin">
      <MiddayHeader
        lastCheckinAt={data.last_checkin_at}
        nextCheckinAt={data.next_checkin_at}
        locale={data.calendar.locale}
        timezone={data.calendar.timezone}
      />
      <div className="midday-checkin__body">
        <section className="midday-zone">
          <p className="midday-zone-label">Today's goals</p>
          <TodaysGoals
            goals={data.todays_goals}
            outcomes={outcomes}
            onToggle={toggleOutcome}
            concerns={data.concerns}
            quarterlyGoals={data.quarterly_goals}
            distractionLabels={data.distraction_labels}
          />
        </section>

        <section className="midday-zone">
          <p className="midday-zone-label">Time split</p>
          <TimeSplitBar
            goals={data.todays_goals}
            concerns={data.concerns}
            weights={weights}
            onChange={setWeights}
            checkinAt={data.checkin_at}
            lastCheckinAt={data.last_checkin_at}
          />
        </section>

        <section className="midday-zone">
          <label className="midday-note-label">
            Note <span className="midday-note-label__optional">(optional)</span>
          </label>
          <textarea
            className="midday-note-field"
            placeholder="Anything worth noting about the morning?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </section>

        <button
          className={`midday-save-btn${saved ? ' midday-save-btn--saved' : ''}`}
          onClick={handleSave}
          disabled={saved}
        >
          {saved ? 'Saved. Good work!' : 'Done — back to work'}
        </button>
      </div>
    </div>
  );
}
