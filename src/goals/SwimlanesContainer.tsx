import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { PointerEventHandler } from 'react'
import type { AnnualGoal, QuarterDisplay, QuarterlyGoal, Swimlane } from '../bindings'
import { isCurrentQuarter } from '../utils/calendar'
import { packSideQuests } from './packSideQuests'
import SwimlaneRow from './SwimlaneRow'

export const CARD_WIDTH = 220
export const GAP = 10
const STEP = CARD_WIDTH + GAP

interface Props {
    swimlanes: Swimlane[]
    annualGoals: AnnualGoal[]
    quarterlyGoals: QuarterlyGoal[]
    quarters: QuarterDisplay[]
    locale: string
}

export interface ScrollAPI {
    prev(): void
    next(): void
    today(): void
}

function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3)
}

function quarterKey(q: QuarterDisplay) {
    return `${q.year}-${q.quarter}`
}

// Returns the global quarters array trimmed to the goal's deadline + 1 peek card.
function trimQuartersForGoal(goal: AnnualGoal, quarters: QuarterDisplay[]): QuarterDisplay[] {
    const deadlineIdx = quarters.findIndex(
        q => q.quarter === goal.due_quarter && q.year === goal.due_year
    )
    if (deadlineIdx === -1) return quarters
    return quarters.slice(0, deadlineIdx + 2)
}

