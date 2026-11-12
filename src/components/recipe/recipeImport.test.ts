import { describe, expect, it } from 'vitest';

import type { FoodItem } from '../food/types';
import { emptyRecipeForm, type RecipeForm } from './recipeForm';
import { buildExportText, formToJson, parseRecipeImport } from './recipeImport';

const CHICKEN: FoodItem = {
  id: 12,
  name: 'Blanc de poulet',
  brand: 'Migros',
  barcode: null,
  baseQuantity: 100,
  baseUnit: 'GRAM',
  kcal: 110,
  protein: 23,
  carbs: 0,
  fat: 2,
  portionQuantity: null,
  portionName: null,
  archived: false,
};

const BISCUIT: FoodItem = {
  ...CHICKEN,
  id: 3,
  name: 'Biscuit',
  brand: null,
  portionQuantity: 12,
  portionName: 'biscuit',
};

const EGG: FoodItem = {
  ...CHICKEN,
  id: 5,
  name: 'Œuf',
  brand: null,
  baseQuantity: 1,
  baseUnit: 'PIECE',
};

const OLD: FoodItem = { ...CHICKEN, id: 9, name: 'Ancien', archived: true };

const FOODS = [CHICKEN, BISCUIT, EGG, OLD];

const VALID = {
  name: 'Curry de poulet',
  category: 'MAIN',
  servings: 4,
  prepMinutes: 35,
  cooking: '20 min à feu doux',
  notes: 'Se garde 3 jours',
  ingredients: [
    { foodId: 12, name: 'Blanc de poulet', quantity: 600, section: null },
    { foodId: 5, name: 'Œuf', quantity: 2, section: null },
  ],
  steps: ['Couper le poulet.', 'Cuire.'],
};

/** The ingredient lines: a section by its name, a food as [id, quantity]. */
const rows = ({ ingredients }: RecipeForm) =>
  ingredients.map((line) =>
    line.kind === 'section'
      ? line.name
      : [line.kind === 'food' && line.foodItem.id, line.quantity],
  );

const parse = (data: unknown) => parseRecipeImport(JSON.stringify(data), FOODS);

function parsed(data: unknown) {
  const result = parse(data);
  if (!result.ok) throw new Error(result.error);
  return result;
}

describe('buildExportText', () => {
  const empty = emptyRecipeForm();

  it('lists the active foods with their number, unit and portion', () => {
    const text = buildExportText(empty, FOODS);
    expect(text).toContain('- 12 : Blanc de poulet (Migros), g');
    expect(text).toContain('- 3 : Biscuit, g, 1 biscuit = 12 g');
    expect(text).toContain('- 5 : Œuf, pièces');
    expect(text).not.toContain('Ancien');
  });

  it('ends with the place for the request', () => {
    expect(buildExportText(empty, FOODS).endsWith('Ma demande : ')).toBe(true);
  });

  it('says when the library is empty', () => {
    expect(buildExportText(empty, [])).toContain(
      '(aucun aliment pour le moment)',
    );
  });

  it('holds the JSON of the recipe', () => {
    const { form } = parsed(VALID);
    expect(buildExportText(form, FOODS)).toContain(formToJson(form));
  });
});

describe('formToJson', () => {
  it('gives the empty fields for a new recipe', () => {
    expect(JSON.parse(formToJson(emptyRecipeForm()))).toEqual({
      name: '',
      category: null,
      servings: 4,
      prepMinutes: null,
      cooking: null,
      notes: null,
      ingredients: [],
      steps: [],
    });
  });

  it('writes each ingredient on one line', () => {
    expect(formToJson(parsed(VALID).form)).toContain(
      '  "ingredients": [\n    { "foodId": 12, "name": "Blanc de poulet", "quantity": 600, "section": null },\n    { "foodId": 5, "name": "Œuf", "quantity": 2, "section": null }\n  ],',
    );
  });

  it('reads back as the same recipe', () => {
    expect(JSON.parse(formToJson(parsed(VALID).form))).toEqual(VALID);
  });

  it('gives each ingredient its section', () => {
    const withSections = {
      ...VALID,
      ingredients: [
        {
          foodId: 12,
          name: 'Blanc de poulet',
          quantity: 600,
          section: 'Poulet',
        },
        { foodId: 5, name: 'Œuf', quantity: 2, section: 'Sauce' },
      ],
    };
    expect(JSON.parse(formToJson(parsed(withSections).form))).toEqual(
      withSections,
    );
  });

  it('leaves out a preparation time that is not whole minutes', () => {
    const form = { ...emptyRecipeForm(), prepMinutes: '1,5' };
    const data = JSON.parse(formToJson(form)) as { prepMinutes: unknown };
    expect(data.prepMinutes).toBeNull();
  });
});

