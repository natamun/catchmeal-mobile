import {
  useState,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
} from 'react';
import { fr } from 'date-fns/locale/fr';
import DatePicker, {
  type ReactDatePickerCustomHeaderProps,
} from 'react-datepicker';

import { BottomSheet } from './BottomSheet';
import { CalendarHeader } from './CalendarHeader';

import 'react-datepicker/dist/react-datepicker.css';

/** A period from `from` to `to`, both days included. */
export interface DateRange {
  from: Date;
  to: Date;
}

interface TriggerProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  id?: string;
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onKeyDown?: KeyboardEventHandler<HTMLButtonElement>;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * The button that opens the calendar. Clicked again while the calendar is open,
 * it closes it instead of reopening it.
 */
export function CalendarTrigger({
  children,
  isOpen,
  onClose,
  id,
  className,
  onClick,
  onKeyDown,
  ref,
}: TriggerProps) {
  return (
    <button
      type="button"
      id={id}
      ref={ref}
      onClick={(event) => {
        if (isOpen) {
          onClose();
        } else {
          onClick?.(event);
        }
      }}
      onKeyDown={onKeyDown}
      data-open={isOpen}
      className={`cursor-pointer *:pointer-events-none ${className ?? ''}`}
    >
      {children}
    </button>
  );
}

interface SharedProps {
  children: ReactNode;
  className?: string;
  wrapperClassName?: string;
  min?: Date;
  max?: Date;
}

interface DayProps extends SharedProps {
  value: Date;
  onChange: (date: Date) => void;
}

interface RangeProps extends SharedProps {
  range: DateRange;
  onRangeChange: (range: DateRange) => void;
}

/**
 * A button that opens a French calendar (weeks start on Monday) in a sheet from
 * the bottom. Two modes: one day (`value` and `onChange`) or a period (`range`
 * and `onRangeChange`). For a period, the first tap is kept aside until the
 * second one completes it; the sheet closes once the choice is complete.
 */
export function CalendarButton(props: DayProps | RangeProps) {
  const { children, className, wrapperClassName, min, max } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [pendingStart, setPendingStart] = useState<Date | null>(null);
  const close = () => {
    setIsOpen(false);
    setPendingStart(null);
  };

  const calendar = {
    inline: true,
    minDate: min,
    maxDate: max,
    locale: fr,
    calendarStartDay: 1,
    // Always six weeks: a shorter month would move the arrows under the thumb.
    fixedHeight: true,
    calendarClassName: 'kcal-datepicker',
    renderCustomHeader: ({
      monthDate,
      decreaseMonth,
      increaseMonth,
      prevMonthButtonDisabled,
      nextMonthButtonDisabled,
    }: ReactDatePickerCustomHeaderProps) => (
      <CalendarHeader
        title={monthDate.toLocaleDateString('fr-FR', {
          month: 'long',
          year: 'numeric',
        })}
        onPrevious={decreaseMonth}
        onNext={increaseMonth}
        previousDisabled={prevMonthButtonDisabled}
        nextDisabled={nextMonthButtonDisabled}
      />
    ),
  } as const;

  let title: string;
  let picker: ReactNode;
  if ('range' in props) {
    const { range, onRangeChange } = props;
    title = pendingStart ? 'Choisir la fin' : 'Choisir le début';
    picker = (
      <DatePicker
        {...calendar}
        selectsRange
        swapRange
        openToDate={range.to}
        startDate={pendingStart ?? range.from}
        endDate={pendingStart ? null : range.to}
        onChange={([start, end]: [Date | null, Date | null]) => {
          setPendingStart(end ? null : start);
          if (start && end) {
            onRangeChange({ from: start, to: end });
            close();
          }
        }}
      />
    );
  } else {
    const { value, onChange } = props;
    title = 'Choisir un jour';
    picker = (
      <>
        <DatePicker
          {...calendar}
          selected={value}
          onChange={(date: Date | null) => {
            if (date) {
              onChange(date);
              close();
            }
          }}
        />
        <button
          type="button"
          onClick={() => {
            onChange(new Date());
            close();
          }}
          className="h-11 w-full cursor-pointer rounded-xl border border-theme-200 text-sm font-medium text-theme-700 transition-colors hover:bg-theme-50"
        >
          Aujourd’hui
        </button>
      </>
    );
  }

  return (
    <div className={wrapperClassName}>
      <CalendarTrigger
        isOpen={isOpen}
        onClose={close}
        onClick={() => setIsOpen(true)}
        className={className}
      >
        {children}
      </CalendarTrigger>
      <BottomSheet open={isOpen} onClose={close} title={title}>
        {picker}
      </BottomSheet>
    </div>
  );
}
