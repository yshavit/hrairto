import { useState } from 'react';
import type { DistractionLabelId, Swimlane, SwimlaneId, SwimlaneWeight, WaypointId, WeeklyGoal, WeeklyGoalId, WeeklySessionData } from '../bindings';
import FocusSplitBar from '../shared/FocusSplitBar';
import '../shared/swimlane-pill.css';
import MissedGoalGhosts from './MissedGoalGhosts';
import PlanGoalsList, { WaypointGroup } from './PlanGoalsList';
import SwimlaneQuarterContext from './SwimlaneQuarterContext';

// ── helpers ────────────────────────────────────────────────────────────────

function defaultWeights(swimlanes: Swimlane[]): SwimlaneWeight[] {
  const n = swimlanes.length + 1; // +1 for Distractions
  const evenPct = Math.floor(100 / n / 5) * 5;
  const remainder = 100 - evenPct * n;
  return [
    ...swimlanes.map((sw, i) => ({
      target: { type: 'Swimlane' as const, id: sw.id },
      weight: (evenPct + (i === 0 ? remainder : 0)) / 100,
    })),
    { target: { type: 'Distractions' as const }, weight: evenPct / 100 },
  ];
}

function targetingPct(weights: SwimlaneWeight[], swimlaneId: SwimlaneId | null): number {
  const entry = weights.find((w) => (swimlaneId === null ? w.target.type === 'Distractions' : w.target.type === 'Swimlane' && w.target.id === swimlaneId));
  return Math.round((entry?.weight ?? 0) * 100);
}

// ── PlanSection ────────────────────────────────────────────────────────────

interface Props {
  data: WeeklySessionData;
  phase: 'reflecting' | 'planning';
  missedGoals: WeeklyGoal[];
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

export default function PlanSection({ data, phase, missedGoals }: Props) {
  const [focusWeights, setFocusWeights] = useState<SwimlaneWeight[]>(() => data.prev_plan?.focus.weights ?? defaultWeights(data.swimlanes));
  const [plannedGoals, setPlannedGoals] = useState<WeeklyGoal[]>(() => data.planned_goals);

  const isActive = phase === 'planning';
  const total = focusWeights.reduce((sum, w) => sum + Math.round(w.weight * 100), 0);

  const targetParts: string[] = [];
  for (const e of data.current_weights.entries) {
    const target = e.target;
    if (target.type !== 'Swimlane') continue;
    const sw = data.swimlanes.find((s) => s.id === target.id);
    targetParts.push(`${Math.round(e.weight * 100)}% ${sw?.name.toLowerCase() ?? ''}`);
  }

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

  function handleAddSwimlane(swimlaneId: SwimlaneId, text: string, waypointId: WaypointId | null) {
    setPlannedGoals((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        plan_id: data.plan.id,
        created_at: Date.now(),
        text,
        outcome: null,
        goal_ref: { type: 'Planned', swimlane_id: swimlaneId, waypoint_id: waypointId },
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

  function waypointGroupsFor(swimlaneId: SwimlaneId): WaypointGroup[] {
    const groups: WaypointGroup[] = [];
    for (const qg of data.upcoming_quarterly_goals) {
      if (qg.swimlane_id !== swimlaneId) continue;
      const incomplete = qg.waypoints.filter((wp) => wp.completed_at === null);
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
            <FocusSplitBar swimlanes={data.swimlanes} weights={focusWeights} isEditable onChange={setFocusWeights} />
            {total !== 100 && <p className="weekly-validation-error">Total is {total}% — adjust to reach 100%</p>}
            {targetParts.length > 0 && <p className="plan-section__target">Quarterly target: {targetParts.join(' · ')}</p>}

            <hr className="plan-section__divider" />

            {/* ── Quarter context (all swimlanes) ── */}
            <p className="weekly-step-label">Current quarter's goals</p>
            {data.quarter_context.map((ctx) => (
              <SwimlaneQuarterContext
                key={ctx.swimlane_id}
                context={ctx}
                locale={data.calendar.locale}
                swimlane={data.swimlanes.find((s) => s.id === ctx.swimlane_id)}
              />
            ))}

            {/* ── Missed goal ghosts (all lanes together) ── */}
            {missedGoals.length > 0 && (
              <>
                <hr className="plan-section__divider" />
                <MissedGoalGhosts goals={missedGoals} swimlanes={data.swimlanes} />
              </>
            )}

            <hr className="plan-section__divider" />

            {/* ── Goal lists (per swimlane + distractions) ── */}
            <p className="weekly-step-label">Goals for this week</p>
            {data.swimlanes.map((sw) => {
              const swGoals = plannedGoals.filter((g) => g.goal_ref.type === 'Planned' && g.goal_ref.swimlane_id === sw.id);
              return (
                <div key={sw.id} className="plan-goal-section">
                  <div className="plan-goal-section__header">
                    <span className="swimlane-pill" style={{ '--swimlane-color': sw.color } as React.CSSProperties}>
                      {sw.name}
                    </span>
                    <span className="plan-goal-section__targeting">targeting ~{targetingPct(focusWeights, sw.id)}%</span>
                  </div>
                  <PlanGoalsList
                    goals={swGoals}
                    waypointGroups={waypointGroupsFor(sw.id)}
                    distractionLabels={data.distraction_labels}
                    isDistraction={false}
                    onAdd={(text, waypointId) => handleAddSwimlane(sw.id, text, waypointId)}
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
                <span className="plan-goal-section__targeting">targeting ~{targetingPct(focusWeights, null)}%</span>
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
          </div>
        </div>
      </div>
    </section>
  );
}
