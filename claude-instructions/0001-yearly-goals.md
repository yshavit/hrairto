# Hrairto — Goal Tree View spec

## Overview

A read-only view showing the full goal hierarchy across all swimlanes. This is the
"north star" reference view — you open it to orient yourself, not to do work.

This document covers display only. Editing and quarterly planning are out of scope.

---

## Milestone definition

**Done when:**

- Swimlanes render as vertically stacked colored rows
- Quarters scroll horizontally left-to-right within each swimlane
- Both swimlanes scroll in sync
- Default scroll position shows ~10% of the previous quarter peeking from the left
- The last quarter has a rubber-band scroll wall
- The donut chart shows current swimlane weights
- All data comes from hardcoded TypeScript objects that conform to Rust-generated types

---

## Step 1: Rust structs + specta setup

Before touching React, define the data model in Rust and generate TypeScript types.

### Add dependencies to `Cargo.toml`

```toml
specta = { version = "2", features = ["derive"] }
tauri-specta = { version = "2", features = ["derive", "typescript"] }
chrono = { version = "0.4", features = ["serde"] }
chrono-tz = "0.9"
serde = { version = "1", features = ["derive"] }
```

### A note on 1-based months and quarters

Months and quarters are **1-based** throughout, matching `chrono` conventions and
human-facing usage. January = 1, December = 12. Q1 = 1, Q4 = 4. Never 0-based.
When using these as array indices in TypeScript, subtract 1 at the point of use.

### Rust structs

> **Step 1 is implemented.** `src-tauri/src/models.rs` is now the canonical
> source of truth for the data model. The structs below were the original
> prescriptive spec; they diverge from the real code in a few ways (typed ID
> newtypes, `Epoch` for timestamps, `AnnualGoalRef` enum — see below). Read
> `models.rs` directly rather than relying on this section.

Key changes made during implementation:

- **Typed IDs**: `String` IDs replaced with newtypes (`CalendarId`, `SwimlaneId`,
  etc.) wrapping `Uuid`. All serialize transparently as strings on the wire.
- **`Epoch`**: `i64` timestamps replaced with `Epoch(i64)` (milliseconds UTC,
  `#[serde(transparent)]`). Milliseconds so the wire format is native to JS
  without any ×1000 conversion.
- **`AnnualGoalRef`**: `QuarterlyGoal::annual_goal_id: AnnualGoalId` replaced
  with `annual_goal: AnnualGoalRef` to support side quests:

```rust
#[serde(tag = "type", content = "id")]
pub enum AnnualGoalRef {
    MainQuest(AnnualGoalId), // serves a specific annual goal
    SideQuest,               // intentional but not tied to any annual goal
}
```

TypeScript: `{ type: "MainQuest"; id: AnnualGoalId } | { type: "SideQuest" }`

- **`WeightTarget`**: `SwimlaneWeightEntry::swimlane_id: SwimlaneId` replaced
  with `target: WeightTarget` so weight periods can budget for distractions:

```rust
#[serde(tag = "type", content = "id")]
pub enum WeightTarget {
    Swimlane(SwimlaneId),  // a specific swimlane
    Distractions,          // unplanned work as a whole
}
```

TypeScript: `{ type: "Swimlane"; id: SwimlaneId } | { type: "Distractions" }`

Original prescriptive structs (now superseded) follow for historical reference:

Define these in `src-tauri/src/models.rs`:

````rust
use specta::Type;
use serde::{Serialize, Deserialize};

/// Defines the fiscal calendar for the user or org.
/// All quarter/month derivations are done relative to this config.
/// `timezone` is an IANA timezone string, e.g. "America/New_York".
/// It defines the timezone in which quarter boundaries are observed —
/// e.g. Q2 ends at midnight on June 30th in this timezone.
/// Stored as a String because IANA identifiers are a living list —
/// they can't be enumerated statically in a way that stays correct over time.
/// `quarter_start_month` is 1-based (1 = January, 2 = February, etc.)
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Calendar {
    pub id: String,
    pub name: String,
    pub quarter_start_month: u8, // 1-based: 1–12
    pub timezone: String,        // IANA tz, e.g. "America/New_York"
}

