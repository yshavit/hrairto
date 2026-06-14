# Hrairto — Mid-day check-in

## Overview

A lightweight scheduled check-in that appears at a configured time (default:
midday). The user marks progress on today's goals and logs how they spent their
time since the last check-in. No planning component — that lives in the end-of-day
check-in.

The mid-day check-in is the simplest session in the app. It opens as a
medium-sized window (not a small tray bubble, not as large as the weekly session).

**Status: UX designed, not yet implemented.**

---

## Mockups

Reference screenshots are in `claude-instructions/0004-mockups/`. The spec takes
precedence where they conflict.

---

## Key files (to be created)

| What                  | Where                                     |
| --------------------- | ----------------------------------------- |
| React entry point     | `src/midday/MiddayCheckin.tsx`            |
| All midday components | `src/midday/`                             |
| Styles                | `src/midday/MiddayCheckin.css`            |
| Mock data (Phase 1)   | `src/mockData.ts` (extend existing file)  |
| Test entrypoint HTML  | `ui-test-entrypoints/midday.html`         |
| Test entrypoint TS    | `src/midday-main.tsx`                     |
| RTL unit tests        | `src/midday/*.test.tsx`                   |
| Playwright e2e tests  | `e2e/midday.spec.ts`                      |

Reuses from existing code:
- All model types from `src/bindings.ts`
- `src/utils/calendar.ts` display helpers
- Concern color constants (from shared theme)
- Goal toggle mechanic (same as weekly and EOD)
- `ⓘ` detail toggle mechanic (same as EOD)

---

## Data model additions

Source of truth: `src-tauri/src/models.rs`. Add these structs:

```rust
/// Full payload for the mid-day check-in session.
/// The backend computes all derived fields; the frontend just renders.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct MiddayCheckinData {
    pub calendar: Calendar,
    /// When this check-in was scheduled / opened.
    pub checkin_at: Epoch,
    /// When the previous check-in ended (morning start-of-day or prior midday).
    /// `None` on the very first check-in of the day.
    pub last_checkin_at: Option<Epoch>,
    /// When the next check-in is scheduled.
    pub next_checkin_at: Epoch,
    /// Today's planned goals, in display order.
    pub todays_goals: Vec<WeeklyGoal>,
    /// All concerns, for color/label resolution.
    pub concerns: Vec<Concern>,
    /// All active main quests, for context resolution.
    pub main_quests: Vec<MainQuest>,
    /// All distraction labels, for context resolution.
    pub distraction_labels: Vec<DistractionLabel>,
    /// The weekly plan this check-in falls within.
    pub weekly_plan: WeeklyPlan,
}

/// The artifact saved when the user completes a mid-day check-in.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct MiddayCheckinResult {
    pub checkin_at: Epoch,
    pub last_checkin_at: Option<Epoch>,
    /// Outcomes for any goals the user marked during this check-in.
    /// Goals not touched are omitted (outcome stays None in storage).
    pub goal_outcomes: Vec<GoalOutcomeEntry>,
    /// Time distribution since last check-in, per weekly goal.
    /// All entries sum to 1.0.
    pub time_split: Focus,
    /// Optional free-text note.
    pub note: Option<String>,
}

/// A single goal outcome recorded during a check-in.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct GoalOutcomeEntry {
    pub goal_id: WeeklyGoalId,
    pub outcome: GoalOutcome,
}
```

Add typed ID newtype: none needed beyond what already exists.

---

## Component hierarchy

```
MiddayCheckin                 — top-level; owns all local state
  MiddayHeader                — title, timestamp, last/next check-in info
  TodaysGoals                 — goal list with hit/miss toggles and ⓘ detail
    GoalRow                   — one per today's goal
  TimeSplitBar                — draggable segmented bar + legend
  NoteField                   — optional textarea
  SaveButton                  — "Done — back to work"
```

---

## MiddayHeader

Shows:
- Title: "Mid-day check-in" (left)
- Date + time: e.g. "Tuesday May 20 · 12:30 pm" (right, muted)
- Sub-line: "Last check-in: this morning at 9:00 am · next check-in at 5:30 pm"
    - "next check-in at X" is a link/button that opens the time adjustment UI
      (Phase 1: cosmetic only — renders as a styled anchor, no action)
    - If `last_checkin_at` is null: "First check-in today"
    - Times formatted via `Intl.DateTimeFormat` using `calendar.locale` and
      `calendar.timezone`

---

## TodaysGoals

A flat list of `WeeklyGoal` items from `todays_goals`. No grouping by concern or
main quest — the list is short enough (1–4 goals typically) that grouping adds
noise without value.

