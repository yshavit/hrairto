import { type CSSProperties, useState } from 'react';
import type {
  Concern,
  ConcernId,
  DistractionLabelId,
  MainQuestId,
  WeightEntry,
  WaypointId,
  WeeklyGoal,
  WeeklyGoalId,
  WeeklyPlanRequest,
  WeeklySessionData,
} from '../bindings';
import FocusSplitBar from '../shared/FocusSplitBar';
import '../shared/concern-pill.css';
import MissedGoalGhosts from './MissedGoalGhosts';
import PlanGoalsList, { WaypointGroup } from './PlanGoalsList';
import QuarterlyGoalCard from './QuarterlyGoalCard';

// ── helpers ────────────────────────────────────────────────────────────────

function goalConcernId(goal: WeeklyGoal): ConcernId | null {
  return goal.goal_ref.type === 'Planned' ? goal.goal_ref.concern_id : null;
}

function quarterlyGoalConcernId(
  goal: { parent: { type: 'MainQuest'; id: MainQuestId } | { type: 'SideQuest'; concern_id: ConcernId } },
  mainQuests: { id: MainQuestId; concern_id: ConcernId }[],
): ConcernId | undefined {
  if (goal.parent.type === 'SideQuest') return goal.parent.concern_id;
  return mainQuests.find((m) => m.id === (goal.parent as { type: 'MainQuest'; id: MainQuestId }).id)?.concern_id;
}

function isGoalComplete(goal: { waypoints: (null | { completed_at: number | null })[] }): boolean {
  return goal.waypoints.every((wp) => wp === null || wp.completed_at !== null);
}

// ── PlanSection ────────────────────────────────────────────────────────────

interface Props {
  data: WeeklySessionData;
  phase: 'reflecting' | 'planning';
  missedGoals: WeeklyGoal[];
  onSave: (req: WeeklyPlanRequest) => void;
}

function ListIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <line x1="2" y1="4" x2="13" y2="4" stroke="#888" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="7.5" x2="13" y2="7.5" stroke="#888" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="11" x2="13" y2="11" stroke="#888" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function PlanSection({ data, phase, missedGoals, onSave }: Props) {
  const [focusWeights, setFocusWeights] = useState<WeightEntry[]>(() => data.prev_plan?.focus.weights ?? data.current_weights.entries);
  const [plannedGoals, setPlannedGoals] = useState<WeeklyGoal[]>(() => data.planned_goals);
  const [showNoGoalConfirm, setShowNoGoalConfirm] = useState(false);
  const [noPlanReason, setNoPlanReason] = useState('');

  const isActive = phase === 'planning';
  const hasGoals = plannedGoals.length > 0;

  // ── goal state handlers ────────────────────────────────────────────────

  function handleDelete(id: WeeklyGoalId) {
    setPlannedGoals((prev) => prev.filter((g) => g.id !== id));
  }

  function handleUpdateWaypoint(id: WeeklyGoalId, waypointId: WaypointId | null) {
    setPlannedGoals((prev) =>
      prev.map((g) => (g.id === id && g.goal_ref.type === 'Planned' ? { ...g, goal_ref: { ...g.goal_ref, waypoint_id: waypointId } } : g)),
    );
  }

  function handleUpdateLabels(id: WeeklyGoalId, labelIds: DistractionLabelId[]) {
    setPlannedGoals((prev) =>
      prev.map((g) => (g.id === id && g.goal_ref.type === 'Distraction' ? { ...g, goal_ref: { ...g.goal_ref, label_ids: labelIds } } : g)),
    );
  }

  function handleAddConcern(concernId: ConcernId, text: string, waypointId: WaypointId | null) {
    setPlannedGoals((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        plan_id: data.plan.id,
        created_at: Date.now(),
        text,
        outcome: null,
        goal_ref: { type: 'Planned', concern_id: concernId, waypoint_id: waypointId },
      },
    ]);
  }

  function handleAddDistraction(text: string, labelIds: DistractionLabelId[]) {
    setPlannedGoals((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        plan_id: data.plan.id,
        created_at: Date.now(),
        text,
        outcome: null,
        goal_ref: { type: 'Distraction', label_ids: labelIds },
      },
    ]);
  }

  function waypointGroupsFor(concernId: ConcernId): WaypointGroup[] {
    const groups: WaypointGroup[] = [];
    for (const qg of data.upcoming_quarterly_goals) {
      const qgConcernId: ConcernId | undefined =
        qg.parent.type === 'MainQuest'
          ? data.main_quests.find((m) => m.id === (qg.parent as { type: 'MainQuest'; id: MainQuestId }).id)?.concern_id
          : (qg.parent as { type: 'SideQuest'; concern_id: ConcernId }).concern_id;
      if (qgConcernId !== concernId) continue;
      const incomplete = qg.waypoints.filter((wp): wp is NonNullable<typeof wp> => wp !== null && wp.completed_at === null);
      if (incomplete.length === 0) continue;
      const label = `Q${qg.due_quarter} ${qg.due_year}`;
      const existing = groups.find((g) => g.label === label);
      if (existing) {
        existing.waypoints.push(...incomplete);
      } else {
        groups.push({ label, waypoints: incomplete });
      }
    }
    return groups;
  }

  const activeQuarter = data.current_quarter;

  // ── render ──────────────────────────────────────────────────────────────

  const distGoals = plannedGoals.filter((g) => g.goal_ref.type === 'Distraction');

  return (
    <section className={`weekly-section${isActive ? '' : ' weekly-section--locked'}`}>
      <div className="weekly-section-header">
        <div className="weekly-section-header__left">
          <ListIcon />
          <span className="weekly-section-header__title">Plan this week</span>
        </div>
        {!isActive && (
          <div className="weekly-section-header__right">
            <span className="weekly-section-header__status weekly-section-header__status--waiting">waiting for reflection</span>
          </div>
        )}
      </div>

      <div className={`weekly-section__collapse${isActive ? ' weekly-section__collapse--open' : ''}`}>
        <div className="weekly-section__collapse-inner">
          <div className="weekly-section__body">
            {/* ── Intended focus ── */}
            <p className="weekly-step-label">Intended focus</p>
            <FocusSplitBar mainQuests={data.main_quests} concerns={data.concerns} weights={focusWeights} isEditable onChange={setFocusWeights} />

            <hr className="plan-section__divider" />

            {/* ── Quarter context (per concern, from current_quarter_goals) ── */}
            <p className="weekly-step-label">Current quarter's goals</p>
            {data.concerns.map((concern) => {
              const currentGoals = data.current_quarter_goals
                .filter((qg) => quarterlyGoalConcernId(qg, data.main_quests) === concern.id)
                .map((qg) => ({ goal: qg, quarter: activeQuarter }));
              return (
                <div key={concern.id} className="concern-context-group">
                  <div className="concern-context-group__header">
                    <span className="concern-pill" style={{ '--concern-color': concern.color } as CSSProperties}>
                      {concern.name}
                    </span>
                    <span className="concern-context-group__quarter">{activeQuarter.label}</span>
                  </div>
                  {currentGoals.length === 0 ? (
                    <p className="concern-context-group__empty">No quarterly goal set</p>
                  ) : (
                    <div className="concern-context-group__cards">
                      {currentGoals.map(({ goal, quarter }) => (
                        <QuarterlyGoalCard
                          key={goal.id}
                          goal={goal}
                          quarter={quarter}
                          locale={data.calendar.locale}
                          color={concern.color}
                          isComplete={isGoalComplete(goal)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── Missed goal ghosts (all concerns together) ── */}
            {missedGoals.length > 0 && (
              <>
                <hr className="plan-section__divider" />
                <MissedGoalGhosts goals={missedGoals} concerns={data.concerns} />
              </>
            )}

            <hr className="plan-section__divider" />

            {/* ── Goal lists (per concern + distractions) ── */}
            <p className="weekly-step-label">Goals for this week</p>
            {data.concerns.map((concern: Concern) => {
              const concernGoals = plannedGoals.filter((g) => goalConcernId(g) === concern.id);
              return (
                <div key={concern.id} className="plan-goal-section">
                  <div className="plan-goal-section__header">
                    <span className="concern-pill" style={{ '--concern-color': concern.color } as CSSProperties}>
                      {concern.name}
                    </span>
                  </div>
                  <PlanGoalsList
                    goals={concernGoals}
                    waypointGroups={waypointGroupsFor(concern.id)}
                    distractionLabels={data.distraction_labels}
                    isDistraction={false}
                    onAdd={(text, waypointId) => handleAddConcern(concern.id, text, waypointId)}
                    onDelete={handleDelete}
                    onUpdateWaypoint={handleUpdateWaypoint}
                    onUpdateLabels={handleUpdateLabels}
                  />
                </div>
              );
            })}

            {/* Distractions */}
            <div className="plan-goal-section">
              <div className="plan-goal-section__header">
                <span className="plan-goal-section__distractions-label">Distractions</span>
              </div>
              <PlanGoalsList
                goals={distGoals}
                waypointGroups={[]}
                distractionLabels={data.distraction_labels}
                isDistraction
                onAdd={(text, _wp, labelIds) => handleAddDistraction(text, labelIds)}
                onDelete={handleDelete}
                onUpdateWaypoint={handleUpdateWaypoint}
                onUpdateLabels={handleUpdateLabels}
              />
            </div>

            {hasGoals ? (
              <button className="save-plan-btn" onClick={() => onSave({ type: 'Plan', focus: { weights: focusWeights }, goals: plannedGoals })}>
                Set Plan
              </button>
            ) : showNoGoalConfirm ? (
              <div
                className="no-plan-confirm"
                ref={(el) => {
                  if (el)
                    requestAnimationFrame(() => {
                      const p = el.closest('.weekly-planning__body') as HTMLElement | null;
                      p?.scrollTo({ top: p.scrollHeight, behavior: 'smooth' });
                    });
                }}
              >
                <textarea
                  className="no-plan-confirm__reason"
                  rows={2}
                  placeholder="Why no plan? (optional)"
                  value={noPlanReason}
                  onChange={(e) => setNoPlanReason(e.target.value)}
                />
                <div className="no-plan-confirm__actions">
                  <button className="no-plan-confirm__cancel" onClick={() => setShowNoGoalConfirm(false)}>
                    Cancel
                  </button>
                  <button className="no-plan-confirm__submit" onClick={() => onSave({ type: 'NoPlan', reason: noPlanReason })}>
                    Confirm: no plan for next week
                  </button>
                </div>
              </div>
            ) : (
              <button className="save-plan-btn save-plan-btn--no-goals" onClick={() => setShowNoGoalConfirm(true)}>
                No plan for next week.
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
