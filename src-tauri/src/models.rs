//! Data model for Hrairto.
//!
//! These structs are the single source of truth for the shape of all
//! planning and tracking data. They derive [`specta::Type`] so that TypeScript
//! definitions are generated from them (see the `tauri-specta` setup in
//! `lib.rs`); the frontend never hand-writes types that duplicate these.
//!
//! Conventions (see `claude-instructions/0000-hrairto-overview.md`):
//! - All point-in-time values are [`Epoch`] (milliseconds UTC).
//! - Months and quarters are **1-based** (January = 1, Q1 = 1), matching
//!   `chrono` conventions and human-facing usage.

use serde::{Deserialize, Serialize};
use specta::Type;
use uuid::Uuid;

/// Unix timestamp in **milliseconds** UTC.
///
/// Milliseconds (not seconds) so that the wire format is native to JavaScript —
/// `Date.now()` and `Intl.DateTimeFormat` both work directly without ×1000
/// conversion. Chrono's [`DateTime::timestamp_millis`] and
/// [`DateTime::from_timestamp_millis`] are the idiomatic conversion points on
/// the Rust side.
///
/// `#[serde(transparent)]` means the JSON wire format is a plain `number`,
/// and specta exports it as `number` in TypeScript.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize, Type)]
#[serde(transparent)]
pub struct Epoch(pub i64);

