import { useState } from 'react';
import type { WeeklyGoal, WeeklySessionData } from '../bindings';
import './WeeklyPlanning.css';
import WeeklyHeader from './WeeklyHeader';
import ReflectSection from './ReflectSection';
import PlanSection from './PlanSection';

interface Props {
  data: WeeklySessionData;
}

export default function WeeklyPlanning({ data }: Props) {
  const [phase, setPhase] = useState<'reflecting' | 'planning'>('reflecting');
  const [missedGoals, setMissedGoals] = useState<WeeklyGoal[]>([]);

  return (
    <div className="weekly-planning">
      <WeeklyHeader plan={data.plan} quarterContext={data.quarter_context} locale={data.calendar.locale} timezone={data.calendar.timezone} />
      <div className="weekly-planning__body">
        <ReflectSection
          data={data}
          phase={phase}
          onDone={(missed) => {
            setMissedGoals(missed);
            setPhase('planning');
          }}
          onEdit={() => setPhase('reflecting')}
        />
        <PlanSection data={data} phase={phase} missedGoals={missedGoals} />
      </div>
    </div>
  );
}
