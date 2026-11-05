import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { useNavigate } from 'react-router';

import type { Backup } from '../../data/backup';
import { PATHS } from '../../routing/paths';
import { failureMessage } from '../../utils/failureMessage';
import { useProfile } from '../profile/profileContext';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { SummaryCard } from '../ui/SummaryCard';
import { useToast } from '../ui/toastContext';
import { exportData, readBackupFile, restoreData } from './api';

const BUTTON_CLASS =
  'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-theme-200 px-4 py-2.5 text-sm font-medium text-theme-700 transition-colors hover:bg-theme-50 disabled:cursor-not-allowed disabled:opacity-60';

function formatBackupDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Backup card of the profile page. The data only lives on this phone:
 * "Exporter" writes it to a file shared through Android (Drive, e-mail...),
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

  const handleExport = async () => {
    setError(null);
    setIsBusy(true);
    try {
      await exportData();
    } catch (err: unknown) {
      setError(failureMessage(err, "L'export a échoué, réessayez."));
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
        Les données restent uniquement sur ce téléphone. Exportez-les
        régulièrement pour pouvoir les retrouver sur un autre appareil.
      </p>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={isBusy}
          className={BUTTON_CLASS}
        >
          <Download className="h-4 w-4" />
          Exporter
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
          className={BUTTON_CLASS}
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
