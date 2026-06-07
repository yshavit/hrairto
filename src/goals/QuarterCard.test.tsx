import {render, screen} from '@testing-library/react'
import {describe, expect, it} from 'vitest'
import QuarterCard from './QuarterCard'
import type {QuarterDisplay, QuarterlyGoal} from '../bindings'

const quarter: QuarterDisplay = {
    quarter: 2,
    year: 2026,
    label: 'Q2 · Apr–Jun',
    start_at: Date.UTC(2026, 3, 1),
    end_at: Date.UTC(2026, 6, 1),
}

const goal: QuarterlyGoal = {
    id: 'goal-1',
    swimlane_id: 'lane-1',
    annual_goal: {type: 'SideQuest'},
    due_quarter: 2,
    due_year: 2026,
    text: 'Launch closed beta',
    created_at: Date.UTC(2026, 3, 1),
    waypoints: [],
}

const baseProps = {
    quarter,
    activeQuarterLabel: 'Q2 · Apr–Jun',
    isSideQuest: false,
    locale: 'en-US',
}

describe('QuarterCard', () => {
    it('past: data-status and badge', () => {
        const {container} = render(
            <QuarterCard {...baseProps} goal={goal} status="past"/>
        )
        expect(container.firstChild).toHaveAttribute('data-status', 'past')
        expect(screen.getByText('done')).toBeInTheDocument()
    })

    it('active: data-status and badge', () => {
        const {container} = render(
            <QuarterCard {...baseProps} goal={goal} status="active"/>
        )
        expect(container.firstChild).toHaveAttribute('data-status', 'active')
        expect(screen.getByText('active')).toBeInTheDocument()
    })

    it('future with goal: renders goal text', () => {
        render(<QuarterCard {...baseProps} goal={goal} status="future"/>)
        expect(screen.getByText('future')).toBeInTheDocument()
        expect(screen.getByText('Launch closed beta')).toBeInTheDocument()
    })

    it('future with no goal: renders placeholder, no goal text', () => {
        render(<QuarterCard {...baseProps} goal={null} status="future"/>)
        expect(screen.getByText(/Plan during/)).toBeInTheDocument()
        expect(screen.queryByText('Launch closed beta')).not.toBeInTheDocument()
    })

    it('isSideQuest=true: shows side quest badge', () => {
        render(<QuarterCard {...baseProps} goal={goal} status="future" isSideQuest={true}/>)
        expect(screen.getByText('side quest')).toBeInTheDocument()
    })

    it('isSideQuest=false: no side quest badge', () => {
        render(<QuarterCard {...baseProps} goal={goal} status="future" isSideQuest={false}/>)
        expect(screen.queryByText('side quest')).not.toBeInTheDocument()
    })
})
