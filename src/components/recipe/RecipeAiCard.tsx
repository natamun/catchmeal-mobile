import { Copy, Share2 } from 'lucide-react';

import { copyText, shareText } from '../../native/shareText';
import type { FoodItem } from '../food/types';
import { useProfile } from '../profile/profileContext';
import { SECONDARY_BUTTON_CLASS } from '../ui/buttonStyle';
import { useToast } from '../ui/toastContext';
import { buildRecipePrompt } from './recipePrompt';
import { RecipeCard } from './RecipeView';
import type { Recipe } from './types';

const TITLE = 'Demander à une IA';

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
  const showToast = useToast();
  const prompt = () => buildRecipePrompt(recipe, foodItems, profile);

  const copy = async () => {
    try {
      await copyText(prompt());
      showToast('Copié : colle-le dans ton IA', Copy);
    } catch {
      showToast('Copie impossible');
    }
  };

  const share = async () => {
    try {
      await shareText(TITLE, prompt());
    } catch {
      showToast('Partage impossible');
    }
  };

  return (
    <RecipeCard title={TITLE}>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => void copy()}
          className={SECONDARY_BUTTON_CLASS}
        >
          <Copy className="h-4 w-4" />
          Copier
        </button>
        <button
          type="button"
          onClick={() => void share()}
          className={SECONDARY_BUTTON_CLASS}
        >
          <Share2 className="h-4 w-4" />
          Partager
        </button>
      </div>
    </RecipeCard>
  );
}
