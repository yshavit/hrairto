import type { PointerEventHandler } from 'react'
import type { AnnualGoal, QuarterDisplay, QuarterlyGoal } from '../bindings'
import QuarterScroller from './QuarterScroller'

type Status = 'past' | 'active' | 'future'

interface Props {
    annualGoal: AnnualGoal
    quarters: QuarterDisplay[]
    goals: QuarterlyGoal[]
    statusMap: Map<string, Status>
    activeQuarterLabel: string
    scrollRef: (el: HTMLDivElement | null) => void
    innerRef: (el: HTMLDivElement | null) => void
    onScroll: () => void
    onPointerDown: PointerEventHandler<HTMLDivElement>
    locale: string
}

export default function GoalSubRow({
    annualGoal, quarters, goals, statusMap, activeQuarterLabel,
    scrollRef, innerRef, onScroll, onPointerDown, locale,
}: Props) {
    return (
        <div className="goal-sub-row">
            <div className="goal-sub-row__header">
                <span className="goal-sub-row__title">{annualGoal.text}</span>
                <span className="goal-sub-row__deadline">
                    by end of Q{annualGoal.due_quarter} {annualGoal.due_year}
                </span>
            </div>
            <QuarterScroller
                quarters={quarters}
                goals={goals}
                statusMap={statusMap}
                activeQuarterLabel={activeQuarterLabel}
                scrollRef={scrollRef}
                innerRef={innerRef}
                onScroll={onScroll}
                onPointerDown={onPointerDown}
                locale={locale}
            />
        </div>
    )
}
