import { useEffect, useMemo, useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';

import { DailyMealList } from '../components/home/DailyMealList';
import { DaySummary } from '../components/home/DaySummary';
import { QuickAddDialog } from '../components/home/QuickAddDialog';
import { TrainingDayCard } from '../components/home/TrainingDayCard';
import { mealTotals } from '../components/meal/types';
import { getWeightHistory, type WeightEntry } from '../components/profile/api';
import { useProfile } from '../components/profile/profileContext';
import { DateNavigator } from '../components/ui/DateNavigator';
import { useToast } from '../components/ui/toastContext';
import {
  effectiveTargetWeight,
  fatFreeMassOf,
  latestComposition,
} from '../data/composition';
import { useDailyMeals } from '../hooks/useDailyMeals';
import { useDataVersion } from '../hooks/useDataVersion';
import {
  journalAddPath,
  journalPath,
  parseDateParam,
} from '../routing/journal';

/**
 * The journal of a day (?date= in the URL): calorie and macro progress with
 * the latest weigh-in (DaySummary), the four meal sections and the session.
 * Adding to a section and editing it each open their own page.
 */
export default function HomePage() {
  const { profile } = useProfile();
  const version = useDataVersion();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const selectedDate = useMemo(() => parseDateParam(dateParam), [dateParam]);
  const showToast = useToast();
  const {
    meals,
    foodItems,
    recipes,
    isReady,
    isLoading,
    loadError,
    reload,
    retry,
  } = useDailyMeals(selectedDate);
  const unavailable = !isReady && !isLoading;
  const [weightHistory, setWeightHistory] = useState<WeightEntry[] | null>(
    null,
  );
  const [weightError, setWeightError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getWeightHistory(controller.signal)
      .then(setWeightHistory)
      .catch(() => {
        if (!controller.signal.aborted) setWeightError(true);
      });
    return () => controller.abort();
  }, [version]);

  const dayTotals = meals.reduce(
    (acc, meal) => {
      const t = mealTotals(meal);
      return {
        kcal: acc.kcal + t.kcal,
        protein: acc.protein + t.protein,
        carbs: acc.carbs + t.carbs,
        fat: acc.fat + t.fat,
      };
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const quickAddDialogRef = useRef<HTMLDialogElement>(null);

  const measured = weightHistory ? latestComposition(weightHistory) : null;
  const goalWeight = effectiveTargetWeight(
    profile,
    measured ? fatFreeMassOf(measured) : null,
  );

  return (
    <>
      <div className="animate-fade-in-up">
        <div className="flex flex-col gap-4 md:gap-6">
          <div className="flex flex-wrap justify-between gap-3">
            <DateNavigator
              value={selectedDate}
              onChange={(date) =>
                void navigate(journalPath(date), { replace: true })
              }
            />
            <button
              type="button"
              onClick={() => quickAddDialogRef.current?.showModal()}
              title="Ajout rapide"
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-theme-500 px-3 text-sm font-medium text-on-accent transition-colors hover:bg-theme-600 max-2xs:order-first max-2xs:w-full max-2xs:py-2.5 xs:px-4"
            >
              <Zap className="h-4 w-4" />
              <span className="hidden max-2xs:inline xs:inline">
                Ajout rapide
              </span>
            </button>
          </div>
          <div
            key={selectedDate.toDateString()}
            className="flex animate-fade-in-up flex-col gap-4 md:gap-6"
          >
            <DaySummary
              consumed={Math.round(dayTotals.kcal)}
              goal={profile.dailyCalorieGoal ?? 2000}
              protein={Math.round(dayTotals.protein)}
              proteinGoal={profile.dailyProteinGoal ?? 150}
              carbs={Math.round(dayTotals.carbs)}
              carbsGoal={profile.dailyCarbsGoal ?? 250}
              fat={Math.round(dayTotals.fat)}
              fatGoal={profile.dailyFatGoal ?? 65}
              isLoading={isLoading}
              unavailable={unavailable}
              weightHistory={weightHistory}
              weightError={weightError}
              goalWeight={goalWeight}
            />
            <DailyMealList
              meals={meals}
              foodItems={foodItems}
              recipes={recipes}
              isLoading={isLoading}
              loadError={loadError}
              onRetry={retry}
              onAdd={(mealType) =>
                void navigate(journalAddPath(mealType, selectedDate))
              }
            />
            <TrainingDayCard date={selectedDate} />
          </div>
        </div>
      </div>
      <QuickAddDialog
        dialogRef={quickAddDialogRef}
        date={selectedDate}
        onSaved={() => {
          showToast('Ajouté au journal');
          reload();
        }}
      />
    </>
  );
}