/// Declares per-entity ID newtypes wrapping [`Uuid`]. Distinct types prevent
/// mixing, say, a `SwimlaneId` where an `AnnualGoalId` is expected — the bug
/// class that bites a model with this many foreign-key fields. `#[serde(transparent)]`
/// keeps the wire/JSON shape identical to a bare UUID string, so specta exports
/// each as a TypeScript `string`.
macro_rules! id_types {
    ($($(#[$doc:meta])* $name:ident),* $(,)?) => {
        $(
            $(#[$doc])*
            #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Type)]
            #[serde(transparent)]
            pub struct $name(pub Uuid);
        )*
    };
}

id_types! {
    CalendarId,
    SwimlaneId,
    SwimlaneWeightPeriodId,
    AnnualGoalId,
    QuarterlyGoalId,
    WaypointId,
    WeeklyPlanId,
    WeeklyReflectionId,
    WeeklyGoalId,
    DistractionLabelId,
}

/// Defines the fiscal calendar for the user or org.
/// All quarter/month derivations are done relative to this config.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Calendar {
    pub id: CalendarId,
    pub name: String,
    /// 1-based: 1 = January, 2 = February, … 12 = December.
    pub quarter_start_month: u8,
    /// IANA timezone string, e.g. "America/New_York". Defines the timezone in
    /// which quarter boundaries are observed — e.g. Q2 ends at midnight on
    /// June 30th in this timezone. Stored as a String because IANA identifiers
    /// are a living list that can't be enumerated statically in a way that
    /// stays correct over time.
    pub timezone: String,
    /// BCP 47 language tag, e.g. `"en-US"`. The frontend passes this to
    /// `Intl.DateTimeFormat` for all locale-sensitive display formatting.
    /// Rust-side labels (e.g. `QuarterDisplay.label`) are currently generated
    /// in English; this field becomes the Rust source of truth once i18n is added.
    pub locale: String,
}

/// Parse a timezone string into a `chrono_tz::Tz`.
/// Returns an error string if the timezone is unrecognized.
/// Callers should surface this error to the user rather than silently
/// defaulting — the UI can show a warning and fall back to UTC if needed.
/// Never use `.expect()` or `.unwrap()` on timezone parsing in production;
/// an invalid stored timezone should produce a visible warning, not a panic.
///
/// Example usage in a Tauri command:
/// ```ignore
/// let tz = parse_timezone(&calendar.timezone)
///     .unwrap_or_else(|e| {
///         eprintln!("Warning: {e}, falling back to UTC");
///         chrono_tz::UTC
///     });
/// ```
pub fn parse_timezone(tz_str: &str) -> Result<chrono_tz::Tz, String> {
    tz_str
        .parse::<chrono_tz::Tz>()
        .map_err(|_| format!("Unknown timezone: '{tz_str}'"))
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Swimlane {
    pub id: SwimlaneId,
    pub name: String,
    /// Hex color, e.g. "#378ADD".
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SwimlaneWeightPeriod {
    pub id: SwimlaneWeightPeriodId,
    /// When these weights take effect.
    pub start_at: Epoch,
    pub note: Option<String>,
    pub entries: Vec<SwimlaneWeight>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SwimlaneWeight {
    pub target: WeightTarget,
    /// 0.0–1.0.
    pub weight: f64,
}

/// Annual goal — due at the end of a specific fiscal quarter.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct AnnualGoal {
    pub id: AnnualGoalId,
    pub swimlane_id: SwimlaneId,
    /// 1-based fiscal quarter: 1–4.
    pub due_quarter: u8,
    /// Fiscal year — the calendar year in which the fiscal year *starts*.
    /// E.g. if [`Calendar::quarter_start_month`] is 2, Q4 of fiscal year 2025
    /// ends in Jan 2026, but `due_year` is still 2025.
    pub due_year: u32,
    pub text: String,
    pub created_at: Epoch,
}

/// What a [`SwimlaneWeight`] allocates weight toward.
///
/// Including `Distractions` as a first-class target lets the user budget
/// intentionally for unplanned work rather than having it silently erode
/// the swimlane allocations.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type", content = "id")]
pub enum WeightTarget {
    /// A specific swimlane.
    Swimlane(SwimlaneId),
    /// The distraction budget — unplanned work as a whole.
    Distractions,
}

/// Whether a quarterly goal serves an annual goal or is a standalone side quest.
///
/// A side quest is intentional work that doesn't map to any annual goal —
/// not a distraction, just independently valuable. Using an enum here (rather
/// than `Option<AnnualGoalId>`) makes the intent explicit at the type level.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type", content = "id")]
pub enum AnnualGoalRef {
    /// Serves a specific annual goal.
    MainQuest(AnnualGoalId),
    /// Standalone work — intentional but not tied to any annual goal.
    SideQuest,
}

/// Quarterly goal — due at the end of a specific fiscal quarter.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct QuarterlyGoal {
    pub id: QuarterlyGoalId,
    pub swimlane_id: SwimlaneId,
    pub annual_goal: AnnualGoalRef,
    /// 1-based fiscal quarter: 1–4.
    pub due_quarter: u8,
    /// Fiscal year — the calendar year in which the fiscal year starts
    /// (see [`AnnualGoal::due_year`]).
    pub due_year: u32,
    pub text: String,
    pub created_at: Epoch,
    pub waypoints: Vec<Waypoint>,
}

/// Waypoint — a monthly milestone within a quarterly goal.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Waypoint {
    pub id: WaypointId,
    pub quarterly_goal_id: QuarterlyGoalId,
    /// Calendar month (not fiscal), 1-based: 1 = January … 12 = December.
    /// Calendar rather than fiscal because months are already unambiguous
    /// without fiscal adjustment.
    pub target_month: u8,
    /// Calendar year.
    pub target_year: u32,
    pub text: String,
    /// `None` until the waypoint is completed.
    pub completed_at: Option<Epoch>,
}

/// Precomputed display info for one fiscal quarter.
///
/// The backend computes these at command-invocation time so the frontend never needs
/// to do fiscal-calendar math. `start_at` and `end_at` form a half-open interval
/// `[start_at, end_at)` in epoch milliseconds UTC.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct QuarterDisplay {
    /// 1-based: 1–4.
    pub quarter: u8,
    /// Fiscal year — calendar year in which the fiscal year starts.
    pub year: u32,
    /// Display label, e.g. "Q2 · Apr–Jun".
    pub label: String,
    /// First millisecond of this quarter (inclusive).
    pub start_at: Epoch,
    /// First millisecond of the following quarter (exclusive end).
    pub end_at: Epoch,
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
    /// Quarters to show in the scrolling strip, in chronological order.
    /// Computed by the backend at invocation time (see `calendar::quarters_to_display`).
    /// Typically one past quarter, the current quarter, and two or more future quarters.
    pub quarters_to_display: Vec<QuarterDisplay>,
}

// ── Weekly planning / reflection ─────────────────────────────────────────────

/// How focus is distributed across swimlanes and distractions.
///
/// All weights should sum to 1.0. Use [`SwimlanesFocus::new`] to construct
/// from raw weights — it normalizes the total automatically.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SwimlanesFocus {
    pub weights: Vec<SwimlaneWeight>,
}

