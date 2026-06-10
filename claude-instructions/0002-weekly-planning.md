# Hrairto — Weekly Planning & Reflection

## Overview

The weekly planning/reflection session is a two-phase guided flow:

1. **Reflect** — review last week: how did time actually split, which goals were
   hit or missed, how are quarterly waypoints tracking, and write a reflection note.
2. **Plan** — set intended focus weights for the coming week, then set goals per
   swimlane (referencing the active quarter's context).

The session enforces phase ordering: the planning section is collapsed and
inaccessible until the reflection is marked complete. Editing the reflection after
planning has begun re-collapses the planning section (but does not discard plan data).

**Status: Steps 0–15 implemented (mock data, no Tauri persistence). Tests pending (Steps 16–17).**

If helpful, there is an overview of the project in `0000-hairto-overview.md`.

---

## Mockups and this spec

Reference screenshots are in `claude-instructions/0002-mockups/`:

- `weekly-reflection.png` — reflect section, empty state (no goals marked)
- `weekly-reflection-filled.png` — reflect section, mid-fill with validation errors visible
- `weekly-planning.png` — plan section after reflection is complete

**Read these before starting any implementation step.** They show the intended
layout and interaction states faster than the prose spec can. The spec takes
precedence over the mockups where they conflict — the mockups are visual reference,
not the source of truth.

**Keep this doc in sync as you implement.** After each step, note any intentional
divergences from the mockups in a "Divergences from mockups" subsection here, so
the doc stays an accurate picture of what's actually built.

## Key files (to be created)

| What                  | Where                                    |
| --------------------- | ---------------------------------------- |
| React entry point     | `src/weekly/WeeklyPlanning.tsx`          |
| All weekly components | `src/weekly/`                            |
| Styles                | `src/weekly/WeeklyPlanning.css`          |
| Mock data (Phase 1)   | `src/mockData.ts` (extend existing file) |
| Test entrypoint HTML  | `ui-test-entrypoints/weekly.html`        |
| Test entrypoint TS    | `src/weekly-main.tsx`                    |
| RTL unit tests        | `src/weekly/*.test.tsx`                  |
| Playwright e2e tests  | `e2e/weekly.spec.ts`                     |

Reuses from existing code:

- All ID newtypes and model types from `src/bindings.ts`
- `src/utils/calendar.ts` display helpers
- Swimlane colors: use `swimlane.color` (hex string from backend) applied via inline `style` + CSS variables, matching the pattern in `SwimlaneRow.tsx`.

---

## Data model additions

Source of truth: `src-tauri/src/models.rs` (already implemented as of Step 1).

### Key design decisions

**`WeeklyPlan` and `WeeklyReflection` are separate entities.** The UI combines them into one
pane (with collapsing), but the model separates them — they represent genuinely different acts.

**Unified weight type.** `SwimlaneWeightEntry` was renamed to `SwimlaneWeight` and is now used
everywhere weights appear: long-term periods (`SwimlaneWeightPeriod`), weekly focus (`WeeklyPlan`),
and actuals (`WeeklyReflection`). `SwimlanesFocus` is a struct wrapping `Vec<SwimlaneWeight>` with
a `new` constructor that normalizes weights to sum to 1.0.

**`GoalOutcome` is an enum with embedded timestamps.** Goals can be marked at any point during
the week, not only during reflection, so `at: Epoch` lives in each variant. `WeeklyGoal.outcome`
is `Option<GoalOutcome>` — `None` while unmarked, `Some(Hit|Miss)` once marked.

**`actual_split` is user-editable.** The backend provides an estimate; the user can adjust it
during reflection (half days, non-uniform days, etc.).

### Structs added

```rust
// SwimlaneWeightEntry renamed to SwimlaneWeight (same fields).

pub struct SwimlanesFocus {
    pub weights: Vec<SwimlaneWeight>,
}
// impl SwimlanesFocus::new normalizes weights to sum to 1.0.

pub enum GoalOutcome {      // #[serde(tag = "type")]
    Hit { at: Epoch },
    Miss { at: Epoch },
}

pub struct WeeklyPlan {
    pub id: WeeklyPlanId,
    pub start_at: Epoch,    // inclusive
    pub end_at: Epoch,      // exclusive
    pub focus: SwimlanesFocus,
}

pub struct WeeklyReflection {
    pub id: WeeklyReflectionId,
    pub plan_id: WeeklyPlanId,
    pub notes: String,
    pub completed_at: Epoch,
    pub actual_split: SwimlanesFocus,
}

pub struct WeeklyGoal {
    pub id: WeeklyGoalId,
    pub plan_id: WeeklyPlanId,
    pub created_at: Epoch,
    pub text: String,
    pub outcome: Option<GoalOutcome>,
    pub goal_ref: WeeklyGoalRef,
}

#[serde(tag = "type")]
pub enum WeeklyGoalRef {
    Planned { swimlane_id: SwimlaneId, waypoint_id: Option<WaypointId> },
    Distraction { label_ids: Vec<DistractionLabelId> },
}

pub struct DistractionLabel {
    pub id: DistractionLabelId,
    pub text: String,
    pub created_at: Epoch,
}

pub struct SwimlanePlanningContext {
    pub swimlane_id: SwimlaneId,
    pub quarter: QuarterDisplay,
    pub quarterly_goal: Option<QuarterlyGoal>,
}

pub struct WeeklySessionData {
    pub calendar: Calendar,
    pub plan: WeeklyPlan,
    pub prev_plan: Option<WeeklyPlan>,          // None on first-ever session
    pub reflection: Option<WeeklyReflection>,  // None on first-ever session
    pub past_goals: Vec<WeeklyGoal>,            // previous week, for reflection
    pub planned_goals: Vec<WeeklyGoal>,         // coming week, being planned
    pub swimlanes: Vec<Swimlane>,
    pub distraction_labels: Vec<DistractionLabel>,
    pub quarter_context: Vec<SwimlanePlanningContext>,
    pub current_weights: SwimlaneWeightPeriod, // quarterly target shown below focus bar
    pub upcoming_quarterly_goals: Vec<QuarterlyGoal>, // for waypoint picker + context cards
}

// Submitted when the user finishes the planning session.
#[serde(tag = "type")]
pub enum WeeklyPlanRequest {
    Plan { focus: SwimlanesFocus, goals: Vec<WeeklyGoal> },
    NoPlan { reason: String },  // reason is empty string if user left it blank
}
```

ID newtypes added to `id_types!`: `WeeklyPlanId`, `WeeklyReflectionId`, `WeeklyGoalId`,
`DistractionLabelId`.

---

## Component hierarchy

```
WeeklyPlanning                  — top-level; owns phase state; accepts onSave(WeeklyPlanRequest)
  WeeklyHeader                  — "Week of May 19" title, quarter/week label, week-end picker
  ReflectSection                — collapsible; always starts expanded
    TimeSplitBars               — planned vs actual stacked bars (two FocusSplitBar instances)
    PastGoalsList               — past week's goals, each togglable hit/miss
    WaypointHealthList          — per-swimlane confidence call
    ReflectionNotes             — required textarea; blocks completion if empty
    [inline button]             — "Done reflecting — start planning"
  PlanSection                   — collapsible; starts collapsed; accepts onSave(WeeklyPlanRequest)
    FocusSplitBar               — draggable stacked bar (enforces 100% structurally)
    [per swimlane: pill + quarter label header, then wrapping row of cards]
      QuarterlyGoalCard         — one card per current-quarter goal (incl. side quests)
    MissedGoalGhosts            — all last week's misses together, below context cards
    PlanGoalsList               — one per swimlane + one for distractions
      PlanGoalItem              — goal text + waypoint picker (or distraction label picker)
      AddGoalButton             — inline goal entry form
    [inline buttons]            — "Set Plan" or "No plan for next week." + confirm panel
```

---

## Phase state and locking mechanic

`WeeklyPlanning` owns `phase: 'reflecting' | 'planning'`.

**Transitions:**

- `reflecting → planning`: triggered by "Done reflecting" button. Validates that:
  - every past goal has an outcome (hit or miss — no unmarked goals)
  - reflection notes are non-empty
    If validation fails, show inline errors; do not transition.
- `planning → reflecting` (edit): triggered by the "Edit" button in the reflection
  header. Collapses the planning section visually. Does **not** discard plan data —
  the user's entered goals and weights survive. The planning section re-expands when
  the user clicks "Done reflecting" again.

**Viewing vs editing:**

- Clicking anywhere in the collapsed reflection section to _read_ it does not
  trigger the edit transition.
- Only clicking the explicit "Edit" button triggers it.
- The "Edit" button is only visible when `phase === 'planning'`.

---

## Reflection section details

### Time split bars

Two horizontal stacked bars, one below the other:

```
Planned  [████████████████████░░░░░░░]
Actual   [████████████░░░░░░░▓▓▓▓▓▓▓]
```

Each bar is a single `<div>` with flex children — one segment per `WeightTarget`.
Segment widths are percentages. Segment colors match swimlane colors; distraction
segment is `#B4B2A9`.

Planned bar: sourced from `WeeklySessionData.weights`.
Actual bar: sourced from `WeeklySessionData.actual_split`.

Values on the actual bar are rounded to the nearest 5% and prefixed with `~`
(e.g. `~50%`). Values on the planned bar are exact.

Distraction labels that fired during the week appear as small pill tags below the
actual bar, e.g. `customer request ×3  bug ×1`. These come from the backend in
`actual_split` metadata (exact shape TBD in Phase 2; leave a `// TODO` placeholder
in Phase 1 and render from mock data).

### Past goals list

One row per `WeeklyGoal` in `WeeklySessionData.goals`.

Each goal starts **unmarked**. The first click sets it to **hit**; subsequent clicks
toggle between hit and miss. It **never returns to unmarked** once touched.

State display:

- Unmarked: empty square border; **row gets a red border + shadow** (always-on,
  from first render — no button press required)
- Hit: green fill + checkmark (`#EAF3DE` background, `#3B6D11` icon); red border removed
- Miss: red fill + × (`#FCEBEB` background, `#A32D2D` icon); red border removed

Goal text for hit goals gets a strikethrough.

A summary stat row at the top shows total goals set, hit count, and missed count,
updating live as the user marks goals. The unmarked count is not shown — the
per-row red border serves as that signal.

Validation: "Done reflecting" is blocked until all goals are marked (unmarked count
= 0). Show an inline error "Mark every goal as hit or missed before continuing." if
the user tries to proceed with unmarked goals (secondary signal; the per-row border
is the primary one).

### Waypoint health

One card per swimlane showing the current quarter's active waypoint (first
incomplete waypoint in the active quarter). The user selects a confidence level:

- **On track** — `#EAF3DE` / `#3B6D11`
- **At risk** — `#FAEEDA` / `#633806`
- **Behind** — `#FCEBEB` / `#791F1F`

Confidence is a single-select — clicking a button selects it (highlighted),
clicking again does nothing (it stays selected; no deselect). The previously
selected button deselects automatically. No validation required — confidence is
optional.

### Reflection notes

A `<textarea>` that is required before proceeding. The red border is shown
**always when the textarea is empty** (from first render). If the user clicks
"Done reflecting" with an empty textarea, also show the inline error
"Reflection notes are required before continuing." below it.

Placeholder text is dynamically assembled from the week's data. Rules:

- If any goals were missed: `• You missed N goal(s) — what got in the way?`
- If distraction actual % is more than 10pp above the planned distraction weight:
  `• Distractions took ~X%, mostly <top label>. Was that avoidable?`
- If all goals were hit:
  `• You hit everything — was planning accurate, or could you have aimed higher?`
- Always append: `• What's one thing you'd do differently next week?`

Assemble these in a helper function `buildReflectionPrompt(goals, weights, actualSplit, labels)`.

### "Done reflecting" button

Label: `Done reflecting — start planning`.

On click:

1. Validate all goals marked — if not, show error and abort
2. Validate notes non-empty — if not, show red ring and abort
3. Transition phase to `'planning'`
4. Collapse reflection section, show "Edit" button in its header
5. Expand planning section