/// Parse a timezone string into a `chrono_tz::Tz`.
/// Returns an error string if the timezone is unrecognized.
/// Callers should surface this error to the user rather than silently
/// defaulting — the UI can show a warning and fall back to UTC if needed.
/// Never use `.expect()` or `.unwrap()` on timezone parsing in production;
/// an invalid stored timezone should produce a visible warning, not a panic.
///
/// Example usage in a Tauri command:
/// ```rust
/// let tz = parse_timezone(&calendar.timezone)
///     .unwrap_or_else(|e| {
///         eprintln!("Warning: {e}, falling back to UTC");
///         chrono_tz::UTC
///     });
/// ```
pub fn parse_timezone(tz_str: &str) -> Result<chrono_tz::Tz, String> {
    tz_str.parse::<chrono_tz::Tz>()
        .map_err(|_| format!("Unknown timezone: '{tz_str}'"))
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Swimlane {
    pub id: String,
    pub name: String,
    pub color: String, // hex, e.g. "#378ADD"
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SwimlaneWeightPeriod {
    pub id: String,
    pub start_at: i64, // unix timestamp (UTC) — weights are valid from this moment
    pub note: Option<String>,
    pub entries: Vec<SwimlaneWeightEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SwimlaneWeightEntry {
    pub swimlane_id: String,
    pub weight: f64, // 0.0–1.0; all entries in a period must sum to 1.0
}

/// Annual goal — due at end of a specific fiscal quarter.
/// `due_quarter` and `due_year` are 1-based and fiscal-calendar-relative.
/// "year" means the calendar year in which the fiscal year starts.
/// E.g. if quarter_start_month=2, then Q4 of fiscal year 2025 ends in Jan 2026,
/// but due_year is still 2025.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct AnnualGoal {
    pub id: String,
    pub swimlane_id: String,
    pub due_quarter: u8, // 1-based: 1–4
    pub due_year: u32,
    pub text: String,
    pub created_at: i64, // unix timestamp (UTC)
}

/// Quarterly goal — due at end of a specific fiscal quarter.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct QuarterlyGoal {
    pub id: String,
    pub swimlane_id: String,
    pub annual_goal_id: String,
    pub due_quarter: u8, // 1-based: 1–4
    pub due_year: u32,
    pub text: String,
    pub created_at: i64, // unix timestamp (UTC)
    pub waypoints: Vec<Waypoint>,
}

/// Waypoint — a monthly milestone within a quarterly goal.
/// `target_month` and `target_year` are calendar month/year (not fiscal),
/// since months are already unambiguous without fiscal adjustment.
/// `target_month` is 1-based (1 = January).
/// `completed_at` is a unix timestamp (UTC), null if not yet completed.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Waypoint {
    pub id: String,
    pub quarterly_goal_id: String,
    pub target_month: u8, // 1-based: 1–12
    pub target_year: u32,
    pub text: String,
    pub completed_at: Option<i64>, // unix timestamp (UTC)
}

/// Full data payload for the goal tree view.
/// This is the shape of what the eventual Tauri command will return.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct GoalTreeData {
    pub calendar: Calendar,
    pub swimlanes: Vec<Swimlane>,
    pub current_weights: SwimlaneWeightPeriod,
    pub annual_goals: Vec<AnnualGoal>,
    pub quarterly_goals: Vec<QuarterlyGoal>,
}
````

### Export TypeScript types

In `src-tauri/src/main.rs`, set up specta export:

```rust
fn main() {
    #[cfg(debug_assertions)]
    {
        use specta_typescript::Typescript;
        tauri_specta::collect_types![/* commands will go here later */]
            .export(Typescript::default(), "../src/bindings.ts")
            .expect("Failed to export types");
    }
    // ... tauri builder
}
```

Run the app once in dev mode to generate `src/bindings.ts`. Import all types from
there — never hand-write types that duplicate Rust structs.

