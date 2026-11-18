import { useState } from 'react';
import { ChefHat, Copy, ShoppingCart } from 'lucide-react';
import { useLocation, useMatch, useNavigate, useParams } from 'react-router';

import { listFoodItems } from '../components/food/api';
import type { FoodItem } from '../components/food/types';
import { useFlow } from '../components/layout/flowContext';
import { FlowHeader } from '../components/layout/FlowHeader';
import {
  cookRecipe,
  deleteRecipe,
  listRecipes,
} from '../components/recipe/api';
import { CookEditor } from '../components/recipe/CookEditor';
import { RecipeAiCard } from '../components/recipe/RecipeAiCard';
import {
  CookingField,
  InfoFields,
  IngredientsEditor,
  NotesField,
  SaveBar,
  StepsEditor,
} from '../components/recipe/RecipeEditor';
import { RecipeImportCard } from '../components/recipe/RecipeImportCard';
import {
  EmptyPart,
  IngredientRows,
  ServingNutrition,
  ServingsStepper,
  StepRows,
  TextBlock,
} from '../components/recipe/RecipeView';
import {
  recipeMeta,
  scaledQuantity,
  servingsLabel,
} from '../components/recipe/servings';
import type { CookInput, Recipe } from '../components/recipe/types';
import { useRecipeEditor } from '../components/recipe/useRecipeEditor';
import { addFoodsToShopping } from '../components/shopping/api';
import { recipeToShopping } from '../components/shopping/lines';
import { ActionMenu } from '../components/ui/ActionMenu';
import { SECONDARY_BUTTON_CLASS } from '../components/ui/buttonStyle';
import { Card, PageLoading } from '../components/ui/Card';
import { EditIconButton } from '../components/ui/EditIconButton';
import { useToast } from '../components/ui/toastContext';
import { useKeepAwake } from '../hooks/useKeepAwake';
import { useList } from '../hooks/useList';
import { useGoBack } from '../routing/navigation';
import { PATHS } from '../routing/paths';
import { recipeCookPath, recipeEditPath, recipePath } from '../routing/recipes';
import { toDateKey } from '../utils/dateKey';
import { MAX_DECIMALS, roundDecimals } from '../utils/decimals';
import { failureMessage } from '../utils/failureMessage';

/**
 * What the page is opened with: a new recipe can start as a copy, and
 * cooking starts from the servings chosen on the recipe.
 */
interface RecipeState {
  copyOf?: number;
  servings?: number;
}

interface PageProps {
  recipe: Recipe | null;
  copyOf: Recipe | null;
  foodItems: FoodItem[];
  onClose: () => void;
  onSaved: (recipe: Recipe) => void;
}

interface SheetProps {
  recipe: Recipe;
  foodItems: FoodItem[];
  onClose: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onDeleted: () => void;
  /** Cooks it ahead, for the servings chosen. */
  onCook: (servings: number) => void;
}

/**
 * The recipe to read while cooking, every part one under the other, the
 * quantities for the servings chosen, which also go to the shopping list,
 * and the recipe sent to an AI. The screen stays on meanwhile.
 */
