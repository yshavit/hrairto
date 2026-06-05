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

TypeScript (from specta): `{ type: "MainQuest"; id: AnnualGoalId } | { type: "SideQuest" }`

Original prescriptive structs (now superseded) follow for historical reference:

Define these in `src-tauri/src/models.rs`:

```rust
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
```

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

---

## Step 2: Calendar utility

Write and test this utility **before building any components**. Quarter derivation
around fiscal year boundaries is subtle enough to get wrong, and getting it wrong
causes hard-to-trace bugs everywhere.

Create `src/utils/calendar.ts`:

```typescript
import {Calendar} from '../bindings'

export interface QuarterInfo {
    quarter: number  // 1-based: 1–4
    year: number     // fiscal year (calendar year in which fiscal year starts)
    label: string    // e.g. "Q2 · Apr–Jun"
    startAt: number  // unix timestamp (ms) of quarter start in calendar timezone
    endAt: number    // unix timestamp (ms) of quarter end in calendar timezone
}

export interface MonthInfo {
    month: number    // 1-based: 1–12
    year: number     // calendar year
    label: string    // e.g. "May"
}

/**
 * Given a unix timestamp (ms) and a calendar config, return the fiscal
 * QuarterInfo that contains that timestamp.
 */
export function getQuarterForTimestamp(
    timestampMs: number,
    calendar: Calendar
): QuarterInfo { ...
}

/**
 * Return the QuarterInfo for a specific fiscal quarter and year.
 */
export function getQuarterInfo(
    quarter: number,
    year: number,
    calendar: Calendar
): QuarterInfo { ...
}

/**
 * Return the MonthInfo for a specific month and year.
 */
export function getMonthInfo(month: number, year: number): MonthInfo { ...
}

/**
 * Return the current QuarterInfo based on now.
 */
export function getCurrentQuarter(calendar: Calendar): QuarterInfo {
    return getQuarterForTimestamp(Date.now(), calendar)
}

/**
 * Return an array of QuarterInfo for a range of quarters to display.
 * Typically: one past quarter, the active quarter, two future quarters.
 */
export function getQuartersToDisplay(
    calendar: Calendar,
    pastCount: number,
    futureCount: number
): QuarterInfo[] { ...
}
```

Use `Intl.DateTimeFormat` with the calendar's timezone for all local date
operations — don't use `new Date()` arithmetic directly, as it ignores timezones.

Write unit tests in `src/utils/calendar.test.ts` using Vitest. Test cases must
include:

- Standard calendar year (quarter_start_month = 1)
- Fiscal year starting in February (quarter_start_month = 2)
- A timestamp in January when fiscal Q1 starts in February
  (this is Q4 of the *previous* fiscal year)
- Quarter boundary edge cases (last second of a quarter, first second of next)
- Year rollover (Q4 → Q1 of next year)

---

## Step 3: Hardcoded mock data

Create `src/mockData.ts`. This file will be deleted in phase 3 when real Tauri
commands replace it. All objects must import and conform to types from `bindings.ts`.

Guidelines:

- Two swimlanes: Team (`#378ADD`) and Personal (`#1D9E75`)
- Four quarters: one past (all waypoints completed), one active (first waypoint
  done, second in progress, third open), two future (no goals, placeholder only)
- The active quarter should be the current fiscal quarter per a standard calendar
- Use real unix timestamps (ms), not zeros
- Annual goals: one per swimlane, due end of Q4 this fiscal year
- Weight period: Team 70%, Personal 30%, started at beginning of current quarter

---

## Step 4: React component hierarchy

```
<GoalTreeView data={GoalTreeData}>
  <GoalTreeHeader />          // title, period label, today/prev/next nav
  <WeightDisplay />           // donut chart + legend
  <SwimlanesContainer>        // manages synchronized scrolling
    <SwimlaneRow>             // one per swimlane, tinted background
      <SwimlaneHeader />      // lane name, annual goal text
      <QuarterScroller>       // the horizontally scrolling strip
        <QuarterCard />       // one per quarter (past/active/future)
          <WaypointList />    // waypoints within the quarter
        </QuarterCard>
      </QuarterScroller>
    </SwimlaneRow>
  </SwimlanesContainer>
</GoalTreeView>
```

### Component responsibilities

**GoalTreeView** — top-level container; owns no state, just passes data down.

**GoalTreeHeader** — shows title ("Goals"), current quarter label (e.g. "Q2 2025"),
and prev/next/today navigation buttons. Accepts a `onNavigate(direction)` callback.

