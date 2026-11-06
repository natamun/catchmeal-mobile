import type { RefObject } from 'react';

import type { MealItemDraft } from '../meal/draft';
import { MEAL_TYPE_LABELS, type Meal, type MealType } from '../meal/types';
import { BaseDialog } from '../ui/BaseDialog';
import { DailyMealReview } from './DailyMealReview';

interface DailyMealFormProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  mealType: MealType;
  date: Date;
  initialItems: MealItemDraft[];
  sessionKey: number;
  existingMeals?: Meal[];
  onSaved: () => void;
}

/**
 * Dialog to edit a journal section: its quantities to adjust, then save. Each
 * opening gets a new sessionKey, which starts the review again.
 */
export function DailyMealForm({
  dialogRef,
  mealType,
  date,
  initialItems,
  sessionKey,
  existingMeals = [],
  onSaved,
}: DailyMealFormProps) {
  const isEdit = existingMeals.length > 0;

  return (
    <BaseDialog
      dialogRef={dialogRef}
      title={`${isEdit ? 'Modifier' : 'Ajouter'} : ${MEAL_TYPE_LABELS[mealType]}`}
    >
      <DailyMealReview
        key={sessionKey}
        mealType={mealType}
        date={date}
        initialItems={initialItems}
        existingMeals={existingMeals}
        onSaved={() => {
          dialogRef.current?.close();
          onSaved();
        }}
      />
    </BaseDialog>
  );
}