---

## Planning section details

### Focus weight bar

A single draggable stacked `FocusSplitBar` replaces the per-swimlane slider design.
Dragging any boundary redistributes adjacent segments; the bar structurally enforces
a sum of 100% — no separate validation needed. Segments snap to 5%, minimum 5% each.

- The quarterly target weights (from `SwimlaneWeightPeriod`) are shown as a
  reminder below the bar: `Quarterly target: 70% team · 30% personal`
- The `targeting ~X%` label in each swimlane goal-list section updates live as the
  bar changes.

### Planning section layout

The body of `PlanSection` flows top-to-bottom in three flat groups:

**1. Quarter context cards** — under the step label "Current quarter's goals",
one group per swimlane. Each group has a header (swimlane pill + quarter label)
followed by a `flex-wrap` row of `QuarterlyGoalCard`s — one per current-quarter
goal for that swimlane, including side quests. Cards are atomic: each either fits
on the current row or wraps to the next as a whole. Cards are sourced from
`upcoming_quarterly_goals` filtered to `due_quarter/year` matching the swimlane's
active quarter (from `quarter_context`). If a swimlane has no goals, a "No
quarterly goal set" placeholder is shown instead. Each card shows the goal text
and its waypoints (using the `WaypointList` visual treatment). No interactions.