impl SwimlanesFocus {
    /// Normalizes `weights` so they sum to 1.0. If the total is zero, returns
    /// the weights as-is (avoids division by zero).
    pub fn new(weights: Vec<SwimlaneWeight>) -> Self {
        let total: f64 = weights.iter().map(|w| w.weight).sum();
        if total == 0.0 {
            return Self { weights };
        }
        let weights = weights
            .into_iter()
            .map(|w| SwimlaneWeight {
                target: w.target,
                weight: w.weight / total,
            })
            .collect();
        Self { weights }
    }
}

/// Whether a weekly goal was achieved.
///
/// `at` is when the user marked the goal — this can happen at any point
/// during the week, not only during a formal reflection session.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type")]
pub enum GoalOutcome {
    Hit { at: Epoch },
    Miss { at: Epoch },
}

/// The planning artifact for a single week: what the user intends to do.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct WeeklyPlan {
    pub id: WeeklyPlanId,
    /// First millisecond of the week being planned (inclusive).
    pub start_at: Epoch,
    /// First millisecond of the following week (exclusive end).
    pub end_at: Epoch,
    pub focus: SwimlanesFocus,
}

/// The reflection artifact for a completed week.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct WeeklyReflection {
    pub id: WeeklyReflectionId,
    /// The weekly plan this reflection is about.
    pub plan_id: WeeklyPlanId,
    pub notes: String,
    pub completed_at: Epoch,
    /// User-adjusted actual time split for the past week. Starts as a
    /// backend estimate; the user can edit it during the reflection session.
    pub actual_split: SwimlanesFocus,
}

/// A single weekly goal, used for both past goals (reflected on) and future
/// goals (being planned). `outcome` is `None` until the user marks it.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct WeeklyGoal {
    pub id: WeeklyGoalId,
    /// The weekly plan this goal belongs to (the week it was created for).
    pub plan_id: WeeklyPlanId,
    pub created_at: Epoch,
    pub text: String,
    /// `None` while unmarked. Set to `Hit` or `Miss` when the user marks it —
    /// this can happen during the week or during the following week's reflection.
    pub outcome: Option<GoalOutcome>,
    pub goal_ref: WeeklyGoalRef,
}

/// What kind of work a [`WeeklyGoal`] represents.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type")]
pub enum WeeklyGoalRef {
    /// Planned work belonging to a swimlane, optionally tied to a waypoint.
    Planned {
        swimlane_id: SwimlaneId,
        waypoint_id: Option<WaypointId>,
    },
    /// Unplanned work; may carry one or more distraction labels.
    Distraction { label_ids: Vec<DistractionLabelId> },
}

/// A global distraction label. Editing the text propagates everywhere the
/// label is referenced.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct DistractionLabel {
    pub id: DistractionLabelId,
    pub text: String,
    pub created_at: Epoch,
}

/// Read-only quarter context for one swimlane, shown during the planning phase
/// so the user can set weekly goals relative to their quarterly commitments.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SwimlanePlanningContext {
    pub swimlane_id: SwimlaneId,
    pub quarter: QuarterDisplay,
    /// `None` if the swimlane has no quarterly goal for the active quarter.
    pub quarterly_goal: Option<QuarterlyGoal>,
}

/// Full payload for the weekly planning/reflection session UI.
/// The backend computes all derived fields; the frontend just renders.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct WeeklySessionData {
    pub calendar: Calendar,
    /// The plan for the coming week (focus weights + new goals).
    pub plan: WeeklyPlan,
    /// The plan being reflected on (previous week). `None` on the first ever
    /// session. Its `focus` is used for the "planned" bar in the time-split
    /// visualization alongside `reflection.actual_split`.
    pub prev_plan: Option<WeeklyPlan>,
    /// Reflection on the previous week. `None` if there is no prior plan to
    /// reflect on (e.g. first ever weekly session).
    pub reflection: Option<WeeklyReflection>,
    /// Goals from the previous week's plan, to be marked during reflection.
    pub past_goals: Vec<WeeklyGoal>,
    /// Goals already entered for the coming week's plan.
    pub planned_goals: Vec<WeeklyGoal>,
    pub swimlanes: Vec<Swimlane>,
    pub distraction_labels: Vec<DistractionLabel>,
    /// Active quarter context per swimlane, for the planning section.
    pub quarter_context: Vec<SwimlanePlanningContext>,
    /// Current long-term weight period, shown as the quarterly target reminder
    /// below the focus weight sliders.
    pub current_weights: SwimlaneWeightPeriod,
}
