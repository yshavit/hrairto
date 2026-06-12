import type { Concern, MainQuest, WeightEntry } from '../bindings';
import WeightDisplay from './WeightDisplay';

interface Props {
  currentQuarterLabel: string;
  entries: WeightEntry[];
  mainQuests: MainQuest[];
  concerns: Concern[];
  onPrev(): void;
  onNext(): void;
  onToday(): void;
}

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="2.5" width="12" height="10" rx="1.5" stroke="#666" strokeWidth="1.2" />
      <line x1="1" y1="6" x2="13" y2="6" stroke="#666" strokeWidth="1.2" />
      <line x1="4.5" y1="0.5" x2="4.5" y2="4" stroke="#666" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="9.5" y1="0.5" x2="9.5" y2="4" stroke="#666" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export default function GoalTreeHeader({ currentQuarterLabel, entries, mainQuests, concerns, onPrev, onNext, onToday }: Props) {
  return (
    <header className="goal-tree-header">
      <h1 className="goal-tree-header__title">Goals</h1>
      <div className="goal-tree-header__nav">
        <button className="goal-tree-header__nav-today" onClick={onToday}>
          Today
        </button>
        <button className="goal-tree-header__nav-arrow" onClick={onPrev}>
          ‹
        </button>
        <button className="goal-tree-header__nav-arrow" onClick={onNext}>
          ›
        </button>
      </div>
      <div className="goal-tree-header__right">
        <div className="goal-tree-header__quarter-info">
          <CalendarIcon />
          {currentQuarterLabel} active
        </div>
        <WeightDisplay entries={entries} mainQuests={mainQuests} concerns={concerns} />
      </div>
    </header>
  );
}
