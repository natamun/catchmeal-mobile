import { roundDecimals } from '../../utils/decimals';
import { wholePortions } from '../food/portion';
import type { FoodItem } from '../food/types';
import type { MealItemDraft } from '../meal/draft';
import {
  emptyRecipeForm,
  linesOf,
  newStep,
  RECIPE_LIMITS,
  withSections,
  type RecipeForm,
} from './recipeForm';
import { MAX_SERVINGS } from './servings';
import {
  RECIPE_CATEGORIES,
  RECIPE_CATEGORY_LABELS,
  type RecipeCategory,
} from './types';

/** The largest quantity of one ingredient the database keeps. */
const MAX_QUANTITY = 10000;

const UNIT_WORDS = { GRAM: 'g', MILLILITER: 'ml', PIECE: 'pièces' } as const;

/** One line per food of the library: "- 12 : Frites (Coop), g, 1 portion = 150 g". */
function foodLine(food: FoodItem) {
  const brand = food.brand ? ` (${food.brand})` : '';
  const portion =
    food.portionQuantity !== null && food.baseUnit !== 'PIECE'
      ? `, 1 ${food.portionName ?? 'portion'} = ${food.portionQuantity} ${UNIT_WORDS[food.baseUnit]}`
      : '';
  return `- ${food.id} : ${food.name}${brand}, ${UNIT_WORDS[food.baseUnit]}${portion}`;
}

/** Stands for the ingredients while the rest of the JSON is written. */
const INGREDIENTS_SLOT = '\u0000ingredients';

/**
 * The recipe being written as the JSON the import reads back: each
 * ingredient by its number in the library, with its name to stay readable.
 * A new recipe gives the same fields, empty.
 */
export function formToJson(form: RecipeForm) {
  const prep = form.prepMinutes.trim();
  const data = {
    name: form.name.trim(),
    category: form.category,
    servings: form.servings,
    prepMinutes: /^\d+$/.test(prep) ? Number(prep) : null,
    cooking: form.cooking.trim() || null,
    notes: form.notes.trim() || null,
    ingredients: withSections(form.ingredients).flatMap(({ item, section }) =>
      item.kind === 'food'
        ? [
            {
              foodId: item.foodItem.id,
              name: item.foodItem.name,
              quantity: item.quantity,
              section,
            },
          ]
        : [],
    ),
    steps: form.steps.map(({ text }) => text.trim()).filter(Boolean),
  };
  // One line per ingredient: a recipe of ten stays easy to read.
  const ingredients = data.ingredients.map(
    (item) =>
      `    { ${Object.entries(item)
        .map(
          ([key, value]) => `${JSON.stringify(key)}: ${JSON.stringify(value)}`,
        )
        .join(', ')} }`,
  );
  return JSON.stringify(
    { ...data, ingredients: INGREDIENTS_SLOT },
    null,
    2,
  ).replace(
    JSON.stringify(INGREDIENTS_SLOT),
    ingredients.length > 0 ? `[\n${ingredients.join(',\n')}\n  ]` : '[]',
  );
}

/**
 * The text to send to an AI: the recipe as JSON (empty for a new one), the
 * rules of its fields, and the foods of the library with their number, since
 * an ingredient must be one of them for the app to know its values. Ends with
 * "Ma demande :" for the user to say what to write or change.
 */
export function buildExportText(form: RecipeForm, foodItems: FoodItem[]) {
  const foods = foodItems
    .filter((food) => !food.archived)
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
    .map(foodLine);
  const categories = RECIPE_CATEGORIES.map(
    (value) => `${value} (${RECIPE_CATEGORY_LABELS[value]})`,
  ).join(', ');

  return [
    'Voici une recette au format JSON de mon application de nutrition (vide si elle est à créer). Complète-la ou modifie-la selon ma demande, puis réponds uniquement avec le JSON complet, sans texte autour.',
    ['```json', formToJson(form), '```'].join('\n'),
    [
      '## Règles',
      '- Chaque ingrédient prend un aliment de ma liste ci-dessous : son numéro dans "foodId", son nom dans "name".',
      `- "quantity" : la quantité pour toute la recette, dans l'unité de l'aliment (g, ml ou nombre de pièces), au plus ${MAX_QUANTITY}.`,
      '- Un ingrédient absent de ma liste : "foodId": null, avec son nom. Je l\'ajouterai moi-même.',
      `- "section" : la partie de la recette où va l'ingrédient, par exemple "Poulet" ou "Sauce" (${RECIPE_LIMITS.section} caractères au plus), ou null si la recette n'a pas de parties. Les ingrédients d'une même section se suivent.`,
      `- "servings" : nombre entier de portions, de 1 à ${MAX_SERVINGS}.`,
      `- "category" : une valeur parmi ${categories}, ou null.`,
      '- "prepMinutes" : temps de préparation en minutes entières, ou null.',
      '- "cooking" et "notes" : texte libre, ou null.',
      `- "steps" : une étape par texte, sans numéro, ${RECIPE_LIMITS.steps} au plus.`,
    ].join('\n'),
    [
      '## Mes aliments (numéro : nom, unité)',
      ...(foods.length > 0 ? foods : ['(aucun aliment pour le moment)']),
    ].join('\n'),
    'Ma demande : ',
  ].join('\n\n');
}

