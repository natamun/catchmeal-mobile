import {
  addDays,
  differenceInCalendarDays,
  isSameDay,
  subDays,
} from 'date-fns';
import { CalendarDays } from 'lucide-react';

import { CalendarButton, type DateRange } from '../ui/CalendarButton';
import { PillTabs } from '../ui/PillTabs';
import { lastDays } from './period';

const PRESETS = [
  { value: '7', label: '7 j' },
  { value: '30', label: '30 j' },
  { value: '90', label: '90 j' },
] as const;

const DAYS_AROUND_TODAY = 90;

/** "13/10", like the chart axes. */
function formatDay(date: Date) {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

/** Which shortcut (7, 30 or 90 days) matches the period, if it ends today. */
function activePreset({ from, to }: DateRange, today: Date) {
  if (!isSameDay(to, today)) {
    return null;
  }

  const days = String(differenceInCalendarDays(to, from) + 1);

  return PRESETS.find((preset) => preset.value === days)?.value ?? null;
}

interface PeriodSelectorProps {
  period: DateRange;
  onChange: (period: DateRange) => void;
}

/**
 * Period of the stats page on one row: a calendar for any range (up to 90
 * days around today) and shortcuts for the last 7, 30 or 90 days.
 */
export function PeriodSelector({ period, onChange }: PeriodSelectorProps) {
  const today = new Date();
  const preset = activePreset(period, today);
  // The calendar takes the accent only for a range of its own; with a
  // shortcut, the shortcut is the active choice.
  const custom = preset === null;

  return (
    <div className="flex gap-2">
      <CalendarButton
        range={period}
        onRangeChange={onChange}
        min={subDays(today, DAYS_AROUND_TODAY)}
        max={addDays(today, DAYS_AROUND_TODAY)}
        className="group flex w-full rounded-xl border border-theme-200 bg-surface p-1.5"
        wrapperClassName="flex min-w-0 flex-1"
      >
        <span
          className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium whitespace-nowrap tabular-nums transition-colors ${
            custom
              ? 'bg-theme-500 text-on-accent group-hover:bg-theme-600 group-data-[open=true]:bg-theme-600'
              : 'text-theme-700 group-hover:bg-theme-100 group-data-[open=true]:bg-theme-100'
          }`}
        >
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {isSameDay(period.from, period.to)
              ? formatDay(period.to)
              : `${formatDay(period.from)} – ${formatDay(period.to)}`}
          </span>
        </span>
      </CalendarButton>
      <PillTabs
        name="statsPeriod"
        options={PRESETS}
        value={preset}
        onChange={(days) => onChange(lastDays(Number(days)))}
        className="shrink-0"
      />
    </div>
  );
}
