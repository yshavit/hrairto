import { useState } from 'react';
import type { Concern, DistractionLabel, MainQuest, WeightEntry, WeeklyGoal, WeeklyPlan, WeeklyReflection } from '../bindings';
import FocusSplitBar, { DISTRACTIONS_COLOR, DISTRACTIONS_KEY, SIDE_QUESTS_COLOR, SIDE_QUESTS_KEY, weightKey } from '../shared/FocusSplitBar';

interface Props {
  prevPlan: WeeklyPlan | null;
  reflection: WeeklyReflection | null;
  mainQuests: MainQuest[];
  concerns: Concern[];
  pastGoals: WeeklyGoal[];
  distractionLabels: DistractionLabel[];
}

interface LegendEntry {
  key: string;
  color: string;
  name: string;
  filled: boolean;
}

function buildLegend(weights: WeightEntry[], mainQuests: MainQuest[], concerns: Concern[]): LegendEntry[] {
  return weights.map((w) => {
    const activity = w.activity;
    if (activity.type === 'MainQuest') {
      const mq = mainQuests.find((m) => m.id === activity.id);
      const concern = concerns.find((c) => c.id === mq?.concern_id);
      return { key: activity.id, color: concern?.color ?? '#666', name: mq?.text ?? 'Unknown', filled: true };
    }
    if (activity.type === 'SideQuests') {
      return { key: SIDE_QUESTS_KEY, color: SIDE_QUESTS_COLOR, name: 'Side quests', filled: true };
    }
    return { key: DISTRACTIONS_KEY, color: DISTRACTIONS_COLOR, name: 'Distractions', filled: false };
  });
}

function buildActualTooltips(actualWeights: WeightEntry[], plannedWeights: WeightEntry[]): Record<string, string> {
  const plannedMap = new Map(plannedWeights.map((w) => [weightKey(w), w.weight * 100]));
  const tooltips: Record<string, string> = {};
  for (const w of actualWeights) {
    const key = weightKey(w);
    const planned = plannedMap.get(key);
    if (planned !== undefined) {
      const delta = Math.round(w.weight * 100 - planned);
      if (delta !== 0) {
        tooltips[key] = `${delta > 0 ? '+' : ''}${delta}% from planned`;
      }
    }
  }
  return tooltips;
}

function countDistractionLabels(pastGoals: WeeklyGoal[], distractionLabels: DistractionLabel[]): { label: DistractionLabel; count: number }[] {
  const counts = new Map<string, number>();
  for (const goal of pastGoals) {
    if (goal.goal_ref.type === 'Distraction') {
      for (const id of goal.goal_ref.label_ids) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
  }
  return distractionLabels.map((label) => ({ label, count: counts.get(label.id) ?? 0 })).filter(({ count }) => count > 0);
}

export default function TimeSplitBars({ prevPlan, reflection, mainQuests, concerns, pastGoals, distractionLabels }: Props) {
  const [actualWeights, setActualWeights] = useState<WeightEntry[]>(() => reflection?.actual_split.weights ?? []);

  const actualTooltips = prevPlan && actualWeights.length > 0 ? buildActualTooltips(actualWeights, prevPlan.focus.weights) : {};

  const legendWeights = prevPlan?.focus.weights ?? actualWeights;
  const legend = buildLegend(legendWeights, mainQuests, concerns);
  const pills = countDistractionLabels(pastGoals, distractionLabels);

  return (
    <div className="time-split-bars">
      {prevPlan && (
        <div className="time-split-bar-row">
          <span className="time-split-bar-row__label">Planned</span>
          <FocusSplitBar mainQuests={mainQuests} concerns={concerns} weights={prevPlan.focus.weights} />
        </div>
      )}
      {actualWeights.length > 0 && (
        <div className="time-split-bar-row">
          <span className="time-split-bar-row__label">Actual</span>
          <FocusSplitBar mainQuests={mainQuests} concerns={concerns} weights={actualWeights} isEditable approximate onChange={setActualWeights} tooltips={actualTooltips} />
        </div>
      )}
      <div className="time-split-bars__footer">
        <div className="time-split-bars__legend">
          {legend.map((entry) => (
            <span key={entry.key} className="time-split-bars__legend-item">
              <svg width="9" height="9" viewBox="0 0 9 9">
                <circle cx="4.5" cy="4.5" r="4" fill={entry.filled ? entry.color : 'none'} stroke={entry.color} strokeWidth="1.2" />
              </svg>
              {entry.name}
            </span>
          ))}
        </div>
        {pills.length > 0 && (
          <div className="time-split-bars__pills">
            {pills.map(({ label, count }) => (
              <span key={label.id} className="time-split-bars__pill">
                {label.text} ×{count}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
