import { useState } from 'react';
import type { Swimlane, SwimlaneWeight, WeeklySessionData } from '../bindings';
import FocusSplitBar from '../shared/FocusSplitBar';
import SwimlaneQuarterContext from './SwimlaneQuarterContext';

interface Props {
  data: WeeklySessionData;
  phase: 'reflecting' | 'planning';
}

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

function ListIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <line x1="2" y1="4" x2="13" y2="4" stroke="#888" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="7.5" x2="13" y2="7.5" stroke="#888" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="11" x2="13" y2="11" stroke="#888" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function PlanSection({ data, phase }: Props) {
  const [focusWeights, setFocusWeights] = useState<SwimlaneWeight[]>(() => data.prev_plan?.focus.weights ?? defaultWeights(data.swimlanes));

  const isActive = phase === 'planning';

  const total = focusWeights.reduce((sum, w) => sum + Math.round(w.weight * 100), 0);

  const targetParts: string[] = [];
  for (const e of data.current_weights.entries) {
    const target = e.target;
    if (target.type !== 'Swimlane') continue;
    const sw = data.swimlanes.find((s) => s.id === target.id);
    targetParts.push(`${Math.round(e.weight * 100)}% ${sw?.name.toLowerCase() ?? ''}`);
  }

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
      {isActive && (
        <div className="weekly-section__body">
          <p className="weekly-step-label">Intended focus</p>
          <FocusSplitBar swimlanes={data.swimlanes} weights={focusWeights} isEditable onChange={setFocusWeights} />
          {total !== 100 && <p className="weekly-validation-error">Total is {total}% — adjust to reach 100%</p>}
          {targetParts.length > 0 && <p className="plan-section__target">Quarterly target: {targetParts.join(' · ')}</p>}
          {data.quarter_context.map((ctx) => (
            <SwimlaneQuarterContext key={ctx.swimlane_id} context={ctx} locale={data.calendar.locale} />
          ))}
        </div>
      )}
    </section>
  );
}
