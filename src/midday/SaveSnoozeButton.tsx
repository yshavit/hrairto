import { useEffect, useRef, useState } from 'react';
import type { Epoch } from '../bindings';

// Stable for the lifetime of the session — only changes if the user
// changes their OS timezone while the app is running.
const LOCAL_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

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
  const [openedAt, setOpenedAt] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onBlur() {
      setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('blur', onBlur);
    };
  }, [open]);

  function handleTriggerClick() {
    if (!open) setOpenedAt(Date.now());
    setOpen((v) => !v);
  }

  const topOfHour = nextTopOfHourAfter15m(openedAt);
  const snoozeOptions = [
    { label: '5 min', until: openedAt + 5 * 60 * 1000 },
    { label: '15 min', until: openedAt + 15 * 60 * 1000 },
    { label: formatTime(topOfHour, locale, LOCAL_TIMEZONE), until: topOfHour },
    { label: `Next check-in (${formatTime(nextCheckinAt, locale, timezone)})`, until: nextCheckinAt },
  ];

  return (
    <div className="save-snooze" ref={wrapRef}>
      {open && (
        <div className="save-snooze__dropdown">
          {snoozeOptions.map((opt) => (
            <button key={opt.label} className="save-snooze__option" onClick={() => setOpen(false)}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
      <div className="save-snooze__bar">
        <button className="save-snooze__done" onClick={onDone}>
          Done
        </button>
        <button className="save-snooze__trigger" onClick={handleTriggerClick}>
          <span className="save-snooze__chevron">▾</span>
          <span className="save-snooze__label">snooze</span>
        </button>
      </div>
    </div>
  );
}