**2. Missed goal ghosts** — all last week's misses collected together below the
context cards (conditional; hidden when nothing was missed). Each ghost is a
dimmed, dashed-border, non-interactive card with a swimlane pill identifying its
lane. A `missed last week` label appears above the group.

Ghost appearance: `opacity: 0.65`, `border: 0.5px dashed`, muted background.

**3. Goal lists** — under the step label "Goals for this week", one section per
swimlane plus one for Distractions. Each section has a lightweight header row
(swimlane pill + `targeting ~X%` label, updating live as the focus bar changes)
followed by a `PlanGoalsList`.

**Goal list contents** (per section):

- Goal text
- For swimlane goals: a waypoint picker `<select>` with `<optgroup>` separators by
  quarter (e.g. "Q2 2026", "Q3 2026"). Shows all incomplete waypoints from the
  current and future quarterly goals for that swimlane, sourced from
  `WeeklySessionData.upcoming_quarterly_goals`. Includes a "No specific waypoint"
  option.
- For distraction goals: a label picker (multi-select checkboxes from
  `DistractionLabel` list; optional)
- A delete button (visible on hover, `×` icon)

**Add goal button**: dashed border, full width, opens an inline entry form with:

- Text input (autofocused)
- Waypoint picker or label picker (depending on lane)
- Enter key submits; Escape cancels

### "Set Plan" / "No plan" button

Both paths call `onSave(req: WeeklyPlanRequest)` on `WeeklyPlanning`. The Tauri
entry point will invoke the backend command and close the calling window via the
injected `tauri::Window` parameter — no window ID is needed from the frontend.

**When any goals exist:** a full-width "Set Plan" button calls
`onSave({ type: 'Plan', focus, goals })`.

**When no goals are set:** the button shows "No plan for next week." in muted red
(matching the "missed last week" indicator color, `#7a3030`). Clicking it replaces
the button with an inline confirmation panel, containing:

- An optional 2-row `<textarea>` ("Why no plan? (optional)")
- A "Cancel" button (restores the warning button) and a "Confirm: no plan for next
  week" button that calls `onSave({ type: 'NoPlan', reason })`