The snippet above is illustrative; the real export setup lives in `src-tauri/src/lib.rs`
(a shared `ts_exporter()` used by both `run` and the bindings-export test), which is the
canonical source. The exporter sets a `// @ts-nocheck` header so the generated file is
skipped by `tsc --noEmit` — a tsconfig `exclude` wouldn't work because hand-written code
imports from `bindings.ts`, which pulls it back into the type-check.

---

## Step 2: Fiscal-calendar math

> **Step 2 is implemented in Rust, not TypeScript.** Fiscal-calendar math belongs
> in Rust so it can be shared with a future CLI and so there is a single place
> for business logic (see `CLAUDE.md` "Logic goes in Rust"). The TypeScript layer
> receives precomputed `QuarterDisplay` values and never does fiscal math itself.

The implementation lives in `src-tauri/src/calendar.rs`. Key public functions:

- `quarter_for_timestamp(Epoch, &Calendar) -> Result<QuarterDisplay, String>`
- `quarter_info(quarter, fiscal_year, &Calendar) -> Result<QuarterDisplay, String>`
- `quarters_to_display(&Calendar, now: Epoch, past_count, future_count) -> Result<Vec<QuarterDisplay>, String>`

`QuarterDisplay` is a specta-exported struct in `models.rs`:

```rust
pub struct QuarterDisplay {
    pub quarter: u8,    // 1-based: 1–4
    pub year: u32,      // fiscal year (calendar year in which fiscal year starts)
    pub label: String,  // e.g. "Q2 · Apr–Jun"
    pub start_at: Epoch,
    pub end_at: Epoch,  // exclusive end — [start_at, end_at)
}
```

`GoalTreeData` now includes `quarters_to_display: Vec<QuarterDisplay>`, computed at
command-invocation time by the backend. The mock data hardcodes this field.

The TypeScript utility `src/utils/calendar.ts` is reduced to display-only helpers:

- `isCurrentQuarter(q: QuarterDisplay): boolean` — compares `Date.now()` to the interval
- `getMonthInfo(month, year): MonthInfo` — formats a month name via `Intl.DateTimeFormat`

The original TypeScript spec below is superseded; `src-tauri/src/calendar.rs` is
the canonical implementation. Rust tests in that file cover the same edge cases
the spec prescribed (standard year, February fiscal year, January-in-Q4, boundaries,
year rollover).

---

## Step 3: Hardcoded mock data

Create `src/mockData.ts`. This file will be deleted in phase 3 when real Tauri
commands replace it. All objects must import and conform to types from `bindings.ts`.

Guidelines:

- Two swimlanes: Team (`#378ADD`) and Personal (`#1D9E75`)
- Five quarters in `quarters_to_display`: one past (all waypoints completed), one
  active (first waypoint done, second in progress, third open), two future (no
  goals, placeholder only), and one **peek quarter** (the quarter after the last
  planned one — no goals, never navigated to by buttons, only visible via
  rubber-band drag)
- The active quarter should be the current fiscal quarter per a standard calendar
- Use real unix timestamps (ms), not zeros
- Annual goals: one per swimlane, due end of Q4 this fiscal year
- Weight period: Team 70%, Personal 30%, started at beginning of current quarter

---

## Step 4: React component hierarchy

> **Step 4 is implemented.** The component sources under `src/components/` are the
> canonical reference. The descriptions below reflect the delivered design.

