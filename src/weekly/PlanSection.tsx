interface Props {
  phase: 'reflecting' | 'planning';
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

export default function PlanSection({ phase }: Props) {
  const isActive = phase === 'planning';

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
      {isActive && <div className="weekly-section__body">{/* planning steps — Steps 10–14 */}</div>}
    </section>
  );
}