Each `GoalRow`:
- Hit/miss toggle (left): same mechanic as weekly and EOD sessions
    - Starts unmarked
    - First click → hit (green fill + checkmark)
    - Subsequent clicks toggle between hit and miss
    - Never returns to unmarked once touched
- Goal text (middle): strikethrough when hit
- `ⓘ` button (right): toggles inline detail below the goal text
    - Detail shows: concern name · quarterly goal text · waypoint text (if linked)
    - For distraction goals: distraction label(s) instead
    - Detail is hidden by default; `ⓘ` button color deepens when open

No validation required — goals do not need to be marked to save. This is a
lightweight check-in, not a formal reflection.

---

## TimeSplitBar

A single horizontally segmented bar with draggable handles between segments.
Each segment corresponds to one of today's goals, plus a distractions segment
at the right end.

### Segments

One segment per `WeeklyGoal` in `todays_goals`, plus one fixed `Distractions`
segment at the right end. Segment count = `todays_goals.length + 1`.

Segment colors:
- For planned goals (`WeeklyGoalRef::Planned`): the color of the goal's concern,
  looked up via `concerns`. If multiple goals share a concern, they get distinct
  shades — use the concern color at full opacity for the first, 60% for the second.
  In practice this is rare (1–2 goals per concern typically).
- For distraction goals in `todays_goals` (known distractions): use the gray ramp
  (`#B4B2A9`) — same as the Distractions segment.
- Distractions segment: always `#B4B2A9` (gray).

### Initial weights

Default: distribute evenly across all segments. E.g. with 3 goals + distractions
= 4 segments, each starts at 25%.

A future enhancement (Phase 2+) could pre-populate from the weekly plan's focus
weights — but for Phase 1, even distribution is fine.

### Drag mechanic

Handles sit at the boundaries between segments. Each handle can be dragged
left/right. Constraints:
- Minimum segment width: 5% (no segment can be dragged below 5%)
- Dragging a handle only affects the two adjacent segments — it does not
  redistribute across all segments
- Handles snap to 1% increments (or use continuous — keep it simple for Phase 1)

### Legend

Below the bar: one item per segment showing a color dot, the goal text (truncated
if long), and the current percentage (integer, no decimal). Updates live as
handles are dragged.

### Label above bar

Left: "Drag the handles to adjust" (muted, 11px)
Right: elapsed time since last check-in, e.g. "~3.5 hrs" — derived from
`checkin_at - last_checkin_at`, formatted as hours and minutes, prefixed with `~`.
If `last_checkin_at` is null: omit the elapsed time label.

---

## NoteField

A `<textarea>` for optional free-text notes.

Label: "Note" with "(optional)" in muted text beside it (not as placeholder —
as a visible label qualifier).

Placeholder: "Anything worth noting about the morning?"

Min height: ~52px, resizable vertically.

---

## SaveButton

Label: "Done — back to work"

On click:
- Collect goal outcomes (only goals that were touched — unmarked goals are omitted)
- Collect time split weights
- Collect note (null if empty)
- In Phase 1: log to console, show saved state
- Button text changes to "Saved. Good work!" and disables

No validation required — the check-in can be saved with no goals marked and
no note written.

---

## Visual design

Follow conventions from `GoalTree.css` and `WeeklyPlanning.css`.

Window feel: medium-sized, comfortable padding. Not cramped like a tray popup,
not as expansive as the weekly session. `max-width: 560px`.

Section spacing: `18px` between zones (goals → bar → note → button).

Zone labels: same pattern as weekly — `11px`, `font-weight: 500`,
`letter-spacing: 0.05em`, `text-transform: uppercase`,
`color: var(--color-text-tertiary)`.

The bar itself: `28px` tall, `border-radius: var(--border-radius-md)`,
`overflow: hidden` on the track. Handles are `10px` wide with a `3px` white
inner pip, extending `3px` above and below the bar for a larger drag target.

---

## Mock data

Extend `src/mockData.ts` with a `middayCheckinData: MiddayCheckinData` export.

Use goals consistent with the existing `weeklySessionData`:
- 2 planned goals (one FizzBuzz main quest, one side-quest)
- 1 distraction goal (known in advance — e.g. "support rotation")
- `last_checkin_at`: 3.5 hours before `checkin_at`
- `next_checkin_at`: 5.5 hours after `checkin_at`

Initial time split weights: distribute evenly across the 4 segments (3 goals +
distractions = 25% each).

---

## Tests to write

### RTL unit tests (`src/midday/*.test.tsx`)

