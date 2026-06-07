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

**Status: UX designed, not yet implemented.**

---

## Mockups

Reference screenshots are in `claude-instructions/0002-mockups/`. These show the
intended UX from the design session. The spec takes precedence over the mockups
where they conflict — the mockups are visual reference, not the source of truth.

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
- Swimlane color constants (define in a shared `src/theme.ts` if not already present)

---

## Data model additions

Source of truth: `src-tauri/src/models.rs`. Add these structs (with
`#[derive(Debug, Clone, Serialize, Deserialize, Type)]` on each):

```rust
/// A weekly plan covers a contiguous time window (usually Mon–Fri, but
/// configurable — the user may end the week on Thursday before a holiday).
pub struct WeeklyPlan {
    pub id: WeeklyPlanId,
    pub start_at: Epoch,
    pub end_at: Epoch,
}

/// Intended swimlane weight for a specific weekly plan.
/// All entries for a plan must sum to 1.0.
/// Uses the same WeightTarget enum as SwimlaneWeightPeriod
/// (Swimlane(SwimlaneId) | Distractions).
pub struct WeeklyPlanWeight {
    pub id: WeeklyPlanWeightId,
    pub weekly_plan_id: WeeklyPlanId,
    pub target: WeightTarget,
    pub weight: f64,
}

/// A single goal within a weekly plan.
/// Exactly one of (swimlane_goal, distraction) is populated.
pub struct WeeklyGoal {
    pub id: WeeklyGoalId,
    pub weekly_plan_id: WeeklyPlanId,
    pub created_at: Epoch,
    pub text: String,
    pub outcome: Option<GoalOutcome>,   // None = not yet saved (UI only)
    pub goal_ref: WeeklyGoalRef,
}

pub enum GoalOutcome {
    Hit,
    Miss,
}

pub enum WeeklyGoalRef {
    /// Planned work: belongs to a swimlane, optionally tied to a waypoint.
    Planned {
        swimlane_id: SwimlaneId,
        waypoint_id: Option<WaypointId>,
    },
    /// Unplanned work: distraction with optional labels.
    Distraction {
        label_ids: Vec<DistractionLabelId>,
    },
}

/// Global distraction label — editing text propagates everywhere.
pub struct DistractionLabel {
    pub id: DistractionLabelId,
    pub text: String,
    pub created_at: Epoch,
}

/// Full payload for the weekly planning/reflection session.
/// Backend computes all derived fields; frontend just renders.
pub struct WeeklySessionData {
    pub plan: WeeklyPlan,
    pub weights: Vec<WeeklyPlanWeight>,
    pub goals: Vec<WeeklyGoal>,
    pub swimlanes: Vec<Swimlane>,
    pub distraction_labels: Vec<DistractionLabel>,
    /// Active quarter context per swimlane, for the planning section.
    /// Key: SwimlaneId (as string on wire)
    pub quarter_context: Vec<SwimlaneQuarterContext>,
    /// Actual time split for the past week, derived from DailyWorkDistributions.
    /// One entry per WeightTarget (Swimlane or Distractions).
    pub actual_split: Vec<ActualSplitEntry>,
}

pub struct SwimlaneQuarterContext {
    pub swimlane_id: SwimlaneId,
    pub quarter: QuarterDisplay,         // from existing models
    pub quarterly_goal: Option<QuarterlyGoal>,
    pub waypoints: Vec<Waypoint>,
}

pub struct ActualSplitEntry {
    pub target: WeightTarget,
    pub fraction: f64,   // 0.0–1.0, rounded to nearest 0.05 for display
}
```

Add typed ID newtypes following the existing pattern in `models.rs`:
`WeeklyPlanId`, `WeeklyPlanWeightId`, `WeeklyGoalId`, `DistractionLabelId`.

---

## Component hierarchy

```
WeeklyPlanning                  — top-level; owns phase state (reflecting | planning)
  WeeklyHeader                  — "Week of May 19" title, quarter/week label, week-end picker
  ReflectSection                — collapsible; always starts expanded
    TimeSplitBars               — planned vs actual stacked bars
    PastGoalsList               — past week's goals, each togglable hit/miss
    WaypointHealthList          — per-swimlane confidence call
    ReflectionNotes             — required textarea; blocks completion if empty
    ReflectDoneButton           — validates and transitions to planning phase
  PlanSection                   — collapsible; starts collapsed
    FocusWeightSliders          — one slider per swimlane + distractions; must sum to 100%
    SwimlanePlanBlocks          — one block per swimlane + one for distractions
      SwimlaneQuarterContext    — read-only quarter goal + waypoints reference card
      MissedGoalGhosts          — dimmed, non-interactive echoes of last week's misses
      PlanGoalsList             — user-entered goals for this week
        PlanGoalItem            — goal text + waypoint picker (or distraction label picker)
      AddGoalButton             — inline goal entry form
    SavePlanButton              — validates weights sum to 100%, then saves
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

- Unmarked: empty square border
- Hit: green fill + checkmark (`#EAF3DE` background, `#3B6D11` icon)
- Miss: red fill + × (`#FCEBEB` background, `#A32D2D` icon)

