import { useEffect, useRef, useState } from 'react';

import { useDataVersion } from '../../hooks/useDataVersion';
import { BaseDialog } from '../ui/BaseDialog';
import { getWeightHistory, type WeightEntry } from './api';
import { WeighInList } from './WeighInList';
import { WeightDialog } from './WeightDialog';

/**
 * The weigh-ins, read again with every change of data, with the dialogs to
 * add or correct one and to see them all. Render `dialogs` once.
 */
export function useWeighIns() {
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
        setHasError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setHistory(null);
          setHasError(true);
        }
      });
    return () => controller.abort();
  }, [attempt, version]);

  const retry = () => {
    setHasError(false);
    setAttempt((count) => count + 1);
  };

  const openDialog = (entry: WeightEntry | null) => {
    setDialog(({ openCount }) => ({ entry, openCount: openCount + 1 }));
    dialogRef.current?.showModal();
  };

  const handleSaved = (saved: WeightEntry) => {
    setHistory((current) =>
      [saved, ...(current ?? []).filter((entry) => entry.id !== saved.id)].sort(
        (a, b) => b.loggedAt.localeCompare(a.loggedAt),
      ),
    );
  };

  const handleDeleted = (entryId: number) => {
    setHistory((current) =>
      (current ?? []).filter((entry) => entry.id !== entryId),
    );
  };

  const dialogs = (
    <>
      <BaseDialog dialogRef={historyRef} title="Historique des pesées">
        <WeighInList entries={history ?? []} onEdit={openDialog} />
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

  return {
    history,
    hasError,
    isLoading: history === null && !hasError,
    retry,
    openDialog,
    openHistory: () => historyRef.current?.showModal(),
    dialogs,
  };
}

export type WeighIns = ReturnType<typeof useWeighIns>;
