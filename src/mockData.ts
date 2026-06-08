import type {
  AnnualGoal,
  AnnualGoalId,
  Calendar,
  CalendarId,
  DistractionLabel,
  DistractionLabelId,
  Epoch,
  GoalTreeData,
  QuarterDisplay,
  QuarterlyGoal,
  QuarterlyGoalId,
  Swimlane,
  SwimlaneId,
  SwimlaneWeightPeriod,
  SwimlaneWeightPeriodId,
  SwimlanePlanningContext,
  Waypoint,
  WaypointId,
  WeeklyGoal,
  WeeklyGoalId,
  WeeklyPlan,
  WeeklyPlanId,
  WeeklyReflection,
  WeeklyReflectionId,
  WeeklySessionData,
} from './bindings';

function utc(year: number, month: number, day: number): Epoch {
  return Date.UTC(year, month - 1, day);
}

const CALENDAR_ID: CalendarId = '00000000-0000-0000-0000-000000000001';
const TEAM_ID: SwimlaneId = '00000000-0000-0000-0000-000000000010';
const PERSONAL_ID: SwimlaneId = '00000000-0000-0000-0000-000000000011';
const WEIGHT_PERIOD_ID: SwimlaneWeightPeriodId = '00000000-0000-0000-0000-000000000020';
const TEAM_ANNUAL_ID: AnnualGoalId = '00000000-0000-0000-0000-000000000030';
const TEAM_ANNUAL_2_ID: AnnualGoalId = '00000000-0000-0000-0000-000000000032';
const PERSONAL_ANNUAL_ID: AnnualGoalId = '00000000-0000-0000-0000-000000000031';
const QG_TEAM_Q1_ID: QuarterlyGoalId = '00000000-0000-0000-0000-000000000040';
const QG_PERSONAL_Q1_ID: QuarterlyGoalId = '00000000-0000-0000-0000-000000000041';
const QG_TEAM_Q2_ID: QuarterlyGoalId = '00000000-0000-0000-0000-000000000042';

const QG_TEAM_Q3_ID: QuarterlyGoalId = '00000000-0000-0000-0000-000000000044';
const QG_TEAM2_Q2_ID: QuarterlyGoalId = '00000000-0000-0000-0000-000000000045';
const QG_TEAM_SQ1_ID: QuarterlyGoalId = '00000000-0000-0000-0000-000000000046';
const QG_TEAM_SQ2_ID: QuarterlyGoalId = '00000000-0000-0000-0000-000000000047';

const W: (suffix: string) => WaypointId = (s) => `00000000-0000-0000-0000-0000000000${s}`;

const calendar: Calendar = {
  id: CALENDAR_ID,
  name: 'Standard',
  quarter_start_month: 1,
  timezone: 'UTC',
  locale: 'en-US',
};

const swimlanes: Swimlane[] = [
  { id: TEAM_ID, name: 'Team', color: '#378ADD' },
  { id: PERSONAL_ID, name: 'Personal', color: '#1D9E75' },
];

const current_weights: SwimlaneWeightPeriod = {
  id: WEIGHT_PERIOD_ID,
  start_at: utc(2026, 4, 1),
  note: null,
  entries: [
    { target: { type: 'Swimlane', id: TEAM_ID }, weight: 0.6 },
    { target: { type: 'Swimlane', id: PERSONAL_ID }, weight: 0.25 },
    { target: { type: 'Distractions' }, weight: 0.15 },
  ],
};

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
    id: TEAM_ANNUAL_2_ID,
    swimlane_id: TEAM_ID,
    due_quarter: 3,
    due_year: 2026,
    text: 'Build the team playbook',
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
];

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
  }));
}

function mixedWaypoints(quarterly_goal_id: QuarterlyGoalId, year: number, months: [number, number, number], idSuffixes: [string, string, string]): Waypoint[] {
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
  ];
}

