import { useRef } from 'react';
import type { GoalTreeData } from '../bindings';
import { isCurrentQuarter } from '../utils/calendar';
import './GoalTree.css';
import GoalTreeHeader from './GoalTreeHeader';
import SwimlanesContainer, { type ScrollAPI } from './SwimlanesContainer';

interface Props {
  data: GoalTreeData;
}

export default function GoalTreeView({ data }: Props) {
  const scrollApi = useRef<ScrollAPI>(null);

  const currentQuarterLabel = data.quarters_to_display.find(isCurrentQuarter)?.label ?? '';

  return (
    <div className="goal-tree">
      <GoalTreeHeader
        currentQuarterLabel={currentQuarterLabel}
        entries={data.current_weights.entries}
        swimlanes={data.swimlanes}
        onPrev={() => scrollApi.current?.prev()}
        onNext={() => scrollApi.current?.next()}
        onToday={() => scrollApi.current?.today()}
      />
      <SwimlanesContainer
        ref={scrollApi}
        swimlanes={data.swimlanes}
        annualGoals={data.annual_goals}
        quarterlyGoals={data.quarterly_goals}
        quarters={data.quarters_to_display}
        locale={data.calendar.locale}
      />
    </div>
  );
}
