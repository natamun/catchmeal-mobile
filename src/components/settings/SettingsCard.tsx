import { useEffect, useState } from 'react';

import { installedVersion } from '../../native/appInfo';
import {
  disableReminder,
  enableReminder,
  isReminderOn,
} from '../../native/weighInReminder';
import { updateProfile } from '../profile/api';
import { useProfile } from '../profile/profileContext';
import { Card } from '../ui/Card';
import { Switch } from '../ui/Switch';
import { useToast } from '../ui/toastContext';

/**
 * Settings card of the profile page: the weekly weigh-in reminder, whose
 * switch shows what Android has scheduled, the alert about the fat-free mass
 * lost while losing weight, and the version installed.
 */
export function SettingsCard() {
  const showToast = useToast();
  const { profile, updateProfile: keepProfile } = useProfile();
  const [isAlertBusy, setIsAlertBusy] = useState(false);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    installedVersion()
      .then((installed) => {
        if (!cancelled) setVersion(installed);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
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

  const toggleAlert = async (next: boolean) => {
    setIsAlertBusy(true);
    try {
      keepProfile(await updateProfile({ leanLossAlert: next }));
    } catch {
      showToast("Impossible de changer l'alerte");
    } finally {
      setIsAlertBusy(false);
    }
  };

  return (
    <Card title="Paramètres">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-base font-medium text-theme-800">
            Rappel de pesée
          </p>
          <p className="text-sm text-theme-600">Chaque dimanche à 8 h</p>
        </div>
        <Switch
          isOn={isOn ?? false}
          onChange={(next) => void toggle(next)}
          disabled={isOn === null || isBusy}
        />
      </div>
      <div className="mt-4 flex items-center justify-between gap-4 border-t border-theme-100 pt-4">
        <div className="min-w-0">
          <p className="text-base font-medium text-theme-800">
            Alerte de masse maigre
          </p>
          <p className="text-sm text-theme-600">
            En perte de poids, prévient si elle baisse trop vite
          </p>
        </div>
        <Switch
          isOn={profile.leanLossAlert}
          onChange={(next) => void toggleAlert(next)}
          disabled={isAlertBusy}
        />
      </div>
      {version && (
        <p className="mt-4 text-center text-xs text-theme-400">
          Version {version}
        </p>
      )}
    </Card>
  );
}
