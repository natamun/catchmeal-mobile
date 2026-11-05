import { useCallback, useState, type ReactNode } from 'react';

import type { Profile } from './api';
import { ProfileContext } from './profileContext';

const EMPTY_PROFILE: Profile = {
  height: null,
  targetWeight: null,
  dailyCalorieGoal: null,
  dailyProteinGoal: null,
  dailyCarbsGoal: null,
  dailyFatGoal: null,
  gender: null,
  birthDate: null,
  activityLevel: null,
};

/**
 * Holds the profile for the whole app. It starts empty and only lives in
 * memory until the profile is stored on the phone.
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);

  const updateProfile = useCallback((partial: Partial<Profile>) => {
    setProfile((prev) => ({ ...prev, ...partial }));
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}
