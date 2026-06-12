# Hrairto — Concern / Main Quest model overhaul

**Status: draft — design agreed, not yet implemented.**

This spec is a **work order**, not enduring truth. It records the target concept model
and the staged plan to migrate the code to it; while the work is in flight, it **is**
the source of truth for the new model. When the work lands, `0000`/`0001`/`0002` are
**reconciled in place** to describe the new model as if swimlanes never existed
(`0001`/`0002` in Stages 3–4, `0000` in Stage 5), and this file graduates.

See `0000-hrairto-overview.md` for current main quest context — which this overhaul
supersedes wherever the two disagree.

---

## Why

The original model used **swimlanes** (Team / Personal) as the top-level unit and
hung **annual goals** beneath them, with swimlane-level **weights** expressing
intended focus. That conflated two jobs into one concept:

1. **Allocation** — "70% Team." But Team and Personal don't trade off week to week
   the way a weight implies; the app lives in the work tray and can't observe or
   move personal time. The weight governed nothing the user could act on.
2. **Grouping / labelling** — colouring and organising work by life-context. This
   was always fine; it just isn't an allocation unit.

The fix is to **split those jobs onto two orthogonal axes** and to merge the
redundant swimlane/annual-goal levels:

- Allocation moves to the **Main Quest** — the thing you actually push forward and
  budget against. (Absorbs the old annual goal; deadline is mandatory.)
- Grouping becomes a featherweight **Concern** — just a name and a colour. No
  weight, no deadline, no cascade.

Net: the same number of nouns, but each now has exactly **one** job, and the two
axes that were tangled inside "swimlane" are pulled apart. The horizons
(quarter / month / week / day) are irreducible — they are the product — so this is
about as much simplification as is available without deleting the thesis.

---

## Target concept model

The model has two orthogonal axes: **Activity** (what kind of time-spend this is —
the allocation axis) and **Concern** (how it's labelled / coloured — the grouping
axis).

### Axis 1 — Activity: the three kinds

All time falls into one of three kinds of **Activity**, ordered as a gradient that
sheds structure at each step (they are _not_ flat peers):

| Activity        | Forward motion?                                             | Carries a Concern?                | Deadline?                                    | Allocation                              |
| --------------- | ----------------------------------------------------------- | --------------------------------- | -------------------------------------------- | --------------------------------------- |
| **Main Quest**  | yes — on the roadmap                                        | yes                               | yes (mandatory)                              | one weight **per** active main quest    |
| **Side-quest**  | yes — off the roadmap (opportunistic, quarter-scale)        | yes                               | inherits its quarter (none while backlogged) | one **pooled** weight (all side-quests) |
| **Distraction** | **no** — necessary but non-advancing (bugs, support, lunch) | **no** — global "everything else" | n/a                                          | one **pooled** weight                   |

The weekly focus bar allocates across **units of Activity**: each active Main Quest, the
single side-quest pool, the single distraction pool. This trichotomy is already in the
model — **rename `WeightTarget` to `Activity`** so the concept is named where it does
the most work (allocation):

- `Activity = MainQuest(MainQuestId) | SideQuests | Distractions` — the unit a focus
  weight points at. The weight struct's field becomes `activity` (not `target`).
- The same trichotomy also surfaces in `ParentGoal` (a quarterly goal's parent:
  `MainQuest | SideQuest`) and `WeeklyGoalRef` (`Planned | Distraction`), each with a
  shape suited to its level. We deliberately **don't** force one shared enum across
  all three — `Activity` carries the name; the others stay shaped for their job.

The gradient is the point: the focus bar reads as _how much of the week is reserved
for necessary non-advancement (the distraction pool), and how is the remaining
forward-motion budget split across on-roadmap (main quests) and off-roadmap
(side-quests) work._

### Axis 2 — Concern: the label over forward-motion work

**Concern** (Team / Personal) is just a name and a colour. It labels and groups the
**forward-motion** kinds of Activity — Main Quests and side-quests. It carries no weight,
no deadline, no cascade. Distractions are unlabelled by definition.

