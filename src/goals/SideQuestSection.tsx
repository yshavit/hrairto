import type { PointerEventHandler } from 'react';
import type { QuarterDisplay, QuarterlyGoal } from '../bindings';
import QuarterCard from './QuarterCard';

// CARD_WIDTH mirrors the constant in SwimlanesContainer and the CSS width on .quarter-card.
const CARD_WIDTH = 220;

type Status = 'past' | 'active' | 'future';

function quarterKey(q: QuarterDisplay) {
  return `${q.year}-${q.quarter}`;
}

interface StripProps {
  goals: QuarterlyGoal[];
  quarters: QuarterDisplay[];
  statusMap: Map<string, Status>;
  scrollRef: (el: HTMLDivElement | null) => void;
  innerRef: (el: HTMLDivElement | null) => void;
  onScroll: () => void;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  locale: string;
}

function SideQuestStrip({ goals, quarters, statusMap, scrollRef, innerRef, onScroll, onPointerDown, locale }: StripProps) {
  return (
    <div ref={scrollRef} className="quarter-scroller" onScroll={onScroll} onPointerDown={onPointerDown}>
      <div ref={innerRef} className="quarter-scroller__inner">
        {quarters.map((q) => {
          const goal = goals.find((g) => g.due_quarter === q.quarter && g.due_year === q.year);
          if (!goal) {
            return <div key={quarterKey(q)} style={{ width: CARD_WIDTH, flexShrink: 0 }} />;
          }
          return (
            <QuarterCard
              key={quarterKey(q)}
              quarter={q}
              goal={goal}
              status={statusMap.get(quarterKey(q)) ?? 'future'}
              activeQuarterLabel=""
              isSideQuest={true}
              locale={locale}
            />
          );
        })}
      </div>
    </div>
  );
}

interface ScrollerProps {
  scrollRef: (el: HTMLDivElement | null) => void;
  innerRef: (el: HTMLDivElement | null) => void;
  onScroll: () => void;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
}

interface SectionProps {
  strips: QuarterlyGoal[][];
  quarters: QuarterDisplay[];
  statusMap: Map<string, Status>;
  scrollers: ScrollerProps[];
  locale: string;
}

export default function SideQuestSection({ strips, quarters, statusMap, scrollers, locale }: SectionProps) {
  return (
    <div className="side-quest-section">
      <div className="side-quest-section__header">Intentional side quests</div>
      {strips.map((strip, i) => (
        <SideQuestStrip
          key={i}
          goals={strip}
          quarters={quarters}
          statusMap={statusMap}
          scrollRef={scrollers[i].scrollRef}
          innerRef={scrollers[i].innerRef}
          onScroll={scrollers[i].onScroll}
          onPointerDown={scrollers[i].onPointerDown}
          locale={locale}
        />
      ))}
    </div>
  );
}
