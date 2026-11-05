import { useState } from 'react';

import type { WeightEntry } from '../components/profile/api';
import { GoalsCard } from '../components/profile/GoalsCard';
import { ProfileCard } from '../components/profile/ProfileCard';
import { useProfile } from '../components/profile/profileContext';
import { WeightCard } from '../components/profile/WeightCard';

/** Profile page: body measures, body composition and goals. */
export default function ProfilePage() {
  const { profile, updateProfile } = useProfile();
  const [latestEntry, setLatestEntry] = useState<WeightEntry | null>();

  return (
    <div className="flex animate-fade-in-up flex-col gap-6">
      <h1 className="sr-only">Profil</h1>

      <ProfileCard profile={profile} onUpdate={updateProfile} />

      <WeightCard height={profile.height} onLatestEntry={setLatestEntry} />

      <GoalsCard profile={profile} latestEntry={latestEntry} />
    </div>
  );
}