**Allocation never mentions Concern** — Concerns are purely how work is organised and
coloured, never how the week is budgeted. The moment a Concern gets a weight, the
Team/Personal mistake is back.

Concern is also the seed of the future enterprise grouping: Team/Personal today,
Team/Org one level up later. Same concept, same pill.

**Why not "Activity Label":** (a) distractions are an Activity but carry no Concern,
so the name would promise a universal property the model doesn't have; and (b) the
model already has `DistractionLabel` ("bug", "customer request") — a second "label"
concept would reintroduce exactly the overloading "Concern" was chosen to avoid. Keep
the name **Concern**; it is the label _axis_, not a property of every Activity item.

### Side-quest backlog

A side quest's **schedule (quarter) is optional**. `None` = it sits in a **backlog**:
a pool of sized-but-unplaced side quests. During quarterly (or annual) planning you
pull from the backlog into a quarter to fill the room a blocked or behind main quest
leaves ("the main quest's stuck this quarter — pull in an extra 2-star side quest")
or swap by size ("main quest's behind — swap the 3-star for a 1-star").

**Size, date, and text are all carried by the waypoints — there is no separate `stars`
field.** A quarterly goal's waypoints become a fixed **`[Option<Waypoint>; 3]`**, where
the **index is the month-of-quarter** (slot 0 = first month, … slot 2 = third). That one
shape does everything:

- **Size** = the count of `Some` slots (the "stars", 1–3); the `[_; 3]` makes "≤3
  monthly milestones" structural.
- **Date** = index + the goal's quarter — _derived, never stored_. So `Waypoint` drops
  `target_month`/`target_year` (and its now-redundant `quarterly_goal_id`), shrinking to
  ~`{ id, text, completed_at }`. A backlogged goal has no quarter, so its `Some` slots
  simply have no date and render as stars — **while keeping their text**, so
  backlog → reschedule never re-scopes the work.

**Completed-then-rescheduled is a pure rendering concern**, not a data problem:
`completed_at` and the `Some`-count survive untouched; only the _derived planned_ month
goes stale, and you never needed it for done work. Rule: **a completed waypoint renders
by its `completed_at` date; an incomplete one by slot + quarter** (or as a star when
backlogged). Normally these agree; after a reschedule the completed slot honestly shows
when it was actually done.

Because the array carries size and text without storing the month, **side quests stay
unified with main quest chunks as `QuarterlyGoal`** (optional `due_quarter`/`due_year`,
`concern_id` on the `SideQuest` arm of `parent`) — **no split needed.** Validation:
≥1 `Some` slot. This is captured now because making scheduling optional is a one-way
door once persistence lands.

The backlog **UX** — pulling and swapping during planning — belongs to the
quarterly-planning session (not yet designed; out of scope here). In the goal tree,
_scheduled_ side quests appear in their quarter columns; surfacing the backlog itself
is deferred.

### Promotion (side-quest → main quest)

**Not in scope to build yet** — recorded only so the model isn't designed into a
corner. A side quest is a single quarterly goal in the side-quest pool, so one day a
side quest that earns its own protected budget could be **promoted** by re-parenting
that quarterly goal under a new Main Quest — and demoted by the reverse. We believe this
keeps it from being a one-way door, but the mechanics are deferred until it's actually
needed.

### Capacity — surfaced, not modelled

Capacity (am I over-committed this quarter?) is **emergent and eyeballed**, not
stored or computed. There is **no capacity number, no `m`, no threshold line, and no
"oversubscribed" verdict** — those attribute a precision this judgment doesn't have.
Real reasoning is comparative: _"a big side quest in Q1, so the main quest crawls;
a 3-week one in Q2, so we catch up."_ The product owns the **representation**; the
human owns the **verdict**. Consequently capacity needs **no new data model** — it is
purely a way of rendering data that already exists.

It surfaces in the **goal-tree redesign** (Stage 3), which flips the layout to
**time × load**:

