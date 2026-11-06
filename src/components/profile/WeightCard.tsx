import { useEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';

import { useDataVersion } from '../../hooks/useDataVersion';
import { formatKg, formatSince } from '../../utils/format';
import { AddCircleButton } from '../ui/AddCircleButton';
import { BaseDialog } from '../ui/BaseDialog';
import { EditIconButton } from '../ui/EditIconButton';
import { LoadError } from '../ui/LoadError';
import { Skeleton } from '../ui/Skeleton';
import { StatTile } from '../ui/StatTile';
import { SummaryCard } from '../ui/SummaryCard';
import { getWeightHistory, type WeightEntry } from './api';
import { COMPOSITION, formatMeasure } from './measures';
import { WeightDialog } from './WeightDialog';

/** Weigh-ins listed in the card; the others are in the history dialog. */
const PREVIEW_COUNT = 5;

const ROW_COLUMNS =
  'md:grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(0,1fr))_1.5rem]';

function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface HistoryProps {
  entries: WeightEntry[];
  onEdit: (entry: WeightEntry) => void;
}

/** Weigh-ins, latest first, each with a button to correct it. */
function WeightHistory({ entries, onEdit }: HistoryProps) {
  return (
    <div className="relative">
      <div
        className={`sticky top-0 hidden gap-x-3 bg-surface pb-2 text-xs text-theme-600 md:grid ${ROW_COLUMNS}`}
      >
        <span>Date</span>
        <span>Poids</span>
        {COMPOSITION.map(({ key, label }) => (
          <span key={key}>{label}</span>
        ))}
      </div>
      <ul className="divide-y divide-theme-100">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className={`grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-1.5 py-2.5 text-sm ${ROW_COLUMNS}`}
          >
            <span className="text-theme-600">{formatDate(entry.loggedAt)}</span>
            <span className="font-semibold whitespace-nowrap text-theme-800 tabular-nums">
              {formatMeasure(entry.weight, 'kg')}
            </span>
            <dl
              className={`col-span-full row-start-2 grid-cols-2 gap-x-2 gap-y-1 text-xs sm:grid-cols-4 sm:gap-x-3 md:contents md:text-sm ${
                COMPOSITION.some(({ key }) => entry[key] !== null)
                  ? 'grid'
                  : 'hidden'
              }`}
            >
              {COMPOSITION.map(({ key, label, unit }) => (
                <div
                  key={key}
                  className="flex min-w-0 justify-between gap-1 md:block"
                >
                  <dt className="truncate text-theme-600 md:hidden">{label}</dt>
                  <dd className="whitespace-nowrap text-theme-800 tabular-nums">
                    {formatMeasure(entry[key], unit)}
                  </dd>
                </div>
              ))}
            </dl>
            <EditIconButton onClick={() => onEdit(entry)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

interface Props {
  onLatestEntry?: (entry: WeightEntry | null) => void;
}

/**
 * Body composition card: latest weigh-in, the last weigh-ins with the
 * full history in a dialog,, and a dialog to
 * add, correct or delete a weigh-in. It reports the latest weigh-in to the
 * page, which GoalsCard needs.
 */
export function WeightCard({ onLatestEntry }: Props) {
  const [history, setHistory] = useState<WeightEntry[] | null>(null);
  const [hasError, setHasError] = useState(false);
  const version = useDataVersion();
  const [attempt, setAttempt] = useState(0);
  const [dialog, setDialog] = useState<{
    entry: WeightEntry | null;
    openCount: number;
  }>({ entry: null, openCount: 0 });
  const dialogRef = useRef<HTMLDialogElement>(null);
  const historyRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    getWeightHistory(controller.signal)
      .then((entries) => {
        setHistory(entries);
        onLatestEntry?.(entries[0] ?? null);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setHasError(true);
          onLatestEntry?.(null);
        }
      });

    return () => controller.abort();
  }, [onLatestEntry, attempt, version]);

  const retry = () => {
    setHasError(false);
    setAttempt((count) => count + 1);
  };

  const openDialog = (entry: WeightEntry | null) => {
    setDialog(({ openCount }) => ({ entry, openCount: openCount + 1 }));
    dialogRef.current?.showModal();
  };

  const handleSaved = (saved: WeightEntry) => {
    if (history === null) {
      retry();
      return;
    }

    const next = [
      saved,
      ...history.filter((entry) => entry.id !== saved.id),
    ].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));

    setHistory(next);
    onLatestEntry?.(next[0]);
  };

  const handleDeleted = (entryId: number) => {
    const next = (history ?? []).filter((entry) => entry.id !== entryId);

    setHistory(next);
    onLatestEntry?.(next[0] ?? null);
  };

  const latest = history?.[0];
  const isLoading = history === null && !hasError;

  return (
    <>
      <SummaryCard
        title="Composition corporelle"
        aside={<AddCircleButton onClick={() => openDialog(null)} />}
      >
        {isLoading && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-4 w-40" />
          </div>
        )}
        {history === null && hasError && (
          <LoadError
            message="Impossible de charger les pesées."
            onRetry={retry}
          />
        )}
        {history !== null && !latest && (
          <p className="text-sm text-theme-600">Aucune pesée enregistrée.</p>
        )}
        {history && latest && (
          <>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
              <div className="flex shrink-0 items-end justify-between gap-3">
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-theme-800">
                    {formatKg(latest.weight)}
                  </span>
                  <span className="mb-1 text-theme-500">kg</span>
                </div>
                <span className="mb-1 flex items-center gap-1.5 rounded-full bg-theme-100 px-3 py-1 text-xs font-medium whitespace-nowrap text-theme-700">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                  {formatSince(latest.loggedAt)}
                </span>
              </div>
              <dl className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
                {COMPOSITION.map(({ key, label, unit }) => (
                  <StatTile key={key} label={label}>
                    {formatMeasure(
                      history.find((entry) => entry[key] !== null)?.[key] ??
                        null,
                      unit,
                    )}
                  </StatTile>
                ))}
              </dl>
            </div>

            <div className="mt-5 border-t border-theme-100 pt-3">
              <WeightHistory
                entries={history.slice(0, PREVIEW_COUNT)}
                onEdit={openDialog}
              />
              {history.length > PREVIEW_COUNT && (
                <button
                  type="button"
                  onClick={() => historyRef.current?.showModal()}
                  className="mt-2 w-full cursor-pointer rounded-xl py-2.5 text-sm font-medium text-theme-600 transition-colors hover:bg-theme-50"
                >
                  Voir tout l'historique ({history.length})
                </button>
              )}
            </div>
          </>
        )}
      </SummaryCard>

      <BaseDialog
        dialogRef={historyRef}
        title="Historique des pesées"
        maxWidth="xl"
      >
        <WeightHistory entries={history ?? []} onEdit={openDialog} />
      </BaseDialog>

      <WeightDialog
        dialogRef={dialogRef}
        openCount={dialog.openCount}
        entry={dialog.entry}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </>
  );
}
