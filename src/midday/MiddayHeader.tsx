import type { Epoch } from '../bindings';

interface Props {
  checkinAt: Epoch;
  lastCheckinAt: Epoch | null;
  nextCheckinAt: Epoch;
  locale: string;
  timezone: string;
}

function formatTime(epoch: Epoch, locale: string, timezone: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  }).format(new Date(epoch));
}

export default function MiddayHeader({ checkinAt, lastCheckinAt, nextCheckinAt, locale, timezone }: Props) {
  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: timezone,
  }).format(new Date(checkinAt));

  const timeLabel = formatTime(checkinAt, locale, timezone);

  const nextTimeLabel = formatTime(nextCheckinAt, locale, timezone);

  return (
    <header className="midday-header">
      <h1 className="midday-header__title">Mid-day check-in</h1>
      <div className="midday-header__right">
        <div className="midday-header__date">
          {dateLabel} · {timeLabel}
        </div>
        <div className="midday-header__sub">
          {lastCheckinAt === null ? (
            'First check-in today'
          ) : (
            <>
              Last check-in at {formatTime(lastCheckinAt, locale, timezone)} ·{' '}
              <button className="midday-header__next-link" type="button" onClick={() => {}}>
                next check-in at {nextTimeLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
