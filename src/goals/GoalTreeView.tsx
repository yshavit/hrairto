import { useRef } from 'react';
import type { GoalTreeData } from '../bindings';
import { isCurrentQuarter } from '../utils/calendar';
import './GoalTree.css';
import GoalTreeHeader from './GoalTreeHeader';
import GoalTimeline, { type ScrollAPI } from './GoalTimeline';

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
        mainQuests={data.main_quests}
        concerns={data.concerns}
        onPrev={() => scrollApi.current?.prev()}
        onNext={() => scrollApi.current?.next()}
        onToday={() => scrollApi.current?.today()}
      />
      <GoalTimeline ref={scrollApi} data={data} />
    </div>
  );
}
