import type { PointerEventHandler } from 'react'
import type { QuarterDisplay, QuarterlyGoal } from '../bindings'
import QuarterCard from './QuarterCard'

type Status = 'past' | 'active' | 'future'

interface Props {
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

function quarterKey(q: QuarterDisplay) {
    return `${q.year}-${q.quarter}`
}

function findGoal(goals: QuarterlyGoal[], q: QuarterDisplay): QuarterlyGoal | null {
    return goals.find(g => g.due_year === q.year && g.due_quarter === q.quarter) ?? null
}

export default function QuarterScroller({
    quarters, goals, statusMap, activeQuarterLabel, scrollRef, innerRef, onScroll, onPointerDown, locale,
}: Props) {
    return (
        <div ref={scrollRef} className="quarter-scroller" onScroll={onScroll} onPointerDown={onPointerDown}>
            <div ref={innerRef} className="quarter-scroller__inner">
                {quarters.map(q => (
                    <QuarterCard
                        key={quarterKey(q)}
                        quarter={q}
                        goal={findGoal(goals, q)}
                        status={statusMap.get(quarterKey(q)) ?? 'future'}
                        activeQuarterLabel={activeQuarterLabel}
                        locale={locale}
                    />
                ))}
            </div>
        </div>
    )
}