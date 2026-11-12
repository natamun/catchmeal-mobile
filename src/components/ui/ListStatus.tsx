import { CardEmpty, CardLoading } from './Card';
import { LoadError } from './LoadError';

interface ListStatusProps {
  isLoading: boolean;
  loadError: string | null;
  onRetry?: () => void;
  /** How many items the library holds, before the search. */
  total: number;
  /** How many the search and the filters keep. */
  shown: number;
  /** Said when the library is empty, such as "Aucun aliment enregistré." */
  empty: string;
  /** Starts the no-result sentence, such as "Aucun aliment". */
  none?: string;
  /** The search typed, named in the no-result sentence. */
  query?: string;
  /** Whether a filter leaves items out, also named in it. */
  filtered?: boolean;
  /** Clears the search and the filters: the way out of no result. */
  onClear?: () => void;
  /** No empty or no-result message, such as while a row offers to create. */
  quiet?: boolean;
}

/** What a search without result says, and what its button clears. */
function noResult(none: string, query: string, filtered: boolean) {
  const named = query && `« ${query} »`;
  if (named && filtered) {
    return {
      text: `${none} ne correspond à ${named} avec ces filtres.`,
      clear: 'Effacer la recherche et les filtres',
    };
  }
  if (filtered) {
    return {
      text: `${none} ne correspond à ces filtres.`,
      clear: 'Retirer les filtres',
    };
  }
  return {
    text: named
      ? `${none} ne correspond à ${named}.`
      : `${none} ne correspond à cette recherche.`,
    clear: 'Effacer la recherche',
  };
}

/**
 * The states of a library list in a card, above its rows: loading, the load
 * error with its retry, the empty library, and a search without result,
 * which names the search and the filters and offers to clear them.
 */
export function ListStatus({
  isLoading,
  loadError,
  onRetry,
  total,
  shown,
  empty,
  none,
  query = '',
  filtered = false,
  onClear,
  quiet = false,
}: ListStatusProps) {
  if (isLoading) return <CardLoading />;
  if (loadError) return <LoadError message={loadError} onRetry={onRetry} />;
  if (quiet) return null;
  if (total === 0) return <CardEmpty>{empty}</CardEmpty>;
  if (shown > 0 || !none) return null;

  const { text, clear } = noResult(none, query.trim(), filtered);
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
      <p className="text-sm break-words text-theme-400">{text}</p>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="h-11 cursor-pointer rounded-full px-4 text-sm font-semibold text-theme-500 transition-colors hover:bg-theme-100"
        >
          {clear}
        </button>
      )}
    </div>
  );
}
