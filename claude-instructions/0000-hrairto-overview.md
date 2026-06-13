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

The model has two orthogonal axes: **Activity** (what kind of time-spend this is —
the allocation axis) and **Concern** (how work is labelled and coloured — the
grouping axis). These are distinct jobs that used to be tangled in a single concept;
keeping them separate is the design's load-bearing insight.

### Concerns

A user has 2–N named, colored Concerns — typically "Team" and "Personal growth",
but fully configurable. A Concern is a grouping and colour label — nothing more. It
has no weight, no deadline, and no goal cascade. It labels and colours forward-motion
work (Main Quests and side quests). Distractions are unlabelled by definition.

### Activity — the three kinds

All time falls into one of three Activities, ordered as a gradient that sheds
structure at each step:

1. **Main Quest** — on-roadmap, long-horizon work with a mandatory deadline (fiscal
   quarter + year). Each active Main Quest belongs to a Concern and gets its own
   protected allocation weight in the weekly focus bar.

2. **Side quests** — forward-motion work that isn't on the roadmap. A side quest is
   a `QuarterlyGoal` parented to a Concern directly (not to a Main Quest). It may be
   scheduled to a quarter or sit in a backlog (`due_quarter = None`). All side quests
   share one pooled allocation weight.

3. **Distractions** — everything else. Any work not in the quarterly plan: reactive
   work (incidents, bugs) and unplanned work alike. Both pull the user from stated
   objectives regardless of merit. Distractions are first-class: they carry labels
   ("bug", "customer request"), are tracked separately, and surface in reflections as
   context for why actuals diverged from plans. All distractions share one pooled
   allocation weight.

The weekly focus bar allocates across all three: one segment per active Main Quest,
one pooled segment for all side quests, one pooled segment for all distractions.

### Goal hierarchy

The planning cascade below a Main Quest:

```
Main Quest        (due a specific fiscal quarter, e.g. "end of Q4 2026")
  └── Quarterly goal  (due a specific quarter; None = backlogged)
        └── Waypoints     (monthly milestones, 1–3; index = month-of-quarter)
              └── Weekly goals   (what I'll do this week toward this waypoint)
                    └── Daily focus  (which weekly goals I'm touching today)
```

Side quests share the same `QuarterlyGoal → Waypoints → Weekly goals` cascade; they
just have a Concern as parent rather than a Main Quest.

### Sessions

Five types of planning/reflection sessions, each with its own UX:

1. **Long-term planning** — quarterly cadence; every 4th quarter includes the annual
   zoom. Sets Main Quests, quarterly goals, waypoints, and focus weights.
2. **Weekly planning/reflection** — looks back at last week, plans the next.
   Two-phase: reflect first (locked before planning begins), then plan.
3. **End-of-day check-in** — marks today's goals hit/miss, plans tomorrow's focus.
   Tomorrow's plan IS the next day's starting point — no separate morning session.
4. **Mid-day check-in** — lightweight "how's the morning going" with no planning.

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
| -------------- | ------------------------------ | ----------------------------------------------------------- |
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

Source of truth: `src-tauri/src/models.rs`. Key points:

- All point-in-time values are `Epoch(i64)` — milliseconds UTC. Milliseconds (not
  seconds) so JavaScript's `Date.now()` and `Intl.DateTimeFormat` work without
  any ×1000 conversion.
- Quarter/month on planning objects are stored as `(year, quarter)` or
  `(year, month)` — never as timestamps — because they are calendar concepts,
  not instants. All are 1-based to match `chrono` conventions.
- IDs are typed newtypes (`ConcernId`, `MainQuestId`, etc.) wrapping `Uuid`.
  They serialize as plain strings on the wire, so TypeScript sees them as `string`.
- A `Calendar` config (quarter start month + IANA timezone + BCP 47 locale) is the
  single source of truth for deriving real time ranges from fiscal quarter/month values.
- Focus weights are time-varying: stored as `FocusTarget` records with a `start_at`
  timestamp. Each entry points at an `Activity` (`MainQuest(id) | SideQuests |
Distractions`) — never at a Concern.
- Distraction labels are global and stable — editing a label propagates everywhere.
- Goals do not have a "pending" state in storage; unmarked during UI interaction
  means not yet saved, but everything persisted is either Hit or Miss.

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

Phase 1 in progress. Goal tree view and weekly planning/reflection are fully implemented.

## Screens

- ✅ Goal tree view (read-only) — designed and implemented; see `0001-yearly-goals.md`
- ✅ Weekly planning/reflection session — designed and implemented; see `0002-weekly-planning.md`
- ✅ End-of-day check-in — UX designed
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