Weight-sum validation is not needed — `FocusSplitBar` enforces 100% structurally
by redistributing remaining weight on every drag.

---

## Visual design

Follow the color and spacing conventions established in `GoalTree.css`.

Section containers:

- Border: `0.5px solid var(--color-border-tertiary)`
- Border radius: `var(--border-radius-lg)`
- Section header padding: `12px 16px`
- Active section header background: `var(--color-background-secondary)`

Step labels (e.g. "HOW DID THE WEEK GO?"):

- `font-size: 11px`, `font-weight: 500`, `letter-spacing: 0.05em`,
  `text-transform: uppercase`, `color: var(--color-text-tertiary)`

---

## Mock data

Extend `src/mockData.ts` with a `weeklySessionData: WeeklySessionData` export.
Use the same swimlanes and quarterly goals already present in the mock data.
The past week should have:

- 4 goals: 2 team, 1 personal, 1 distraction
- Planned split: 65% team, 25% personal, 10% distractions
- Actual split: ~50% team, ~20% personal, ~30% distractions
- Distraction labels used: `customer request ×3`, `bug ×1`
- Active waypoints: one in-progress per swimlane

---

## Tests to write

### RTL unit tests (`src/weekly/*.test.tsx`)

- `ReflectSection`: "Done reflecting" is blocked with unmarked goals
- `ReflectSection`: "Done reflecting" is blocked with empty notes
- `ReflectSection`: transitions to planning when all goals marked and notes filled
- `PastGoalsList`: first click sets hit; second sets miss; never returns to unmarked
- `PlanSection`: "Set Plan" calls `onSave` with a `Plan` payload when goals exist
- `PlanSection`: "No plan for next week." shows confirmation panel; confirm calls `onSave` with `NoPlan` payload
- `PlanSection`: "Edit" re-collapses planning section
- `PlanSection`: plan data survives the edit/re-complete cycle
- `FocusSplitBar`: segment boundaries drag correctly and always sum to 100%
- `ReflectionNotes`: placeholder text is correct for all-hit scenario
- `ReflectionNotes`: placeholder text is correct for missed-goals scenario

### Playwright e2e (`e2e/weekly.spec.ts`)

- Full happy path: mark all goals, write notes, complete reflection, set weights,
  add a goal, save
- Blocked transitions: verify planning section is not accessible before reflection
- Edit cycle: complete reflection, enter planning, click Edit, verify planning
  collapses, re-complete reflection, verify planning re-expands with data intact
- Header non-clickable: while in planning phase, clicking the reflection section
  header background (anywhere except the Edit button) must NOT expand the reflection
  or collapse planning — only the Edit button should trigger that transition

---

## Implementation checklist

- [x] **Step 0: Reconcile spec with current codebase**
  - This spec was written in a separate Claude session with knowledge of the data
    model and UX decisions, but without full visibility into current code conventions.
    Before implementing anything:
    - Read the key files listed in `0001-yearly-goals.md` to understand current
      conventions (component structure, CSS patterns, mock data shape, test setup)
    - Identify any conflicts or inconsistencies between this spec and those conventions
    - Amend this spec to resolve them — the codebase conventions win
    - Only proceed to Step 1 once the spec reflects the actual repo
- [x] **Step 1: Data model**
  - [x] Add `WeeklyGoal`, `WeeklyPlan`, `WeeklyReflection`, `WeeklyGoalRef`,
        `GoalOutcome`, `DistractionLabel`, `WeeklySessionData`,
        `SwimlanePlanningContext`, `SwimlanesFocus`, `SwimlaneWeight` (renamed
        from `SwimlaneWeightEntry`) to `src-tauri/src/models.rs`
  - [x] Add typed ID newtypes: `WeeklyPlanId`, `WeeklyReflectionId`,
        `WeeklyGoalId`, `DistractionLabelId`
  - [x] Run `cargo check` — no errors
  - [x] Run app in dev mode to regenerate `src/bindings.ts`
  - [x] Verify new types appear correctly in `bindings.ts`

