import { describe, it, expect } from 'vitest'
import { getMonthInfo, isCurrentQuarter } from './calendar'
import type { QuarterDisplay } from '../bindings'

describe('getMonthInfo', () => {
    it('returns the correct long month name', () => {
        expect(getMonthInfo(1, 2025, 'en-US').label).toBe('January')
        expect(getMonthInfo(5, 2025, 'en-US').label).toBe('May')
        expect(getMonthInfo(12, 2025, 'en-US').label).toBe('December')
    })

    it('passes through month and year unchanged', () => {
        const info = getMonthInfo(7, 2024, 'en-US')
        expect(info.month).toBe(7)
        expect(info.year).toBe(2024)
    })
})

describe('isCurrentQuarter', () => {
    it('returns true when now falls inside the quarter', () => {
        const now = Date.now()
        const q: QuarterDisplay = {
            quarter: 1, year: 2025, label: 'Q1 · Jan–Mar',
            start_at: now - 1000, end_at: now + 1000,
        }
        expect(isCurrentQuarter(q)).toBe(true)
    })

    it('returns false for a quarter entirely in the past', () => {
        const now = Date.now()
        const q: QuarterDisplay = {
            quarter: 4, year: 2024, label: 'Q4 · Oct–Dec',
            start_at: now - 20000, end_at: now - 10000,
        }
        expect(isCurrentQuarter(q)).toBe(false)
    })

    it('returns false for a quarter entirely in the future', () => {
        const now = Date.now()
        const q: QuarterDisplay = {
            quarter: 2, year: 2026, label: 'Q2 · Apr–Jun',
            start_at: now + 10000, end_at: now + 20000,
        }
        expect(isCurrentQuarter(q)).toBe(false)
    })
})
