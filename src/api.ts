import type { GoalTreeData } from './bindings'
import { mockData } from './mockData'

export async function getGoalTreeData(): Promise<GoalTreeData> {
    return mockData
}
