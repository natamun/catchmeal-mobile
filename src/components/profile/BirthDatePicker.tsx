import { useState } from 'react';
import { subYears } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import DatePicker from 'react-datepicker';

import 'react-datepicker/dist/react-datepicker.css';

import { toDateKey } from '../../utils/dateKey';
import { BottomSheet } from '../ui/BottomSheet';
import { CalendarTrigger } from '../ui/CalendarButton';
import { CalendarHeader } from '../ui/CalendarHeader';
import { LABEL_CLASS } from '../ui/fieldStyle';

type View = 'year' | 'month' | 'day';

const SHEET_TITLE: Record<View, string> = {
  year: 'Année de naissance',
  month: 'Mois de naissance',
  day: 'Jour de naissance',
};

const YEARS_PER_PAGE = 20;

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Birth date picker that goes year, then month, then day, so an old date takes
 * three taps instead of hundreds, in a sheet from the bottom like the other
 * calendars. It opens 20 years back when empty, and the future is blocked.
 */
export function BirthDatePicker({ id, label, value, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<View>('year');
  const today = new Date();
  const selected = value ? new Date(`${value}T12:00:00`) : null;
  const close = () => {
    setIsOpen(false);
    setView('year');
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <div className="flex flex-col">
        <CalendarTrigger
          id={id}
          isOpen={isOpen}
          onClose={close}
          onClick={() => setIsOpen(true)}
          className="w-full rounded-xl border border-theme-200 bg-surface px-4 py-2.75 text-left text-base text-theme-800 transition-colors hover:bg-theme-100 data-[open=true]:bg-theme-100"
        >
          {selected ? (
            selected.toLocaleDateString('fr-FR')
          ) : (
            <span className="text-theme-800/50">Date</span>
          )}
        </CalendarTrigger>
        <BottomSheet open={isOpen} onClose={close} title={SHEET_TITLE[view]}>
          <DatePicker
            inline
            selected={selected}
            openToDate={selected ?? subYears(today, YEARS_PER_PAGE)}
            maxDate={today}
            onSelect={(date: Date | null) => {
              if (!date) {
                return;
              }
              if (view === 'day') {
                onChange(toDateKey(date));
                close();
              } else {
                setView(view === 'year' ? 'month' : 'day');
              }
            }}
            showYearPicker={view === 'year'}
            showMonthYearPicker={view === 'month'}
            yearItemNumber={YEARS_PER_PAGE}
            locale={fr}
            calendarStartDay={1}
            calendarClassName="kcal-datepicker"
            renderCustomHeader={({
              date,
              decreaseMonth,
              increaseMonth,
              decreaseYear,
              increaseYear,
              prevMonthButtonDisabled,
              nextMonthButtonDisabled,
              visibleYearsRange,
            }) => {
              const byMonth = view === 'day';
              const lastYear = visibleYearsRange?.endYear ?? date.getFullYear();
              const title = visibleYearsRange
                ? `${visibleYearsRange.startYear} – ${visibleYearsRange.endYear}`
                : date.toLocaleDateString(
                    'fr-FR',
                    byMonth
                      ? { month: 'long', year: 'numeric' }
                      : { year: 'numeric' },
                  );

              return (
                <CalendarHeader
                  title={title}
                  onTitleClick={
                    view === 'year'
                      ? undefined
                      : () => setView(byMonth ? 'month' : 'year')
                  }
                  onPrevious={byMonth ? decreaseMonth : decreaseYear}
                  onNext={byMonth ? increaseMonth : increaseYear}
                  previousDisabled={byMonth && prevMonthButtonDisabled}
                  nextDisabled={
                    byMonth
                      ? nextMonthButtonDisabled
                      : lastYear >= today.getFullYear()
                  }
                />
              );
            }}
          />
        </BottomSheet>
      </div>
    </div>
  );
}
