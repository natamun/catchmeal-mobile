import { ChevronLeft, ChevronRight } from 'lucide-react';

const ARROW_CLASS =
  'flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-theme-600 transition-colors hover:bg-theme-100 disabled:pointer-events-none disabled:opacity-30';

interface CalendarHeaderProps {
  title: string;
  /** Makes the title a button, such as going from the days to the months. */
  onTitleClick?: () => void;
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
}

/**
 * The header of every calendar of the app (react-datepicker's
 * renderCustomHeader): the period in the middle, and two 44 px arrows whose
 * pressed state follows the app's buttons, centred on their icon.
 */
export function CalendarHeader({
  title,
  onTitleClick,
  onPrevious,
  onNext,
  previousDisabled = false,
  nextDisabled = false,
}: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between px-2">
      <button
        type="button"
        aria-label="Précédent"
        onClick={onPrevious}
        disabled={previousDisabled}
        className={ARROW_CLASS}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      {onTitleClick ? (
        <button
          type="button"
          onClick={onTitleClick}
          className="react-datepicker__current-month cursor-pointer transition-colors hover:text-theme-600"
        >
          {title}
        </button>
      ) : (
        <span className="react-datepicker__current-month">{title}</span>
      )}
      <button
        type="button"
        aria-label="Suivant"
        onClick={onNext}
        disabled={nextDisabled}
        className={ARROW_CLASS}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