- A **column is a quarter**; the active forward-motion Activities **stack vertically**
  within it. A main quest spans quarters, so in each column it's represented by _that
  quarter's chunk_ (its quarterly goal), not the whole main quest; a side quest scheduled
  in the quarter stacks alongside. Column height reads relatively — taller = fuller. No
  line, no verdict.
- **Block height = the Activity's waypoint count (1–3).** This is _derived_ (waypoints
  are already entered in planning, so size is free — no effort-estimate to invent),
  _honestly coarse_ (1–3 ≈ small/medium/large), and a _duration_ proxy (waypoints are
  monthly milestones). It visualises the Q1/Q2 reasoning above for free. Caveat: it's
  duration, not true effort — don't read the heights as precise.
- **Colour = Concern.** Concern is never a layout band here, only the card colour —
  consistent with Activity × Concern.
- This retires the nested-scroll critique from the UX review (one vertical axis, one
  horizontal axis, no per-swimlane internal scroll).

**Distractions do not appear on the timeline at all** — not as a block, not as
headroom. They appear _only_ in the top-right allocation donut. And the donut's job
is **prediction → reflection**, not planning: the distraction weight is a _forecast_
of the unavoidable tax, not a target you steer toward. Its payoff is retrospective —
a year on, "we forecast 20% distraction, reality was 40%" is one concrete answer to
"why did we miss." (Same lens applies to the whole donut split.)

---

## Naming map (old → new)

| Old                                                            | New                                                                                                          | Notes                                                                                                                                       |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `Swimlane`                                                     | `Concern`                                                                                                    | strip to `{ id, name, color }`; no weight association                                                                                       |
| `SwimlaneId`                                                   | `ConcernId`                                                                                                  |                                                                                                                                             |
| `AnnualGoal`                                                   | `MainQuest`                                                                                                  | `swimlane_id` → `concern_id`; deadline stays mandatory                                                                                      |
| `AnnualGoalId`                                                 | `MainQuestId`                                                                                                |                                                                                                                                             |
| `AnnualGoalRef` (`MainQuest` \| `SideQuest`)                   | `ParentGoal` (`MainQuest(MainQuestId)` \| `SideQuest { concern_id: ConcernId }`)                             | a quarterly goal's parent is a Main Quest or the side-quest pool; `SideQuest` uses struct syntax because the field is a _different_ id type |
| `WeightTarget` (`Swimlane(id)` \| `Distractions`)              | `Activity` (`MainQuest(id)` \| `SideQuests` \| `Distractions`)                                               | renamed so the trichotomy is named where it matters (see Axis 1)                                                                            |
| `SwimlaneWeight` / `SwimlaneWeightPeriod` / `SwimlanesFocus`   | `WeightEntry` / `WeightPeriod` / `Focus`                                                                     | drop the now-wrong `Swimlane` prefix; `WeightEntry`'s field `target` → `activity`; also `SwimlaneWeightPeriodId` → `WeightPeriodId`         |
| `QuarterlyGoal.swimlane_id`                                    | (derive from parent — see below)                                                                             |                                                                                                                                             |
| `QuarterlyGoal.due_quarter` / `due_year` (required)            | **optional** (`None` = backlog side quest)                                                                   | **new** — the backlog decision (see Side-quest backlog)                                                                                     |
| `QuarterlyGoal.waypoints: Vec<Waypoint>`                       | `[Option<Waypoint>; 3]` — index = month-of-quarter                                                           | **new shape** (spiked: specta rc.22 exports as `[(Waypoint \| null), (Waypoint \| null), (Waypoint \| null)]` ✓). Validate ≥1 `Some`        |
| `Waypoint { target_month, target_year, quarterly_goal_id, … }` | drop `target_month` / `target_year` (month = slot index + quarter) and the now-redundant `quarterly_goal_id` | shrinks to ~`{ id, text, completed_at }`                                                                                                    |
| `WeeklyGoalRef::Planned { swimlane_id, .. }`                   | `Planned { concern_id, .. }`                                                                                 | minimal change; weekly-screen grouping is an open call (Stage 4)                                                                            |
| `SwimlanePlanningContext`                                      | `MainQuestPlanningContext` (likely)                                                                          | shape depends on Stage 4                                                                                                                    |
| `GoalTreeData.swimlanes` / `.annual_goals`                     | `.concerns` / `.main_quests`                                                                                 |                                                                                                                                             |