- [x] **Step 2: Mock data**
  - [x] Extend `src/mockData.ts` with `weeklySessionData: WeeklySessionData`
        per the mock data spec above
  - [x] TypeScript compiles with no errors against the generated types

- [x] **Step 3: Test entrypoint**
  - [x] Create `ui-test-entrypoints/weekly.html` (copy from `goals.html`, change
        script src to `../src/weekly-main.tsx`)
  - [x] Create `src/weekly-main.tsx` (copy from `goals-main.tsx`, render
        `<WeeklyPlanning data={weeklySessionData} />`)
  - [x] Create stub `src/weekly/WeeklyPlanning.tsx` (accepts `data: WeeklySessionData`,
        renders placeholder — filled in by Steps 4+)
  - [x] Register `weekly.html` in `vite.config.ts` rollup inputs
  - [x] Verify the page loads in browser (no Tauri required)

- [x] **Step 4: WeeklyHeader**
  - [x] Title: "Week of [start date]", formatted via `Intl.DateTimeFormat`
  - [x] Subtitle: "Q2 · week N of 13" (derive from `plan.start_at` and calendar)
  - [x] Week-end picker: dropdown with options for each remaining day of the week,
        plus one option for "next Monday". Default: Friday of the current week.
        (Phase 1: purely cosmetic — no logic needed beyond rendering)
  - Note: `WeeklySessionData` gained a `calendar` field (parallel to `GoalTreeData`)
    so the header has access to both `locale` and `timezone` for `Intl.DateTimeFormat`.

- [x] **Step 5: TimeSplitBars**
  - [x] Planned bar from `weights`
  - [x] Actual bar from `actual_split`, values rounded to nearest 5% with `~`
  - [x] Distraction label pills below actual bar (from mock data)
  - [x] Legend below bars
  - Note: implemented as part of Step 10; `TimeSplitBars.tsx` uses two `FocusSplitBar`
    instances (planned = read-only, actual = read-only with delta tooltips). Distraction
    pills rendered from mock data. Legend omitted — not needed given the bar labels.

- [x] **Step 6: PastGoalsList**
  - [x] Render all goals from mock data
  - [x] Click cycles: unmarked → hit → miss → hit → … (never back to unmarked)
  - [x] Stats row updates live
  - [x] Strikethrough on hit goals

- [x] **Step 7: WaypointHealthList**
  - [x] One card per swimlane (skipped if no active waypoint)
  - [x] Three confidence buttons, single-select
  - [x] No deselect on re-click
  - Note: button colors use darker/more saturated shades than the spec's pastels,
    which are designed for light themes and read poorly on the dark background.

- [x] **Step 8: ReflectionNotes + validation**
  - [x] `buildReflectionPrompt` helper with all four placeholder rules
  - [x] Red ring + inline error when empty on submit attempt (invalid prop; wired up in Step 9)
  - Note: goal rows use a single-line layout with a fixed-width muted swimlane chip
    (low-opacity color-mix background) rather than a stacked subtitle, for compactness.
    Chip width is fixed at 76px so all goals align regardless of swimlane name length.

- [x] **Step 9: ReflectSection assembly + phase transition**
  - [x] Assemble steps 5–8 into `ReflectSection`
  - [x] "Done reflecting" validates goals + notes before transitioning
  - [x] On success: collapse reflection, show "Edit" button, expand planning
  - Note: `LocalOutcome`, `initialOutcome`, `nextOutcome` exported from `PastGoalsList.tsx`
    so `ReflectSection` owns outcome state and passes `outcomes`/`onToggle` props down.
    Collapsed reflect section shows "Done" + "Edit" button; clicking header toggles a peek
    without triggering the edit transition. `PlanSection` is a stub (Steps 10–14 fill it).

