import { useRef, useState } from 'react';
import { Save, Share2, Upload } from 'lucide-react';
import { useNavigate } from 'react-router';

import type { Backup } from '../../data/backup';
import { PATHS } from '../../routing/paths';
import { failureMessage } from '../../utils/failureMessage';
import { useProfile } from '../profile/profileContext';
import { DANGER_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from '../ui/buttonStyle';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { SummaryCard } from '../ui/SummaryCard';
import { useToast } from '../ui/toastContext';
import { readBackupFile, restoreData, saveData, shareData } from './api';

function formatBackupDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Backup card of the profile page. The data only lives on this phone:
 * "Enregistrer" saves it to a file in Documents/CatCHMeal, "Partager" hands
 * that file to Android (Drive, e-mail...) for a copy off the phone, and
 * "Restaurer" reads such a file back and replaces everything, after a
 * confirmation.
 */
export function BackupCard() {
  const { reloadProfile } = useProfile();
  const navigate = useNavigate();
  const showToast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirmDialogRef = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    setIsBusy(true);
    try {
      showToast(`Sauvegarde enregistrée dans ${await saveData()}`, Save);
    } catch (err: unknown) {
      setError(failureMessage(err, "L'enregistrement a échoué, réessayez."));
    } finally {
      setIsBusy(false);
    }
  };

  const handleShare = async () => {
    setError(null);
    setIsBusy(true);
    try {
      await shareData();
    } catch (err: unknown) {
      setError(failureMessage(err, 'Le partage a échoué, réessayez.'));
    } finally {
      setIsBusy(false);
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    setError(null);
    try {
      setPending(await readBackupFile(file));
      confirmDialogRef.current?.showModal();
    } catch (err: unknown) {
      setError(failureMessage(err, 'Impossible de lire ce fichier.'));
    }
  };

  const handleRestore = async () => {
    if (!pending) return;
    setIsBusy(true);
    try {
      await restoreData(pending);
      await reloadProfile();
      confirmDialogRef.current?.close();
      showToast('Sauvegarde restaurée');
      void navigate(PATHS.home);
    } catch (err: unknown) {
      confirmDialogRef.current?.close();
      setError(failureMessage(err, 'La restauration a échoué, réessayez.'));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <SummaryCard title="Sauvegarde">
      <p className="text-sm text-theme-600">
        Les données restent uniquement sur ce téléphone. Enregistrez une
        sauvegarde régulièrement, et partagez-la sur un Drive pour en garder une
        copie ailleurs.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isBusy}
          className={SECONDARY_BUTTON_CLASS}
        >
          <Save className="h-4 w-4" />
          Enregistrer
        </button>
        <button
          type="button"
          onClick={() => void handleShare()}
          disabled={isBusy}
          className={SECONDARY_BUTTON_CLASS}
        >
          <Share2 className="h-4 w-4" />
          Partager
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
          className={`col-span-2 ${DANGER_BUTTON_CLASS}`}
        >
          <Upload className="h-4 w-4" />
          Restaurer
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      <ConfirmDialog
        dialogRef={confirmDialogRef}
        title="Restaurer la sauvegarde ?"
        description={
          pending
            ? `Toutes les données actuelles seront remplacées par la sauvegarde du ${formatBackupDate(pending.exportedAt)}.`
            : ''
        }
        confirmLabel="Restaurer"
        pendingLabel="Restauration..."
        isPending={isBusy}
        onConfirm={() => void handleRestore()}
      />
    </SummaryCard>
  );
}