**WeightDisplay** — renders a small donut chart (SVG arc, no library needed for
two segments) showing current swimlane weight split. Accepts
`entries: SwimlaneWeightEntry[]` and `swimlanes: Swimlane[]`.

**SwimlanesContainer** — owns all scroll state and behavior. Uses two refs (one
per swimlane scroller) and syncs `scrollLeft` between them. Also owns rubber-band
logic and "scroll to today" behavior. Passes scroll refs and handlers down.

**SwimlaneRow** — renders one swimlane. Tinted background using the swimlane's
color at low opacity (`${color}22` for ~13% opacity hex alpha). Header shows lane
name and annual goal text prominently.

**QuarterScroller** — the horizontally scrollable strip. Fixed card width (220px),
10px gap. Accepts a ref for scroll sync. Does not handle scroll events itself —
delegates to SwimlanesContainer.

**QuarterCard** — renders one quarter. Receives a `QuarterInfo` and a
`QuarterlyGoal | null` (null = not yet planned). Derives past/active/future status
by comparing quarter to current quarter. Past cards: `opacity: 0.5`. Future
unplanned: italic placeholder text.

**WaypointList** — renders waypoints within a quarter card. Each waypoint shows
its month label (from `getMonthInfo`), text, and completion state. "Current" = first
incomplete waypoint in the active quarter.

---

## Step 5: Scroll behavior

### Scroll sync

```typescript
const teamRef = useRef<HTMLDivElement>(null)
const personalRef = useRef<HTMLDivElement>(null)
const isSyncing = useRef(false)  // use ref, not state, to avoid re-renders

const handleScroll = (
    source: React.RefObject<HTMLDivElement>,
    target: React.RefObject<HTMLDivElement>
) => {
    if (isSyncing.current || !source.current || !target.current) return
    isSyncing.current = true
    target.current.scrollLeft = source.current.scrollLeft
    isSyncing.current = false
}
```

Attach scroll listeners in a `useEffect` with proper cleanup.

### Default scroll position

On mount, scroll to show the active quarter with ~10% of the previous quarter
peeking from the left:

```typescript
const CARD_WIDTH = 220
const GAP = 10
const STEP = CARD_WIDTH + GAP

// activeIndex = index of active quarter in quarters array (0-based for array)
const scrollTarget = (activeIndex * STEP) - (CARD_WIDTH * 0.1)
```

Set without animation on mount. Set on both scrollers simultaneously.

### Rubber-band scroll wall

The maximum useful scroll position is where the last card is ~20% visible.
Implement using pointer events (not scroll events) so you can intercept and damp:

```typescript
const CARD_WIDTH = 220
const GAP = 10
const PADDING = 16

// max = last card is 20% visible
const maxScroll = (quarters.length - 1) * (CARD_WIDTH + GAP)
    - (CARD_WIDTH * 0.8) + PADDING

// when dragging past max, apply damping factor
const overshoot = rawScroll - maxScroll
const dampedScroll = maxScroll + (overshoot * 0.3)
// clamp damped overshoot to a maximum of 60px
const clampedScroll = maxScroll + Math.min(overshoot * 0.3, 60)

// on pointer release, if past max, spring back:
// use requestAnimationFrame with ease-out cubic over ~320ms
```

### Easing function (used for all animated scrolls)

```typescript
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3)

function animateScroll(
    refs: React.RefObject<HTMLDivElement>[],
    targetScroll: number,
    durationMs: number
) {
    const startScroll = refs[0].current?.scrollLeft ?? 0
    const startTime = performance.now()
    const frame = (now: number) => {
        const t = Math.min((now - startTime) / durationMs, 1)
        const eased = easeOutCubic(t)
        const current = startScroll + (targetScroll - startScroll) * eased
        refs.forEach(ref => {
            if (ref.current) ref.current.scrollLeft = current
        })
        if (t < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
}
```

### Navigation buttons

- **Prev/Next**: snap to nearest quarter boundary
  ```typescript
  const currentQ = Math.round(scrollLeft / STEP)
  const targetQ = Math.max(0, Math.min(currentQ + direction, quarters.length - 1))
  animateScroll(refs, targetQ * STEP, 300)
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
- Header: quarter label + status badge (done / active / not planned yet)
- Active badge: `background: #EAF3DE, color: #3B6D11`
- Done badge: muted, light border
- Goal text: 12px below header
- Waypoints: below goal text

### Donut chart

Two `<path>` elements using SVG arc math. 48×48px canvas, 18px radius, 7px stroke,
`round` linecaps, 0.04 radian gap between segments. Start at top (−π/2).

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