Goal text for hit goals gets a strikethrough.

A summary stat row at the top shows `N hit / N missed / N unmarked` and updates
live as the user marks goals.

Validation: "Done reflecting" is blocked until all goals are marked (unmarked count
= 0). Show an inline error message if the user tries to proceed with unmarked goals.

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

A `<textarea>` that is required before proceeding. If the user clicks "Done
reflecting" with an empty textarea, show a red focus ring and an inline error.

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

### Focus weight sliders

One slider per swimlane plus one for `Distractions`. All weights must sum to 100%.

- Sliders range 0–100, step 5.
- A running total is shown; if it doesn't equal 100, a red hint appears:
  `"Total is X% — adjust to reach 100%"`
- The quarterly target weights (from `SwimlaneWeightPeriod`) are shown as a
  reminder below the sliders: `Quarterly target: 70% team · 30% personal`
- The `targeting ~X%` label in each swimlane plan block updates live as sliders move.

### Swimlane plan blocks

One block per swimlane, one block for Distractions. Each block has:

**Header**: tinted background (swimlane color), lane name, `targeting ~X%` label.
Colors follow the existing swimlane color system from `GoalTree.css`.

**Quarter context card** (swimlane blocks only, not Distractions):
A read-only reference card showing:

- The active quarter label (e.g. "Q2 quarterly goal")
- The quarterly goal text
- Waypoints with their completion state (done / current / open), using the same
  visual treatment as `WaypointList` in the goal tree

This card is informational only — no interactions.

**Missed goal ghosts** (if any goals were missed last week in this swimlane):
Dimmed, dashed-border, non-interactive cards at the top of the goal list. They
echo missed goals from the reflection phase. They are visual reminders only —
not pre-populated entries, not interactive. A small label above them reads
`missed last week`.

Ghost appearance: `opacity: 0.65`, `border: 0.5px dashed var(--color-border-secondary)`,
`background: var(--color-background-secondary)`.

**Goal list**: user-entered goals for this week. Each goal shows:

- Goal text
- For swimlane goals: a waypoint picker dropdown (optional; shows only existing
  waypoints for this swimlane's active quarter; includes a `(no specific waypoint)`
  option)
- For distraction goals: a label picker (multi-select from `DistractionLabel` list;
  optional)
- A delete button (visible on hover, `×` icon)

**Add goal button**: dashed border, full width, opens an inline entry form with:

- Text input (autofocused)
- Waypoint picker or label picker (depending on lane)
- Enter key submits

### "Save week plan" button

Validates that all weight sliders sum to 100%. If not, shows an error and blocks
save. On success, transitions to a saved state (button text changes to `Saved.`).

---

## Visual design

Follow the color and spacing conventions established in `GoalTree.css`.

Section containers:

- Border: `0.5px solid var(--color-border-tertiary)`
- Border radius: `var(--border-radius-lg)`
- Section header padding: `12px 16px`
- Active section header background: `var(--color-background-secondary)`

Swimlane block headers (tinted):

- Team: background `#E6F1FB`, border-bottom `#B5D4F4`, text `#0C447C`
- Personal: background `#E1F5EE`, border-bottom `#9FE1CB`, text `#085041`
- Distractions: background `#F1EFE8`, border-bottom `#D3D1C7`, text `#444441`
- Additional swimlanes: use the palette from the goal tree

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
- `PlanSection`: "Save" is blocked when weights don't sum to 100%
- `PlanSection`: "Edit" re-collapses planning section
- `PlanSection`: plan data survives the edit/re-complete cycle
- `FocusWeightSliders`: total hint shows when sum ≠ 100%
- `ReflectionNotes`: placeholder text is correct for all-hit scenario
- `ReflectionNotes`: placeholder text is correct for missed-goals scenario

### Playwright e2e (`e2e/weekly.spec.ts`)

- Full happy path: mark all goals, write notes, complete reflection, set weights,
  add a goal, save
- Blocked transitions: verify planning section is not accessible before reflection
- Edit cycle: complete reflection, enter planning, click Edit, verify planning
  collapses, re-complete reflection, verify planning re-expands with data intact

---

## Implementation checklist

- [ ] **Step 0: Reconcile spec with current codebase**
  - This spec was written in a separate Claude session with knowledge of the data
    model and UX decisions, but without full visibility into current code conventions.
    Before implementing anything:
    - Read the key files listed in `0001-yearly-goals.md` to understand current
      conventions (component structure, CSS patterns, mock data shape, test setup)
    - Identify any conflicts or inconsistencies between this spec and those conventions
    - Amend this spec to resolve them — the codebase conventions win
    - Only proceed to Step 1 once the spec reflects the actual repo