**Concern placement on `QuarterlyGoal` (decided):** `concern_id` lives _only_ on the
`SideQuest { concern_id }` arm of `ParentGoal`. A `MainQuest`-parented goal's Concern
is derived from its Main Quest. This avoids a redundant field and the "must match the
parent" invariant. Frontend resolution: one extra map lookup for the `MainQuest` case;
direct for `SideQuest`.

---

## Staged migration plan

Each stage is independently checkable. Logic lives in Rust and `bindings.ts` is
generated, so the Rust model gates everything — do Stage 1 first and expect the
frontend `tsc` to go red; that red is the worklist for Stages 2–4.

### Stage 1 — Rust model + generated bindings

- [x] `src-tauri/src/models.rs`: apply the naming map. Rename id newtypes; `Swimlane`→
      `Concern`; `AnnualGoal`→`MainQuest`; introduce `ParentGoal`; rename `WeightTarget`→
      `Activity` (and its weight field `target`→`activity`); rename the weight/focus
      structs; `WeeklyGoalRef::Planned` field; rename payload
      fields on `GoalTreeData` / `WeeklySessionData`.
- [x] Decide `concern_id` placement on `QuarterlyGoal` (`SideQuest` arm vs flat field
      — see the naming-map note).
- [x] **Backlog support** (see "Side-quest backlog"): make `due_quarter`/`due_year`
      optional (`None` = backlog), switch `QuarterlyGoal.waypoints` to `[Option<Waypoint>; 3]`
      (index = month-of-quarter; specta exports as a TS tuple ✓), and drop
      `Waypoint.target_month`/`target_year` (derived) and `quarterly_goal_id`. Keep side quests
      unified with main quest chunks (no split). Validate ≥1 `Some`.
      **Not skippable: Stage 2's example uses backlog items.**
- [x] `src-tauri/src/calendar.rs` and any logic referencing the renamed types.
- [x] Regenerate `src/bindings.ts` via `pnpm test:rust` (the export test rewrites it;
      do **not** hand-edit) and commit the result — CI fails on drift.
- [x] Verify: `pnpm test:rust` and `cargo fmt --check` green; `pnpm tsc` red (expected).

### Stage 2 — Mock data

- [x] Rewrite `src/mockData.ts` to the corrected example (see below). This is the first
      time the model is exercised honestly — the focus split becomes a real decision.
- [x] Verify: `mockData.ts` type-checks against the new bindings.

### Stage 3 — Goal tree screen **redesign** (`src/goals/`, spec `0001`)

A redesign, not a port — see "Capacity — surfaced, not modelled" above for rationale.

- [ ] Flip the layout to **time × load**: one column per quarter; forward-motion
      Activities stack vertically; block height = waypoint count (1–3); colour = Concern
      (on the cards, not as bands). Read relatively — no capacity line, no verdict. (Retires
      the nested-scroll critique by construction — no per-swimlane internal scroll.)
- [ ] **Distractions do not render on the timeline.** The header allocation donut
      (`WeightDisplay`) is their only home; it now shows **per-main-quest + side-quests +
      distractions** as the predicted split (its purpose is prediction → reflection).
- [ ] Reconcile `0001-yearly-goals.md` to the redesigned screen.
- [ ] Verify: `pnpm test:ts-unit` + `pnpm test:e2e` for goals.

### Stage 4 — Weekly screen (`src/weekly/`, spec `0002`)

- [ ] **Biggest semantic change.** The focus bar allocates across **main quests +
      side-quests + distractions**, not Concerns. `FocusSplitBar` / `TimeSplitBars` /
      `PlanSection` change accordingly.
