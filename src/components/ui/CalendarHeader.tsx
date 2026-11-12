import { ChevronLeft, ChevronRight } from 'lucide-react';

import { IconButton } from './IconButton';

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
      <IconButton
        label="Précédent"
        tone="strong"
        onClick={onPrevious}
        disabled={previousDisabled}
      >
        <ChevronLeft className="h-5 w-5" />
      </IconButton>
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
      <IconButton
        label="Suivant"
        tone="strong"
        onClick={onNext}
        disabled={nextDisabled}
      >
        <ChevronRight className="h-5 w-5" />
      </IconButton>
    </div>
  );
}