- `GoalRow`: first click sets hit; second sets miss; never returns to unmarked
- `GoalRow`: ⓘ toggle reveals and hides detail
- `GoalRow`: strikethrough applied on hit, removed on miss
- `TimeSplitBar`: segments sum to 100% on initial render
- `TimeSplitBar`: dragging a handle updates adjacent segment percentages only
- `TimeSplitBar`: no segment can go below 5%
- `TimeSplitBar`: legend values update live on drag
- `SaveButton`: saves with no goals marked (no validation)
- `MiddayHeader`: shows "First check-in today" when `last_checkin_at` is null
- `MiddayHeader`: elapsed time label absent when `last_checkin_at` is null

### Playwright e2e (`e2e/midday.spec.ts`)

- Full happy path: mark a goal hit, drag a handle, write a note, save
- Save with nothing touched — should succeed immediately
- ⓘ toggle opens and closes detail for each goal type (planned, distraction)

---

## Implementation checklist

- [ ] **Step 0: Reconcile spec with current codebase**
    - This spec was written with knowledge of the data model and UX decisions but
      without full visibility into current code conventions. Before implementing:
        - Read key files from `0001-yearly-goals.md` and `0002-weekly-planning.md`
          to understand current conventions (component structure, CSS patterns,
          mock data shape, test setup, the EOD check-in if already implemented)
        - Identify any conflicts or inconsistencies between this spec and those conventions
        - Amend this spec to resolve them — the codebase conventions win
        - Only proceed to Step 1 once the spec reflects the actual repo

- [ ] **Step 1: Data model**
    - [ ] Add `MiddayCheckinData`, `MiddayCheckinResult`, `GoalOutcomeEntry`
      to `src-tauri/src/models.rs` (or `views.rs` as appropriate)
    - [ ] Run `cargo check` — no errors
    - [ ] Regenerate `src/bindings.ts`
    - [ ] Verify new types appear correctly in `bindings.ts`

- [ ] **Step 2: Mock data**
    - [ ] Extend `src/mockData.ts` with `middayCheckinData: MiddayCheckinData`
      per the mock data spec above
    - [ ] TypeScript compiles with no errors

- [ ] **Step 3: Test entrypoint**
    - [ ] Create `ui-test-entrypoints/midday.html`
    - [ ] Create `src/midday-main.tsx`
    - [ ] Verify page loads in browser

- [ ] **Step 4: MiddayHeader**
    - [ ] Title + timestamp (right-aligned, muted)
    - [ ] Sub-line with last/next check-in times
    - [ ] "First check-in today" variant when `last_checkin_at` is null
    - [ ] "Next check-in at X" renders as styled link (Phase 1: no action)

- [ ] **Step 5: GoalRow + TodaysGoals**
    - [ ] Hit/miss toggle: unmarked → hit → miss → hit (never back to unmarked)
    - [ ] Strikethrough on hit
    - [ ] ⓘ toggle: reveals/hides detail inline
    - [ ] Detail content: concern + quarterly goal + waypoint for planned goals;
      labels for distraction goals
    - [ ] Assemble into TodaysGoals flat list

- [ ] **Step 6: TimeSplitBar**
    - [ ] Render segments from `todays_goals` + distractions, evenly weighted
    - [ ] Correct colors per segment (concern color for planned, gray for distractions)
    - [ ] Drag handles: update adjacent segments only, 5% minimum per segment
    - [ ] Legend updates live
    - [ ] Elapsed time label (omit if `last_checkin_at` is null)
    - [ ] "Drag the handles to adjust" label

- [ ] **Step 7: NoteField**
    - [ ] Optional textarea with label + "(optional)" qualifier
    - [ ] Correct placeholder text

- [ ] **Step 8: SaveButton**
    - [ ] No validation — saves regardless
    - [ ] Post-save: text changes to "Saved. Good work!", disables
    - [ ] Phase 1: logs collected data to console

- [ ] **Step 9: MiddayCheckin assembly**
    - [ ] Assemble all components
    - [ ] Full flow works end-to-end with mock data
    - [ ] Visual polish: spacing, zone labels, max-width

- [ ] **Step 10: RTL unit tests**
    - [ ] Write all tests listed above
    - [ ] All pass: `pnpm test`

- [ ] **Step 11: Playwright e2e tests**
    - [ ] Write all e2e tests listed above
    - [ ] All pass: `pnpm test:e2e`

- [ ] **Step 12: Graduate this doc**
    - [ ] Remove the implementation checklist from this file
    - [ ] Update the overview section to "Status: fully implemented"
    - [ ] Fill in the "Key files" table with actual paths
    - [ ] Add a "Non-obvious decisions" section for anything that diverged from
      this spec or required significant judgment
    - [ ] Delete `claude-instructions/0004-mockups/`
    - [ ] Update `0000-hrairto-overview.md`: mark mid-day check-in as ✅,
      update "Current status" line