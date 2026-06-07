import { Component, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { GoalTreeData } from '../bindings'
import { getGoalTreeData } from '../api'
import GoalTreeView from './GoalTreeView'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
    state = { error: null }
    static getDerivedStateFromError(error: Error) { return { error } }
    render() {
        const { error } = this.state
        if (error) {
            return (
                <pre style={{
                    color: '#ff6b6b', background: '#111', padding: 20, margin: 0,
                    height: '100vh', font: '12px monospace', whiteSpace: 'pre-wrap', overflow: 'auto',
                }}>
                    {(error as Error).message}{'\n\n'}{(error as Error).stack}
                </pre>
            )
        }
        return this.props.children
    }
}

export default function YearlyGoals() {
    const [data, setData] = useState<GoalTreeData | null>(null)

    useEffect(() => {
        getGoalTreeData().then(setData)
    }, [])

    if (!data) {
        return (
            <div style={{
                background: '#111', color: '#666', height: '100vh',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontFamily: 'system-ui, -apple-system, sans-serif',
            }}>
                Loading…
            </div>
        )
    }

    return (
        <ErrorBoundary>
            <GoalTreeView data={data} />
        </ErrorBoundary>
    )
}