const quarterly_goals: QuarterlyGoal[] = [
  // ── Team / goal 1 ─────────────────────────────────────────────────
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
    id: QG_TEAM_Q3_ID,
    swimlane_id: TEAM_ID,
    annual_goal: { type: 'MainQuest', id: TEAM_ANNUAL_ID },
    due_quarter: 3,
    due_year: 2026,
    text: 'Public launch',
    created_at: utc(2026, 6, 1),
    waypoints: [
      {
        id: W('70'),
        quarterly_goal_id: QG_TEAM_Q3_ID,
        target_month: 7,
        target_year: 2026,
        text: 'Launch blog post + landing page',
        completed_at: null,
      },
    ],
  },
  // ── Team / goal 2 (shorter deadline: Q3 2026) ─────────────────────
  {
    id: QG_TEAM2_Q2_ID,
    swimlane_id: TEAM_ID,
    annual_goal: { type: 'MainQuest', id: TEAM_ANNUAL_2_ID },
    due_quarter: 2,
    due_year: 2026,
    text: 'Define hiring criteria',
    created_at: utc(2026, 4, 2),
    waypoints: [
      {
        id: W('80'),
        quarterly_goal_id: QG_TEAM2_Q2_ID,
        target_month: 4,
        target_year: 2026,
        text: 'Draft job descriptions',
        completed_at: utc(2026, 4, 20),
      },
      {
        id: W('81'),
        quarterly_goal_id: QG_TEAM2_Q2_ID,
        target_month: 5,
        target_year: 2026,
        text: 'Align with exec on comp bands',
        completed_at: null,
      },
    ],
  },
  // ── Team / side quests (both in Q2 → two strips) ──────────────────
  {
    id: QG_TEAM_SQ1_ID,
    swimlane_id: TEAM_ID,
    annual_goal: { type: 'SideQuest' },
    due_quarter: 2,
    due_year: 2026,
    text: 'Set up deployment pipeline',
    created_at: utc(2026, 4, 1),
    waypoints: [
      {
        id: W('90'),
        quarterly_goal_id: QG_TEAM_SQ1_ID,
        target_month: 5,
        target_year: 2026,
        text: 'CI/CD for staging env',
        completed_at: null,
      },
    ],
  },
  {
    id: QG_TEAM_SQ2_ID,
    swimlane_id: TEAM_ID,
    annual_goal: { type: 'SideQuest' },
    due_quarter: 2,
    due_year: 2026,
    text: 'Migrate to monorepo',
    created_at: utc(2026, 4, 1),
    waypoints: [
      {
        id: W('91'),
        quarterly_goal_id: QG_TEAM_SQ2_ID,
        target_month: 4,
        target_year: 2026,
        text: 'Move repos + update CI',
        completed_at: null,
      },
    ],
  },
  // ── Personal / goal 1 ─────────────────────────────────────────────
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
];

const quarters_to_display: QuarterDisplay[] = [
  {
    quarter: 1,
    year: 2026,
    label: 'Q1 · Jan–Mar',
    start_at: utc(2026, 1, 1),
    end_at: utc(2026, 4, 1),
  },
  {
    quarter: 2,
    year: 2026,
    label: 'Q2 · Apr–Jun',
    start_at: utc(2026, 4, 1),
    end_at: utc(2026, 7, 1),
  },
  {
    quarter: 3,
    year: 2026,
    label: 'Q3 · Jul–Sep',
    start_at: utc(2026, 7, 1),
    end_at: utc(2026, 10, 1),
  },
  {
    quarter: 4,
    year: 2026,
    label: 'Q4 · Oct–Dec',
    start_at: utc(2026, 10, 1),
    end_at: utc(2027, 1, 1),
  },
  {
    quarter: 1,
    year: 2027,
    label: 'Q1 · Jan–Mar',
    start_at: utc(2027, 1, 1),
    end_at: utc(2027, 4, 1),
  },
];

export const mockData: GoalTreeData = {
  calendar,
  swimlanes,
  current_weights,
  annual_goals,
  quarterly_goals,
  quarters_to_display,
};

// ── Weekly session mock data ──────────────────────────────────────────────────

const PREV_WEEKLY_PLAN_ID: WeeklyPlanId = '00000000-0000-0000-0000-000000000100';
const WEEKLY_PLAN_ID: WeeklyPlanId = '00000000-0000-0000-0000-000000000102';
const WEEKLY_REFLECTION_ID: WeeklyReflectionId = '00000000-0000-0000-0000-000000000101';
const WG = (suffix: string): WeeklyGoalId => `00000000-0000-0000-0000-0000000001${suffix}`;
const LABEL_CUSTOMER_REQUEST: DistractionLabelId = '00000000-0000-0000-0000-000000000120';
const LABEL_BUG: DistractionLabelId = '00000000-0000-0000-0000-000000000121';

