# Hrairto — Weekly Planning & Reflection

**Status: fully implemented (mock data, no Tauri persistence).**

A two-phase guided window. Reflection must be completed before planning unlocks.
See `0000-hrairto-overview.md` for project context.

---

## Key files

| What            | Where                                   |
| --------------- | --------------------------------------- |
| Entry point     | `src/weekly/WeeklyPlanning.tsx`         |
| All components  | `src/weekly/`                           |
| Styles          | `src/weekly/WeeklyPlanning.css`         |
| Data model      | `src-tauri/src/models.rs`               |
| Mock data       | `src/mockData.ts` (`weeklySessionData`) |
| Test entrypoint | `ui-test-entrypoints/weekly.html`       |
| RTL unit tests  | `src/weekly/WeeklyPlanning.test.tsx`    |
| Playwright e2e  | `tests/weekly.spec.ts`                  |

---

## Reflect phase

The user works through four sub-sections in order, then clicks **Done reflecting — start planning**:

1. **Time split bars** — read-only; shows planned vs actual time split for last week.
   Distraction label pills appear below the actual bar.

2. **Past goals** — one row per goal from last week. Clicking cycles unmarked → hit → miss → hit
   (never back to unmarked). Unmarked rows have a red border from first render.
   Blocked until all goals are marked.

3. **Waypoint health** — one card per swimlane with an active quarterly waypoint.
   Single-select confidence: on track / at risk / behind. Each unselected card has a
   red border from first render. Blocked until all cards have a selection. If a swimlane
   has no active waypoint it is omitted; the check is trivially satisfied when no cards
   exist.

4. **Reflection notes** — required textarea. Red border always-on when empty.
   Placeholder text is assembled dynamically from the week's data (missed goals,
   distraction overrun, all-hit). Blocked until non-empty.

On success, the section collapses to a "Done / Edit" header and planning unlocks.
Clicking **Edit** re-collapses planning (without discarding plan data) and re-expands reflection.

---

## Plan phase

1. **Focus bar** — draggable stacked bar (`FocusSplitBar`, shared with `TimeSplitBars`).
   Segments snap to 5%, minimum 5% each, always sum to 100% structurally.
   Quarterly target weights shown as a reminder below.

2. **Quarter context cards** — read-only; one group per swimlane showing current-quarter
   goals and their waypoints. Swimlanes with no current goal show a placeholder.

3. **Missed goal ghosts** — dimmed, non-interactive cards for last week's misses.
   Hidden when there are no misses.

4. **Goal lists** — one section per swimlane + one for Distractions. Each has an inline
   add form (text + waypoint picker or distraction label picker; Enter submits, Escape cancels)
   and a delete button per goal.

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

**`WaypointHealthList` trivially satisfied with no cards** — When no swimlane has an
active waypoint, the component renders nothing. A `useEffect` calls `onAllSelected(true)`
so the parent (`ReflectSection`) doesn't permanently block on health validation.

**Outcome state in `ReflectSection`** — `ReflectSection` owns
`outcomes: Map<WeeklyGoalId, LocalOutcome>` and passes it down to `PastGoalsList`.
`initialOutcome`, `nextOutcome`, and `LocalOutcome` are exported from `PastGoalsList.tsx`.
This keeps the missed-goals snapshot at phase transition straightforward.

**`FocusSplitBar` in `src/shared/`** — `TimeSplitBars` also uses it (twice: planned and
actual bars, both read-only), so it lives outside `src/weekly/`.
