import { useEffect, useMemo, useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';

import { CalorieSummary } from '../components/home/CalorieSummary';
import { DailyMealForm } from '../components/home/DailyMealForm';
import { DailyMealList } from '../components/home/DailyMealList';
import { MacroBreakdown } from '../components/home/MacroBreakdown';
import { QuickAddDialog } from '../components/home/QuickAddDialog';
import { WeightWidget } from '../components/home/WeightWidget';
import { WorkoutDayCard } from '../components/home/WorkoutDayCard';
import { buildDrafts, type MealItemDraft } from '../components/meal/draft';
import { mealTotals, type Meal, type MealType } from '../components/meal/types';
import { getWeightHistory, type WeightEntry } from '../components/profile/api';
import { useProfile } from '../components/profile/profileContext';
import { DateNavigator } from '../components/ui/DateNavigator';
import { useToast } from '../components/ui/toastContext';
import { useDailyMeals } from '../hooks/useDailyMeals';
import { useDataVersion } from '../hooks/useDataVersion';
import {
  journalAddPath,
  journalPath,
  parseDateParam,
} from '../routing/journal';
import { toDateKey } from '../utils/dateKey';

interface SectionEdit {
  mealType: MealType;
  key: number;
  items: MealItemDraft[];
  meals: Meal[];
}

/**
 * The journal of a day (?date= in the URL): calorie and macro progress, latest
 * weigh-in and the four meal sections. Adding to a section
 * opens its own page; editing a section opens DailyMealForm with all its meals
 * merged.
 */
export default function HomePage() {
  const { profile } = useProfile();
  const version = useDataVersion();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const selectedDate = useMemo(() => parseDateParam(dateParam), [dateParam]);
  const showToast = useToast();
  const { meals, foodItems, isReady, isLoading, loadError, reload, retry } =
    useDailyMeals(selectedDate);
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
  const [sectionEdit, setSectionEdit] = useState<SectionEdit>({
    mealType: 'BREAKFAST',
    key: 0,
    items: [],
    meals: [],
  });
  const editDialogRef = useRef<HTMLDialogElement>(null);
  const quickAddDialogRef = useRef<HTMLDialogElement>(null);

  const openSectionEditor = (mealType: MealType) => {
    const sectionMeals = meals
      .filter((meal) => meal.typeMeal === mealType)
      .sort((a, b) => a.id - b.id);
    setSectionEdit((prev) => ({
      mealType,
      key: prev.key + 1,
      items: buildDrafts([], sectionMeals, foodItems),
      meals: sectionMeals,
    }));
    editDialogRef.current?.showModal();
  };

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
            <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
              <CalorieSummary
                consumed={Math.round(dayTotals.kcal)}
                goal={profile.dailyCalorieGoal ?? 2000}
                isLoading={isLoading}
                unavailable={unavailable}
              />
              <MacroBreakdown
                protein={Math.round(dayTotals.protein)}
                proteinGoal={profile.dailyProteinGoal ?? 150}
                carbs={Math.round(dayTotals.carbs)}
                carbsGoal={profile.dailyCarbsGoal ?? 250}
                fat={Math.round(dayTotals.fat)}
                fatGoal={profile.dailyFatGoal ?? 65}
                isLoading={isLoading}
                unavailable={unavailable}
              />
              <WeightWidget
                history={weightHistory}
                hasError={weightError}
                goalWeight={profile.targetWeight ?? null}
              />
            </div>
            <DailyMealList
              meals={meals}
              foodItems={foodItems}
              isLoading={isLoading}
              loadError={loadError}
              onRetry={retry}
              onAdd={(mealType) =>
                void navigate(journalAddPath(mealType, selectedDate))
              }
              onEdit={openSectionEditor}
            />
            <WorkoutDayCard day={toDateKey(selectedDate)} />
          </div>
        </div>
      </div>
      <DailyMealForm
        dialogRef={editDialogRef}
        mealType={sectionEdit.mealType}
        date={selectedDate}
        initialItems={sectionEdit.items}
        sessionKey={sectionEdit.key}
        existingMeals={sectionEdit.meals}
        onSaved={() => {
          showToast('Journal mis à jour');
          reload();
        }}
      />
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
