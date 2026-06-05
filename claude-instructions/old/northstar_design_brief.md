# Northstar — design brief

## What it is

A local-first, cross-platform native app (target: Tauri + Rust backend) for cascading goal planning and daily tracking. It bridges the gap between long-term goals and day-to-day work by helping a user maintain a hierarchy of goals — annual → quarterly → weekly → daily — and track actual time against those goals.

Target user: a senior individual contributor who wants to align their personal and team work toward year-long goals, without using a hosted SaaS tool (for IT/privacy reasons) and without it feeling like a ticket tracker.

---

## Core concepts

### Swimlanes
The top-level organizing unit. A user has 2–N swimlanes (fully configurable), each with a name and color. Default swimlanes: "Team" and "Personal". Each swimlane has its own goal hierarchy.

Swimlane weights (e.g. 70% Team / 30% Personal) are time-varying and stored separately as `SwimlaneWeightPeriod`. Weights represent intended focus allocation, not a property of the swimlane itself.

### Goal hierarchy
Within each swimlane:
- **Annual goal** — a long-horizon goal with a target quarter (e.g. "due end of Q2 2026"). Fixed, not rolling. Can be amended with a reason; amendment history is preserved.
- **Quarterly goal** — breaks an annual goal into a quarter-sized chunk. Also has a target timestamp and amendment history.
- **Waypoints** — 1–3 monthly milestones within a quarterly goal. Not separately tracked, but used as reference points during weekly planning and reflection.

### Sessions (modes)
Five session types, each a distinct UX:
1. **Long-term planning** — quarterly by default; every 4th quarter includes the annual zoom. Sets/reviews annual goals, quarterly goals, waypoints, and swimlane weights.
2. **Weekly planning/reflection** — single session that looks back at the past week and plans the next. Guided two-phase flow: reflect first (locked before planning begins), then plan.
3. **End-of-day check-in** — lightweight two-zone screen: mark today's goals hit/miss, plan tomorrow's focus. Tomorrow's focus IS the daily plan — no separate morning session needed.
4. **Mid-day check-in** — just the "how's the morning going" zone, no planning component.
5. *(Quarterly planning is session 1 above; no separate daily planning session.)*

### Distractions
A first-class concept. Work that wasn't in the quarterly plan — even if you add it to the weekly plan mid-week — is a distraction. Not pejorative; just honest. Distractions have optional labels (e.g. "customer request", "bug", "external team"). Labels are global and editable; edits propagate everywhere.

### No carryover
Goals do not carry over automatically. A missed weekly goal is a miss. If you want to work on it next week, you re-enter it intentionally. This is by design — it forces accountability and intentionality.

---

## UX patterns established

### Goal tree view
- Two swimlanes stacked vertically
- Within each swimlane, quarters scroll horizontally left-to-right (past → future)
- Both swimlanes scroll in sync
- Default scroll position shows ~10% of the previous quarter peeking from the left
- Last quarter has a rubber-band scroll wall (can't fully scroll into unplanned future)
- Swimlane background tinted in lane color (blue for Team, green for Personal)
- Annual goal displayed prominently in lane header
- Quarter cells are white cards on the tinted background
- Waypoints shown within each quarter cell with done/active/future states
- Swimlane weight shown as a small donut chart + labels at top of view
- Navigation: prev/next quarter buttons + "today" snap button

### Weekly planning/reflection
Two collapsible sections. Reflection must be completed before planning opens. If you edit the reflection after planning, the planning section collapses (but data is not lost — just hidden until you re-complete reflection).

**Reflection section contains:**
- Stats: goals set / hit / missed
- Time split: two stacked bars (planned vs actual), each a horizontal stacked bar segmented by swimlane color. Values rounded to nearest 5% with `~` prefix.
- Past week's goals: each toggleable hit/miss. First click locks in (no back to unmarked). All must be marked before reflection can be completed.
- Quarterly waypoint health: per-swimlane confidence call (on track / at risk / behind)
- Reflection notes: required, blocks completion. Placeholder text is dynamically generated from the week's data (e.g. "You missed 1 goal — what got in the way? Distractions took ~30%..."). Can be template-based or LLM-generated depending on configuration.

**Planning section contains:**
- Intended focus sliders (team / personal / distractions, must sum to 100%)
- Goals organized by swimlane block (colored header, white body)
- Each swimlane block shows the active quarter's goal and waypoints as read-only context
- Missed goals from last week appear as ghosts (dashed border, dimmed) at top of relevant swimlane — visual echo only, not interactive, not pre-populated
- Add goal button per swimlane; each new goal optionally linked to a waypoint (only existing waypoints shown, no future unplanned quarters)
- Distraction lane: same pattern, but goals get distraction labels instead of waypoints

### End-of-day check-in
Single screen, two visual zones (no locking mechanic).

**Zone 1 — today:**
- List of today's goals, clean (no swimlane clutter by default)
- Each goal has an `ⓘ` toggle to reveal context (swimlane, waypoint) inline
- Hit/miss toggle, same mechanic as weekly
- Optional free-text note

**Zone 2 — tomorrow:**
- Week-so-far vs planned split bar (for reorientation)
- Checklist of this week's goals to pick from for tomorrow
- "Add anything else" input — defaults to distraction, can override lane; enter key submits; adds distraction label or waypoint picker based on lane
- "Done — see you tomorrow" save button

### Tray-first model
The app lives primarily in the system tray. Default interaction is the check-in. Sessions (weekly planning, quarterly planning, goal tree) are opened deliberately as larger windows. On startup / morning, the tray shows today's planned goals (set by yesterday's end-of-day). This means you come in and yesterday-you has already done the thinking.