const SwimlanesContainer = forwardRef<ScrollAPI, Props>(function SwimlanesContainer(
    { swimlanes, annualGoals, quarterlyGoals, quarters, locale },
    ref,
) {
    const scrollerRefs = useRef<(HTMLDivElement | null)[]>([])
    const innerRefs = useRef<(HTMLDivElement | null)[]>([])
    const isSyncing = useRef(false)
    const isAnimating = useRef(false)
    const isRubberAnimating = useRef(false)

    const activeIdx = quarters.findIndex(isCurrentQuarter)

    function defaultTarget(): number {
        return activeIdx > 0 ? activeIdx * STEP - CARD_WIDTH * 0.1 : 0
    }

    // Rubber-band wall = position where the longest strip's last planned card is fully visible.
    function getHardMax(): number {
        return scrollerRefs.current.reduce((max, el) => {
            if (!el) return max
            return Math.max(max, Math.max(0, el.scrollWidth - el.clientWidth - STEP))
        }, 0)
    }

    function animateAll(targetScroll: number, durationMs: number) {
        isAnimating.current = true
        const startScroll = scrollerRefs.current.find(Boolean)?.scrollLeft ?? 0
        const t0 = performance.now()
        const frame = (now: number) => {
            const t = Math.min((now - t0) / durationMs, 1)
            const pos = startScroll + (targetScroll - startScroll) * easeOutCubic(t)
            scrollerRefs.current.forEach(el => { if (el) el.scrollLeft = pos })
            if (t < 1) {
                requestAnimationFrame(frame)
            } else {
                isAnimating.current = false
            }
        }
        requestAnimationFrame(frame)
    }

    useEffect(() => {
        const target = defaultTarget()
        scrollerRefs.current.forEach(el => { if (el) el.scrollLeft = target })
    }, [activeIdx])

    const handleScroll = (sourceIdx: number) => {
        if (isAnimating.current) return
        const source = scrollerRefs.current[sourceIdx]
        if (!source || isSyncing.current) return
        isSyncing.current = true
        scrollerRefs.current.forEach((el, i) => {
            if (i !== sourceIdx && el) el.scrollLeft = source.scrollLeft
        })
        requestAnimationFrame(() => { isSyncing.current = false })
    }

    function animateTransform(startOffset: number, durationMs: number) {
        isRubberAnimating.current = true
        const t0 = performance.now()
        const frame = (now: number) => {
            if (!isRubberAnimating.current) return
            const t = Math.min((now - t0) / durationMs, 1)
            const current = startOffset * (1 - easeOutCubic(t))
            innerRefs.current.forEach(r => {
                if (r) r.style.transform = t < 1 ? `translateX(${-current}px)` : ''
            })
            if (t < 1) requestAnimationFrame(frame)
            else isRubberAnimating.current = false
        }
        requestAnimationFrame(frame)
    }

    function makeDragHandler(sourceIdx: number): PointerEventHandler<HTMLDivElement> {
        return (e) => {
            if (e.button !== 0) return
            const el = scrollerRefs.current[sourceIdx]
            if (!el) return

            const startX = e.clientX
            const startScroll = el.scrollLeft
            let dragging = false
            let rubberOffset = 0

            const onMove = (moveE: PointerEvent) => {
                const dx = moveE.clientX - startX
                if (!dragging) {
                    if (Math.abs(dx) < 4) return
                    dragging = true
                    isAnimating.current = false
                    isRubberAnimating.current = false
                    document.body.style.cursor = 'grabbing'
                    document.body.style.userSelect = 'none'
                }
                const maxScroll = getHardMax()
                const rawScroll = startScroll - dx

                if (rawScroll > maxScroll) {
                    const over = rawScroll - maxScroll
                    rubberOffset = Math.min(over * 0.3, 90)
                    isSyncing.current = true
                    scrollerRefs.current.forEach(r => { if (r) r.scrollLeft = maxScroll })
                    innerRefs.current.forEach(r => { if (r) r.style.transform = `translateX(${-rubberOffset}px)` })
                    requestAnimationFrame(() => { isSyncing.current = false })
                } else {
                    rubberOffset = 0
                    innerRefs.current.forEach(r => { if (r) r.style.transform = '' })
                    isSyncing.current = true
                    scrollerRefs.current.forEach(r => { if (r) r.scrollLeft = Math.max(0, rawScroll) })
                    requestAnimationFrame(() => { isSyncing.current = false })
                }
            }

            const onUp = () => {
                document.removeEventListener('pointermove', onMove)
                document.removeEventListener('pointerup', onUp)
                document.removeEventListener('pointercancel', onUp)
                if (dragging) {
                    document.body.style.cursor = ''
                    document.body.style.userSelect = ''
                    if (rubberOffset > 0) animateTransform(rubberOffset, 350)
                }
            }

            document.addEventListener('pointermove', onMove)
            document.addEventListener('pointerup', onUp)
            document.addEventListener('pointercancel', onUp)
        }
    }

    useImperativeHandle(ref, () => ({
        prev() {
            const current = scrollerRefs.current.find(Boolean)?.scrollLeft ?? 0
            const currentQ = Math.round(current / STEP)
            animateAll(Math.max(0, currentQ - 1) * STEP, 300)
        },
        next() {
            const el = scrollerRefs.current.find(Boolean)
            if (!el) return
            const currentQ = Math.round(el.scrollLeft / STEP)
            const hardMax = getHardMax()
            animateAll(Math.min(hardMax, (currentQ + 1) * STEP), 300)
        },
        today() {
            animateAll(defaultTarget(), 300)
        },
    }))

    const now = Date.now()
    const statusMap = new Map<string, 'past' | 'active' | 'future'>()
    for (const q of quarters) {
        const key = quarterKey(q)
        if (isCurrentQuarter(q)) statusMap.set(key, 'active')
        else if (q.end_at <= now) statusMap.set(key, 'past')
        else statusMap.set(key, 'future')
    }

    const activeQuarterLabel = quarters.find(isCurrentQuarter)?.label ?? ''

    // Pre-compute per-swimlane layout: assign a flat integer index to every scroller
    // (annual goal strips first, then side quest strips) across all swimlanes.
    let scrollerIdx = 0
    const swimlaneLayouts = swimlanes.map(swimlane => {
        const swimlaneAnnualGoals = annualGoals.filter(g => g.swimlane_id === swimlane.id)
        const mainQuestGoals = quarterlyGoals.filter(
            g => g.swimlane_id === swimlane.id && g.annual_goal.type === 'MainQuest'
        )
        const sideQuestGoals = quarterlyGoals.filter(
            g => g.swimlane_id === swimlane.id && g.annual_goal.type === 'SideQuest'
        )
        const packed = packSideQuests(sideQuestGoals)
        const annualGoalIndices = swimlaneAnnualGoals.map(() => scrollerIdx++)
        const sideQuestIndices = packed.map(() => scrollerIdx++)
        return { swimlane, swimlaneAnnualGoals, mainQuestGoals, packed, annualGoalIndices, sideQuestIndices }
    })

    function makeScrollerProps(idx: number) {
        return {
            scrollRef: (el: HTMLDivElement | null) => { scrollerRefs.current[idx] = el },
            innerRef: (el: HTMLDivElement | null) => { innerRefs.current[idx] = el },
            onScroll: () => handleScroll(idx),
            onPointerDown: makeDragHandler(idx),
        }
    }

    return (
        <div className="swimlanes-container">
            {swimlaneLayouts.map(({ swimlane, swimlaneAnnualGoals, mainQuestGoals, packed, annualGoalIndices, sideQuestIndices }) => (
                <SwimlaneRow
                    key={swimlane.id}
                    swimlane={swimlane}
                    annualGoals={swimlaneAnnualGoals}
                    annualGoalScrollers={annualGoalIndices.map(makeScrollerProps)}
                    annualGoalQuarters={swimlaneAnnualGoals.map(g => trimQuartersForGoal(g, quarters))}
                    mainQuestGoals={mainQuestGoals}
                    packedSideQuestStrips={packed}
                    sideQuestScrollers={sideQuestIndices.map(makeScrollerProps)}
                    allQuarters={quarters}
                    statusMap={statusMap}
                    activeQuarterLabel={activeQuarterLabel}
                    locale={locale}
                />
            ))}
        </div>
    )
})

export default SwimlanesContainer
