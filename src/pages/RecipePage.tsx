import { useRef, useState } from 'react';
import { LoaderCircle, Trash2 } from 'lucide-react';
import { useMatch, useNavigate, useParams } from 'react-router';

import { listFoodItems } from '../components/food/api';
import type { FoodItem } from '../components/food/types';
import { useFlow } from '../components/layout/flowContext';
import { FlowHeader } from '../components/layout/FlowHeader';
import { listRecipes } from '../components/recipe/api';
import {
  CookingField,
  DeleteRecipeDialog,
  InfoFields,
  IngredientsEditor,
  NotesField,
  SaveBar,
  StepsEditor,
} from '../components/recipe/RecipeEditor';
import {
  EmptyPart,
  IngredientRows,
  RecipeCard,
  ServingNutrition,
  ServingsStepper,
  StepRows,
  TextBlock,
} from '../components/recipe/RecipeView';
import { recipeMeta } from '../components/recipe/servings';
import type { Recipe } from '../components/recipe/types';
import {
  useRecipeEditor,
  type RecipeEditor,
} from '../components/recipe/useRecipeEditor';
import { EditIconButton } from '../components/ui/EditIconButton';
import { useKeepAwake } from '../hooks/useKeepAwake';
import { useList } from '../hooks/useList';
import { useGoBack } from '../routing/navigation';
import { PATHS } from '../routing/paths';
import { recipeEditPath, recipePath } from '../routing/recipes';

const HEADER_BUTTON_CLASS =
  'flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-theme-400 transition-colors hover:bg-theme-100';

interface PageProps {
  recipe: Recipe | null;
  foodItems: FoodItem[];
  /** The page itself: the dropdowns render in it. */
  container: HTMLElement | null;
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
        className={`${HEADER_BUTTON_CLASS} hover:text-red-500`}
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
}

/**
 * The recipe to read while cooking, every part one under the other, the
 * quantities for the servings chosen. The screen stays on meanwhile.
 */
function RecipeSheet({ recipe, foodItems, onClose, onEdit }: SheetProps) {
  const [servings, setServings] = useState(recipe.servings);
  useKeepAwake();
  return (
    <>
      <FlowHeader
        title={recipe.name}
        subtitle={recipeMeta(recipe) || 'Recette'}
        onClose={onClose}
        action={<EditIconButton size="lg" onClick={onEdit} />}
      />
      <RecipeCard>
        <ServingNutrition recipe={recipe} />
      </RecipeCard>
      <RecipeCard
        title="Ingrédients"
        action={
          <ServingsStepper
            value={servings}
            onChange={setServings}
            prefix="Pour"
          />
        }
      >
        <IngredientRows
          recipe={recipe}
          foodItems={foodItems}
          servings={servings}
        />
      </RecipeCard>
      {recipe.cooking && (
        <RecipeCard title="Cuisson">
          <TextBlock>{recipe.cooking}</TextBlock>
        </RecipeCard>
      )}
      {recipe.steps.length > 0 && (
        <RecipeCard title="Préparation">
          <StepRows steps={recipe.steps} />
        </RecipeCard>
      )}
      {recipe.notes && (
        <RecipeCard title="Autres">
          <TextBlock>{recipe.notes}</TextBlock>
        </RecipeCard>
      )}
    </>
  );
}

/** The recipe to write, on its own page, every part stacked. */
function EditRecipe({
  recipe,
  foodItems,
  container,
  onClose,
  onSaved,
  onDeleted,
}: PageProps) {
  const editor = useRecipeEditor({ recipe, foodItems, onSaved, onDeleted });
  return (
    <>
      <FlowHeader
        title={recipe ? 'Modifier la recette' : 'Nouvelle recette'}
        subtitle={recipe?.name ?? 'Recettes'}
        onClose={onClose}
        action={<DeleteAction editor={editor} />}
      />
      <RecipeCard>
        <InfoFields editor={editor} container={container} />
      </RecipeCard>
      <RecipeCard title="Ingrédients">
        <IngredientsEditor editor={editor} container={container} />
      </RecipeCard>
      <RecipeCard title="Cuisson">
        <CookingField editor={editor} hideLabel />
      </RecipeCard>
      <RecipeCard title="Préparation">
        <StepsEditor editor={editor} />
      </RecipeCard>
      <RecipeCard title="Autres">
        <NotesField editor={editor} hideLabel />
      </RecipeCard>
      <SaveBar editor={editor} onSave={() => void editor.save()} />
    </>
  );
}

/**
 * /food/recipe/:recipeId: a recipe to read, or "new" to write one, and
 * /food/recipe/:recipeId/edit to edit it. Slides in over the food page.
 */
export default function RecipePage() {
  const { recipeId = '' } = useParams();
  const isEditRoute = useMatch(PATHS.recipeEdit) !== null;
  const navigate = useNavigate();
  const flow = useFlow();
  const recipes = useList(listRecipes);
  const foods = useList(listFoodItems);
  const [lastSaved, setLastSaved] = useState<Recipe | null>(null);
  const [node, setNode] = useState<HTMLDivElement | null>(null);

  const isNew = recipeId === 'new';
  const id = Number(recipeId);
  const backToFood = useGoBack(PATHS.food);
  const backToSheet = useGoBack(isNew ? PATHS.food : recipePath(id));

  // A recipe just created shows even before the list is read again.
  const recipe = isNew
    ? null
    : (recipes.items.find((item) => item.id === id) ??
      (lastSaved?.id === id ? lastSaved : null));

  const close = () => flow.close(backToFood);
  const props = {
    recipe,
    foodItems: foods.items,
    container: node,
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
      />
    );
  }

  return (
    <div ref={setNode} className="flex flex-col gap-4">
      {content}
    </div>
  );
}
