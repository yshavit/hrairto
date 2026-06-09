import { useEffect, useRef, useState } from 'react';
import type { DistractionLabel, DistractionLabelId, Waypoint, WaypointId, WeeklyGoal, WeeklyGoalId } from '../bindings';

export interface WaypointGroup {
  label: string;
  waypoints: Waypoint[];
}

// ── shared waypoint select ────────────────────────────────────────────────────

function WaypointSelect({ groups, value, onChange }: { groups: WaypointGroup[]; value: WaypointId | null; onChange: (id: WaypointId | null) => void }) {
  return (
    <select className="plan-goal-item__wp-picker" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">No specific waypoint</option>
      {groups.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.waypoints.map((wp) => (
            <option key={wp.id} value={wp.id}>
              {wp.text}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

// ── PlanGoalItem ──────────────────────────────────────────────────────────────

interface ItemProps {
  goal: WeeklyGoal;
  waypointGroups: WaypointGroup[];
  distractionLabels: DistractionLabel[];
  onDelete: (id: WeeklyGoalId) => void;
  onUpdateWaypoint: (id: WeeklyGoalId, waypointId: WaypointId | null) => void;
  onUpdateLabels: (id: WeeklyGoalId, labelIds: DistractionLabelId[]) => void;
}

function PlanGoalItem({ goal, waypointGroups, distractionLabels, onDelete, onUpdateWaypoint, onUpdateLabels }: ItemProps) {
  const isDistraction = goal.goal_ref.type === 'Distraction';
  const waypointId = goal.goal_ref.type === 'Planned' ? (goal.goal_ref.waypoint_id ?? null) : null;
  const labelIds = goal.goal_ref.type === 'Distraction' ? goal.goal_ref.label_ids : [];

  return (
    <div className="plan-goal-item">
      <span className="plan-goal-item__text">{goal.text}</span>
      {!isDistraction && <WaypointSelect groups={waypointGroups} value={waypointId} onChange={(id) => onUpdateWaypoint(goal.id, id)} />}
      {isDistraction && distractionLabels.length > 0 && (
        <div className="plan-goal-item__labels">
          {distractionLabels.map((label) => (
            <label key={label.id} className="plan-goal-item__label-check">
              <input
                type="checkbox"
                checked={labelIds.includes(label.id)}
                onChange={(e) => {
                  const next = e.target.checked ? [...labelIds, label.id] : labelIds.filter((id) => id !== label.id);
                  onUpdateLabels(goal.id, next);
                }}
              />
              {label.text}
            </label>
          ))}
        </div>
      )}
      <button className="plan-goal-item__delete" onClick={() => onDelete(goal.id)} aria-label="Delete goal">
        ×
      </button>
    </div>
  );
}

// ── AddGoalForm ───────────────────────────────────────────────────────────────

interface FormProps {
  waypointGroups: WaypointGroup[];
  distractionLabels: DistractionLabel[];
  isDistraction: boolean;
  onSubmit: (text: string, waypointId: WaypointId | null, labelIds: DistractionLabelId[]) => void;
  onCancel: () => void;
}

function AddGoalForm({ waypointGroups, distractionLabels, isDistraction, onSubmit, onCancel }: FormProps) {
  const [text, setText] = useState('');
  const [waypointId, setWaypointId] = useState<WaypointId | null>(null);
  const [labelIds, setLabelIds] = useState<DistractionLabelId[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed, waypointId, labelIds);
  }

  return (
    <div className="add-goal-form">
      <input
        ref={inputRef}
        className="add-goal-form__input"
        value={text}
        placeholder="Goal text…"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
          if (e.key === 'Escape') onCancel();
        }}
      />
      {!isDistraction && <WaypointSelect groups={waypointGroups} value={waypointId} onChange={setWaypointId} />}
      {isDistraction && distractionLabels.length > 0 && (
        <div className="plan-goal-item__labels">
          {distractionLabels.map((label) => (
            <label key={label.id} className="plan-goal-item__label-check">
              <input
                type="checkbox"
                checked={labelIds.includes(label.id)}
                onChange={(e) => {
                  setLabelIds((prev) => (e.target.checked ? [...prev, label.id] : prev.filter((id) => id !== label.id)));
                }}
              />
              {label.text}
            </label>
          ))}
        </div>
      )}
      <div className="add-goal-form__actions">
        <button className="add-goal-form__submit" onClick={submit}>
          Add
        </button>
        <button className="add-goal-form__cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── PlanGoalsList ─────────────────────────────────────────────────────────────

export interface PlanGoalsListProps {
  goals: WeeklyGoal[];
  waypointGroups: WaypointGroup[];
  distractionLabels: DistractionLabel[];
  isDistraction: boolean;
  onAdd: (text: string, waypointId: WaypointId | null, labelIds: DistractionLabelId[]) => void;
  onDelete: (id: WeeklyGoalId) => void;
  onUpdateWaypoint: (id: WeeklyGoalId, waypointId: WaypointId | null) => void;
  onUpdateLabels: (id: WeeklyGoalId, labelIds: DistractionLabelId[]) => void;
}

export default function PlanGoalsList({
  goals,
  waypointGroups,
  distractionLabels,
  isDistraction,
  onAdd,
  onDelete,
  onUpdateWaypoint,
  onUpdateLabels,
}: PlanGoalsListProps) {
  const [adding, setAdding] = useState(false);

  function handleSubmit(text: string, waypointId: WaypointId | null, labelIds: DistractionLabelId[]) {
    onAdd(text, waypointId, labelIds);
    setAdding(false);
  }

  return (
    <div className="plan-goals-list">
      {goals.map((goal) => (
        <PlanGoalItem
          key={goal.id}
          goal={goal}
          waypointGroups={waypointGroups}
          distractionLabels={distractionLabels}
          onDelete={onDelete}
          onUpdateWaypoint={onUpdateWaypoint}
          onUpdateLabels={onUpdateLabels}
        />
      ))}
      {adding ? (
        <AddGoalForm
          waypointGroups={waypointGroups}
          distractionLabels={distractionLabels}
          isDistraction={isDistraction}
          onSubmit={handleSubmit}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button className="add-goal-btn" onClick={() => setAdding(true)}>
          + Add goal
        </button>
      )}
    </div>
  );
}
