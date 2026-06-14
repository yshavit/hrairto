# Hrairto — Mid-day check-in

## Overview

A lightweight scheduled check-in that appears at a configured time (default:
midday). The user marks progress on today's goals and logs how they spent their
time since the last check-in. No planning component — that lives in the end-of-day
check-in.

The mid-day check-in is the simplest session in the app. It opens as a
medium-sized window (not a small tray bubble, not as large as the weekly session).

**Relationship to EOD check-in:** The EOD check-in is this same pane plus a
goal-selection section (pick tomorrow's goals). They will share the same component,
with a boolean prop to show or hide the second section.

**Status: fully implemented.**

---

## Mockups

Reference screenshots are in `claude-instructions/0004-mockups/`. The spec takes
precedence where they conflict.

---

## Key files

| What                  | Where                                     |
| --------------------- | ----------------------------------------- |
| React entry point     | `src/midday/MiddayCheckin.tsx`            |
| All midday components | `src/midday/`                             |
| Styles                | `src/midday/MiddayCheckin.css`            |
| Mock data (Phase 1)   | `src/mockData.ts` (extend existing file)  |
| Test entrypoint HTML  | `ui-test-entrypoints/midday.html`         |
| Test entrypoint TS    | `src/midday-main.tsx`                     |
| RTL unit tests        | `src/midday/*.test.tsx`                   |
| Playwright e2e tests  | `tests/midday.spec.ts`                      |

Reuses from existing code:
- All model types from `src/bindings.ts`
- `src/utils/calendar.ts` display helpers
- Concern color constants (from shared theme)
- Goal toggle mechanic (same as weekly session)
- `ⓘ` detail toggle mechanic (defined below; EOD check-in will reuse this same component)

---

## Data model additions

**View** (`src-tauri/src/models/views.rs`) — computed by backend, never stored:

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
    /// All quarterly goals active this week, for ⓘ detail resolution.
    pub quarterly_goals: Vec<QuarterlyGoal>,
    /// All distraction labels, for context resolution.
    pub distraction_labels: Vec<DistractionLabel>,
    /// The weekly plan this check-in falls within.
    pub weekly_plan: WeeklyPlan,
}
```

**Stored** (`src-tauri/src/models/stored.rs`) — persisted as the check-in artifact:

```rust
/// The artifact saved when the user completes a mid-day check-in.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct MiddayCheckinResult {
    pub checkin_at: Epoch,
    pub last_checkin_at: Option<Epoch>,
    /// Outcomes for any goals the user marked during this check-in.
    /// Goals not touched are omitted (outcome stays None in storage).
    pub goal_outcomes: Vec<GoalOutcomeEntry>,
    /// Time distribution since last check-in, one weight per today's goal
    /// plus a distraction bucket. All weights sum to 1.0.
    pub time_split: MiddayTimeSplit,
    /// Optional free-text note.
    pub note: Option<String>,
}

/// A single goal outcome recorded during a check-in.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct GoalOutcomeEntry {
    pub goal_id: WeeklyGoalId,
    pub outcome: GoalOutcome,
}

/// Per-goal time allocation for a midday check-in.
///
/// Unlike [`Focus`], which allocates across [`Activity`] buckets (MainQuest /
/// SideQuests / Distractions), this records how time was actually spent at the
/// individual [`WeeklyGoal`] level. The EOD reflection can translate this to a
/// `Focus` for pre-populating the weekly actual-split bar.
///
/// All `goal_weights[*].weight` values plus `distraction_weight` sum to 1.0.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct MiddayTimeSplit {
    pub goal_weights: Vec<MiddayGoalWeight>,
    /// Weight for unplanned/distraction time not attributed to any goal.
    pub distraction_weight: f64,
}

/// One entry in a [`MiddayTimeSplit`]: how much of the period's time went to
/// a specific weekly goal.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct MiddayGoalWeight {
    pub goal_id: WeeklyGoalId,
    /// 0.0–1.0.
    pub weight: f64,
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
- Hit/miss toggle (left): same mechanic as weekly session
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

Reuse the drag logic from `src/shared/FocusSplitBar.tsx` — it already implements
pointer capture, adjacent-segment-only updates, and the 5% minimum. The only new
work is adapting the data shape (per-`WeeklyGoalId` instead of per-`Activity`) and
adding the below-bar legend.

Constraints (same as `FocusSplitBar`):
- Minimum segment width: 5% (no segment can be dragged below 5%)
- Dragging a handle only affects the two adjacent segments — it does not
  redistribute across all segments
- Snap to 5% increments (matching `FocusSplitBar`'s existing behavior)

Note: 5% minimum means a 20-goal day would be impossible to represent accurately;
that's a known limitation to be addressed when `FocusSplitBar` is revised.

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

### Playwright e2e (`tests/midday.spec.ts`)

- Full happy path: mark a goal hit, drag a handle, write a note, save
- Save with nothing touched — should succeed immediately
- ⓘ toggle opens and closes detail for each goal type (planned, distraction)

---

## Non-obvious decisions

- **`time_split: Focus` → `MiddayTimeSplit`**: The original spec used `Focus` for the
  saved time split, but `Focus` allocates across `Activity` buckets (MainQuest /
  SideQuests / Distractions) — it can't hold per-goal weights. A new `MiddayTimeSplit`
  type holds one weight per `WeeklyGoal` plus a `distraction_weight` bucket. At EOD
  reflection, the backend can translate this to a `Focus` by grouping goals by their
  activity type, for pre-populating the weekly actual-split bar.

- **`quarterly_goals` added to `MiddayCheckinData`**: The ⓘ detail panel shows
  "quarterly goal text · waypoint text", but `WeeklyGoalRef::Planned` only carries
  `concern_id + waypoint_id`. Resolving both requires `QuarterlyGoal` records. The
  field was missing from the original spec.

- **`MiddayCheckinData` is a view, not stored**: Follows the existing `views.rs` /
  `stored.rs` split. `MiddayCheckinResult` and its sub-types are stored; the session
  payload is assembled by the backend at invocation time.

- **`TimeSplitBar` adapted from `FocusSplitBar`**: The drag mechanic (pointer capture,
  adjacent-segment-only adjustment, 5% snapping) was reused from `src/shared/FocusSplitBar.tsx`
  rather than rebuilt. The main new work was the per-goal data adapter and the below-bar
  legend. Snap interval was aligned to 5% (matching the existing bar) rather than the
  spec's "1% or continuous."

- **"Next check-in at X" rendered as a `<button>`** rather than `<a href="#">`: avoids
  the browser's default anchor behavior (scroll-to-top, address bar change) with no
  action wired yet. Styled identically.

- **Mock data goal IDs use hex suffixes `a0–a2`**: `WG('20')–WG('22')` would collide
  with distraction label IDs `120–122` (same UUID byte pattern). Hex suffixes avoid
  this without changing any ID scheme.