const distractionLabels: DistractionLabel[] = [
  { id: LABEL_CUSTOMER_REQUEST, text: 'customer request', created_at: utc(2026, 1, 1) },
  { id: LABEL_BUG, text: 'bug', created_at: utc(2026, 1, 1) },
];

// Past week: May 19–23. Planned 65% team / 25% personal / 10% distractions.
const prevWeeklyPlan: WeeklyPlan = {
  id: PREV_WEEKLY_PLAN_ID,
  start_at: utc(2026, 5, 19),
  end_at: utc(2026, 5, 24),
  focus: {
    weights: [
      { target: { type: 'Swimlane', id: TEAM_ID }, weight: 0.65 },
      { target: { type: 'Swimlane', id: PERSONAL_ID }, weight: 0.25 },
      { target: { type: 'Distractions' }, weight: 0.1 },
    ],
  },
};

// Coming week: May 26–30.
const weeklyPlan: WeeklyPlan = {
  id: WEEKLY_PLAN_ID,
  start_at: utc(2026, 5, 26),
  end_at: utc(2026, 5, 31),
  focus: {
    weights: [
      { target: { type: 'Swimlane', id: TEAM_ID }, weight: 0.65 },
      { target: { type: 'Swimlane', id: PERSONAL_ID }, weight: 0.25 },
      { target: { type: 'Distractions' }, weight: 0.1 },
    ],
  },
};

// Actual split was ~50% team / ~20% personal / ~30% distractions.
const weeklyReflection: WeeklyReflection = {
  id: WEEKLY_REFLECTION_ID,
  plan_id: PREV_WEEKLY_PLAN_ID,
  notes: 'Took more distraction hits than expected — the oncall incident ate most of Thursday. Need to protect deep work time.',
  completed_at: utc(2026, 5, 26),
  actual_split: {
    weights: [
      { target: { type: 'Swimlane', id: TEAM_ID }, weight: 0.5 },
      { target: { type: 'Swimlane', id: PERSONAL_ID }, weight: 0.2 },
      { target: { type: 'Distractions' }, weight: 0.3 },
    ],
  },
};

// Goals 1 was marked Hit during the week; 2–4 are unmarked going into reflection.
const pastGoals: WeeklyGoal[] = [
  {
    id: WG('10'),
    plan_id: PREV_WEEKLY_PLAN_ID,
    created_at: utc(2026, 5, 18),
    text: 'Review API performance',
    outcome: { type: 'Hit', at: utc(2026, 5, 21) },
    goal_ref: { type: 'Planned', swimlane_id: TEAM_ID, waypoint_id: W('61') },
  },
  {
    id: WG('11'),
    plan_id: PREV_WEEKLY_PLAN_ID,
    created_at: utc(2026, 5, 18),
    text: 'Draft closed beta invite flow',
    outcome: null,
    goal_ref: { type: 'Planned', swimlane_id: TEAM_ID, waypoint_id: null },
  },
  {
    id: WG('12'),
    plan_id: PREV_WEEKLY_PLAN_ID,
    created_at: utc(2026, 5, 18),
    text: 'Long run (10 km)',
    outcome: null,
    goal_ref: { type: 'Planned', swimlane_id: PERSONAL_ID, waypoint_id: null },
  },
  {
    id: WG('13'),
    plan_id: PREV_WEEKLY_PLAN_ID,
    created_at: utc(2026, 5, 18),
    text: 'Oncall incident postmortem',
    outcome: null,
    goal_ref: { type: 'Distraction', label_ids: [LABEL_CUSTOMER_REQUEST] },
  },
];

// Q2 2026 context: Team has an active quarterly goal; Personal has none this quarter.
const quarterContext: SwimlanePlanningContext[] = [
  {
    swimlane_id: TEAM_ID,
    quarter: quarters_to_display[1], // Q2 2026
    quarterly_goal: quarterly_goals[1], // QG_TEAM_Q2_ID "Launch closed beta"
  },
  {
    swimlane_id: PERSONAL_ID,
    quarter: quarters_to_display[1],
    quarterly_goal: null,
  },
];

export const weeklySessionData: WeeklySessionData = {
  plan: weeklyPlan,
  prev_plan: prevWeeklyPlan,
  reflection: weeklyReflection,
  past_goals: pastGoals,
  planned_goals: [],
  swimlanes,
  distraction_labels: distractionLabels,
  quarter_context: quarterContext,
};
