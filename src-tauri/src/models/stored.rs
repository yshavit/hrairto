//! Persisted data model for Hrairto.
//!
//! These structs are the entities written to and read from storage. They derive
//! [`specta::Type`] so that TypeScript definitions are generated from them (see
//! the `tauri-specta` setup in `lib.rs`); the frontend never hand-writes types
//! that duplicate these.
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
/// accidentally passing, say, a `WaypointId` where a `MainQuestId` is expected —
/// the bug class that bites a model with this many foreign-key fields.
/// `#[serde(transparent)]` keeps the wire/JSON shape identical to a bare UUID
/// string, so specta exports each as a TypeScript `string`.
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
    ConcernId,
    WeightPeriodId,
    MainQuestId,
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

/// A grouping / colour label for forward-motion work (Main Quests and side quests).
/// Carries no weight, deadline, or cascade — purely organisational.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Concern {
    pub id: ConcernId,
    pub name: String,
    /// Hex color, e.g. "#378ADD".
    pub color: String,
}

/// The unit a [`WeightEntry`] points at — the three kinds of time-spend that
/// the weekly focus bar allocates across.
///
/// `MainQuest` is one entry per active main quest; `SideQuests` and
/// `Distractions` are each a single pooled entry.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type", content = "id")]
pub enum Activity {
    /// A specific active main quest.
    MainQuest(MainQuestId),
    /// The pooled side-quest budget — all side quests share one weight.
    SideQuests,
    /// The distraction budget — unplanned, non-advancing work as a whole.
    Distractions,
}

/// A long-horizon goal on the roadmap. Carries a mandatory deadline and a
/// [`Concern`] for grouping / colour. Each active main quest gets its own
/// allocation weight in the weekly focus bar.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct MainQuest {
    pub id: MainQuestId,
    pub concern_id: ConcernId,
    /// 1-based fiscal quarter: 1–4.
    pub due_quarter: u8,
    /// Fiscal year — the calendar year in which the fiscal year *starts*.
    /// E.g. if [`Calendar::quarter_start_month`] is 2, Q4 of fiscal year 2025
    /// ends in Jan 2026, but `due_year` is still 2025.
    pub due_year: u32,
    pub text: String,
    pub created_at: Epoch,
}

/// A quarterly goal's parent — either a specific main quest or the side-quest
/// pool (with its own concern).
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type")]
pub enum ParentGoal {
    /// Serves a specific main quest; concern is derived from the main quest.
    MainQuest { id: MainQuestId },
    /// Standalone side-quest work; the concern labels it directly.
    SideQuest { concern_id: ConcernId },
}

/// Quarterly goal — a chunk of work due at the end of a specific fiscal quarter,
/// or sitting in the backlog when unscheduled.
///
/// Waypoints are indexed by month-of-quarter: slot 0 = first month, slot 2 =
/// third. The count of `Some` slots is the goal's size (1–3 "stars"). At least
/// one slot must be `Some`.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct QuarterlyGoal {
    pub id: QuarterlyGoalId,
    pub parent: ParentGoal,
    /// 1-based fiscal quarter: 1–4. `None` = this goal is in the backlog.
    pub due_quarter: Option<u8>,
    /// Fiscal year — the calendar year in which the fiscal year starts
    /// (see [`MainQuest::due_year`]). `None` = this goal is in the backlog.
    pub due_year: Option<u32>,
    pub text: String,
    pub created_at: Epoch,
    /// Monthly milestones indexed by month-of-quarter (0 = first month of the
    /// quarter). Month and year are derived from the index plus `due_quarter` /
    /// `due_year` — never stored on the waypoint itself. A backlogged goal's
    /// `Some` slots render as stars (no derived date).
    pub waypoints: [Option<Waypoint>; 3],
}

/// A monthly milestone within a quarterly goal.
///
/// The target month is derived from the slot index in
/// [`QuarterlyGoal::waypoints`] plus the parent goal's quarter — it is never
/// stored here. A completed waypoint renders by `completed_at`; an incomplete
/// one renders by slot + quarter (or as a star when the goal is backlogged).
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Waypoint {
    pub id: WaypointId,
    pub text: String,
    /// `None` until the waypoint is completed.
    pub completed_at: Option<Epoch>,
}

/// One entry in a [`WeightPeriod`]: how much of the week's focus budget goes to
/// a specific [`Activity`].
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct WeightEntry {
    pub activity: Activity,
    /// 0.0–1.0.
    pub weight: f64,
}

/// A dated set of long-term focus weights that takes effect at `start_at`.
///
/// All entry weights within a period should sum to 1.0.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct WeightPeriod {
    pub id: WeightPeriodId,
    /// When these weights take effect.
    pub start_at: Epoch,
    pub note: Option<String>,
    pub entries: Vec<WeightEntry>,
}

/// How focus is distributed across activities (main quests, side quests,
/// distractions) for a given week or period.
///
/// All weights should sum to 1.0. Use [`Focus::new`] to construct
/// from raw weights — it normalizes the total automatically.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Focus {
    pub weights: Vec<WeightEntry>,
}

impl Focus {
    /// Normalizes `weights` so they sum to 1.0. If the total is zero, returns
    /// the weights as-is (avoids division by zero).
    pub fn new(weights: Vec<WeightEntry>) -> Self {
        let total: f64 = weights.iter().map(|w| w.weight).sum();
        if total == 0.0 {
            return Self { weights };
        }
        let weights = weights
            .into_iter()
            .map(|w| WeightEntry {
                activity: w.activity,
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
    pub focus: Focus,
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
    pub actual_split: Focus,
}

/// What kind of work a [`WeeklyGoal`] represents.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type")]
pub enum WeeklyGoalRef {
    /// Planned work belonging to a concern, optionally tied to a waypoint.
    Planned {
        concern_id: ConcernId,
        waypoint_id: Option<WaypointId>,
    },
    /// Unplanned work; may carry one or more distraction labels.
    Distraction { label_ids: Vec<DistractionLabelId> },
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

/// A global distraction label. Editing the text propagates everywhere the
/// label is referenced.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct DistractionLabel {
    pub id: DistractionLabelId,
    pub text: String,
    pub created_at: Epoch,
}

/// Payload submitted when the user finishes the weekly planning session.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type")]
pub enum WeeklyPlanRequest {
    Plan { focus: Focus, goals: Vec<WeeklyGoal> },
    NoPlan { reason: String },
}
