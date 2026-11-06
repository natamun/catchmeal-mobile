import { useEffect, useRef, useState } from 'react';
import { Settings } from 'lucide-react';

import {
  disableReminder,
  enableReminder,
  isReminderOn,
} from '../../native/weighInReminder';
import { BaseDialog } from '../ui/BaseDialog';
import { Switch } from '../ui/Switch';
import { useToast } from '../ui/toastContext';

/**
 * Gear button opening the settings: for now the weekly weigh-in reminder.
 * The switch shows what Android has scheduled, read at each opening.
 */
export function SettingsButton() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const showToast = useToast();
  // null while it is read.
  const [isOn, setIsOn] = useState<boolean | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [openCount, setOpenCount] = useState(0);

  useEffect(() => {
    if (openCount === 0) return;
    let cancelled = false;
    isReminderOn()
      .then((on) => {
        if (!cancelled) setIsOn(on);
      })
      .catch(() => {
        if (!cancelled) setIsOn(false);
      });
    return () => {
      cancelled = true;
    };
  }, [openCount]);

  const open = () => {
    setOpenCount((count) => count + 1);
    dialogRef.current?.showModal();
  };

  const toggle = async (next: boolean) => {
    setIsBusy(true);
    try {
      if (!next) {
        await disableReminder();
        setIsOn(false);
      } else if (await enableReminder()) {
        setIsOn(true);
      } else {
        showToast(
          'Notifications refusées : autorise-les dans les réglages Android',
        );
      }
    } catch {
      showToast('Impossible de changer le rappel');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="tap-area relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center text-theme-400 transition-colors hover:text-theme-600"
      >
        <Settings className="h-5 w-5" />
      </button>

      <BaseDialog dialogRef={dialogRef} title="Paramètres" maxWidth="sm">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-base font-medium text-theme-800">
              Rappel de pesée
            </p>
            <p className="text-sm text-theme-500">Chaque dimanche à 8 h</p>
          </div>
          <Switch
            isOn={isOn ?? false}
            onChange={(next) => void toggle(next)}
            disabled={isOn === null || isBusy}
          />
        </div>
      </BaseDialog>
    </>
  );
}