```
<YearlyGoals>                      // fetches data via api.ts, wraps in ErrorBoundary
  <GoalTreeView data={GoalTreeData}>  // owns scroll ref, bridges header ↔ swimlanes
    <GoalTreeHeader>               // title, nav buttons, current quarter, donut chart
      <WeightDisplay />            // donut chart + legend (rendered inside header)
    </GoalTreeHeader>
    <SwimlanesContainer>           // owns all scroll state and rubber-band logic
      <SwimlaneRow>                // one per swimlane, tinted background
        [swimlane name label]      // colored uppercase label, above all sub-rows
        <GoalSubRow>               // one per annual goal: stationary left panel + scroller
          <QuarterScroller>        // horizontally scrolling strip, trimmed to goal deadline
            <QuarterCard />        // one per quarter (past/active/future)
              <WaypointList />     // waypoints within the quarter
            </QuarterCard>
          </QuarterScroller>
        </GoalSubRow>
        <SideQuestSection>         // present only if the swimlane has side quests; "Intentional side quests" header
          <SideQuestStrip>         // one per packed strip (interval-scheduled)
            <QuarterCard isSideQuest /> // shows "side quest" badge; blank spacer if empty
          </SideQuestStrip>
        </SideQuestSection>
      </SwimlaneRow>
    </SwimlanesContainer>
  </GoalTreeView>
</YearlyGoals>
```

### Component responsibilities

**YearlyGoals** — entry point; calls `getGoalTreeData()`, shows loading state,
wraps in `ErrorBoundary`. This is the file rendered by `goals-main.tsx` and the
Tauri window.

**GoalTreeView** — owns the `ScrollAPI` ref that connects the header nav buttons
to `SwimlanesContainer`. Passes `onPrev`/`onNext`/`onToday` callbacks to
`GoalTreeHeader`. No state of its own.

**GoalTreeHeader** — single-row flex header. Props: `currentQuarterLabel`,
`entries`, `swimlanes`, `onPrev`, `onNext`, `onToday`. Renders `WeightDisplay`
inline on the right side, next to the current-quarter label.

**WeightDisplay** — renders a small donut chart (SVG arc, no library needed for
two segments) showing current swimlane weight split. Accepts
`entries: SwimlaneWeightEntry[]` and `swimlanes: Swimlane[]`.

**SwimlanesContainer** — owns all scroll state and behavior. Pre-computes the
full scroller layout (one index per annual-goal strip + one per side-quest strip,
across all swimlanes) before rendering, then holds a flat `scrollerRefs` array
covering all of them. Syncs `scrollLeft` across all scrollers. The rubber-band wall
(`getHardMax()`) uses `max(scrollWidth - clientWidth - STEP)` over all scrollers so
the boundary is always set by the longest strip. Exposes a `ScrollAPI` handle via
`forwardRef`. Also calls `packSideQuests` per swimlane and passes packed strips + scroller
props down to `SwimlaneRow`.

**SwimlaneRow** — renders one swimlane. Tinted background using the swimlane's
color at low opacity. Renders the swimlane name once at the top, then N `GoalSubRow`
components (one per annual goal) followed by a `SideQuestSection` if side quests exist.

**GoalSubRow** — one annual goal's sub-row. Full-width heading line: goal title
(17px) + `"by end of Q{N} {year}"` (13px, dimmed) inline at baseline. Left border
(3px, swimlane color) spans the full sub-row height (heading + scroller). Below the
heading: a `QuarterScroller` whose `quarters` prop is trimmed to the goal's deadline

- 1 peek (`trimQuartersForGoal` in `SwimlanesContainer`).

**SideQuestSection** — the shared side-quest area within a swimlane. Renders an
"Intentional side quests" header (17px, same style as goal titles, no deadline),
then N `SideQuestStrip` components stacked vertically. A CSS `::before`
pseudo-element provides a 3px left bar at 35% opacity (same swimlane color) so the
bar's opacity doesn't affect the content.

**SideQuestStrip** — one packed strip of side quests. Renders all global quarters;
quarter positions with a side quest show a `QuarterCard` (with `isSideQuest={true}`);
empty positions render a blank 220px spacer to preserve column alignment.

**`packSideQuests` (src/goals/packSideQuests.ts)** — pure function. Greedy
interval-scheduling: two side quests share a strip only if they are in different
quarters. Input: array of side-quest `QuarterlyGoal`s; output: `QuarterlyGoal[][]`.

**QuarterScroller** — the horizontally scrollable strip. Fixed card width (220px),
10px gap. Accepts a ref for scroll sync. Does not handle scroll events itself —
delegates to SwimlanesContainer.