- [ ] **Step 1: Data model**
  - [ ] Add `WeeklyGoal`, `WeeklyPlan`, `WeeklyPlanWeight`, `WeeklyGoalRef`,
        `GoalOutcome`, `DistractionLabel`, `WeeklySessionData`,
        `SwimlaneQuarterContext`, `ActualSplitEntry` to `src-tauri/src/models.rs`
  - [ ] Add typed ID newtypes: `WeeklyPlanId`, `WeeklyPlanWeightId`,
        `WeeklyGoalId`, `DistractionLabelId`
  - [ ] Run `cargo check` — no errors
  - [ ] Run app in dev mode to regenerate `src/bindings.ts`
  - [ ] Verify new types appear correctly in `bindings.ts`

- [ ] **Step 2: Mock data**
  - [ ] Extend `src/mockData.ts` with `weeklySessionData: WeeklySessionData`
        per the mock data spec above
  - [ ] TypeScript compiles with no errors against the generated types

- [ ] **Step 3: Test entrypoint**
  - [ ] Create `ui-test-entrypoints/weekly.html` (copy from `goals.html`, change
        script src to `../src/weekly-main.tsx`)
  - [ ] Create `src/weekly-main.tsx` (copy from `goals-main.tsx`, render
        `<WeeklyPlanning data={weeklySessionData} />`)
  - [ ] Verify the page loads in browser (no Tauri required)

- [ ] **Step 4: WeeklyHeader**
  - [ ] Title: "Week of [start date]", formatted via `Intl.DateTimeFormat`
  - [ ] Subtitle: "Q2 · week N of 13" (derive from `plan.start_at` and calendar)
  - [ ] Week-end picker: dropdown with options for each remaining day of the week,
        plus one option for "next Monday". Default: Friday of the current week.
        (Phase 1: purely cosmetic — no logic needed beyond rendering)

- [ ] **Step 5: TimeSplitBars**
  - [ ] Planned bar from `weights`
  - [ ] Actual bar from `actual_split`, values rounded to nearest 5% with `~`
  - [ ] Distraction label pills below actual bar (from mock data)
  - [ ] Legend below bars

- [ ] **Step 6: PastGoalsList**
  - [ ] Render all goals from mock data
  - [ ] Click cycles: unmarked → hit → miss → hit → … (never back to unmarked)
  - [ ] Stats row updates live
  - [ ] Strikethrough on hit goals

- [ ] **Step 7: WaypointHealthList**
  - [ ] One card per swimlane
  - [ ] Three confidence buttons, single-select, correct colors
  - [ ] No deselect on re-click

- [ ] **Step 8: ReflectionNotes + validation**
  - [ ] `buildReflectionPrompt` helper with all four placeholder rules
  - [ ] Red ring + inline error when empty on submit attempt

- [ ] **Step 9: ReflectSection assembly + phase transition**
  - [ ] Assemble steps 5–8 into `ReflectSection`
  - [ ] "Done reflecting" validates goals + notes before transitioning
  - [ ] On success: collapse reflection, show "Edit" button, expand planning

- [ ] **Step 10: FocusWeightSliders**
  - [ ] One slider per swimlane + Distractions
  - [ ] Running total with error hint when ≠ 100%
  - [ ] Quarterly target reminder below

- [ ] **Step 11: SwimlaneQuarterContext card**
  - [ ] Read-only; shows quarterly goal text and waypoints
  - [ ] Waypoint completion states match `WaypointList` visual treatment

- [ ] **Step 12: MissedGoalGhosts**
  - [ ] Derive from past goals that were marked miss in `ReflectSection`
  - [ ] Ghost appearance: dimmed, dashed border, non-interactive
  - [ ] "Missed last week" label above
  - [ ] Appear in correct swimlane block (or Distractions block)
  - [ ] Ghosts are computed at phase transition time, not re-derived on every render

- [ ] **Step 13: PlanGoalsList + AddGoalButton**
  - [ ] Add goal inline form: text input + waypoint picker (or label picker)
  - [ ] Enter key submits
  - [ ] Delete button on hover
  - [ ] Waypoint picker: only shows existing waypoints for active quarter;
        includes `(no specific waypoint)` option
  - [ ] Label picker: multi-select from `DistractionLabel` list

- [ ] **Step 14: PlanSection assembly + save**
  - [ ] Assemble steps 10–13 into `PlanSection`
  - [ ] "Edit" button re-collapses planning (does not discard data)
  - [ ] "Save" validates weights, then shows saved state

- [ ] **Step 15: WeeklyPlanning assembly**
  - [ ] Assemble all sections into `WeeklyPlanning`
  - [ ] Phase state correctly gates section visibility
  - [ ] Full flow works end-to-end with mock data

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
