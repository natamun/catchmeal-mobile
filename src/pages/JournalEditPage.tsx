import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Navigate, useParams, useSearchParams } from 'react-router';

import { listFoodItems } from '../components/food/api';
import { DailyMealReview } from '../components/home/DailyMealReview';
import { useFlow } from '../components/layout/flowContext';
import { FlowHeader } from '../components/layout/FlowHeader';
import { listMealsOnDate } from '../components/meal/api';
import { buildDrafts, type MealItemDraft } from '../components/meal/draft';
import { MEAL_TYPE_LABELS, type Meal } from '../components/meal/types';
import { listRecipes } from '../components/recipe/api';
import { useToast } from '../components/ui/toastContext';
import {
  journalPath,
  mealTypeFromSlug,
  parseDateParam,
} from '../routing/journal';
import { useGoBack } from '../routing/navigation';
import { PATHS } from '../routing/paths';
import { toDateKey } from '../utils/dateKey';
import { formatWeekday } from '../utils/format';

/** The section as it is when the page opens. */
interface Section {
  meals: Meal[];
  items: MealItemDraft[];
}

/**
 * /home/edit/:mealType: the quantities of one section of a day's journal, all
 * its meals merged, to adjust then save. An unknown meal type redirects to the
 * journal.
 */
export default function JournalEditPage() {
  const { mealType: slug } = useParams();
  const [searchParams] = useSearchParams();
  const showToast = useToast();
  const dateParam = searchParams.get('date');
  const date = useMemo(() => parseDateParam(dateParam), [dateParam]);
  const mealType = mealTypeFromSlug(slug);
  const backToJournal = useGoBack(journalPath(date));
  const flow = useFlow();
  const [section, setSection] = useState<Section | null>(null);
  const [hasError, setHasError] = useState(false);

  // Read once: the page edits the section as it was when it opened.
  useEffect(() => {
    if (!mealType) return;
    const controller = new AbortController();
    Promise.all([
      listMealsOnDate(toDateKey(date), controller.signal),
      listFoodItems(controller.signal),
      listRecipes(controller.signal),
    ])
      .then(([meals, foodItems, recipes]) => {
        const sectionMeals = meals
          .filter((meal) => meal.typeMeal === mealType)
          .sort((a, b) => a.id - b.id);
        setSection({
          meals: sectionMeals,
          items: buildDrafts({ meals: sectionMeals }, { foodItems, recipes }),
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) setHasError(true);
      });
    return () => controller.abort();
  }, [date, mealType]);

  if (!mealType) {
    return <Navigate to={PATHS.home} replace />;
  }

  const close = () => flow.close(backToJournal);

  let content;
  if (hasError) {
    content = (
      <p className="py-8 text-center text-sm text-theme-600">
        Impossible de charger le journal. Réessayez.
      </p>
    );
  } else if (!section) {
    content = (
      <div className="flex justify-center py-16">
        <LoaderCircle className="h-6 w-6 animate-spin text-theme-400" />
      </div>
    );
  } else {
    content = (
      <DailyMealReview
        mealType={mealType}
        date={date}
        initialItems={section.items}
        existingMeals={section.meals}
        onSaved={() => {
          showToast('Journal mis à jour');
          close();
        }}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <FlowHeader
        title={MEAL_TYPE_LABELS[mealType]}
        subtitle={formatWeekday(date)}
        onClose={close}
      />
      {content}
    </div>
  );
}
