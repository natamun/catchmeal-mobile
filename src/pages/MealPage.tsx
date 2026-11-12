import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router';

import { listFoodItems } from '../components/food/api';
import { useFlow } from '../components/layout/flowContext';
import { FlowHeader } from '../components/layout/FlowHeader';
import { listMeals } from '../components/meal/api';
import { MealForm } from '../components/meal/MealForm';
import type { Meal } from '../components/meal/types';
import { useList } from '../hooks/useList';
import { useGoBack } from '../routing/navigation';
import { PATHS } from '../routing/paths';
import { mealPath } from '../routing/recipes';

/** The library meals, the journal left out. */
const listLibraryMeals = (signal: AbortSignal) => listMeals(false, signal);

/** What the page is opened with: a new meal can start as a copy. */
interface MealState {
  copyOf?: number;
}

/**
 * /food/meal/:mealId: a library meal to edit, or "new" to write one, maybe
 * as a copy of another. Slides in over the food page.
 */
export default function MealPage() {
  // A copy opens on the same route: the page starts again for it.
  return <MealScreen key={useLocation().key} />;
}

function MealScreen() {
  const { mealId = '' } = useParams();
  const state = useLocation().state as MealState | null;
  const navigate = useNavigate();
  const flow = useFlow();
  const meals = useList(listLibraryMeals);
  const foods = useList(listFoodItems);
  const backToFood = useGoBack(PATHS.food);
  const close = () => flow.close(backToFood);
  const isNew = mealId === 'new';
  const isReady = !meals.isLoading && !foods.isLoading;

  // The meal as the page opened on it: it stays while the page slides away
  // once deleted.
  const [opened, setOpened] = useState<Meal | null | undefined>(undefined);
  const copyOf =
    (isNew && meals.items.find((meal) => meal.id === state?.copyOf)) || null;
  if (isReady && opened === undefined) {
    setOpened(
      isNew
        ? null
        : (meals.items.find((meal) => meal.id === Number(mealId)) ?? null),
    );
  }

  let content;
  if (meals.hasError || foods.hasError) {
    content = (
      <>
        <FlowHeader title="Repas" subtitle="Bibliothèque" onClose={close} />
        <p className="py-8 text-center text-sm text-theme-600">
          Impossible de charger le repas. Réessayez.
        </p>
      </>
    );
  } else if (opened === undefined) {
    content = (
      <div className="flex justify-center py-16">
        <LoaderCircle className="h-6 w-6 animate-spin text-theme-400" />
      </div>
    );
  } else if (!isNew && opened === null) {
    content = (
      <>
        <FlowHeader title="Repas" subtitle="Bibliothèque" onClose={close} />
        <p className="py-8 text-center text-sm text-theme-600">
          Ce repas n'existe plus.
        </p>
      </>
    );
  } else {
    content = (
      <MealForm
        meal={opened}
        copyOf={copyOf}
        foodItems={foods.items}
        onClose={close}
        onCopy={() =>
          void navigate(mealPath('new'), {
            state: { copyOf: opened?.id } satisfies MealState,
          })
        }
        onDone={close}
      />
    );
  }

  return <div className="flex flex-1 flex-col gap-4">{content}</div>;
}