function RecipeSheet({
  recipe,
  foodItems,
  onClose,
  onEdit,
  onCopy,
  onDeleted,
  onCook,
}: SheetProps) {
  const [servings, setServings] = useState(recipe.servings);
  const [isAdding, setIsAdding] = useState(false);
  const showToast = useToast();
  useKeepAwake();

  const addToShopping = async () => {
    setIsAdding(true);
    try {
      await addFoodsToShopping(recipeToShopping(recipe, servings));
      showToast(`Ajouté aux courses, pour ${servingsLabel(servings)}`);
    } catch {
      showToast('Ajout impossible, réessayez.');
    } finally {
      setIsAdding(false);
    }
  };

  const remove = async () => {
    try {
      await deleteRecipe(recipe.id);
      showToast('Recette supprimée');
      onDeleted();
    } catch {
      showToast('Suppression impossible, réessayez.');
    }
  };
  return (
    <>
      <FlowHeader
        title={recipe.name}
        subtitle={recipeMeta(recipe) || 'Recette'}
        onClose={onClose}
        action={
          <div className="flex shrink-0 items-center gap-1">
            <EditIconButton size="lg" onClick={onEdit} />
            <ActionMenu
              title={recipe.name}
              actions={[
                { label: 'Dupliquer la recette', icon: Copy, onSelect: onCopy },
              ]}
              onDelete={() => void remove()}
              deleteLabel="Supprimer la recette"
            />
          </div>
        }
      />
      <ServingNutrition recipe={recipe} />
      <Card
        title="Ingrédients"
        action={<ServingsStepper value={servings} onChange={setServings} />}
      >
        <IngredientRows
          recipe={recipe}
          foodItems={foodItems}
          servings={servings}
        />
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => void addToShopping()}
            disabled={isAdding}
            className={SECONDARY_BUTTON_CLASS}
          >
            <ShoppingCart className="h-4 w-4" />
            Ajouter aux courses
          </button>
          <button
            type="button"
            onClick={() => onCook(servings)}
            className={SECONDARY_BUTTON_CLASS}
          >
            <ChefHat className="h-4 w-4" />
            Cuisiner
          </button>
        </div>
      </Card>
      {recipe.cooking && (
        <Card title="Cuisson">
          <TextBlock>{recipe.cooking}</TextBlock>
        </Card>
      )}
      {recipe.steps.length > 0 && (
        <Card title="Préparation">
          <StepRows steps={recipe.steps} />
        </Card>
      )}
      {recipe.notes && (
        <Card title="Autres">
          <TextBlock>{recipe.notes}</TextBlock>
        </Card>
      )}
      <RecipeAiCard recipe={recipe} foodItems={foodItems} />
    </>
  );
}

interface CookProps {
  recipe: Recipe;
  foodItems: FoodItem[];
  /** The servings chosen on the recipe: its ingredients are scaled to them. */
  servings: number;
  onClose: () => void;
}

/** The recipe's ingredients for `servings` servings instead of its own. */
function scaledCook(recipe: Recipe, servings: number): CookInput {
  return {
    servings,
    ingredients: recipe.ingredients.map((item) => ({
      foodItemId: item.foodItemId,
      quantity: roundDecimals(
        scaledQuantity(item.quantity, recipe.servings, servings),
        MAX_DECIMALS,
      ),
      section: item.section,
    })),
  };
}

/**
 * The recipe cooked ahead today: its servings and ingredients, adapted or
 * not, all become a leftover to log later. The recipe stays as it is.
 */
