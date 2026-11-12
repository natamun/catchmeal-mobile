import { listWorkouts } from '../fitness/api';
import {
  getGoalStart,
  getMeasuredExpenditure,
  getWeightHistory,
} from '../profile/api';
import { useProfile } from '../profile/profileContext';
import { AiCard } from '../ui/AiCard';
import { buildAiContext } from './aiContext';
import type { DashboardDay } from './types';

interface Props {
  from: string;
  to: string;
  days: DashboardDay[];
  isLoading?: boolean;
}

/**
 * Copies or shares a summary of the period (buildAiContext) to paste into an
 * AI chat, followed by the question to ask.
 */
export function AiContextCard({ from, to, days, isLoading = false }: Props) {
  const { profile } = useProfile();

  const text = async () => {
    const [measured, weighIns, workouts, goalStart] = await Promise.all([
      getMeasuredExpenditure().catch(() => null),
      getWeightHistory().catch(() => []),
      listWorkouts().catch(() => []),
      getGoalStart().catch(() => null),
    ]);
    return buildAiContext({
      from,
      to,
      days,
      profile,
      measured,
      weighIns,
      goalStart,
      workouts,
    });
  };

  return <AiCard text={text} disabled={isLoading} />;
}