/** What a paste gives: the form to review, or why nothing could be read. */
export type RecipeImport =
  | {
      ok: true;
      form: RecipeForm;
      /** The ingredients not found in the library, by the name the AI gave. */
      missing: string[];
      /** What was left out or changed on the way. */
      warnings: string[];
    }
  | { ok: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const textOf = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

/**
 * The JSON object in the text: AIs often wrap it in ```json fences or a
 * sentence, so only what lies between the first "{" and the last "}" is read.
 */
function readObject(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end < start) return undefined;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return undefined;
  }
}

/**
 * Reads the JSON an AI wrote from buildExportText into a recipe form, to be
 * reviewed and saved like a typed one (validateRecipeForm still applies).
 * Ingredients are matched by their number in the library; an unknown one is
 * listed in `missing`, a bad quantity in `warnings`. Lines of the same food
 * in the same section are added up; the foods of a section are gathered
 * where it first appears.
 */
export function parseRecipeImport(
  text: string,
  foodItems: FoodItem[],
): RecipeImport {
  const data = readObject(text);
  if (!isRecord(data)) {
    return {
      ok: false,
      error: 'Aucune recette lisible dans ce texte',
    };
  }

  const warnings: string[] = [];
  const missing: string[] = [];
  const cut = (value: unknown, max: number, label: string) => {
    const written = textOf(value);
    if (written.length <= max) return written;
    warnings.push(`${label} coupé à ${max} caractères`);
    return written.slice(0, max);
  };

  const form = emptyRecipeForm();
  form.name = textOf(data.name);

  if (RECIPE_CATEGORIES.includes(data.category as RecipeCategory)) {
    form.category = data.category as RecipeCategory;
  } else if (data.category !== null && data.category !== undefined) {
    warnings.push('Catégorie inconnue, laissée vide');
  }

  const { servings } = data;
  if (
    typeof servings === 'number' &&
    Number.isInteger(servings) &&
    servings >= 1 &&
    servings <= MAX_SERVINGS
  ) {
    form.servings = servings;
  } else {
    warnings.push(`Portions invalides, mises à ${form.servings}`);
  }

  if (
    typeof data.prepMinutes === 'number' ||
    typeof data.prepMinutes === 'string'
  ) {
    form.prepMinutes = String(data.prepMinutes).trim();
  }
  form.cooking = cut(data.cooking, RECIPE_LIMITS.cooking, 'Cuisson');
  form.notes = cut(data.notes, RECIPE_LIMITS.notes, 'Autres');

  const steps = Array.isArray(data.steps)
    ? data.steps
        .map((step) => cut(step, RECIPE_LIMITS.step, 'Une étape'))
        .filter((step) => step !== '')
    : [];
  if (steps.length > 0) form.steps = steps.map(newStep);

  const active = new Map(
    foodItems.filter((food) => !food.archived).map((food) => [food.id, food]),
  );
  // Keyed by section, then by food, both in the order they first appear.
  const sections = new Map<string | null, Map<number, number>>();
  const lines = Array.isArray(data.ingredients) ? data.ingredients : [];
  for (const line of lines) {
    if (!isRecord(line)) continue;
    const name = textOf(line.name);
    const food =
      typeof line.foodId === 'number' ? active.get(line.foodId) : undefined;
    if (!food) {
      missing.push(name || 'Ingrédient sans nom');
      continue;
    }
    const { quantity } = line;
    if (
      typeof quantity !== 'number' ||
      !(quantity > 0) ||
      quantity > MAX_QUANTITY
    ) {
      warnings.push(`Quantité invalide pour ${food.name}, ingrédient ignoré`);
      continue;
    }
    const section =
      cut(line.section, RECIPE_LIMITS.section, 'Une section') || null;
    const foods = sections.get(section) ?? new Map<number, number>();
    sections.set(section, foods);
    foods.set(food.id, (foods.get(food.id) ?? 0) + quantity);
  }

  form.ingredients = linesOf(
    [...sections].flatMap(([section, foods]) =>
      [...foods].map(([id, total]) => {
        const foodItem = active.get(id)!;
        const quantity = roundDecimals(Math.min(total, MAX_QUANTITY), 2);
        const item: MealItemDraft = {
          id: crypto.randomUUID(),
          kind: 'food',
          foodItem,
          quantity,
          inPortions: wholePortions(foodItem, quantity) !== null,
        };
        return { item, section };
      }),
    ),
  );

  return { ok: true, form, missing, warnings };
}