**QuarterCard** — renders one quarter. Receives a `QuarterDisplay` and a
`QuarterlyGoal | null` (null = not yet planned). Optional `isSideQuest` flag adds a
"side quest" badge in the card header. Past cards: `opacity: 0.6`. Future unplanned:
shows a "Plan during {activeQuarterLabel} review →" placeholder.

**WaypointList** — renders waypoints within a quarter card. Each waypoint shows
its month label (from `getMonthInfo`), text, and completion state. "Current" = first
incomplete waypoint in the active quarter.

---

## Step 5: Scroll behavior

> **Step 5 is implemented.** `src/goals/SwimlanesContainer.tsx` is the
> canonical source. The descriptions below reflect the delivered design.

### Scroll sync

Use a flat ref array spanning **all scrollers** (annual-goal strips + side-quest
strips across all swimlanes), not one per swimlane. A boolean `isSyncing` ref
prevents feedback loops. Sync is handled in `onScroll` callbacks — not via
`useEffect` scroll listeners — so cleanup is automatic. During animations,
`isAnimating` is set to suppress scroll-event propagation.

Scrollers for the same quarter are at the same `scrollLeft` positions because all
strips start from the same Q1 and use the same card width. Strips with fewer cards
are clamped by the browser at their natural scroll maximum and fall behind gracefully.

### Default scroll position

On mount, scroll to show the active quarter with ~10% of the card peeking from
the left:

```typescript
const CARD_WIDTH = 220;
const GAP = 10;
const STEP = CARD_WIDTH + GAP;

// activeIndex = index of active quarter in quarters array (0-based)
const scrollTarget = activeIndex > 0 ? activeIndex * STEP - CARD_WIDTH * 0.1 : 0;
```

Set without animation on mount (direct `scrollLeft` assignment). Reset whenever
the active quarter changes.

### Peek quarter

`quarters_to_display` always ends with one **peek quarter** — the next quarter
beyond the planning horizon. It is intentionally unplanned and exists only as
visual wallpaper in the rubber-band stretch zone.

Rules that follow from this:

- The rubber-band snap boundary is `scrollWidth - clientWidth - STEP`, not the
  absolute content end, so spring-back lands at the last planned quarter.
- The `›` nav button must be capped at the same boundary (use `scrollWidth -
clientWidth - STEP` as `hardMax`, not `(quarters.length - 1) * STEP`), so the
  peek quarter is unreachable via buttons.
- When the backend generates `quarters_to_display`, it should append one peek
  quarter after the last planned quarter.

### Rubber-band scroll wall

The snap boundary is the scroll position that leaves the last _planned_ quarter
fully in view (the peek quarter is just past it). The browser clamps `scrollLeft`
to `scrollWidth - clientWidth`, so rubber-band overshoot is applied via CSS
`translateX` on the inner wrapper (`.quarter-scroller__inner`), not via
`scrollLeft`.

```typescript
// Snap boundary: max across all scrollers so the wall is set by the longest strip.
const maxScroll = scrollerRefs.current.reduce((max, el) => (el ? Math.max(max, Math.max(0, el.scrollWidth - el.clientWidth - STEP)) : max), 0);

// When dragging past maxScroll: pin scrollLeft at maxScroll, stretch visually.
const rubberOffset = Math.min(overshoot * 0.3, 90); // cap at 90px
inner.style.transform = `translateX(${-rubberOffset}px)`;

// On pointer release: animate transform back to '' over ~350ms ease-out cubic.
```

### Easing function (used for all animated scrolls)

```typescript
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
```

Both `animateAll` (scrollLeft-based, for nav and today) and `animateTransform`
(transform-based, for rubber-band spring-back) use this curve. Refs are captured
via closure rather than passed as arguments.

### Navigation buttons

- **Prev/Next**: snap to nearest quarter boundary, capped at `hardMax` for next:
  ```typescript
  const currentQ = Math.round(el.scrollLeft / STEP);
  const hardMax = Math.max(0, el.scrollWidth - el.clientWidth - STEP);
  animateAll(Math.min(hardMax, (currentQ + 1) * STEP), 300);
  ```
