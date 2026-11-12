import { useRef, useState } from 'react';
import { Copy, LoaderCircle, ShoppingCart, Trash2 } from 'lucide-react';
import { useLocation, useMatch, useNavigate, useParams } from 'react-router';

import { listFoodItems } from '../components/food/api';
import type { FoodItem } from '../components/food/types';
import { useFlow } from '../components/layout/flowContext';
import { FlowHeader } from '../components/layout/FlowHeader';
import { listRecipes } from '../components/recipe/api';
import { RecipeAiCard } from '../components/recipe/RecipeAiCard';
import {
  CookingField,
  DeleteRecipeDialog,
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
import { recipeMeta, servingsLabel } from '../components/recipe/servings';
import type { Recipe } from '../components/recipe/types';
import {
  useRecipeEditor,
  type RecipeEditor,
} from '../components/recipe/useRecipeEditor';
import { addFoodsToShopping } from '../components/shopping/api';
import { recipeToShopping } from '../components/shopping/lines';
import { SECONDARY_BUTTON_CLASS } from '../components/ui/buttonStyle';
import { Card } from '../components/ui/Card';
import { EditIconButton } from '../components/ui/EditIconButton';
import { useToast } from '../components/ui/toastContext';
import { useKeepAwake } from '../hooks/useKeepAwake';
import { useList } from '../hooks/useList';
import { useGoBack } from '../routing/navigation';
import { PATHS } from '../routing/paths';
import { recipeEditPath, recipePath } from '../routing/recipes';

const HEADER_BUTTON_CLASS =
  'flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-theme-400 transition-colors hover:bg-theme-100';

/** What the page is opened with: a new recipe can start as a copy. */
interface RecipeState {
  copyOf?: number;
}

interface PageProps {
  recipe: Recipe | null;
  copyOf: Recipe | null;
  foodItems: FoodItem[];
  onClose: () => void;
  onSaved: (recipe: Recipe) => void;
  onDeleted: () => void;
}

/** The trash button of an edited recipe, and the dialog it opens. */
function DeleteAction({ editor }: { editor: RecipeEditor }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  if (!editor.recipe) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-500/10"
      >
        <Trash2 className="h-5 w-5" />
      </button>
      <DeleteRecipeDialog editor={editor} dialogRef={dialogRef} />
    </>
  );
}

interface SheetProps {
  recipe: Recipe;
  foodItems: FoodItem[];
  onClose: () => void;
  onEdit: () => void;
  onCopy: () => void;
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
  return (
    <>
      <FlowHeader
        title={recipe.name}
        subtitle={recipeMeta(recipe) || 'Recette'}
        onClose={onClose}
        action={
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onCopy}
              title="Dupliquer"
              className={`${HEADER_BUTTON_CLASS} hover:text-theme-600`}
            >
              <Copy className="h-5 w-5" />
            </button>
            <EditIconButton size="lg" onClick={onEdit} />
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
        <button
          type="button"
          onClick={() => void addToShopping()}
          disabled={isAdding}
          className={`${SECONDARY_BUTTON_CLASS} flex-none self-start`}
        >
          <ShoppingCart className="h-4 w-4" />
          Ajouter aux courses
        </button>
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
  onDeleted,
}: PageProps) {
  const editor = useRecipeEditor({
    recipe,
    copyOf,
    foodItems,
    onSaved,
    onDeleted,
  });
  return (
    <>
      <FlowHeader
        title={recipe ? 'Modifier la recette' : 'Nouvelle recette'}
        subtitle={
          recipe?.name ?? (copyOf ? `Copie de ${copyOf.name}` : 'Recettes')
        }
        onClose={onClose}
        action={<DeleteAction editor={editor} />}
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
 * another when the page is opened with `copyOf`), and
 * /food/recipe/:recipeId/edit to edit it. Slides in over the food page.
 */
export default function RecipePage() {
  const { recipeId = '' } = useParams();
  const { state } = useLocation() as { state: RecipeState | null };
  const isEditRoute = useMatch(PATHS.recipeEdit) !== null;
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
    // The edit page sits on the sheet, both over the food page.
    onDeleted: () => flow.close(() => void navigate(isEditRoute ? -2 : -1)),
  };

  let content;
  if (recipes.isLoading || foods.isLoading) {
    content = (
      <div className="flex justify-center py-16">
        <LoaderCircle className="h-6 w-6 animate-spin text-theme-400" />
      </div>
    );
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
      />
    );
  }

  return <div className="flex flex-col gap-4">{content}</div>;
}
