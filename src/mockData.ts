import type {
    AnnualGoal,
    AnnualGoalId,
    Calendar,
    CalendarId,
    Epoch,
    GoalTreeData,
    QuarterDisplay,
    QuarterlyGoal,
    QuarterlyGoalId,
    Swimlane,
    SwimlaneId,
    SwimlaneWeightPeriod,
    SwimlaneWeightPeriodId,
    Waypoint,
    WaypointId,
} from './bindings'

function utc(year: number, month: number, day: number): Epoch {
    return Date.UTC(year, month - 1, day)
}

const CALENDAR_ID: CalendarId = '00000000-0000-0000-0000-000000000001'
const TEAM_ID: SwimlaneId = '00000000-0000-0000-0000-000000000010'
const PERSONAL_ID: SwimlaneId = '00000000-0000-0000-0000-000000000011'
const WEIGHT_PERIOD_ID: SwimlaneWeightPeriodId = '00000000-0000-0000-0000-000000000020'
const TEAM_ANNUAL_ID: AnnualGoalId = '00000000-0000-0000-0000-000000000030'
const PERSONAL_ANNUAL_ID: AnnualGoalId = '00000000-0000-0000-0000-000000000031'
const QG_TEAM_Q1_ID: QuarterlyGoalId = '00000000-0000-0000-0000-000000000040'
const QG_PERSONAL_Q1_ID: QuarterlyGoalId = '00000000-0000-0000-0000-000000000041'
const QG_TEAM_Q2_ID: QuarterlyGoalId = '00000000-0000-0000-0000-000000000042'
const QG_PERSONAL_Q2_ID: QuarterlyGoalId = '00000000-0000-0000-0000-000000000043'

const W: (suffix: string) => WaypointId = (s) => `00000000-0000-0000-0000-0000000000${s}`

const calendar: Calendar = {
    id: CALENDAR_ID,
    name: 'Standard',
    quarter_start_month: 1,
    timezone: 'UTC',
    locale: 'en-US',
}

const swimlanes: Swimlane[] = [
    { id: TEAM_ID, name: 'Team', color: '#378ADD' },
    { id: PERSONAL_ID, name: 'Personal', color: '#1D9E75' },
]

const current_weights: SwimlaneWeightPeriod = {
    id: WEIGHT_PERIOD_ID,
    start_at: utc(2026, 4, 1),
    note: null,
    entries: [
        { target: { type: 'Swimlane', id: TEAM_ID }, weight: 0.60 },
        { target: { type: 'Swimlane', id: PERSONAL_ID }, weight: 0.25 },
        { target: { type: 'Distractions' }, weight: 0.15 },
    ],
}

const annual_goals: AnnualGoal[] = [
    {
        id: TEAM_ANNUAL_ID,
        swimlane_id: TEAM_ID,
        due_quarter: 4,
        due_year: 2026,
        text: 'Ship the v1 product',
        created_at: utc(2025, 12, 15),
    },
    {
        id: PERSONAL_ANNUAL_ID,
        swimlane_id: PERSONAL_ID,
        due_quarter: 4,
        due_year: 2026,
        text: 'Run a half marathon',
        created_at: utc(2025, 12, 15),
    },
]

function completedWaypoints(
    quarterly_goal_id: QuarterlyGoalId,
    year: number,
    months: [number, number, number],
    idSuffixes: [string, string, string],
): Waypoint[] {
    return months.map((month, i) => ({
        id: W(idSuffixes[i]),
        quarterly_goal_id,
        target_month: month,
        target_year: year,
        text: `Month ${month} milestone`,
        completed_at: utc(year, month, 25),
    }))
}

function mixedWaypoints(
    quarterly_goal_id: QuarterlyGoalId,
    year: number,
    months: [number, number, number],
    idSuffixes: [string, string, string],
): Waypoint[] {
    return [
        {
            id: W(idSuffixes[0]),
            quarterly_goal_id,
            target_month: months[0],
            target_year: year,
            text: `Month ${months[0]} milestone`,
            completed_at: utc(year, months[0], 24),
        },
        {
            id: W(idSuffixes[1]),
            quarterly_goal_id,
            target_month: months[1],
            target_year: year,
            text: `Month ${months[1]} milestone`,
            completed_at: null,
        },
        {
            id: W(idSuffixes[2]),
            quarterly_goal_id,
            target_month: months[2],
            target_year: year,
            text: `Month ${months[2]} milestone`,
            completed_at: null,
        },
    ]
}

const quarterly_goals: QuarterlyGoal[] = [
    {
        id: QG_TEAM_Q1_ID,
        swimlane_id: TEAM_ID,
        annual_goal: { type: 'MainQuest', id: TEAM_ANNUAL_ID },
        due_quarter: 1,
        due_year: 2026,
        text: 'Finish backend API',
        created_at: utc(2026, 1, 3),
        waypoints: completedWaypoints(QG_TEAM_Q1_ID, 2026, [1, 2, 3], ['50', '51', '52']),
    },
    {
        id: QG_PERSONAL_Q1_ID,
        swimlane_id: PERSONAL_ID,
        annual_goal: { type: 'MainQuest', id: PERSONAL_ANNUAL_ID },
        due_quarter: 1,
        due_year: 2026,
        text: 'Build base mileage',
        created_at: utc(2026, 1, 3),
        waypoints: completedWaypoints(QG_PERSONAL_Q1_ID, 2026, [1, 2, 3], ['53', '54', '55']),
    },
    {
        id: QG_TEAM_Q2_ID,
        swimlane_id: TEAM_ID,
        annual_goal: { type: 'MainQuest', id: TEAM_ANNUAL_ID },
        due_quarter: 2,
        due_year: 2026,
        text: 'Launch closed beta',
        created_at: utc(2026, 4, 2),
        waypoints: mixedWaypoints(QG_TEAM_Q2_ID, 2026, [4, 5, 6], ['60', '61', '62']),
    },
    {
        id: QG_PERSONAL_Q2_ID,
        swimlane_id: PERSONAL_ID,
        annual_goal: { type: 'SideQuest' },
        due_quarter: 2,
        due_year: 2026,
        text: 'Read three books on product design',
        created_at: utc(2026, 4, 2),
        waypoints: mixedWaypoints(QG_PERSONAL_Q2_ID, 2026, [4, 5, 6], ['63', '64', '65']),
    },
]

const quarters_to_display: QuarterDisplay[] = [
    { quarter: 1, year: 2026, label: 'Q1 · Jan–Mar', start_at: utc(2026, 1, 1), end_at: utc(2026, 4, 1) },
    { quarter: 2, year: 2026, label: 'Q2 · Apr–Jun', start_at: utc(2026, 4, 1), end_at: utc(2026, 7, 1) },
    { quarter: 3, year: 2026, label: 'Q3 · Jul–Sep', start_at: utc(2026, 7, 1), end_at: utc(2026, 10, 1) },
    { quarter: 4, year: 2026, label: 'Q4 · Oct–Dec', start_at: utc(2026, 10, 1), end_at: utc(2027, 1, 1) },
]

export const mockData: GoalTreeData = {
    calendar,
    swimlanes,
    current_weights,
    annual_goals,
    quarterly_goals,
    quarters_to_display,
}
