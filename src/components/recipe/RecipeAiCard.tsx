import type { FoodItem } from '../food/types';
import { useProfile } from '../profile/profileContext';
import { AiCard } from '../ui/AiCard';
import { buildRecipePrompt } from './recipePrompt';
import type { Recipe } from './types';

interface Props {
  recipe: Recipe;
  foodItems: FoodItem[];
}

/**
 * Copies or shares the recipe with the goal and the daily targets
 * (buildRecipePrompt), to paste into an AI chat, like the stats summary.
 */
export function RecipeAiCard({ recipe, foodItems }: Props) {
  const { profile } = useProfile();
  return <AiCard text={() => buildRecipePrompt(recipe, foodItems, profile)} />;
}
