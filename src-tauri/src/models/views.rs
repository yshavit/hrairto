//! Backend-compiled view types for Hrairto.
//!
//! These structs are assembled at command-invocation time and returned to the
//! frontend as read-only payloads. They are never written back to storage.
//! They derive [`specta::Type`] so TypeScript bindings are generated automatically.

use serde::{Deserialize, Serialize};
use specta::Type;

use super::stored::{
    Calendar, Concern, DistractionLabel, Epoch, MainQuest, MainQuestId, QuarterlyGoal, WeeklyGoal,
    WeeklyPlan, WeeklyReflection, WeightPeriod,
};

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
    pub concerns: Vec<Concern>,
    pub current_weights: WeightPeriod,
    pub main_quests: Vec<MainQuest>,
    pub quarterly_goals: Vec<QuarterlyGoal>,
    /// Quarters to show in the scrolling strip, in chronological order.
    /// Computed by the backend at invocation time (see `calendar::quarters_to_display`).
    /// Typically one past quarter, the current quarter, and two or more future quarters.
    pub quarters_to_display: Vec<QuarterDisplay>,
}

/// Read-only quarter context for one main quest, shown during the planning phase
/// so the user can set weekly goals relative to their quarterly commitments.
/// Shape will be refined in Stage 4.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct MainQuestPlanningContext {
    pub main_quest_id: MainQuestId,
    pub quarter: QuarterDisplay,
    /// `None` if the main quest has no quarterly goal for the active quarter.
    pub quarterly_goal: Option<QuarterlyGoal>,
}

/// Full payload for the weekly planning/reflection session UI.
/// The backend computes all derived fields; the frontend just renders.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct WeeklySessionData {
    pub calendar: Calendar,
    /// The fiscal quarter the plan week falls in. Always present — the backend
    /// derives it from `plan.start_at` at invocation time.
    pub current_quarter: QuarterDisplay,
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
    pub concerns: Vec<Concern>,
    /// Active main quests, for color/label resolution in focus-bar and goal lists.
    pub main_quests: Vec<MainQuest>,
    pub distraction_labels: Vec<DistractionLabel>,
    /// Current long-term weight period, shown as the quarterly target reminder
    /// below the focus weight sliders.
    pub current_weights: WeightPeriod,
    /// All quarterly goals for the current planning quarter, for the context
    /// display in the plan section. Includes completed goals (shown dimmed);
    /// covers both main-quest and side-quest goals.
    pub current_quarter_goals: Vec<QuarterlyGoal>,
    /// Quarterly goals available for waypoint selection when entering this
    /// week's goals. Includes the current quarter and any future quarters;
    /// the backend excludes goals whose every waypoint is already completed.
    pub upcoming_quarterly_goals: Vec<QuarterlyGoal>,
}