---

## Data model

All timestamps are Unix timestamps (integers). Quarter/month is always derived from timestamps + Calendar config, never stored directly. IDs are TEXT (UUIDs or ULIDs recommended).

```
Calendar
  id, name, quarter_start_month

Swimlane
  id, name, color

SwimlaneWeightPeriod
  id, start_at, note (nullable)

SwimlaneWeightPeriodEntry
  id, period_id → SwimlaneWeightPeriod, swimlane_id → Swimlane, weight

AnnualGoal
  id, swimlane_id → Swimlane, due_at, text, created_at

GoalAmendment
  id, goal_id, goal_type (enum: annual|quarterly), old_text, new_text, reason, created_at

QuarterlyGoal
  id, swimlane_id → Swimlane, annual_goal_id → AnnualGoal, due_at, text, created_at

Waypoint
  id, quarterly_goal_id → QuarterlyGoal, target_at, text, completed_at (nullable)

WeeklyPlan
  id, start_at, end_at

WeeklyPlanWeight
  id, weekly_plan_id → WeeklyPlan, swimlane_id → Swimlane, weight

WeeklyGoal
  id, weekly_plan_id → WeeklyPlan, created_at, text,
  outcome (enum: Hit|Miss),
  swimlane_id → Swimlane (nullable — null if distraction),
  waypoint_id → Waypoint (nullable),
  is_distraction (bool)

DistractionLabel
  id, text, created_at

WeeklyGoalDistractionLabel
  id, weekly_goal_id → WeeklyGoal, distraction_label_id → DistractionLabel

DailyFocus
  id, created_at

DailyFocusGoal
  id, daily_focus_id → DailyFocus, weekly_goal_id → WeeklyGoal

DailyWorkDistribution
  id, created_at

DailyWorkDistributionEntry
  id, daily_work_distribution_id → DailyWorkDistribution,
  weekly_goal_id → WeeklyGoal, percentage
```

### Key derivations
- **Current swimlane weights**: latest `SwimlaneWeightPeriod` where `start_at <= now`
- **Which quarter a timestamp is in**: derive from `Calendar.quarter_start_month` + timestamp arithmetic
- **Swimlane time distribution**: aggregate `DailyWorkDistributionEntry.percentage` grouped by `WeeklyGoal.swimlane_id`
- **Unplanned distractions**: `WeeklyGoal` where `is_distraction = true` and `created_at` is significantly after `WeeklyPlan.start_at`

---

## Tech stack decisions
- **Backend**: Rust
- **UI**: Web frontend (HTML/CSS/JS or a framework) packaged via Tauri
- **Storage**: SQLite, local only, no cloud sync required (user can layer their own via Dropbox/iCloud if desired)
- **Platform**: Cross-platform (macOS, Windows, Linux) via Tauri
- **Notifications/scheduling**: Native tray icon + scheduled prompts via Tauri APIs

## Still to design
- Quarterly planning session UX
- Mid-day check-in UX (simpler variant of end-of-day zone 1)
- Tray popup UX (the container for check-ins)
- Full Rust struct definitions and SQLite schema (next step)
