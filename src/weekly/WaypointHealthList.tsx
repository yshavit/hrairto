import { useState } from 'react';
import type { Swimlane, SwimlanePlanningContext, Waypoint } from '../bindings';

interface Props {
  swimlanes: Swimlane[];
  quarterContext: SwimlanePlanningContext[];
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

function findActiveWaypoint(ctx: SwimlanePlanningContext): Waypoint | null {
  return ctx.quarterly_goal?.waypoints.find((w) => w.completed_at === null) ?? null;
}

function quarterPrefix(label: string): string {
  return label.split(' · ')[0];
}

function monthName(month: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2000, month - 1, 1));
}

interface CardProps {
  swimlane: Swimlane;
  ctx: SwimlanePlanningContext;
  waypoint: Waypoint;
  locale: string;
  confidence: Confidence | null;
  onSelect: (value: Confidence) => void;
}

function WaypointHealthCard({ swimlane, ctx, waypoint, locale, confidence, onSelect }: CardProps) {
  const subtitle = `${quarterPrefix(ctx.quarter.label)} ${monthName(waypoint.target_month, locale)} waypoint`;

  return (
    <div className={`waypoint-health-card${confidence === null ? ' waypoint-health-card--unselected' : ''}`}>
      <div className="waypoint-health-card__content">
        <div className="waypoint-health-card__swimlane-label" style={{ color: swimlane.color }}>
          {swimlane.name}
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

export default function WaypointHealthList({ swimlanes, quarterContext, locale, invalid, onAllSelected }: Props) {
  const [confidences, setConfidences] = useState<Map<string, Confidence>>(() => new Map());

  const cards = quarterContext
    .map((ctx) => {
      const swimlane = swimlanes.find((s) => s.id === ctx.swimlane_id);
      const waypoint = findActiveWaypoint(ctx);
      return swimlane && waypoint ? { ctx, swimlane, waypoint } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (cards.length === 0) return null;

  const anyUnselected = cards.some((c) => !confidences.has(c.swimlane.id));

  function handleSelect(swimlaneId: string, val: Confidence) {
    const next = new Map(confidences).set(swimlaneId, val);
    setConfidences(next);
    onAllSelected?.(cards.every((c) => next.has(c.swimlane.id)));
  }

  return (
    <div className="waypoint-health-list">
      {cards.map(({ ctx, swimlane, waypoint }) => (
        <WaypointHealthCard
          key={swimlane.id}
          swimlane={swimlane}
          ctx={ctx}
          waypoint={waypoint}
          locale={locale}
          confidence={confidences.get(swimlane.id) ?? null}
          onSelect={(val) => handleSelect(swimlane.id, val)}
        />
      ))}
      {invalid && anyUnselected && <p className="weekly-validation-error">Rate your confidence for each waypoint before continuing.</p>}
    </div>
  );
}
