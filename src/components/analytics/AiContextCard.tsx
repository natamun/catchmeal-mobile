import { useState } from 'react';
import { Copy, Share2 } from 'lucide-react';

import { copyText, shareText } from '../../native/shareText';
import { listWorkouts } from '../fitness/api';
import {
  getGoalStart,
  getMeasuredExpenditure,
  getWeightHistory,
} from '../profile/api';
import { useProfile } from '../profile/profileContext';
import { SECONDARY_BUTTON_CLASS } from '../ui/buttonStyle';
import { SummaryCard } from '../ui/SummaryCard';
import { useToast } from '../ui/toastContext';
import { buildAiContext } from './aiContext';
import type { DashboardDay } from './types';

const TITLE = 'Demander à une IA';

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
  const showToast = useToast();
  const [isBusy, setIsBusy] = useState(false);

  const run = async (
    send: (text: string) => Promise<void>,
    failure: string,
  ) => {
    setIsBusy(true);
    try {
      const [measured, weighIns, workouts, goalStart] = await Promise.all([
        getMeasuredExpenditure().catch(() => null),
        getWeightHistory().catch(() => []),
        listWorkouts().catch(() => []),
        getGoalStart().catch(() => null),
      ]);
      await send(
        buildAiContext({
          from,
          to,
          days,
          profile,
          measured,
          weighIns,
          goalStart,
          workouts,
        }),
      );
    } catch {
      showToast(failure);
    } finally {
      setIsBusy(false);
    }
  };

  const copy = () =>
    run(async (text) => {
      await copyText(text);
      showToast('Copié : colle-le dans ton IA', Copy);
    }, 'Copie impossible');

  const share = () =>
    run((text) => shareText(TITLE, text), 'Partage impossible');

  return (
    <SummaryCard title={TITLE}>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => void copy()}
          disabled={isLoading || isBusy}
          className={SECONDARY_BUTTON_CLASS}
        >
          <Copy className="h-4 w-4" />
          Copier
        </button>
        <button
          type="button"
          onClick={() => void share()}
          disabled={isLoading || isBusy}
          className={SECONDARY_BUTTON_CLASS}
        >
          <Share2 className="h-4 w-4" />
          Partager
        </button>
      </div>
    </SummaryCard>
  );
}
