import { useState } from 'react';
import type { WeeklySessionData } from '../bindings';
import './WeeklyPlanning.css';
import WeeklyHeader from './WeeklyHeader';
import TimeSplitBars from './TimeSplitBars';
import PastGoalsList from './PastGoalsList';
import WaypointHealthList from './WaypointHealthList';
import ReflectionNotes from './ReflectionNotes';

interface Props {
  data: WeeklySessionData;
}

export default function WeeklyPlanning({ data }: Props) {
  const [notes, setNotes] = useState('');

  const initialMissedCount = data.past_goals.filter((g) => g.outcome?.type === 'Miss').length;
  const initialAllHit = data.past_goals.length > 0 && data.past_goals.every((g) => g.outcome?.type === 'Hit');

  return (
    <div className="weekly-planning">
      <WeeklyHeader plan={data.plan} quarterContext={data.quarter_context} locale={data.calendar.locale} timezone={data.calendar.timezone} />
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <TimeSplitBars
          prevPlan={data.prev_plan ?? null}
          reflection={data.reflection ?? null}
          swimlanes={data.swimlanes}
          pastGoals={data.past_goals}
          distractionLabels={data.distraction_labels}
        />
        <PastGoalsList goals={data.past_goals} swimlanes={data.swimlanes} quarterContext={data.quarter_context} distractionLabels={data.distraction_labels} />
        <WaypointHealthList swimlanes={data.swimlanes} quarterContext={data.quarter_context} locale={data.calendar.locale} />
        <ReflectionNotes
          missedCount={initialMissedCount}
          allHit={initialAllHit}
          prevPlan={data.prev_plan ?? null}
          reflection={data.reflection ?? null}
          pastGoals={data.past_goals}
          distractionLabels={data.distraction_labels}
          invalid={false}
          value={notes}
          onChange={setNotes}
        />
      </div>
    </div>
  );
}
