import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { applyTheme } from '../theme/themes';
import { LoadError } from '../ui/LoadError';
import { getProfile, type Profile } from './api';
import { ProfileContext } from './profileContext';

/**
 * Reads the profile stored on the phone once when the app starts, then keeps it
 * up to date after each edit (updateProfile). The app shows only once the
 * profile is read, so no screen starts with empty goals.
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getProfile()
      .then((stored) => {
        if (!cancelled) setProfile(stored);
      })
      .catch(() => {
        if (!cancelled) setHasFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // The theme stored in the profile wins over the copy used at startup.
  const theme = profile?.theme;
  useEffect(() => {
    if (theme !== undefined) applyTheme(theme);
  }, [theme]);

  const updateProfile = useCallback((partial: Partial<Profile>) => {
    setProfile((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  const reloadProfile = useCallback(async () => {
    setProfile(await getProfile());
  }, []);

  if (hasFailed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-theme-50">
        <LoadError
          message="Impossible d'ouvrir les données de l'app."
          onRetry={() => {
            setHasFailed(false);
            setAttempt((count) => count + 1);
          }}
        />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, reloadProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}
