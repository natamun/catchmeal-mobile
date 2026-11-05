import { useState } from 'react';

import { updateProfile } from '../profile/api';
import { useProfile } from '../profile/profileContext';
import { SummaryCard } from '../ui/SummaryCard';
import { useToast } from '../ui/toastContext';
import { DEFAULT_THEME, THEMES } from './themeList';

/**
 * Appearance card of the profile: one button per theme showing three of its
 * colors (data-theme on the button). The choice shows at once and is saved in
 * the profile, so it is part of the backup.
 */
export function ThemeCard() {
  const { profile, updateProfile: setLocalProfile } = useProfile();
  const showToast = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const current = profile.theme ?? DEFAULT_THEME;

  const choose = async (id: string) => {
    if (id === current || isSaving) return;
    const previous = profile.theme;
    setLocalProfile({ theme: id });
    setIsSaving(true);
    try {
      await updateProfile({ theme: id });
    } catch {
      setLocalProfile({ theme: previous });
      showToast("Le thème n'a pas pu être enregistré");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SummaryCard title="Apparence">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {THEMES.map(({ id }) => (
          <button
            key={id}
            type="button"
            data-theme={id}
            onClick={() => void choose(id)}
            className={`flex cursor-pointer items-center justify-center rounded-xl border bg-theme-50 py-3 transition-colors ${
              id === current
                ? 'border-theme-500 ring-2 ring-theme-500'
                : 'border-theme-200'
            }`}
          >
            <span className="flex -space-x-1.5">
              <span className="h-6 w-6 rounded-full border border-theme-200 bg-surface" />
              <span className="h-6 w-6 rounded-full bg-theme-500" />
              <span className="h-6 w-6 rounded-full bg-theme-800" />
            </span>
          </button>
        ))}
      </div>
    </SummaryCard>
  );
}
