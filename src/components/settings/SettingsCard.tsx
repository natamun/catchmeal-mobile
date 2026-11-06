import { useEffect, useState } from 'react';

import {
  disableReminder,
  enableReminder,
  isReminderOn,
} from '../../native/weighInReminder';
import { SummaryCard } from '../ui/SummaryCard';
import { Switch } from '../ui/Switch';
import { useToast } from '../ui/toastContext';

/**
 * Settings card of the profile page: for now the weekly weigh-in reminder.
 * The switch shows what Android has scheduled.
 */
export function SettingsCard() {
  const showToast = useToast();
  // null while it is read.
  const [isOn, setIsOn] = useState<boolean | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
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
  }, []);

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
    <SummaryCard title="Paramètres">
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
    </SummaryCard>
  );
}
