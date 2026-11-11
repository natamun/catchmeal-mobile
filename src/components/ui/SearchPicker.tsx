import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Check, Search } from 'lucide-react';

import { FieldError } from './FieldError';
import { LABEL_CLASS } from './fieldStyle';
import { SearchInput } from './SearchInput';

interface SearchPickerProps<T> {
  /** The label above the field, also the name of the search page. */
  label: string;
  /** What the field says before a search: "Rechercher un aliment". */
  placeholder: string;
  items: readonly T[];
  keyOf: (item: T) => string | number;
  nameOf: (item: T) => string;
  /** A dimmer figure at the end of a result, such as its calories. */
  detailOf?: (item: T) => string;
  matches: (item: T, query: string) => boolean;
  /** Already in the list being edited: checked, and not added twice. */
  isAdded: (item: T) => boolean;
  onPick: (item: T) => void;
  /** A link beside the label, such as "Ajout rapide". */
  labelAction?: ReactNode;
  /** Shown above the results of a search, such as creating what was typed. */
  renderExtra?: (query: string) => ReactNode;
  /** The way out when nothing matches, given a way to close the search. */
  renderEmpty?: (query: string, close: () => void) => ReactNode;
  error?: string;
}

/**
 * A field that opens a search of a library on the whole screen, fading in as
 * a search mode of the page rather than a page of its own: the field at the
 * top, the results right under it, so the
 * keyboard never covers them (in edge-to-edge, Android lays the keyboard over
 * the app instead of shrinking it). A tap adds a result and the search stays
 * open, so several can be added in a row; those already added are checked.
 * It is a native <dialog>, so the Android back button closes it.
 */
export function SearchPicker<T>({
  label,
  placeholder,
  items,
  keyOf,
  nameOf,
  detailOf,
  matches,
  isAdded,
  onPick,
  labelAction,
  renderExtra,
  renderEmpty,
  error,
}: SearchPickerProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      inputRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const typed = query.trim().toLowerCase();
  const results = typed ? items.filter((item) => matches(item, typed)) : items;

  const close = () => setOpen(false);

  return (
    <div className="relative flex flex-col gap-1.5">
      <div className="flex min-h-5 items-center justify-between gap-3">
        <span className={LABEL_CLASS}>{label}</span>
        {labelAction}
      </div>
      <button
        type="button"
        onClick={() => {
          setQuery('');
          setOpen(true);
        }}
        data-invalid={Boolean(error)}
        className="flex h-12 w-full cursor-pointer items-center gap-2 rounded-xl border border-theme-200 bg-surface px-3 text-left text-base text-theme-400 transition-colors hover:bg-theme-100 data-[invalid=true]:border-red-500"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">{placeholder}</span>
      </button>
      <FieldError message={error} />

      <dialog
        ref={dialogRef}
        aria-label={label}
        onClose={close}
        className="search-fade m-0 h-dvh max-h-none w-full max-w-none border-none bg-theme-50 p-0"
      >
        <div className="mx-auto flex h-full max-w-6xl flex-col pt-[env(safe-area-inset-top)]">
          <div className="flex shrink-0 items-center gap-2 px-4 py-3">
            <button
              type="button"
              aria-label="Fermer la recherche"
              onClick={close}
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-theme-600 transition-colors hover:bg-theme-100 active:bg-theme-200"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <SearchInput
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              placeholder={placeholder}
            />
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-6 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {typed && renderExtra?.(query.trim())}
            {results.length > 0 ? (
              <ul className="flex flex-col divide-y divide-theme-100">
                {results.map((item) => {
                  const added = isAdded(item);
                  return (
                    <li key={keyOf(item)}>
                      <button
                        type="button"
                        disabled={added}
                        onClick={() => onPick(item)}
                        className="-mx-2 flex h-12 w-[calc(100%+1rem)] cursor-pointer items-center gap-3 rounded-xl px-2 text-left transition-colors hover:bg-theme-100 disabled:cursor-default disabled:hover:bg-transparent"
                      >
                        <span className="min-w-0 flex-1 truncate text-base text-theme-800">
                          {nameOf(item)}
                        </span>
                        {detailOf && (
                          <span className="shrink-0 text-sm text-theme-600 tabular-nums">
                            {detailOf(item)}
                          </span>
                        )}
                        <span className="flex w-5 shrink-0 justify-center">
                          {added && (
                            <Check className="h-5 w-5 text-theme-500" />
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex flex-col items-start gap-3 py-2">
                <p className="text-sm text-theme-600">
                  {typed
                    ? `Aucun résultat pour « ${query.trim()} ».`
                    : 'La bibliothèque est vide.'}
                </p>
                {renderEmpty?.(query.trim(), close)}
              </div>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}
