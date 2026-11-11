import { formatShortDate } from '../../utils/format';
import type { WeightEntry } from './api';
import { formatMeasure } from './measures';

interface ListProps {
  /** The weigh-ins to list, the latest first. */
  entries: WeightEntry[];
  onEdit: (entry: WeightEntry) => void;
}

/**
 * Weigh-ins on one line each: date, weight and body fat. A tap on the row
 * opens the weigh-in, with its other values, to correct or delete it.
 */
export function WeighInList({ entries, onEdit }: ListProps) {
  return (
    <ul className="divide-y divide-theme-100">
      {entries.map((entry) => (
        <li key={entry.id}>
          <button
            type="button"
            onClick={() => onEdit(entry)}
            className="-mx-2 flex h-12 w-[calc(100%+1rem)] cursor-pointer items-center gap-3 rounded-xl px-2 text-sm tabular-nums transition-colors hover:bg-theme-100"
          >
            <span className="min-w-0 flex-1 truncate text-left text-theme-600">
              {formatShortDate(new Date(entry.loggedAt))}
            </span>
            <span className="w-16 text-right font-semibold whitespace-nowrap text-theme-800">
              {formatMeasure(entry.weight, 'kg')}
            </span>
            <span className="w-14 text-right whitespace-nowrap text-theme-600">
              {formatMeasure(entry.bodyFat, '%')}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
