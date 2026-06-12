# Hrairto — Goal Tree View

## Overview

A read-only view showing the full goal hierarchy across quarters. This is the
"north star" reference view — open it to orient yourself, not to do work.

**Status: fully implemented** (Phase 1, with hardcoded mock data).

---

## Key files

| What                     | Where                                            |
| ------------------------ | ------------------------------------------------ |
| Data model structs       | `src-tauri/src/models.rs`                        |
| Fiscal calendar math     | `src-tauri/src/calendar.rs`                      |
| TypeScript bindings      | `src/bindings.ts` (generated — do not hand-edit) |
| Mock data (Phase 1)      | `src/mockData.ts`                                |
| Calendar display helpers | `src/utils/calendar.ts`                          |
| React entry point        | `src/goals/YearlyGoals.tsx`                      |
| All goal-tree components | `src/goals/`                                     |
| Styles                   | `src/goals/GoalTree.css`                         |

---

## Data model

Source of truth: `src-tauri/src/models.rs`. Key design decisions not obvious from struct names:

- **`Epoch`**: all timestamps are `Epoch(i64)` — milliseconds UTC, not seconds.
  Milliseconds so JavaScript's `Date.now()` and `Intl.DateTimeFormat` work without
  ×1000 conversion.
- **Typed IDs**: `ConcernId`, `MainQuestId`, `QuarterlyGoalId`, etc. are newtypes
  wrapping `Uuid`. They serialize as plain strings (`#[serde(transparent)]`), so
  TypeScript sees them as `string` but Rust prevents mixing them up.
- **Two orthogonal axes**:
  - **Activity** (`Activity` enum): the allocation unit. `MainQuest(MainQuestId)` |
    `SideQuests` | `Distractions`. Each active main quest has its own weight; side
    quests share one pooled weight; distractions have one pooled weight.
  - **Concern** (`Concern` struct): a grouping/colour label for forward-motion work.
    Carries no weight, deadline, or cascade — purely organisational.
- **`ParentGoal`**: `QuarterlyGoal.parent` is either `MainQuest { id: MainQuestId }` or
  `SideQuest { concern_id: ConcernId }`. Both variants are struct-style to support
  `#[serde(tag = "type")]` internally-tagged serialisation.
  Wire format: `{ type: "MainQuest"; id: string } | { type: "SideQuest"; concern_id: string }`.
- **Waypoints**: `QuarterlyGoal.waypoints` is `[Option<Waypoint>; 3]` — a fixed-length
  tuple indexed by month-of-quarter (0 = first month). Month and year are derived from
  the slot index plus the goal's `due_quarter` / `due_year`. TypeScript type:
  `[(Waypoint | null), (Waypoint | null), (Waypoint | null)]`.
- **Backlog**: goals with `due_quarter: None, due_year: None` are unscheduled. They do
  not appear in any quarter column.
- **`GoalTreeData`**: the full payload, including `quarters_to_display: Vec<QuarterDisplay>`
  computed by the backend at invocation time. The frontend never does fiscal-calendar math.

---

## Calendar math

All in `src-tauri/src/calendar.rs`. Key public functions:

- `quarter_for_timestamp(Epoch, &Calendar) → Result<QuarterDisplay, String>`
- `quarter_info(quarter, fiscal_year, &Calendar) → Result<QuarterDisplay, String>`
- `quarters_to_display(&Calendar, now: Epoch, past_count, future_count) → Result<Vec<QuarterDisplay>, String>`

The TypeScript layer receives `QuarterDisplay` values ready to render. `src/utils/calendar.ts`
contains only display helpers: `isCurrentQuarter` (compares `Date.now()` to the quarter
interval) and `getMonthInfo` (formats a month name via `Intl.DateTimeFormat`).

---

## Component hierarchy

All components live under `src/goals/`. The window entry point is `src/goals-main.tsx`,
which renders `YearlyGoals`.

```
YearlyGoals             — fetches data via api.ts, wraps in ErrorBoundary
  GoalTreeView          — owns ScrollAPI ref bridging header nav ↔ GoalTimeline
    GoalTreeHeader      — title, nav buttons, current quarter label, donut chart
      WeightDisplay     — SVG donut for activity weight split (MainQuest per concern, side quests, distractions)
    GoalTimeline        — single horizontally-scrolling timeline; rubber-band; exposes ScrollAPI via forwardRef
      [per quarter]     — one .quarter-column div per quarter in quarters_to_display
        ActivityCard    — one per quarterly goal in that quarter; left border = concern color
          WaypointList  — fixed-tuple waypoints; month label derived from slot + quarter
```

Layout is **time × load**: one column per quarter, forward-motion activities stack
vertically. Block height grows naturally with waypoint count (1–3 slots rendered).
Concern color appears on the card's left border, not as swimlane bands.
Distractions are not rendered in the timeline (no spatial representation).

`GoalTimeline` computes concern colors by resolving `ParentGoal`:
- `MainQuest { id }` → look up `MainQuest.concern_id` → look up `Concern.color`
- `SideQuest { concern_id }` → look up `Concern.color` directly

---

## Scroll behavior

Canonical source: `src/goals/GoalTimeline.tsx`. Non-obvious decisions:

- **Peek quarter**: `quarters_to_display` always ends with one extra quarter beyond
  the planning horizon — visible only via rubber-band drag, unreachable via nav buttons.
  The rubber-band wall and the Next button cap are both derived from the same
  `hardMax` value so they stay in sync.
- **Rubber-band overshoot** is applied via CSS `translateX` on `.goal-timeline__inner`,
  not via `scrollLeft`. This lets the browser manage the true scroll boundary
  while the visual stretch is purely cosmetic.
- **Single scroller**: unlike the old swimlane design, there is one scroll container for
  the entire timeline. No per-row sync is needed.

---

## Testing

- **RTL unit tests** (`pnpm test`): `src/goals/ActivityCard.test.tsx`,
  `src/shared/WaypointList.test.tsx`, `src/utils/`.
- **Playwright e2e** (`pnpm test:e2e`): nav cap, rubber-band. Entry point:
  `ui-test-entrypoints/goals.html`.
  Viewport is 900×680. With 4 × 220px columns the timeline fits without scrolling,
  so rubber-band triggers at `scrollLeft = 0` (hardMax = 0). Tests are written to
  pass in this condition.
- **Test entrypoint isolation**: `ui-test-entrypoints/goals.html` renders `YearlyGoals`
  directly via `src/goals-main.tsx`, bypassing the Tauri dependency in `main.tsx`.
  Add a parallel `<window>.html` + `<window>-main.tsx` pair for each new Tauri window
  that needs browser-testable isolation.
