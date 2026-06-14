import type { Epoch } from '../bindings';

interface Props {
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

export default function MiddayHeader({ lastCheckinAt, nextCheckinAt, locale, timezone }: Props) {
  const nextTimeLabel = formatTime(nextCheckinAt, locale, timezone);

  return (
    <header className="midday-header">
      <h1 className="midday-header__title">Check-in</h1>
      <div className="midday-header__right">
        <div className="midday-header__sub">
          {lastCheckinAt === null ? (
            'First check-in today'
          ) : (
            <>
              Last check-in at {formatTime(lastCheckinAt, locale, timezone)} · next check-in at {nextTimeLabel}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
