import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import type { PointerEventHandler } from 'react';
import type { GoalTreeData, QuarterDisplay, QuarterlyGoal } from '../bindings';
import { isCurrentQuarter } from '../utils/calendar';
import ActivityCard from './ActivityCard';

export const CARD_WIDTH = 220;
export const GAP = 10;
const STEP = CARD_WIDTH + GAP;

export interface ScrollAPI {
  prev(): void;
  next(): void;
  today(): void;
}

type Status = 'past' | 'active' | 'future';

interface Props {
  data: GoalTreeData;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function quarterKey(q: QuarterDisplay): string {
  return `${q.year}-${q.quarter}`;
}

const GoalTimeline = forwardRef<ScrollAPI, Props>(function GoalTimeline({ data }, ref) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const isAnimating = useRef(false);
  const isRubberAnimating = useRef(false);

  const quarters = data.quarters_to_display;
  const activeIdx = quarters.findIndex(isCurrentQuarter);

  const defaultTarget = useCallback((): number => {
    return activeIdx > 0 ? activeIdx * STEP - CARD_WIDTH * 0.1 : 0;
  }, [activeIdx]);

  function getHardMax(): number {
    const el = scrollerRef.current;
    return el ? Math.max(0, el.scrollWidth - el.clientWidth - STEP) : 0;
  }

  function animateTo(target: number, durationMs: number) {
    isAnimating.current = true;
    const el = scrollerRef.current;
    if (!el) return;
    const start = el.scrollLeft;
    const t0 = performance.now();
    const frame = (now: number) => {
      const t = Math.min((now - t0) / durationMs, 1);
      if (scrollerRef.current) scrollerRef.current.scrollLeft = start + (target - start) * easeOutCubic(t);
      if (t < 1) requestAnimationFrame(frame);
      else isAnimating.current = false;
    };
    requestAnimationFrame(frame);
  }

  function animateTransform(startOffset: number, durationMs: number) {
    isRubberAnimating.current = true;
    const t0 = performance.now();
    const frame = (now: number) => {
      if (!isRubberAnimating.current) return;
      const t = Math.min((now - t0) / durationMs, 1);
      const current = startOffset * (1 - easeOutCubic(t));
      if (innerRef.current) innerRef.current.style.transform = t < 1 ? `translateX(${-current}px)` : '';
      if (t < 1) requestAnimationFrame(frame);
      else isRubberAnimating.current = false;
    };
    requestAnimationFrame(frame);
  }

  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollLeft = defaultTarget();
  }, [activeIdx, defaultTarget]);

  useImperativeHandle(ref, () => ({
    prev() {
      const el = scrollerRef.current;
      if (!el) return;
      const currentQ = Math.round(el.scrollLeft / STEP);
      animateTo(Math.max(0, currentQ - 1) * STEP, 300);
    },
    next() {
      const el = scrollerRef.current;
      if (!el) return;
      const currentQ = Math.round(el.scrollLeft / STEP);
      animateTo(Math.min(getHardMax(), (currentQ + 1) * STEP), 300);
    },
    today() {
      animateTo(defaultTarget(), 300);
    },
  }));

  const handlePointerDown: PointerEventHandler<HTMLDivElement> = (e) => {
    if (e.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;

    const startX = e.clientX;
    const startScroll = el.scrollLeft;
    let dragging = false;
    let rubberOffset = 0;

    const onMove = (moveE: PointerEvent) => {
      const dx = moveE.clientX - startX;
      if (!dragging) {
        if (Math.abs(dx) < 4) return;
        dragging = true;
        isAnimating.current = false;
        isRubberAnimating.current = false;
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
      }
      const maxScroll = getHardMax();
      const rawScroll = startScroll - dx;

      if (rawScroll > maxScroll) {
        const over = rawScroll - maxScroll;
        rubberOffset = Math.min(over * 0.3, 90);
        if (scrollerRef.current) scrollerRef.current.scrollLeft = maxScroll;
        if (innerRef.current) innerRef.current.style.transform = `translateX(${-rubberOffset}px)`;
      } else {
        rubberOffset = 0;
        if (innerRef.current) innerRef.current.style.transform = '';
        if (scrollerRef.current) scrollerRef.current.scrollLeft = Math.max(0, rawScroll);
      }
    };

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      if (dragging) {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        if (rubberOffset > 0) animateTransform(rubberOffset, 350);
      }
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  };

  // Concern resolution
  const mainQuestById = new Map(data.main_quests.map((mq) => [mq.id, mq]));
  const concernById = new Map(data.concerns.map((c) => [c.id, c]));

  function goalConcernColor(goal: QuarterlyGoal): string {
    const concernId =
      goal.parent.type === 'MainQuest'
        ? mainQuestById.get(goal.parent.id)?.concern_id
        : goal.parent.concern_id;
    return concernId ? concernById.get(concernId)?.color ?? '#666' : '#666';
  }

  // Quarter status map
  const now = Date.now();
  const statusMap = new Map<string, Status>();
  for (const q of quarters) {
    if (isCurrentQuarter(q)) statusMap.set(quarterKey(q), 'active');
    else if (q.end_at <= now) statusMap.set(quarterKey(q), 'past');
    else statusMap.set(quarterKey(q), 'future');
  }

  // Main quest ordering: stable sort key so main quest chunks appear before side quests,
  // and main quests appear in the order they're listed in data.main_quests.
  const mqOrder = new Map(data.main_quests.map((mq, i) => [mq.id, i]));

  function goalsForQuarter(q: QuarterDisplay): QuarterlyGoal[] {
    const goals = data.quarterly_goals.filter(
      (g) => g.due_quarter === q.quarter && g.due_year === q.year,
    );
    return [...goals].sort((a, b) => {
      const aMain = a.parent.type === 'MainQuest';
      const bMain = b.parent.type === 'MainQuest';
      if (aMain !== bMain) return aMain ? -1 : 1;
      if (a.parent.type === 'MainQuest' && b.parent.type === 'MainQuest') {
        return (mqOrder.get(a.parent.id) ?? 999) - (mqOrder.get(b.parent.id) ?? 999);
      }
      return a.created_at - b.created_at;
    });
  }

  return (
    <div ref={scrollerRef} className="goal-timeline" onPointerDown={handlePointerDown}>
      <div ref={innerRef} className="goal-timeline__inner">
        {quarters.map((q) => {
          const key = quarterKey(q);
          const status = statusMap.get(key) ?? 'future';
          const goals = goalsForQuarter(q);
          return (
            <div key={key} className="quarter-column" data-status={status}>
              <div className="quarter-column__header">{q.label}</div>
              {goals.map((goal) => (
                <ActivityCard
                  key={goal.id}
                  goal={goal}
                  quarter={q}
                  concernColor={goalConcernColor(goal)}
                  status={status}
                  locale={data.calendar.locale}
                />
              ))}
              {goals.length === 0 && <div className="quarter-column__empty">—</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default GoalTimeline;
