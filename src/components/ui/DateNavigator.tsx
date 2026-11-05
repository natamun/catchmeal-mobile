import { ChevronLeft, ChevronRight } from 'lucide-react';

import { CalendarButton } from './CalendarButton';

const ARROW_CLASS =
  'tap-area relative flex cursor-pointer items-center justify-center rounded-lg px-3 py-1.5 text-theme-500 transition-colors hover:bg-theme-100';

function shiftDay(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

/** "Aujourd'hui", "Hier", "Demain", or a short date. */
function formatLabel(date: Date) {
  const today = new Date();

  if (isSameDay(date, today)) {
    return "Aujourd'hui";
  }
  if (isSameDay(date, shiftDay(today, -1))) {
    return 'Hier';
  }
  if (isSameDay(date, shiftDay(today, 1))) {
    return 'Demain';
  }

  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

interface DateNavigatorProps {
  value: Date;
  onChange: (date: Date) => void;
}

/**
 * Day picker of the journal: arrows for the previous and next day, and the date
 * in the middle, which opens a calendar.
 */
export function DateNavigator({ value, onChange }: DateNavigatorProps) {
  return (
    <div className="flex gap-1.5 self-start rounded-xl border border-theme-200 bg-surface p-1.5 max-2xs:w-full">
      <button
        type="button"
        onClick={() => onChange(shiftDay(value, -1))}
        className={ARROW_CLASS}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <CalendarButton
        value={value}
        onChange={onChange}
        className="tap-area relative w-36 rounded-lg bg-theme-500 px-3 py-1.5 text-center text-sm font-medium text-on-accent capitalize transition-colors hover:bg-theme-600 max-2xs:w-full"
        wrapperClassName="max-2xs:flex-1"
      >
        {formatLabel(value)}
      </CalendarButton>
      <button
        type="button"
        onClick={() => onChange(shiftDay(value, 1))}
        className={ARROW_CLASS}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
