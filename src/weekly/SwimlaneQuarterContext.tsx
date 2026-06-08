import type { Swimlane, SwimlanePlanningContext } from '../bindings';
import '../shared/swimlane-pill.css';
import WaypointList from '../shared/WaypointList';

interface Props {
  context: SwimlanePlanningContext;
  locale: string;
  swimlane?: Swimlane;
}

export default function SwimlaneQuarterContext({ context, locale, swimlane }: Props) {
  const { quarter, quarterly_goal } = context;
  const color = swimlane?.color ?? '#666';
  return (
    <div className="swimlane-quarter-context" style={{ '--swimlane-color': color } as React.CSSProperties}>
      <div className="swimlane-quarter-context__header">
        {swimlane && <span className="swimlane-pill">{swimlane.name}</span>}
        <span className="swimlane-quarter-context__label">{quarter.label}</span>
        {!quarterly_goal && <span className="swimlane-quarter-context__empty">— No quarterly goal set</span>}
      </div>
      {quarterly_goal && (
        <>
          <p className="swimlane-quarter-context__goal-text">{quarterly_goal.text}</p>
          <WaypointList waypoints={quarterly_goal.waypoints} isActiveQuarter locale={locale} />
        </>
      )}
    </div>
  );
}
