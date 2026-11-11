import { BackupCard } from '../components/backup/BackupCard';
import { GoalsCard } from '../components/profile/GoalsCard';
import { useProfile } from '../components/profile/profileContext';
import { useGoals } from '../components/profile/useGoals';
import { useWeighIns } from '../components/profile/useWeighIns';
import { WeightCard } from '../components/profile/WeightCard';
import { SettingsCard } from '../components/settings/SettingsCard';
import { ThemeCard } from '../components/theme/ThemeCard';

/**
 * Profile page: the body (latest weigh-in, history, the person's profile),
 * the goal, theme, settings and backup. It shows once the weigh-ins and the
 * measured expenditure are read: drawn before, the short loading cards let
 * the bottom ones flash at the top.
 */
export default function ProfilePage() {
  const { profile, updateProfile } = useProfile();
  const weighIns = useWeighIns();
  const goals = useGoals(profile, weighIns.history);
  const isReady = !weighIns.isLoading && goals.isMeasureRead;

  return (
    <div
      className={`flex flex-col gap-6 ${isReady ? 'animate-fade-in-up' : 'invisible'}`}
    >
      <WeightCard
        weighIns={weighIns}
        profile={profile}
        onUpdate={updateProfile}
      />
      <GoalsCard
        goals={goals}
        profile={profile}
        history={weighIns.history}
        onUpdate={updateProfile}
      />
      <ThemeCard />
      <SettingsCard />
      <BackupCard />
      {weighIns.dialogs}
    </div>
  );
}
