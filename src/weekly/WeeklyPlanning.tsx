import type { WeeklySessionData } from '../bindings';
import './WeeklyPlanning.css';
import WeeklyHeader from './WeeklyHeader';
import TimeSplitBars from './TimeSplitBars';

interface Props {
  data: WeeklySessionData;
}

export default function WeeklyPlanning({ data }: Props) {
  return (
    <div className="weekly-planning">
      <WeeklyHeader plan={data.plan} quarterContext={data.quarter_context} locale={data.calendar.locale} timezone={data.calendar.timezone} />
      <div style={{ padding: '20px' }}>
        <TimeSplitBars
          prevPlan={data.prev_plan ?? null}
          reflection={data.reflection ?? null}
          swimlanes={data.swimlanes}
          pastGoals={data.past_goals}
          distractionLabels={data.distraction_labels}
        />
      </div>
    </div>
  );
}