- [ ] **Decide:** do goal-entry sections group by Concern (visual, like today) or by
      Main Quest (matching allocation)? Don't carry the swimlane grouping forward by inertia.
- [ ] Quarter context (`*PlanningContext`) becomes per-main-quest.
- [ ] Reconcile `0002-weekly-planning.md` to the new model.
- [ ] Verify: `pnpm test:ts-unit` + `pnpm test:e2e` for weekly.

### Stage 5 — Reconcile `0000` + graduate

- [ ] Rewrite the swimlane / annual-goal sections of `0000-hrairto-overview.md` to the
      Activity × Concern model (Main Quest / Side-quest / Distraction, the two pooled
      Activities, the forward-motion framing). `0001`/`0002` were reconciled in Stages 3–4.
- [ ] Mark this spec graduated.
- [ ] Verify: `pnpm all` (format, tsc, lint, all tests).

---

## Revised example data (for Stage 2)

**Why this shape:** every Activity draws on the _same controllable budget_ — the
user's work hours — so the focus weights are genuine, movable trade-offs. This
**includes the Personal-growth items**: learning Rust and mentoring are pursued **on
work time**, not personal _time_ (hence the explicit name — it's growth, not an
off-hours budget), so they still compete for the same hours. (The original
half-marathon failed exactly here — training comes out of evenings the work-tray can't
observe or shift.) The lesson the example teaches: **Concern marks a category, never a
separate budget.**

(Specifics provisional — final pass before Stage 2.)

**Concerns:** two — **Team** (blue) and **Personal growth** (green). Personal growth
appears _only_ in side quests (no main quest of its own), which keeps the colour axis
alive without re-introducing a non-fungible budget.

**Main Quests** (both Team) _(a main quest's start is emergent — its first scheduled
quarter — not a stored field)_:

- **Ship FizzBuzz v1** — starts Q2 2026 (now), due Q4 2026; chunks in Q2 / Q3 / Q4 2026.
- **Break apart the monolith** — starts Q4 2026, due Q4 2027; chunks Q4 2026 → Q4 2027.

  _Two main quests under one Concern — demonstrates Concern ≠ Main Quest. They overlap only
  in **Q4 2026**._

**Side-quests, scheduled** (`★` = waypoint count = block height):

- **API v2** — Team, 2★, Q2 2026
- **Prototype: port service to Rust** — Team, 3★, Q3 2026
- **Take on one mentee** — Personal growth, 1★, Q2 2026
- **Learn Rust** — Personal growth, 2★, Q1 2027

**Side-quests, backlog** (`schedule = None`, both Team):

- **Evaluate a GraphQL gateway** — 2★
- **Internal CLI tooling** — 1★

**The load picture this yields** (the Stage-3 capacity payoff, read by eye):

- Q2 2026 (now): FizzBuzz + API v2 + the mentee quest — moderate.
- Q3 2026: FizzBuzz + the 3★ Rust port — heavy.
- **Q4 2026: FizzBuzz wrapping up _and_ the monolith starting — heavy from the main quest
  overlap alone.** The crunch shows a quarter out, while there's still time to pull the
  backlog in/out to relieve it.
- Q1 2027: monolith + Learn Rust — moderate.

**Current focus weights** (the Q2 2026 donut — only FizzBuzz is active yet; the
monolith isn't allocated until it starts in Q4): FizzBuzz 0.55 · Side-quests 0.30 ·
Distractions 0.15. (Side-quests is one pooled weight spanning both Concerns' side
quests.)

The weekly mock (`weeklySessionData`) should be re-derived from these main quests and
side-quests at Stage 4 rather than kept from the swimlane era.

---

## Notes

- Phase 1 is **mock-only** — there is no SQLite and no persistence, so this is a
  refactor plus a mock-data rewrite, not a data migration. Risk is contained.
- This overhaul touches ~26 files; the goal-tree and weekly _screens_ need real
  redesign (their layouts assumed swimlane bands and swimlane weights), not a
  find-and-replace — and their spec docs `0001`/`0002` get reconciled alongside (Stages 3–4).
