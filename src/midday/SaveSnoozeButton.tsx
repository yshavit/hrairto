import { useEffect, useRef, useState } from 'react';
import type { Epoch } from '../bindings';

function formatTime(epoch: number, locale: string, timezone: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  }).format(new Date(epoch));
}

function nextTopOfHourAfter15m(now: number): number {
  const t = new Date(now + 15 * 60 * 1000);
  t.setSeconds(0, 0);
  if (t.getMinutes() > 0) {
    t.setMinutes(0);
    t.setHours(t.getHours() + 1);
  }
  return t.getTime();
}

interface Props {
  onDone: () => void;
  nextCheckinAt: Epoch;
  locale: string;
  timezone: string;
}

export default function SaveSnoozeButton({ onDone, nextCheckinAt, locale, timezone }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onBlur() { setOpen(false); }
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('blur', onBlur);
    };
  }, [open]);

  const now = Date.now();
  const topOfHour = nextTopOfHourAfter15m(now);
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const snoozeOptions = [
    { label: '5 min', until: now + 5 * 60 * 1000 },
    { label: '15 min', until: now + 15 * 60 * 1000 },
    { label: formatTime(topOfHour, locale, localTimezone), until: topOfHour },
    { label: `Next check-in (${formatTime(nextCheckinAt, locale, timezone)})`, until: nextCheckinAt },
  ];

  return (
    <div className="save-snooze" ref={wrapRef}>
      {open && (
        <div className="save-snooze__dropdown">
          {snoozeOptions.map((opt) => (
            <button
              key={opt.label}
              className="save-snooze__option"
              onClick={() => setOpen(false)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      <div className="save-snooze__bar">
        <button className="save-snooze__done" onClick={onDone}>
          Done
        </button>
        <button className="save-snooze__trigger" onClick={() => setOpen((v) => !v)}>
          <span className="save-snooze__chevron">▾</span>
          <span className="save-snooze__label">snooze</span>
        </button>
      </div>
    </div>
  );
}
