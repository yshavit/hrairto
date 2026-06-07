import type { QuarterlyGoal } from '../bindings'

// Greedy interval scheduling: pack side quests into horizontal strips.
// Two goals share a strip only if they are in different quarters.
export function packSideQuests(goals: QuarterlyGoal[]): QuarterlyGoal[][] {
    const sorted = [...goals].sort((a, b) =>
        a.due_year !== b.due_year ? a.due_year - b.due_year : a.due_quarter - b.due_quarter
    )

    const strips: QuarterlyGoal[][] = []
    for (const goal of sorted) {
        const available = strips.find(
            strip => !strip.some(g => g.due_quarter === goal.due_quarter && g.due_year === goal.due_year)
        )
        if (available) {
            available.push(goal)
        } else {
            strips.push([goal])
        }
    }
    return strips
}
