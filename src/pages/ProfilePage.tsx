import { useCallback, useState } from 'react';

import { BackupCard } from '../components/backup/BackupCard';
import type { WeightEntry } from '../components/profile/api';
import { GoalsCard } from '../components/profile/GoalsCard';
import { ProfileCard } from '../components/profile/ProfileCard';
import { useProfile } from '../components/profile/profileContext';
import { WeightCard } from '../components/profile/WeightCard';
import { ThemeCard } from '../components/theme/ThemeCard';

/**
 * Profile page: body measures, body composition, goals, theme and backup. It
 * shows once the weigh-ins and the measured expenditure are read: drawn
 * before, the short loading cards let the bottom ones flash at the top.
 */
export default function ProfilePage() {
  const { profile, updateProfile } = useProfile();
  const [latestEntry, setLatestEntry] = useState<WeightEntry | null>();
  const [isGoalsReady, setIsGoalsReady] = useState(false);
  const markGoalsReady = useCallback(() => setIsGoalsReady(true), []);
  const isReady = latestEntry !== undefined && isGoalsReady;

  return (
    <div
      className={`flex flex-col gap-6 ${isReady ? 'animate-fade-in-up' : 'invisible'}`}
    >
      <ProfileCard profile={profile} onUpdate={updateProfile} />

      <WeightCard height={profile.height} onLatestEntry={setLatestEntry} />

      <GoalsCard
        profile={profile}
        latestEntry={latestEntry}
        onReady={markGoalsReady}
      />

      <ThemeCard />

      <BackupCard />
    </div>
  );
}
