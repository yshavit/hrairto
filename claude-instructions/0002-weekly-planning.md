# Hrairto — Weekly Planning & Reflection

**Status: fully implemented (mock data, no Tauri persistence).**

A two-phase guided window. Reflection must be completed before planning unlocks.
See `0000-hrairto-overview.md` for project context.

---

## Key files

| What            | Where                                                         |
| --------------- | ------------------------------------------------------------- |
| Entry point     | `src/weekly/WeeklyPlanning.tsx`                               |
| All components  | `src/weekly/`                                                 |
| Shared          | `src/shared/FocusSplitBar.tsx`, `src/shared/concern-pill.css` |
| Styles          | `src/weekly/WeeklyPlanning.css`                               |
| Data model      | `src-tauri/src/models.rs`                                     |
| Mock data       | `src/mockData.ts` (`weeklySessionData`)                       |
| Test entrypoint | `ui-test-entrypoints/weekly.html`                             |
| RTL unit tests  | `src/weekly/WeeklyPlanning.test.tsx`                          |
| Playwright e2e  | `tests/weekly.spec.ts`                                        |

---

## Data model — weekly-specific types

Key types in `models.rs` (see `0001-yearly-goals.md` for shared types):

- **`WeeklySessionData`**: full payload. Contains `concerns: Vec<Concern>`,
  `main_quests: Vec<MainQuest>` (for color/label resolution throughout), and
  `quarter_context: Vec<MainQuestPlanningContext>`.
- **`MainQuestPlanningContext`**: pairs a `MainQuestId` with the active
  `QuarterDisplay` and optional `QuarterlyGoal` for that quarter.
- **`WeeklyGoalRef`**: discriminated union — `Planned { concern_id, waypoint_id }` or
  `Distraction { label_ids }`. Goals no longer carry `swimlane_id`; they carry
  `concern_id` instead.
- **`Activity`**: `MainQuest(MainQuestId) | SideQuests | Distractions` — the unit of
  allocation in `WeightEntry`. `FocusSplitBar` works with `WeightEntry[]` directly.

---

## Reflect phase

The user works through four sub-sections in order, then clicks **Done reflecting — start planning**:

1. **Time split bars** — read-only; shows planned vs actual time split for last week.
   Distraction label pills appear below the actual bar. Uses `FocusSplitBar` with
   `mainQuests` and `concerns` to resolve segment colors.

2. **Past goals** — one row per goal from last week. Clicking cycles unmarked → hit → miss → hit
   (never back to unmarked). Unmarked rows have a red border from first render.
   Blocked until all goals are marked. Goal chips show the `Concern.name` and color.

3. **Waypoint health** — one card per `MainQuestPlanningContext` that has an active quarterly
   waypoint (first non-null, non-completed slot in the fixed-tuple). Single-select confidence:
   on track / at risk / behind. Each unselected card has a red border from first render.
   Blocked until all cards have a selection. If a main quest has no active waypoint its context
   entry is omitted; the check is trivially satisfied when no cards exist.
   Month label is derived from slot index + `ctx.quarter.start_at` (no stored month field).

4. **Reflection notes** — required textarea. Red border always-on when empty.
   Placeholder text is assembled dynamically from the week's data (missed goals,
   distraction overrun, all-hit). Blocked until non-empty.

On success, the section collapses to a "Done / Edit" header and planning unlocks.
Clicking **Edit** re-collapses planning (without discarding plan data) and re-expands reflection.

---

## Plan phase

1. **Focus bar** — draggable stacked bar (`FocusSplitBar`, shared with `TimeSplitBars`).
   Segments snap to 5%, minimum 5% each, always sum to 100% structurally.
   Initialized from `data.prev_plan?.focus.weights ?? data.current_weights.entries`.
   No `defaultWeights` fallback — prior week's plan or the long-term target is always used.

2. **Quarter context cards** — read-only; one group per concern showing current-quarter
   goals for any main quests belonging to that concern. Main quests with no current goal
   show a placeholder. `QuarterlyGoalCard` receives `quarter: QuarterDisplay` so
   `WaypointList` can derive month labels from slot + quarter.

3. **Missed goal ghosts** — dimmed, non-interactive cards for last week's misses.
   Hidden when there are no misses. Chips show concern name + color.

4. **Goal lists** — one section per concern + one for Distractions. Each has an inline
   add form (text + waypoint picker or distraction label picker; Enter submits, Escape cancels)
   and a delete button per goal. Added goals carry `concern_id`, not `swimlane_id`.

**Save:** when goals exist, "Set Plan" calls `onSave({ type: 'Plan', focus, goals })`.
When no goals are set, a muted-red "No plan for next week." button expands an inline
confirmation panel with an optional reason textarea. Confirming calls
`onSave({ type: 'NoPlan', reason })`. `WeeklyPlanRequest` is a discriminated union in
`models.rs`; `WeeklyPlanning` receives `onSave` from its parent.

---

## Non-obvious decisions

**`onSave` callback instead of `window.close()`** — `window.close()` only works in Tauri
webviews, not browser tabs, which broke the dev entrypoint. The parent injects `onSave`;
the test entrypoint writes `document.body.dataset.savedPayload` (a DOM signal Playwright
asserts on); the Tauri entry point will invoke the backend command and close via
`tauri::Window`.

**Always-on validation borders** — Red borders on unmarked goals, empty notes, and
unselected health cards are driven by data state from first render. Error text messages
are gated on button press as a secondary signal.

**`WaypointHealthList` trivially satisfied with no cards** — When no main quest has an
active waypoint, the component renders nothing. A `useEffect` calls `onAllSelected(true)`
so the parent (`ReflectSection`) doesn't permanently block on health validation.

**Outcome state in `ReflectSection`** — `ReflectSection` owns
`outcomes: Map<WeeklyGoalId, LocalOutcome>` and passes it down to `PastGoalsList`.
`initialOutcome`, `nextOutcome`, and `LocalOutcome` are exported from `PastGoalsList.tsx`.
This keeps the missed-goals snapshot at phase transition straightforward.

**`FocusSplitBar` in `src/shared/`** — `TimeSplitBars` also uses it (twice: planned and
actual bars, both read-only), so it lives outside `src/weekly/`. Props are
`mainQuests: MainQuest[], concerns: Concern[], weights: WeightEntry[]`. Color resolution:
`MainQuest(id)` → find MainQuest → find Concern → `.color`; `SideQuests` → `SIDE_QUESTS_COLOR`
(`#8B8680`); `Distractions` → `DISTRACTIONS_COLOR` (`#555`).

**Concern pills** — `.concern-pill` in `src/shared/concern-pill.css` uses `--concern-color`
CSS variable. Replaces the old `.swimlane-pill` / `--swimlane-color`.
