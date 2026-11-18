import { formatWeekday } from '../../utils/format';
import { MEAL_TYPE_LABELS, type MealType } from '../meal/types';
import { DailyMealReview } from './DailyMealReview';
import { LibraryPicker } from './LibraryPicker';

interface DailyMealPickerProps {
  mealType: MealType;
  date: Date;
  onClose: () => void;
  onAdded: () => void;
}

/**
 * Page content that adds foods, library meals, recipes and leftovers to one
 * section of the journal, in two steps: select them, then check the
 * quantities before saving.
 */
export function DailyMealPicker({
  mealType,
  date,
  onClose,
  onAdded,
}: DailyMealPickerProps) {
  return (
    <LibraryPicker
      title={MEAL_TYPE_LABELS[mealType]}
      subtitle={formatWeekday(date)}
      onClose={onClose}
      withLeftovers
      renderReview={(items) => (
        <DailyMealReview
          mealType={mealType}
          date={date}
          initialItems={items}
          onSaved={onAdded}
        />
      )}
    />
  );
}