function CookRecipe({ recipe, foodItems, servings, onClose }: CookProps) {
  const showToast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cook = async (input: CookInput) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await cookRecipe(recipe.id, input, toDateKey(new Date()));
      showToast(
        `${servingsLabel(input.servings)} ${input.servings > 1 ? 'prêtes' : 'prête'}`,
      );
      onClose();
    } catch (err: unknown) {
      setError(failureMessage(err, 'Une erreur est survenue, réessayez.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <FlowHeader title="Cuisiner" subtitle={recipe.name} onClose={onClose} />
      <CookEditor
        recipe={recipe}
        foodItems={foodItems}
        initial={
          servings === recipe.servings
            ? undefined
            : scaledCook(recipe, servings)
        }
        submitLabel="Enregistrer les portions"
        isSubmitting={isSubmitting}
        error={error}
        onSubmit={(input) => void cook(input)}
      />
    </>
  );
}

/**
 * The recipe to write, on its own page, every part stacked, then the card
 * that writes or changes it with an AI.
 */
function EditRecipe({
  recipe,
  copyOf,
  foodItems,
  onClose,
  onSaved,
}: PageProps) {
  const editor = useRecipeEditor({
    recipe,
    copyOf,
    foodItems,
    onSaved,
  });
  return (
    <>
      <FlowHeader
        title={recipe ? 'Modifier la recette' : 'Nouvelle recette'}
        subtitle={
          recipe?.name ?? (copyOf ? `Copie de ${copyOf.name}` : 'Recettes')
        }
        onClose={onClose}
      />
      <Card>
        <InfoFields editor={editor} />
      </Card>
      <Card title="Ingrédients">
        <IngredientsEditor editor={editor} />
      </Card>
      <Card title="Cuisson">
        <CookingField editor={editor} hideLabel />
      </Card>
      <Card title="Préparation">
        <StepsEditor editor={editor} />
      </Card>
      <Card title="Autres">
        <NotesField editor={editor} hideLabel />
      </Card>
      <RecipeImportCard editor={editor} />
      <SaveBar editor={editor} onSave={() => void editor.save()} />
    </>
  );
}

/**
 * /food/recipe/:recipeId: a recipe to read, or "new" to write one (a copy of
 * another when the page is opened with `copyOf`),
 * /food/recipe/:recipeId/edit to edit it and /food/recipe/:recipeId/cook to
 * cook it ahead. Slides in over the food page.
 */
export default function RecipePage() {
  const { recipeId = '' } = useParams();
  const { state } = useLocation() as { state: RecipeState | null };
  const isEditRoute = useMatch(PATHS.recipeEdit) !== null;
  const isCookRoute = useMatch(PATHS.recipeCook) !== null;
  const navigate = useNavigate();
  const flow = useFlow();
  const recipes = useList(listRecipes);
  const foods = useList(listFoodItems);
  const [lastSaved, setLastSaved] = useState<Recipe | null>(null);

  const isNew = recipeId === 'new';
  const id = Number(recipeId);
  const backToFood = useGoBack(PATHS.food);
  const backToSheet = useGoBack(isNew ? PATHS.food : recipePath(id));

  // A recipe just created shows even before the list is read again.
  const recipe = isNew
    ? null
    : (recipes.items.find((item) => item.id === id) ??
      (lastSaved?.id === id ? lastSaved : null));

  const copyOf =
    (isNew && recipes.items.find((item) => item.id === state?.copyOf)) || null;

  const close = () => flow.close(backToFood);
  const props = {
    recipe,
    copyOf,
    foodItems: foods.items,
    onClose: close,
    onSaved: (saved: Recipe) => {
      setLastSaved(saved);
      void navigate(recipePath(saved.id), { replace: true });
    },
  };

  let content;
  if (recipes.isLoading || foods.isLoading) {
    content = <PageLoading />;
  } else if (recipes.hasError || foods.hasError) {
    content = (
      <>
        <FlowHeader title="Recette" subtitle="Recettes" onClose={close} />
        <EmptyPart>Impossible de charger la recette. Réessayez.</EmptyPart>
      </>
    );
  } else if (!isNew && (!recipe || recipe.archived)) {
    content = (
      <>
        <FlowHeader title="Recette" subtitle="Recettes" onClose={close} />
        <EmptyPart>Cette recette n'existe plus.</EmptyPart>
      </>
    );
  } else if (isCookRoute) {
    content = (
      <CookRecipe
        recipe={recipe!}
        foodItems={foods.items}
        servings={state?.servings ?? recipe!.servings}
        onClose={backToSheet}
      />
    );
  } else if (isNew || isEditRoute) {
    content = (
      <EditRecipe
        key={recipeId}
        {...props}
        onClose={isNew ? close : backToSheet}
        onSaved={isNew ? props.onSaved : backToSheet}
      />
    );
  } else {
    content = (
      <RecipeSheet
        recipe={recipe!}
        foodItems={foods.items}
        onClose={close}
        onEdit={() => void navigate(recipeEditPath(id))}
        onCopy={() =>
          void navigate(recipePath('new'), {
            state: { copyOf: id } satisfies RecipeState,
          })
        }
        onDeleted={close}
        onCook={(servings) =>
          void navigate(recipeCookPath(id), {
            state: { servings } satisfies RecipeState,
          })
        }
      />
    );
  }

  return <div className="flex flex-col gap-4">{content}</div>;
}
