import type { PointerEventHandler } from 'react';
import type { AnnualGoal, QuarterDisplay, QuarterlyGoal, Swimlane } from '../bindings';
import GoalSubRow from './GoalSubRow';
import SideQuestSection from './SideQuestSection';

type Status = 'past' | 'active' | 'future';

interface ScrollerProps {
  scrollRef: (el: HTMLDivElement | null) => void;
  innerRef: (el: HTMLDivElement | null) => void;
  onScroll: () => void;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
}

interface Props {
  swimlane: Swimlane;
  annualGoals: AnnualGoal[];
  annualGoalScrollers: ScrollerProps[];
  annualGoalQuarters: QuarterDisplay[][];
  mainQuestGoals: QuarterlyGoal[];
  packedSideQuestStrips: QuarterlyGoal[][];
  sideQuestScrollers: ScrollerProps[];
  allQuarters: QuarterDisplay[];
  statusMap: Map<string, Status>;
  activeQuarterLabel: string;
  locale: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function SwimlaneRow({
  swimlane,
  annualGoals,
  annualGoalScrollers,
  annualGoalQuarters,
  mainQuestGoals,
  packedSideQuestStrips,
  sideQuestScrollers,
  allQuarters,
  statusMap,
  activeQuarterLabel,
  locale,
}: Props) {
  return (
    <div
      className="swimlane-row"
      style={{
        '--swimlane-color': swimlane.color,
        '--swimlane-tint': hexToRgba(swimlane.color, 0.1),
      }}
    >
      <div className="swimlane-row__name">{swimlane.name}</div>
      {annualGoals.map((goal, i) => (
        <GoalSubRow
          key={goal.id}
          annualGoal={goal}
          quarters={annualGoalQuarters[i]}
          goals={mainQuestGoals.filter((g) => g.annual_goal.type === 'MainQuest' && g.annual_goal.id === goal.id)}
          statusMap={statusMap}
          activeQuarterLabel={activeQuarterLabel}
          scrollRef={annualGoalScrollers[i].scrollRef}
          innerRef={annualGoalScrollers[i].innerRef}
          onScroll={annualGoalScrollers[i].onScroll}
          onPointerDown={annualGoalScrollers[i].onPointerDown}
          locale={locale}
        />
      ))}
      {packedSideQuestStrips.length > 0 && (
        <SideQuestSection strips={packedSideQuestStrips} quarters={allQuarters} statusMap={statusMap} scrollers={sideQuestScrollers} locale={locale} />
      )}
    </div>
  );
}
