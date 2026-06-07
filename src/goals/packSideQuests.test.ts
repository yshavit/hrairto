import { describe, expect, it } from 'vitest'
import { packSideQuests } from './packSideQuests'
import type { QuarterlyGoal } from '../bindings'

function side_quest(due_quarter: number, due_year: number, id: string): QuarterlyGoal {
    return {
        id,
        swimlane_id: 'lane-1',
        annual_goal: { type: 'SideQuest' },
        due_quarter,
        due_year,
        text: id,
        created_at: 0,
        waypoints: [],
    }
}

describe('packSideQuests', () => {
    it('empty input returns empty output', () => {
        expect(packSideQuests([])).toEqual([])
    })

    it('single goal goes into one strip', () => {
        const result = packSideQuests([side_quest(2, 2026, 'a')])
        expect(result).toHaveLength(1)
        expect(result[0]).toHaveLength(1)
    })

    it('goals in different quarters share one strip', () => {
        const result = packSideQuests([side_quest(2, 2026, 'a'), side_quest(3, 2026, 'b')])
        expect(result).toHaveLength(1)
        expect(result[0]).toHaveLength(2)
    })

    it('goals in the same quarter go into separate strips', () => {
        const result = packSideQuests([side_quest(2, 2026, 'a'), side_quest(2, 2026, 'b')])
        expect(result).toHaveLength(2)
        expect(result[0]).toHaveLength(1)
        expect(result[1]).toHaveLength(1)
    })

    it('three goals: two same quarter + one different packs into two strips', () => {
        // a(Q2) and c(Q3) share strip 1; b(Q2) goes to strip 2
        const result = packSideQuests([side_quest(2, 2026, 'a'), side_quest(2, 2026, 'b'), side_quest(3, 2026, 'c')])
        expect(result).toHaveLength(2)
        expect(result[0].map(g => g.id)).toEqual(['a', 'c'])
        expect(result[1].map(g => g.id)).toEqual(['b'])
    })

    it('same quarter number but different years are treated as distinct', () => {
        const result = packSideQuests([side_quest(2, 2026, 'a'), side_quest(2, 2027, 'b')])
        expect(result).toHaveLength(1)
        expect(result[0]).toHaveLength(2)
    })
})
