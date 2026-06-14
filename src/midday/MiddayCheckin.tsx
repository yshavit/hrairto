import { useLayoutEffect, useState } from 'react';

function formatElapsed(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  const hrs = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (min === 0) return `~${hrs} hrs`;
  if (min === 30) return `~${hrs}.5 hrs`;
  return `~${hrs}h ${min}m`;
}
import type { MiddayCheckinData, MiddayCheckinResult } from '../bindings';
import './MiddayCheckin.css';
import MiddayHeader from './MiddayHeader';
import TodaysGoals, { type LocalOutcome } from './TodaysGoals';
import TimeSplitBar from './TimeSplitBar';
import SaveSnoozeButton from './SaveSnoozeButton';

interface Props {
  data: MiddayCheckinData;
  onSave: (result: MiddayCheckinResult) => void;
  onReady?: () => void;
}

export default function MiddayCheckin({ data, onSave, onReady }: Props) {
  const segCount = data.todays_goals.length + 1;
  const [outcomes, setOutcomes] = useState<Map<string, LocalOutcome>>(new Map());
  const [weights, setWeights] = useState<number[]>(() => Array(segCount).fill(1 / segCount));
  const [note, setNote] = useState('');

  useLayoutEffect(() => { onReady?.(); }, []);

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
          <div className="midday-time-split-header">
            <p className="midday-zone-label">
              Time split
              <span className="midday-zone-bullet">•</span><span className="midday-zone-hint">Drag handles to adjust</span>
            </p>
            {data.last_checkin_at !== null && (
              <span className="time-split-bar__elapsed">
                {formatElapsed(data.checkin_at - data.last_checkin_at)}
              </span>
            )}
          </div>
          <TimeSplitBar
            goals={data.todays_goals}
            concerns={data.concerns}
            weights={weights}
            onChange={setWeights}
          />
        </section>

        <section className="midday-zone">
          <textarea
            className="midday-note-field"
            placeholder="Anything worth noting about the morning?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </section>

        <SaveSnoozeButton
          onDone={handleSave}
          nextCheckinAt={data.next_checkin_at}
          locale={data.calendar.locale}
          timezone={data.calendar.timezone}
        />
      </div>
    </div>
  );
}