describe('parseRecipeImport', () => {
  it('fills the form from a valid recipe', () => {
    const { form, missing, warnings } = parsed(VALID);
    expect(form).toMatchObject({
      name: 'Curry de poulet',
      category: 'MAIN',
      servings: 4,
      prepMinutes: '35',
      cooking: '20 min à feu doux',
      notes: 'Se garde 3 jours',
    });
    expect(rows(form)).toEqual([
      [12, 600],
      [5, 2],
    ]);
    expect(form.steps.map(({ text }) => text)).toEqual([
      'Couper le poulet.',
      'Cuire.',
    ]);
    expect(missing).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('reads the JSON inside fences and a sentence', () => {
    const text = `Voici ta recette :\n\`\`\`json\n${JSON.stringify(VALID)}\n\`\`\`\nBon appétit !`;
    const result = parseRecipeImport(text, FOODS);
    expect(result.ok && result.form.name).toBe('Curry de poulet');
  });

  it('refuses a text without JSON', () => {
    expect(parseRecipeImport('Je ne sais pas.', FOODS).ok).toBe(false);
  });

  it('refuses broken JSON', () => {
    expect(parseRecipeImport('{ "name": "Curry", }', FOODS).ok).toBe(false);
  });

  it('refuses JSON that holds no object', () => {
    expect(parseRecipeImport('["Curry", 4]', FOODS).ok).toBe(false);
  });

  it('lists an ingredient without a known food as missing', () => {
    const { form, missing } = parsed({
      ...VALID,
      ingredients: [
        { foodId: null, name: 'Lait de coco', quantity: 400 },
        { foodId: 99, name: 'Inventé', quantity: 10 },
        { name: 'Sans numéro', quantity: 10 },
        { foodId: 12, quantity: 600 },
      ],
    });
    expect(missing).toEqual(['Lait de coco', 'Inventé', 'Sans numéro']);
    expect(form.ingredients).toHaveLength(1);
  });

  it('refuses an archived food', () => {
    const { form, missing } = parsed({
      ...VALID,
      ingredients: [{ foodId: 9, name: 'Ancien', quantity: 100 }],
    });
    expect(form.ingredients).toEqual([]);
    expect(missing).toEqual(['Ancien']);
  });

  it.each([0, -5, 10001, '200', null])(
    'leaves out the quantity %s',
    (quantity) => {
      const { form, warnings } = parsed({
        ...VALID,
        ingredients: [{ foodId: 12, name: 'Blanc de poulet', quantity }],
      });
      expect(form.ingredients).toEqual([]);
      expect(warnings).toEqual([
        'Quantité invalide pour Blanc de poulet, ingrédient ignoré',
      ]);
    },
  );

  it('adds up the lines of the same food', () => {
    const { form } = parsed({
      ...VALID,
      ingredients: [
        { foodId: 12, quantity: 300 },
        { foodId: 12, quantity: 200 },
      ],
    });
    expect(rows(form)).toEqual([[12, 500]]);
  });

  it('gathers the foods of a section under its title, apart from another', () => {
    const { form } = parsed({
      ...VALID,
      ingredients: [
        { foodId: 12, quantity: 600, section: 'Poulet' },
        { foodId: 5, quantity: 2, section: ' Sauce ' },
        { foodId: 12, quantity: 100, section: 'Sauce' },
        { foodId: 3, quantity: 24, section: 'Poulet' },
        { foodId: 5, quantity: 1, section: 'Sauce' },
      ],
    });
    expect(rows(form)).toEqual([
      'Poulet',
      [12, 600],
      [3, 24],
      'Sauce',
      [5, 3],
      [12, 100],
    ]);
  });

  it('cuts a section name to 60 characters', () => {
    const { form, warnings } = parsed({
      ...VALID,
      ingredients: [{ foodId: 12, quantity: 600, section: 'a'.repeat(61) }],
    });
    expect(rows(form)[0]).toBe('a'.repeat(60));
    expect(warnings).toContain('Une section coupé à 60 caractères');
  });

  it('shows whole portions as portions', () => {
    const { form } = parsed({
      ...VALID,
      ingredients: [
        { foodId: 3, quantity: 36 },
        { foodId: 12, quantity: 50 },
      ],
    });
    expect(
      form.ingredients.map((item) => item.kind === 'food' && item.inPortions),
    ).toEqual([true, false]);
  });

  it.each([0, 51, 2.5, '4', null])(
    'keeps the default servings for %s',
    (servings) => {
      const { form, warnings } = parsed({ ...VALID, servings });
      expect(form.servings).toBe(4);
      expect(warnings).toEqual(['Portions invalides, mises à 4']);
    },
  );

  it('leaves an unknown category empty', () => {
    const { form, warnings } = parsed({ ...VALID, category: 'LUNCH' });
    expect(form.category).toBeNull();
    expect(warnings).toEqual(['Catégorie inconnue, laissée vide']);
  });

  it('accepts a null category without a warning', () => {
    const { form, warnings } = parsed({ ...VALID, category: null });
    expect(form.category).toBeNull();
    expect(warnings).toEqual([]);
  });

  it('cuts the texts to the lengths kept', () => {
    const { form, warnings } = parsed({
      ...VALID,
      cooking: 'a'.repeat(501),
      steps: ['b'.repeat(501), '  ', 'Cuire.'],
    });
    expect(form.cooking).toHaveLength(500);
    expect(form.steps.map(({ text }) => text.length)).toEqual([500, 6]);
    expect(warnings).toEqual([
      'Cuisson coupé à 500 caractères',
      'Une étape coupé à 500 caractères',
    ]);
  });

  it('keeps an empty step to write when none is given', () => {
    const { form } = parsed({ ...VALID, steps: undefined });
    expect(form.steps.map(({ text }) => text)).toEqual(['']);
  });

  it('leaves a bad name or time to the form validation', () => {
    const { form } = parsed({ ...VALID, name: 42, prepMinutes: '1,5' });
    expect(form.name).toBe('');
    expect(form.prepMinutes).toBe('1,5');
  });
});
