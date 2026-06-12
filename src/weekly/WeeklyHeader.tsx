import type { QuarterDisplay, WeeklyPlan } from '../bindings';

interface Props {
  plan: WeeklyPlan;
  currentQuarter: QuarterDisplay;
  locale: string;
  timezone: string;
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function weekInQuarter(planStart: number, quarterStart: number): number {
  return Math.floor((planStart - quarterStart) / MS_PER_WEEK) + 1;
}

function totalWeeks(quarterStart: number, quarterEnd: number): number {
  return Math.round((quarterEnd - quarterStart) / MS_PER_WEEK);
}

export default function WeeklyHeader({ plan, currentQuarter, locale, timezone }: Props) {
  const titleDate = new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', timeZone: timezone }).format(new Date(plan.start_at));

  const prefix = currentQuarter.label.split(' · ')[0];
  const n = weekInQuarter(plan.start_at, currentQuarter.start_at);
  const total = totalWeeks(currentQuarter.start_at, currentQuarter.end_at);
  const subtitle = `${prefix} · week ${n} of ${total}`;

  const dayFmt = new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'short', day: 'numeric', timeZone: timezone });
  const endOptions: { value: string; label: string }[] = Array.from({ length: 7 }, (_, i) => {
    const ms = plan.start_at + i * MS_PER_DAY;
    return { value: String(ms), label: dayFmt.format(new Date(ms)) };
  });
  endOptions.push({
    value: String(plan.start_at + 7 * MS_PER_DAY),
    label: 'Next Monday',
  });

  const defaultEnd = String(plan.start_at + 4 * MS_PER_DAY); // Friday

  return (
    <header className="weekly-header">
      <div className="weekly-header__left">
        <h1 className="weekly-header__title">Week of {titleDate}</h1>
        <span className="weekly-header__subtitle">{subtitle}</span>
      </div>
      <div className="weekly-header__right">
        <span className="weekly-header__ends-label">ends</span>
        <select className="weekly-header__end-picker" defaultValue={defaultEnd}>
          {endOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