- **Today**: animate to default scroll position (active quarter with peek)

---

## Visual design

### Colors

- Team: `#378ADD`, tint bg: `#E6F1FB`, border: `#B5D4F4`
- Personal: `#1D9E75`, tint bg: `#E1F5EE`, border: `#9FE1CB`
- Additional swimlane palette (assign in order): `#E8820C`, `#9B59B6`, `#E74C3C`, `#F39C12`
- Past quarters: `opacity: 0.5`
- Waypoint states:
  - Completed: `background: #EAF3DE`, green checkmark
  - Current (first incomplete in active quarter): `border: 1.5px solid #378ADD`
  - Future: `border: 0.5px solid #D0CEC7`

### Annual goal text

Most prominent text in the lane header. 15–16px, medium weight, full color.
Everything else in the header is secondary.

### Quarter card

- Width: 220px fixed
- White background, `0.5px` border, 8px border radius
- Header: quarter label + status badge (`done` / `active` / `future`)
- Active badge: `background: #EAF3DE, color: #3B6D11`
- Done badge: muted, light border
- Goal text: 12px below header
- Waypoints: below goal text

### Donut chart

Two `<path>` elements using SVG arc math. 48×48px canvas, 18px radius, 7px stroke,
`round` linecaps, 0.04 radian gap between segments. Start at top (−π/2).

---

## Testing

### Test stack

- **Vitest + React Testing Library** (`pnpm test`) — unit tests for individual
  components. Config in `vitest.config.ts`; setup in `src/test-setup.ts`.
- **Playwright** (`pnpm test:e2e`) — interaction tests that exercise scroll behavior,
  sync, and rubber-band in a real browser. Config in `playwright.config.ts`.

### Isolation: `ui-test-entrypoints/`

`main.tsx` is the only file with a hard Tauri dependency (`getCurrentWindow().label`).
To test components in a browser without Tauri, `ui-test-entrypoints/goals.html`
renders `YearlyGoals` directly via `src/goals-main.tsx`. Playwright navigates to
`/ui-test-entrypoints/goals.html`. Add a similar `<window>.html` + `<window>-main.tsx`
pair for each new Tauri window that needs browser-testable isolation.

The `ui-test-entrypoints/` directory is registered as a Rollup input in
`vite.config.ts` so it's served by `pnpm dev` and included in production builds.

### Playwright viewport

Set to `900×680` to match the Tauri window dimensions. At wider viewports all
cards fit without scrolling, which makes scroll-dependent tests incorrect.

### What to test

- **RTL**: static rendering — badge labels, waypoint `data-state` attributes,
  `Intl`-formatted month names. Keep tests at behavior level, not DOM text strings
  (e.g. assert `data-state="completed"`, not `textContent === "✓"`).
- **Playwright**: dynamic behavior — nav button caps, scroll sync across swimlanes,
  rubber-band spring-back. Use `scrollLeft` and `style.transform` assertions.

---

## What this component does NOT do

- No click handlers that navigate to planning sessions
- No editing of any kind
- No Tauri `invoke` calls — all data comes from props
- No persistence

---

## Suggested implementation order

1. Set up specta, define Rust structs, run app to generate `src/bindings.ts`
2. Write and **test** `src/utils/calendar.ts` — don't skip the tests
3. Write `src/mockData.ts` with realistic hardcoded data
4. Build `WaypointList` in isolation with static props
5. Build `QuarterCard` with static props (no scroll yet)
6. Build `SwimlaneRow` with a non-scrolling strip of cards
7. Add `QuarterScroller` with basic native scroll (no sync, no rubber-band)
8. Add scroll sync in `SwimlanesContainer`
9. Add rubber-band wall and default scroll position on mount
10. Add `WeightDisplay` donut
11. Add `GoalTreeHeader` with working nav buttons

Complete and verify each step before moving to the next.
