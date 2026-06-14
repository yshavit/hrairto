import type {
  Calendar,
  CalendarId,
  Concern,
  ConcernId,
  DistractionLabel,
  DistractionLabelId,
  Epoch,
  GoalTreeData,
  MainQuest,
  MainQuestId,
  MiddayCheckinData,
  QuarterDisplay,
  QuarterlyGoal,
  QuarterlyGoalId,
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

const W = (suffix: string): WaypointId => `00000000-0000-0000-0000-0000000000${suffix}`;

function wp(suffix: string, text: string, completedAt: Epoch | null = null): Waypoint {
  return { id: W(suffix), text, completed_at: completedAt };
}

// ── IDs ───────────────────────────────────────────────────────────────────────

const CALENDAR_ID: CalendarId = '00000000-0000-0000-0000-000000000001';

const TEAM_ID: ConcernId = '00000000-0000-0000-0000-000000000010';
const PERSONAL_GROWTH_ID: ConcernId = '00000000-0000-0000-0000-000000000011';

const FOCUS_TARGET_ID = '00000000-0000-0000-0000-000000000020';

const FIZZBUZZ_ID: MainQuestId = '00000000-0000-0000-0000-000000000030';
const MONOLITH_ID: MainQuestId = '00000000-0000-0000-0000-000000000031';

const QG_FIZZBUZZ_Q2_ID: QuarterlyGoalId = '00000000-0000-0000-0000-000000000040';
const QG_FIZZBUZZ_Q3_ID: QuarterlyGoalId = '00000000-0000-0000-0000-000000000041';
const QG_FIZZBUZZ_Q4_ID: QuarterlyGoalId = '00000000-0000-0000-0000-000000000042';
const QG_MONOLITH_Q4_26_ID: QuarterlyGoalId = '00000000-0000-0000-0000-000000000043';
const QG_MONOLITH_Q1_27_ID: QuarterlyGoalId = '00000000-0000-0000-0000-000000000044';
const QG_API_V2_ID: QuarterlyGoalId = '00000000-0000-0000-0000-000000000045';
const QG_RUST_PORT_ID: QuarterlyGoalId = '00000000-0000-0000-0000-000000000046';
const QG_MENTEE_ID: QuarterlyGoalId = '00000000-0000-0000-0000-000000000047';
const QG_LEARN_RUST_ID: QuarterlyGoalId = '00000000-0000-0000-0000-000000000048';
const QG_GRAPHQL_ID: QuarterlyGoalId = '00000000-0000-0000-0000-000000000049';
const QG_CLI_ID: QuarterlyGoalId = '00000000-0000-0000-0000-000000000050';

// ── Calendar ──────────────────────────────────────────────────────────────────

const calendar: Calendar = {
  id: CALENDAR_ID,
  name: 'Standard',
  quarter_start_month: 1,
  timezone: 'UTC',
  locale: 'en-US',
};

// ── Concerns ──────────────────────────────────────────────────────────────────
// Two concerns: Team and Personal growth. Both are just labels/colours — no
// budget, no weight. Personal growth appears only in side quests.

const concerns: Concern[] = [
  { id: TEAM_ID, name: 'Team', color: '#378ADD' },
  { id: PERSONAL_GROWTH_ID, name: 'Personal growth', color: '#1D9E75' },
];

// ── Long-term focus weights ───────────────────────────────────────────────────
// Q2 2026: only FizzBuzz is active; the monolith doesn't start until Q4.
// Side-quests is a single pooled weight covering both concerns' side quests.

const current_weights = {
  id: FOCUS_TARGET_ID,
  start_at: utc(2026, 4, 1),
  note: null,
  entries: [
    { activity: { type: 'MainQuest' as const, id: FIZZBUZZ_ID }, weight: 0.55 },
    { activity: { type: 'SideQuests' as const }, weight: 0.3 },
    { activity: { type: 'Distractions' as const }, weight: 0.15 },
  ],
};

// ── Main quests ───────────────────────────────────────────────────────────────

const main_quests: MainQuest[] = [
  {
    id: FIZZBUZZ_ID,
    concern_id: TEAM_ID,
    due_quarter: 4,
    due_year: 2026,
    text: 'Ship FizzBuzz v1',
    created_at: utc(2026, 3, 15),
  },
  {
    id: MONOLITH_ID,
    concern_id: TEAM_ID,
    due_quarter: 4,
    due_year: 2027,
    text: 'Break apart the monolith',
    created_at: utc(2026, 3, 15),
  },
];

// ── Quarterly goals ───────────────────────────────────────────────────────────
// Waypoints indexed by month-of-quarter (slot 0 = first month).
// Count of Some slots = "stars" (size). Backlogged goals have no due_quarter/year.

const quarterly_goals: QuarterlyGoal[] = [
  // ── FizzBuzz: Q2 2026 (current quarter, 3★) ──────────────────────────────
  // Apr done, May done, Jun in progress.
  {
    id: QG_FIZZBUZZ_Q2_ID,
    parent: { type: 'MainQuest', id: FIZZBUZZ_ID },
    due_quarter: 2,
    due_year: 2026,
    text: 'Launch closed beta',
    created_at: utc(2026, 4, 2),
    waypoints: [
      wp('50', 'Design system architecture', utc(2026, 4, 25)),
      wp('51', 'Ship alpha to internal users', utc(2026, 5, 24)),
      wp('52', 'Closed beta sign-up flow'),
    ],
  },
  // ── FizzBuzz: Q3 2026 (2★) ───────────────────────────────────────────────
  {
    id: QG_FIZZBUZZ_Q3_ID,
    parent: { type: 'MainQuest', id: FIZZBUZZ_ID },
    due_quarter: 3,
    due_year: 2026,
    text: 'Private beta + onboarding',
    created_at: utc(2026, 4, 2),
    waypoints: [wp('53', 'Private beta launch'), wp('54', 'Onboard 10 beta users'), null],
  },
  // ── FizzBuzz: Q4 2026 (1★) ───────────────────────────────────────────────
  {
    id: QG_FIZZBUZZ_Q4_ID,
    parent: { type: 'MainQuest', id: FIZZBUZZ_ID },
    due_quarter: 4,
    due_year: 2026,
    text: 'Public v1 launch',
    created_at: utc(2026, 4, 2),
    waypoints: [wp('55', 'Public launch'), null, null],
  },
  // ── Monolith: Q4 2026 (2★) ───────────────────────────────────────────────
  // Overlaps with FizzBuzz wrapping up — the intentional crunch the mock demonstrates.
  {
    id: QG_MONOLITH_Q4_26_ID,
    parent: { type: 'MainQuest', id: MONOLITH_ID },
    due_quarter: 4,
    due_year: 2026,
    text: 'Map service boundaries',
    created_at: utc(2026, 4, 2),
    waypoints: [wp('56', 'Identify seam candidates'), wp('57', 'Extract first service skeleton'), null],
  },
  // ── Monolith: Q1 2027 (3★) ───────────────────────────────────────────────
  {
    id: QG_MONOLITH_Q1_27_ID,
    parent: { type: 'MainQuest', id: MONOLITH_ID },
    due_quarter: 1,
    due_year: 2027,
    text: 'First two services independent',
    created_at: utc(2026, 4, 2),
    waypoints: [wp('58', 'First service fully independent'), wp('59', 'Second service extracted'), wp('5a', 'Comms protocol settled')],
  },
  // ── Side quest: API v2 (Team, Q2 2026, 2★) ───────────────────────────────
  {
    id: QG_API_V2_ID,
    parent: { type: 'SideQuest', concern_id: TEAM_ID },
    due_quarter: 2,
    due_year: 2026,
    text: 'API v2',
    created_at: utc(2026, 4, 1),
    waypoints: [wp('60', 'Design API contracts', utc(2026, 4, 28)), wp('61', 'Implement + integration tests'), null],
  },
  // ── Side quest: Prototype: port service to Rust (Team, Q3 2026, 3★) ───────
  {
    id: QG_RUST_PORT_ID,
    parent: { type: 'SideQuest', concern_id: TEAM_ID },
    due_quarter: 3,
    due_year: 2026,
    text: 'Prototype: port service to Rust',
    created_at: utc(2026, 4, 1),
    waypoints: [wp('62', 'Port core service'), wp('63', 'Shadow traffic testing'), wp('64', 'Cut over')],
  },
  // ── Side quest: Take on one mentee (Personal growth, Q2 2026, 1★) ─────────
  // Done this quarter.
  {
    id: QG_MENTEE_ID,
    parent: { type: 'SideQuest', concern_id: PERSONAL_GROWTH_ID },
    due_quarter: 2,
    due_year: 2026,
    text: 'Take on one mentee',
    created_at: utc(2026, 4, 1),
    waypoints: [wp('65', 'Onboard + first 1-on-1s', utc(2026, 4, 30)), null, null],
  },
  // ── Side quest: Learn Rust (Personal growth, Q1 2027, 2★) ────────────────
  {
    id: QG_LEARN_RUST_ID,
    parent: { type: 'SideQuest', concern_id: PERSONAL_GROWTH_ID },
    due_quarter: 1,
    due_year: 2027,
    text: 'Learn Rust',
    created_at: utc(2026, 4, 1),
    waypoints: [wp('66', 'Complete rustlings + toy project'), wp('67', 'Contribute one PR to internal tooling'), null],
  },
  // ── Backlog: Evaluate a GraphQL gateway (Team, 2★) ───────────────────────
  {
    id: QG_GRAPHQL_ID,
    parent: { type: 'SideQuest', concern_id: TEAM_ID },
    due_quarter: null,
    due_year: null,
    text: 'Evaluate a GraphQL gateway',
    created_at: utc(2026, 4, 1),
    waypoints: [wp('68', 'Evaluate 3 gateway options'), wp('69', 'PoC with Auth service'), null],
  },
  // ── Backlog: Internal CLI tooling (Team, 1★) ─────────────────────────────
  {
    id: QG_CLI_ID,
    parent: { type: 'SideQuest', concern_id: TEAM_ID },
    due_quarter: null,
    due_year: null,
    text: 'Internal CLI tooling',
    created_at: utc(2026, 4, 1),
    waypoints: [wp('6a', 'Ship first-cut dev tools'), null, null],
  },
];

// ── Quarters to display ───────────────────────────────────────────────────────

const quarters_to_display: QuarterDisplay[] = [
  { quarter: 2, year: 2026, label: 'Q2 · Apr–Jun', start_at: utc(2026, 4, 1), end_at: utc(2026, 7, 1) },
  { quarter: 3, year: 2026, label: 'Q3 · Jul–Sep', start_at: utc(2026, 7, 1), end_at: utc(2026, 10, 1) },
  { quarter: 4, year: 2026, label: 'Q4 · Oct–Dec', start_at: utc(2026, 10, 1), end_at: utc(2027, 1, 1) },
  { quarter: 1, year: 2027, label: 'Q1 · Jan–Mar', start_at: utc(2027, 1, 1), end_at: utc(2027, 4, 1) },
];

export const mockData: GoalTreeData = {
  calendar,
  concerns,
  current_weights,
  main_quests,
  quarterly_goals,
  quarters_to_display,
};

// ── Weekly session mock data ──────────────────────────────────────────────────
// NOTE: redesigned in Stage 4 to use the Concern/MainQuest model.

const PREV_WEEKLY_PLAN_ID: WeeklyPlanId = '00000000-0000-0000-0000-000000000100';
const WEEKLY_PLAN_ID: WeeklyPlanId = '00000000-0000-0000-0000-000000000102';
const WEEKLY_REFLECTION_ID: WeeklyReflectionId = '00000000-0000-0000-0000-000000000101';
const WG = (suffix: string): WeeklyGoalId => `00000000-0000-0000-0000-0000000001${suffix}`;
const LABEL_CUSTOMER_REQUEST: DistractionLabelId = '00000000-0000-0000-0000-000000000120';
const LABEL_BUG: DistractionLabelId = '00000000-0000-0000-0000-000000000121';
const LABEL_SUPPORT_ROTATION: DistractionLabelId = '00000000-0000-0000-0000-000000000122';

const distractionLabels: DistractionLabel[] = [
  { id: LABEL_CUSTOMER_REQUEST, text: 'customer request', created_at: utc(2026, 1, 1) },
  { id: LABEL_BUG, text: 'bug', created_at: utc(2026, 1, 1) },
  { id: LABEL_SUPPORT_ROTATION, text: 'support rotation', created_at: utc(2026, 1, 1) },
];

// Past week: May 19–23.
const prevWeeklyPlan: WeeklyPlan = {
  id: PREV_WEEKLY_PLAN_ID,
  start_at: utc(2026, 5, 19),
  end_at: utc(2026, 5, 24),
  focus: {
    weights: [
      { activity: { type: 'MainQuest', id: FIZZBUZZ_ID }, weight: 0.6 },
      { activity: { type: 'SideQuests' }, weight: 0.25 },
      { activity: { type: 'Distractions' }, weight: 0.15 },
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
      { activity: { type: 'MainQuest', id: FIZZBUZZ_ID }, weight: 0.55 },
      { activity: { type: 'SideQuests' }, weight: 0.3 },
      { activity: { type: 'Distractions' }, weight: 0.15 },
    ],
  },
};

// Actual split: oncall incident ate most of Thursday.
const weeklyReflection: WeeklyReflection = {
  id: WEEKLY_REFLECTION_ID,
  plan_id: PREV_WEEKLY_PLAN_ID,
  notes: 'Took more distraction hits than expected — the oncall incident ate most of Thursday. Need to protect deep work time.',
  completed_at: utc(2026, 5, 26),
  actual_split: {
    weights: [
      { activity: { type: 'MainQuest', id: FIZZBUZZ_ID }, weight: 0.45 },
      { activity: { type: 'SideQuests' }, weight: 0.25 },
      { activity: { type: 'Distractions' }, weight: 0.3 },
    ],
  },
};

const pastGoals: WeeklyGoal[] = [
  {
    id: WG('10'),
    plan_id: PREV_WEEKLY_PLAN_ID,
    created_at: utc(2026, 5, 18),
    text: 'Review API performance',
    outcome: { type: 'Hit', at: utc(2026, 5, 21) },
    goal_ref: { type: 'Planned', concern_id: TEAM_ID, waypoint_id: W('61') },
  },
  {
    id: WG('11'),
    plan_id: PREV_WEEKLY_PLAN_ID,
    created_at: utc(2026, 5, 18),
    text: 'Draft closed beta invite flow',
    outcome: null,
    goal_ref: { type: 'Planned', concern_id: TEAM_ID, waypoint_id: null },
  },
  {
    id: WG('12'),
    plan_id: PREV_WEEKLY_PLAN_ID,
    created_at: utc(2026, 5, 18),
    text: 'Oncall incident postmortem',
    outcome: null,
    goal_ref: { type: 'Distraction', label_ids: [LABEL_CUSTOMER_REQUEST] },
  },
];

const upcomingQuarterlyGoals = quarterly_goals.filter((qg) => qg.waypoints.some((wp) => wp !== null && wp.completed_at === null));

// All Q2 2026 goals — includes completed ones for context display.
const currentQuarterGoals = quarterly_goals.filter((qg) => qg.due_quarter === 2 && qg.due_year === 2026);

export const weeklySessionData: WeeklySessionData = {
  calendar,
  current_quarter: quarters_to_display[0], // Q2 2026
  plan: weeklyPlan,
  prev_plan: prevWeeklyPlan,
  reflection: weeklyReflection,
  past_goals: pastGoals,
  planned_goals: [],
  concerns,
  main_quests,
  distraction_labels: distractionLabels,
  current_weights,
  current_quarter_goals: currentQuarterGoals,
  upcoming_quarterly_goals: upcomingQuarterlyGoals,
};

// ── Midday check-in mock data ─────────────────────────────────────────────────
// Monday May 26 at noon. Last check-in was 3.5 hrs ago (8:30 AM); next at 5:30 PM.
// 3 goals: one FizzBuzz planned, one API v2 side-quest planned, one distraction.

const MIDDAY_AT: Epoch = utc(2026, 5, 26) + 12 * 60 * 60 * 1000;

// Use hex suffixes a0–a2 to avoid collision with distraction label IDs (120–122).
const middayGoals: WeeklyGoal[] = [
  {
    id: WG('a0'),
    plan_id: WEEKLY_PLAN_ID,
    created_at: utc(2026, 5, 25),
    text: 'Wire up the closed beta sign-up flow',
    outcome: null,
    goal_ref: { type: 'Planned', concern_id: TEAM_ID, waypoint_id: W('52') },
  },
  {
    id: WG('a1'),
    plan_id: WEEKLY_PLAN_ID,
    created_at: utc(2026, 5, 25),
    text: 'Implement API v2 endpoints + integration tests',
    outcome: null,
    goal_ref: { type: 'Planned', concern_id: TEAM_ID, waypoint_id: W('61') },
  },
  {
    id: WG('a2'),
    plan_id: WEEKLY_PLAN_ID,
    created_at: utc(2026, 5, 25),
    text: 'Support rotation',
    outcome: null,
    goal_ref: { type: 'Distraction', label_ids: [LABEL_SUPPORT_ROTATION] },
  },
];

export const middayCheckinData: MiddayCheckinData = {
  calendar,
  checkin_at: MIDDAY_AT,
  last_checkin_at: MIDDAY_AT - 3.5 * 60 * 60 * 1000,
  next_checkin_at: MIDDAY_AT + 5.5 * 60 * 60 * 1000,
  todays_goals: middayGoals,
  concerns,
  main_quests,
  quarterly_goals: currentQuarterGoals,
  distraction_labels: distractionLabels,
  weekly_plan: weeklyPlan,
};