- [x] **Step 10: FocusSplitBar (replaces slider spec)**
  - [x] One draggable stacked bar instead of per-swimlane sliders
  - [x] Running total error hint when ≠ 100%; quarterly target reminder below
  - [x] `isEditable` makes segment boundaries draggable (snap to 5%, min 5% per segment)
  - Note: lives in `src/shared/FocusSplitBar.tsx`. `TimeSplitBars` now uses two instances
    (planned = read-only, actual = editable with delta tooltips). `PlanSection` uses one
    editable instance for intended focus. Added `current_weights: SwimlaneWeightPeriod`
    to `WeeklySessionData` for the quarterly target line.

- [x] **Step 11: SwimlaneQuarterContext card**
  - [x] Read-only; shows quarterly goal text and waypoints
  - [x] Waypoint completion states match `WaypointList` visual treatment
  - Note: also shows swimlane identity (colored left bar + pill) and a "Current quarter's
    goals" section header. Swimlane passed as optional prop; quarter label uses `quarter.label`.

- [x] **Step 12: MissedGoalGhosts**
  - [x] Derive from past goals that were marked miss in `ReflectSection`
  - [x] Ghost appearance: dimmed, dashed border, non-interactive
  - [x] "Missed last week" label above
  - [x] Appear in correct swimlane block (Distractions block deferred to Step 14)
  - [x] Ghosts are computed at phase transition time via `onDone(missed)` snapshot held
        in `WeeklyPlanning` state; passed to `PlanSection` as `missedGoals` prop

- [x] **Step 13: PlanGoalsList + AddGoalButton**
  - [x] Add goal inline form: text input + waypoint picker (or label picker)
  - [x] Enter key submits
  - [x] Delete button on hover
  - [x] Waypoint picker: only shows existing waypoints for active quarter;
        includes `(no specific waypoint)` option
  - [x] Label picker: multi-select from `DistractionLabel` list
  - Note: waypoint picker uses `<optgroup>` separators by quarter (e.g. "Q2 2026").
    Shows all incomplete waypoints across current + future quarters, sourced from
    `upcoming_quarterly_goals` (added to `WeeklySessionData` for this purpose).

- [x] **Step 14: PlanSection assembly + save**
  - [x] Assemble steps 10–13 into `PlanSection`
  - [x] "Edit" button re-collapses planning (does not discard data) — already
        working via ReflectSection's Edit button + phase state; no new code needed
  - [x] "Save" — implemented as "Set Plan" button calling `onSave({ type: 'Plan', ... })`;
        when no goals are set, replaced by a muted-red "No plan for next week." button
        with an inline confirmation panel that calls `onSave({ type: 'NoPlan', reason })`.
        `WeeklyPlanRequest` enum added to `models.rs` and registered with specta.
        `WeeklyPlanning` accepts `onSave: (req: WeeklyPlanRequest) => void` from its parent;
        the test entrypoint passes `console.log`; the Tauri entry point will invoke the
        backend command and close via the injected `tauri::Window`.

- [x] **Step 15: WeeklyPlanning assembly**
  - [x] Assemble all sections into `WeeklyPlanning`
  - [x] Phase state correctly gates section visibility
  - [x] Full flow works end-to-end with mock data

- [ ] **Step 16: RTL unit tests**
  - [ ] Write all tests listed in "Tests to write" above
  - [ ] All pass: `pnpm test`

- [ ] **Step 17: Playwright e2e tests**
  - [ ] Write all e2e tests listed above
  - [ ] All pass: `pnpm test:e2e`

- [ ] **Step 18: Graduate this doc**
  - [ ] Remove the implementation checklist from this file
  - [ ] Update the overview section to "Status: fully implemented"
  - [ ] Fill in the "Key files" table with actual paths
  - [ ] Add a "Non-obvious decisions" section documenting anything that diverged
        from this spec or required significant judgment during implementation
  - [ ] Update `0000-hrairto-overview.md`: mark weekly planning as ✅,
        update "Current status" line
  - [ ] Delete `claude-instructions/0002-mockups/` — the implemented code is now
        the visual reference, not the prototype screenshots
