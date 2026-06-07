# Hrairto — Goal Tree View

## Overview

A read-only view showing the full goal hierarchy across all swimlanes. This is the
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
| Side-quest packing       | `src/goals/packSideQuests.ts`                    |
| Styles                   | `src/goals/GoalTree.css`                         |

---

## Data model

Source of truth: `src-tauri/src/models.rs`. Key design decisions not obvious from struct names:

- **`Epoch`**: all timestamps are `Epoch(i64)` — milliseconds UTC, not seconds.
  Milliseconds so JavaScript's `Date.now()` and `Intl.DateTimeFormat` work without
  ×1000 conversion.
- **Typed IDs**: `SwimlaneId`, `AnnualGoalId`, `QuarterlyGoalId`, etc. are newtypes
  wrapping `Uuid`. They serialize as plain strings (`#[serde(transparent)]`), so
  TypeScript sees them as `string` but Rust prevents mixing them up.
- **`AnnualGoalRef`**: `QuarterlyGoal.annual_goal` is an enum — `MainQuest(AnnualGoalId)`
  or `SideQuest` — not a nullable ID. Makes side-quest intent explicit at the type level.
  Wire format: `{ type: "MainQuest"; id: string } | { type: "SideQuest" }`.
- **`WeightTarget`**: `SwimlaneWeightEntry.target` is an enum — `Swimlane(SwimlaneId)`
  or `Distractions` — so the user can budget intentionally for unplanned work.
  Wire format: `{ type: "Swimlane"; id: string } | { type: "Distractions" }`.
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
  GoalTreeView          — owns ScrollAPI ref bridging header nav ↔ SwimlanesContainer
    GoalTreeHeader      — title, nav buttons, current quarter label, donut chart
      WeightDisplay     — SVG donut for swimlane weight split
    SwimlanesContainer  — all scroll state + rubber-band; exposes ScrollAPI via forwardRef
      SwimlaneRow       — one per swimlane; tinted background, swimlane name label
        GoalSubRow      — one per annual goal; heading + deadline + QuarterScroller
          QuarterScroller — horizontally scrolling strip
            QuarterCard — one per quarter; past/active/future styling; isSideQuest badge
              WaypointList — waypoints: month label, text, completion state
        SideQuestSection — present only if swimlane has side quests
          SideQuestStrip — one interval-packed strip of side quests
```

`SwimlanesContainer` holds one flat `scrollerRefs` array covering every scroller
(all goal strips and side-quest strips across all swimlanes). Scroll sync is done
in `onScroll` callbacks — not `useEffect` listeners — with a boolean `isSyncing`
guard against feedback loops.

`packSideQuests` (greedy interval scheduling: two side quests share a strip only if
they are in different quarters) lives in `src/goals/packSideQuests.ts`.

---

## Scroll behavior

Canonical source: `src/goals/SwimlanesContainer.tsx`. Non-obvious decisions:

- **Peek quarter**: `quarters_to_display` always ends with one extra quarter beyond
  the planning horizon — visible only via rubber-band drag, unreachable via nav buttons.
  The rubber-band wall and the Next button cap are both derived from the same
  `hardMax` value so they stay in sync.
- **Rubber-band overshoot** is applied via CSS `translateX` on the inner scroller
  wrapper, not via `scrollLeft`. This lets the browser manage the true scroll boundary
  while the visual stretch is purely cosmetic.

---

## Testing

- **RTL unit tests** (`pnpm test`): in `src/goals/` and `src/utils/`.
- **Playwright e2e** (`pnpm test:e2e`): scroll sync, nav caps, rubber-band.
  Viewport is set to match the Tauri window dimensions — wider viewports fit all
  cards without scrolling, which breaks scroll-dependent tests.
- **Test entrypoint isolation**: `ui-test-entrypoints/goals.html` renders `YearlyGoals`
  directly via `src/goals-main.tsx`, bypassing the Tauri dependency in `main.tsx`.
  Add a parallel `<window>.html` + `<window>-main.tsx` pair for each new Tauri window
  that needs browser-testable isolation.
