import { useEffect, useState } from 'react';
import type { Concern, MainQuest, QuarterDisplay, QuarterlyGoal, Waypoint } from '../bindings';

interface Props {
  mainQuests: MainQuest[];
  concerns: Concern[];
  currentQuarterGoals: QuarterlyGoal[];
  currentQuarter: QuarterDisplay;
  locale: string;
  invalid?: boolean;
  onAllSelected?: (allSelected: boolean) => void;
}

type Confidence = 'on-track' | 'at-risk' | 'behind';

const CONFIDENCE_OPTIONS: { value: Confidence; label: string; bg: string; color: string }[] = [
  { value: 'on-track', label: 'on track', bg: '#2a6b18', color: '#a8e080' },
  { value: 'at-risk', label: 'at risk', bg: '#7a4800', color: '#f5c050' },
  { value: 'behind', label: 'behind', bg: '#7a1818', color: '#f08080' },
];

function findActiveWaypointSlot(goal: QuarterlyGoal): { waypoint: Waypoint; slot: number } | null {
  for (let slot = 0; slot < goal.waypoints.length; slot++) {
    const wp = goal.waypoints[slot];
    if (wp !== null && wp.completed_at === null) return { waypoint: wp, slot };
  }
  return null;
}

function slotMonthName(slot: number, quarterStartAt: number, locale: string): string {
  const d = new Date(quarterStartAt);
  const totalMonth = d.getUTCMonth() + slot;
  const month = (totalMonth % 12) + 1;
  const year = d.getUTCFullYear() + Math.floor(totalMonth / 12);
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(year, month - 1, 1));
}

function quarterPrefix(label: string): string {
  return label.split(' · ')[0];
}

interface CardProps {
  label: string;
  concernColor: string;
  currentQuarter: QuarterDisplay;
  waypoint: Waypoint;
  slot: number;
  locale: string;
  confidence: Confidence | null;
  onSelect: (value: Confidence) => void;
}

function WaypointHealthCard({ label, concernColor, currentQuarter, waypoint, slot, locale, confidence, onSelect }: CardProps) {
  const month = slotMonthName(slot, currentQuarter.start_at, locale);
  const subtitle = `${quarterPrefix(currentQuarter.label)} ${month} waypoint`;

  return (
    <div className={`waypoint-health-card${confidence === null ? ' waypoint-health-card--unselected' : ''}`}>
      <div className="waypoint-health-card__content">
        <div className="waypoint-health-card__label" style={{ color: concernColor }}>
          {label}
        </div>
        <p className="waypoint-health-card__waypoint-text">{waypoint.text}</p>
        <p className="waypoint-health-card__subtitle">{subtitle}</p>
      </div>
      <div className="waypoint-health-card__buttons">
        {CONFIDENCE_OPTIONS.map((opt) => {
          const selected = confidence === opt.value;
          return (
            <button
              key={opt.value}
              className="waypoint-health-card__btn"
              style={selected ? { background: opt.bg, color: opt.color, borderColor: opt.bg } : undefined}
              onClick={() => onSelect(opt.value)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function WaypointHealthList({ mainQuests, concerns, currentQuarterGoals, currentQuarter, locale, invalid, onAllSelected }: Props) {
  const [confidences, setConfidences] = useState<Map<string, Confidence>>(() => new Map());

  const cards = currentQuarterGoals
    .map((goal) => {
      const active = findActiveWaypointSlot(goal);
      if (!active) return null;
      let concernColor: string;
      if (goal.parent.type === 'MainQuest') {
        const mq = mainQuests.find((m) => m.id === goal.parent.id);
        concernColor = concerns.find((c) => c.id === mq?.concern_id)?.color ?? '#666';
      } else {
        concernColor = concerns.find((c) => c.id === goal.parent.concern_id)?.color ?? '#666';
      }
      return { goal, label: goal.text, concernColor, ...active };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const nCards = cards.length;
  useEffect(() => {
    if (nCards === 0) onAllSelected?.(true);
  }, [nCards, onAllSelected]);

  if (cards.length === 0) return null;

  const anyUnselected = cards.some((c) => !confidences.has(c.goal.id));

  function handleSelect(goalId: string, val: Confidence) {
    const next = new Map(confidences).set(goalId, val);
    setConfidences(next);
    onAllSelected?.(cards.every((c) => next.has(c.goal.id)));
  }

  return (
    <div className="waypoint-health-list">
      {cards.map(({ goal, label, concernColor, waypoint, slot }) => (
        <WaypointHealthCard
          key={goal.id}
          label={label}
          concernColor={concernColor}
          currentQuarter={currentQuarter}
          waypoint={waypoint}
          slot={slot}
          locale={locale}
          confidence={confidences.get(goal.id) ?? null}
          onSelect={(val) => handleSelect(goal.id, val)}
        />
      ))}
      {invalid && anyUnselected && <p className="weekly-validation-error">Rate your confidence for each waypoint before continuing.</p>}
    </div>
  );
}
