import { useState } from 'react';

import { failureMessage } from '../../utils/failureMessage';
import { replaceLoggedLines } from '../meal/api';
import { draftsToInput, type MealItemDraft } from '../meal/draft';
import { draftRow } from '../meal/draftRow';
import { PRIMARY_BUTTON_CLASS } from '../ui/buttonStyle';
import { ItemSheet } from '../ui/ItemSheet';
import { useToast } from '../ui/toastContext';

/** A row of the journal: its lines in the database, as one item to edit. */
export interface JournalLine {
  itemIds: number[];
  draft: MealItemDraft;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Kept once the sheet closes, so it still shows while sliding away. */
  line: JournalLine | null;
}

/**
 * The sheet of a journal row: its quantity to change then save, or the row
 * to remove. Closing it without saving leaves the journal as it was. Remount
 * it (key) at each opening to start again from the row.
 */
export function JournalLineSheet({ open, onClose, line }: Props) {
  const showToast = useToast();
  const [draft, setDraft] = useState(line?.draft ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const save = async (next: MealItemDraft | null) => {
    if (!line) return;
    setError(null);
    setIsSaving(true);
    try {
      await replaceLoggedLines(
        line.itemIds,
        next ? draftsToInput([next])[0] : null,
      );
      showToast(next ? 'Journal mis à jour' : 'Retiré du journal');
      onClose();
    } catch (err: unknown) {
      setError(failureMessage(err, 'Une erreur est survenue, réessayez.'));
    } finally {
      setIsSaving(false);
    }
  };

  const row = draft && draftRow(draft, setDraft, () => void save(null), true);
  const isChanged = draft !== null && draft.quantity !== line?.draft.quantity;

  return (
    <ItemSheet
      open={open && row !== null}
      onClose={onClose}
      title={row?.name ?? ''}
      onRemove={() => void save(null)}
      detail={row?.detail}
      aside={row?.aside}
    >
      {row?.editor}
      {row?.editor && (
        <div className="relative mt-2">
          {error && (
            <p className="absolute right-0 bottom-full left-0 mb-2 bg-surface text-sm text-red-500">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => void save(draft)}
            disabled={isSaving || !isChanged}
            className={PRIMARY_BUTTON_CLASS}
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      )}
    </ItemSheet>
  );
}
