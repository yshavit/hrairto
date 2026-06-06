# Hrairto — project overview

## What it is

Hrairto is a local-first, cross-platform desktop app for cascading goal planning
and daily work tracking. It helps a senior individual contributor maintain alignment
between their long-term goals and their day-to-day work.

The core idea: most productivity tools are either pure planning (goal trees with no
tracking) or pure tracking (time logs with no goals). Hrairto closes the loop —
you plan at multiple horizons, log what you actually do, and the app surfaces the
gap between the two.

## Who it's for

A senior IC (individual contributor) who:

- Has both team goals ("ship Xyz") and personal career goals ("get promoted")
- Works in an environment with IT policies that prohibit posting company data to
  unvetted SaaS vendors — so the app must be fully local, no cloud required
- Wants scheduled nudges (like a system tray prompt) to stay on track without
  switching to a separate app

## Core concepts

### Swimlanes

The top-level organizing unit. A user has 2–N named, colored swimlanes — typically
"Team" and "Personal", but fully configurable. Each swimlane has its own goal
hierarchy. Swimlanes have weights (e.g. 70% Team / 30% Personal) that represent
intended focus allocation. Weights are time-varying and stored separately from the
swimlane definition.

### Goal hierarchy

Within each swimlane, goals cascade from long-term to short-term:

```
Annual goal       (due a specific fiscal quarter, e.g. "end of Q4 2026")
  └── Quarterly goal  (due a specific quarter)
        └── Waypoints     (monthly milestones, 1–3 per quarter)
              └── Weekly goals   (what I'll do this week toward this waypoint)
                    └── Daily focus  (which weekly goals I'm touching today)
```

### Sessions

Five types of planning/reflection sessions, each with its own UX:

1. **Long-term planning** — quarterly cadence; every 4th quarter includes the annual
   zoom. Sets annual goals, quarterly goals, waypoints, and swimlane weights.
2. **Weekly planning/reflection** — looks back at last week, plans the next.
   Two-phase: reflect first (locked before planning begins), then plan.
3. **End-of-day check-in** — marks today's goals hit/miss, plans tomorrow's focus.
   Tomorrow's plan IS the next day's starting point — no separate morning session.
4. **Mid-day check-in** — lightweight "how's the morning going" with no planning.

### Three kinds of work

Hrairto organizes all work into exactly three categories:

1. **Long-term goals** — set in quarterly planning sessions; cascade from annual
   goals down to weekly goals. This is the main hierarchy.

2. **Side quests** — intentional work planned for a quarter or month that doesn't
   serve any annual goal. Deliberate and worthwhile, just outside the long-term
   hierarchy. Represented as `AnnualGoalRef::SideQuest` on `QuarterlyGoal`.

3. **Distractions** — everything else. Definitionally: any work that wasn't in the
   quarterly plan. This includes both reactive work (oncall incidents, urgent bugs)
   *and* unplanned work the user chose to take on mid-week. Conflating these is
   intentional — both are pulling the user away from their stated objectives,
   regardless of merit. Distractions are a first-class concept: they have labels
   ("bug", "customer request", "external team"), are tracked separately from planned
   work, and surface in reflections as context for why actuals diverged from plans.

Swimlane weights account for all three: a `SwimlaneWeightPeriod` can allocate
budget to specific swimlanes (`WeightTarget::Swimlane`) and to distractions as a
whole (`WeightTarget::Distractions`), so the user sets intentional expectations
for how much unplanned work they absorb.

### No carryover

Goals do not carry over automatically between weeks. A missed goal is a miss.
Re-entering it next week is an intentional act. This is by design.

### Tray-first

The app lives in the system tray. The default interaction is a small popup for
check-ins. Planning sessions open as larger dedicated windows. On startup, the tray
shows today's goals — set by yesterday's end-of-day check-in. Yesterday-you already
did the thinking; today-you just executes.

## Tech stack

| Layer          | Choice                         | Why                                                         |
|----------------|--------------------------------|-------------------------------------------------------------|
| Desktop shell  | Tauri                          | Cross-platform, lightweight, native tray support            |
| Backend        | Rust                           | Local-first, fast, type-safe; all business logic lives here |
| Frontend       | React + TypeScript             | Familiar ecosystem, strong Claude Code support              |
| Database       | SQLite (local)                 | No server, no sync required; user can layer their own cloud |
| Type sharing   | specta + tauri-specta          | Generates TypeScript types from Rust structs automatically  |
| Frontend tests | Vitest + React Testing Library | Behavioral UI tests                                         |
| Backend tests  | cargo test + in-memory SQLite  | Unit and integration tests                                  |

**Key architectural principle:** React is a thin display layer. All business logic,
data access, and computation lives in Rust. Tauri commands are the boundary —
thin wrappers that call into Rust and return typed data to React.

## Data model (summary)

Full details in `data_model.mermaid`. Key points:

- All timestamps are Unix timestamps (UTC) for point-in-time events
- Quarter/month on planning objects are stored as `(year, quarter)` or
  `(year, month)` — never as timestamps — because they are calendar concepts,
  not instants. All are 1-based to match `chrono` conventions.
- A `Calendar` config (quarter start month + IANA timezone) is the single source
  of truth for deriving real time ranges from fiscal quarter/month values
- Swimlane weights are time-varying: stored as `SwimlaneWeightPeriod` records
  with a `start_at` timestamp, not as a property of the swimlane itself
- Distraction labels are global and stable — editing a label propagates everywhere
- Goals do not have a "pending" state in storage; unmarked during UI interaction
  means not yet saved, but everything persisted is either Hit or Miss

## Build plan

**Phase 1 — wired-up mockups (current phase)**
All screens built in React with hardcoded TypeScript data. No Tauri commands, no
SQLite. Rust structs defined and TypeScript types generated via specta, so mock
data conforms to the real shape. Goal: validate UX before investing in backend.

**Phase 2 — backend**
SQLite schema, Rust business logic, Tauri commands. Fully tested in isolation.

**Phase 3 — wire together**
Replace hardcoded data with real Tauri command calls, top-down (annual goals first,
daily tracking last).

## Current status

Phase 1 in progress. Tray scaffold is working. Next: goal tree view (read-only).

## Screens designed so far

- ✅ Goal tree view (read-only) — see `hrairto_goal_tree_spec.md`
- ✅ Weekly planning/reflection session
- ✅ End-of-day check-in
- 🔲 Quarterly planning session (UX not yet designed)
- 🔲 Mid-day check-in (simple variant of end-of-day zone 1)
- 🔲 Tray popup container

## Conventions

- IDs are strings (use UUIDs or ULIDs)
- Months and quarters are 1-based throughout (January = 1, Q1 = 1)
- "Fiscal year N" means the fiscal year whose first quarter starts in calendar year N
- Timezone parsing always returns a `Result` — never `.unwrap()` or `.expect()` on
  user-supplied timezone strings in production code
- React components receive all data as props — no `invoke()` calls inside components
  during phase 1, and ideally not in phase 3 either (fetch at the edge, pass inward)