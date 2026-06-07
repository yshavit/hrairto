import type { QuarterDisplay, QuarterlyGoal } from '../bindings'
import WaypointList from './WaypointList'

type Status = 'past' | 'active' | 'future'

interface Props {
    quarter: QuarterDisplay
    goal: QuarterlyGoal | null
    status: Status
    activeQuarterLabel: string
    locale: string
}

const BADGE_LABEL: Record<Status, string> = {
    past: 'done',
    active: 'active',
    future: 'future',
}

export default function QuarterCard({ quarter, goal, status, activeQuarterLabel, locale }: Props) {
    return (
        <div className="quarter-card" data-status={status}>
            <div className="quarter-card__header">
                <span className="quarter-card__label">{quarter.label}</span>
                <span className="quarter-card__badge">{BADGE_LABEL[status]}</span>
            </div>
            {goal ? (
                <>
                    <div className="quarter-card__goal-text">{goal.text}</div>
                    <WaypointList
                        waypoints={goal.waypoints}
                        isActiveQuarter={status === 'active'}
                        locale={locale}
                    />
                </>
            ) : (
                <div className="quarter-card__placeholder">
                    Plan during {activeQuarterLabel} review →
                </div>
            )}
        </div>
    )
}