import { createContext, useContext } from 'react';

import type { Profile } from './api';

/**
 * What useProfile() gives: the profile, a way to change it in place, and a way
 * to read it again from the phone (after a restore).
 */
export interface ProfileContextValue {
  profile: Profile;
  updateProfile: (partial: Partial<Profile>) => void;
  reloadProfile: () => Promise<void>;
}

export const ProfileContext = createContext<ProfileContextValue | null>(null);

/** Reads the profile kept by ProfileProvider. */
export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return ctx;
}
