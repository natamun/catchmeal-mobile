import { createContext, useContext } from 'react';

import type { Profile } from './api';

/** What useProfile() gives: the profile and a way to change it in place. */
export interface ProfileContextValue {
  profile: Profile;
  updateProfile: (partial: Partial<Profile>) => void;
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
