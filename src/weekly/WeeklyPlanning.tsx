import type { WeeklySessionData } from '../bindings';
import './WeeklyPlanning.css';
import WeeklyHeader from './WeeklyHeader';

interface Props {
  data: WeeklySessionData;
}

export default function WeeklyPlanning({ data }: Props) {
  return (
    <div className="weekly-planning">
      <WeeklyHeader plan={data.plan} quarterContext={data.quarter_context} locale={data.calendar.locale} timezone={data.calendar.timezone} />
    </div>
  );
}
