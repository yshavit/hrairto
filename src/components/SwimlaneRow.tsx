import type { PointerEventHandler } from 'react'
import type { AnnualGoal, QuarterDisplay, QuarterlyGoal, Swimlane } from '../bindings'
import QuarterScroller from './QuarterScroller'

type Status = 'past' | 'active' | 'future'

interface Props {
    swimlane: Swimlane
    annualGoal: AnnualGoal | undefined
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

function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function SwimlaneRow({
    swimlane, annualGoal, quarters, goals, statusMap, activeQuarterLabel, scrollRef, innerRef, onScroll, onPointerDown, locale,
}: Props) {
    return (
        <div
            className="swimlane-row"
            style={{
                '--swimlane-color': swimlane.color,
                '--swimlane-tint': hexToRgba(swimlane.color, 0.1),
            }}
        >
            <div className="swimlane-row__header">
                <div className="swimlane-row__name">{swimlane.name}</div>
                {annualGoal && (
                    <div className="swimlane-row__goal">{annualGoal.text}</div>
                )}
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