import type { SwimlanePlanningContext } from '../bindings';
import WaypointList from '../shared/WaypointList';

interface Props {
  context: SwimlanePlanningContext;
  locale: string;
}

export default function SwimlaneQuarterContext({ context, locale }: Props) {
  const { quarter, quarterly_goal } = context;
  return (
    <div className="swimlane-quarter-context">
      <p className="swimlane-quarter-context__label">{quarter.label} · quarterly goal</p>
      {quarterly_goal ? (
        <>
          <p className="swimlane-quarter-context__goal-text">{quarterly_goal.text}</p>
          <WaypointList waypoints={quarterly_goal.waypoints} isActiveQuarter locale={locale} />
        </>
      ) : (
        <p className="swimlane-quarter-context__empty">No quarterly goal set</p>
      )}
    </div>
  );
}
