import type { WorkoutItemInput, WorkoutSet } from '../components/fitness/types';
import type { FoodItemInput } from '../components/food/types';
import type { MealItemInput, MealType } from '../components/meal/types';
import { createExercise } from '../data/exercises';
import { createFoodItem } from '../data/foodItems';
import { createMeal } from '../data/meals';
import { updateProfile } from '../data/profile';
import { createRecipe } from '../data/recipes';
import { addFoodsToShopping, addLabelToShopping } from '../data/shopping';
import { logWeight } from '../data/weights';
import { saveDay } from '../data/workouts';
import { createTemplate } from '../data/workoutTemplates';
import type { Database } from '../db/database';
import { toDateKey } from '../utils/dateKey';

/** How many days of history the demo holds, today included. */
export const DEMO_DAYS = 90;

/** The same numbers on every run, so two seeds look alike. */
function randomFrom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

const round = (value: number, decimals = 1) =>
  Math.round(value * 10 ** decimals) / 10 ** decimals;

const food = (
  name: string,
  brand: string | null,
  per: [quantity: number, unit: FoodItemInput['baseUnit']],
  [kcal, protein, carbs, fat]: [number, number, number, number],
  portion: [quantity: number, name: string | null] | null = null,
): FoodItemInput => ({
  name,
  brand,
  barcode: null,
  baseQuantity: per[0],
  baseUnit: per[1],
  kcal,
  protein,
  carbs,
  fat,
  portionQuantity: portion?.[0] ?? null,
  portionName: portion?.[1] ?? null,
});

const G100 = [100, 'GRAM'] as const;

const FOODS = {
  oats: food('Flocons d’avoine', 'Migros Bio', [...G100], [372, 13.5, 58.7, 7]),
  milk: food(
    'Lait demi-écrémé',
    'Coop',
    [100, 'MILLILITER'],
    [47, 3.4, 4.8, 1.5],
  ),
  skyr: food(
    'Skyr nature',
    'Migros',
    [...G100],
    [63, 11, 4, 0.2],
    [150, 'pot'],
  ),
  banana: food('Banane', null, [1, 'PIECE'], [105, 1.3, 27, 0.4]),
  apple: food('Pomme', null, [1, 'PIECE'], [80, 0.4, 19, 0.3]),
  blackberry: food('Mûre', null, [...G100], [43, 1.4, 9.6, 0.5]),
  egg: food('Œuf', 'Coop Naturaplan', [1, 'PIECE'], [78, 6.5, 0.4, 5.5]),
  bread: food(
    'Pain complet',
    'Coop',
    [...G100],
    [240, 9, 41, 3],
    [40, 'tranche'],
  ),
  chicken: food('Blanc de poulet', 'Optigal', [...G100], [110, 23, 0, 1.8]),
  rice: food('Riz basmati', 'Coop', [...G100], [355, 8, 78, 0.9]),
  pasta: food('Spaghetti', 'Barilla', [...G100], [359, 12.5, 71, 2]),
  tuna: food(
    'Thon au naturel',
    'Coop',
    [...G100],
    [116, 26, 0, 1],
    [130, 'boîte'],
  ),
  salmon: food('Saumon', 'Migros', [...G100], [208, 20, 0, 13]),
  broccoli: food('Brocoli', null, [...G100], [34, 2.8, 7, 0.4]),
  potato: food('Pomme de terre', null, [...G100], [77, 2, 17, 0.1]),
  fries: food('Frites au four', 'Coop Bio', [...G100], [160, 2.6, 24, 5.6]),
  tomato: food('Tomate', null, [...G100], [18, 0.9, 3.9, 0.2]),
  oil: food(
    'Huile d’olive',
    'Coop',
    [100, 'MILLILITER'],
    [828, 0, 0, 92],
    [10, 'c. à s.'],
  ),
  almonds: food(
    'Amandes',
    'Migros',
    [...G100],
    [609, 22, 6, 53],
    [30, 'poignée'],
  ),
  whey: food(
    'Whey vanille',
    'Sponser',
    [...G100],
    [380, 78, 6, 5],
    [30, 'dose'],
  ),
  chocolate: food(
    'Chocolat noir 70 %',
    'Lindt',
    [...G100],
    [566, 9.5, 34, 41],
    [10, 'carré'],
  ),
  cheese: food('Gruyère', 'Coop', [...G100], [413, 27, 0, 34], [30, 'portion']),
  yogurt: food(
    'Yogourt grec',
    'Migros',
    [...G100],
    [97, 9, 4, 5],
    [180, 'pot'],
  ),
  avocado: food('Avocat', null, [1, 'PIECE'], [240, 3, 13, 22]),
} satisfies Record<string, FoodItemInput>;

type FoodKey = keyof typeof FOODS;

const EXERCISES = {
  bench: { name: 'Développé couché', kind: 'STRENGTH' },
  squat: { name: 'Squat', kind: 'STRENGTH' },
  deadlift: { name: 'Soulevé de terre', kind: 'STRENGTH' },
  pullup: { name: 'Tractions', kind: 'STRENGTH' },
  press: { name: 'Développé militaire', kind: 'STRENGTH' },
  row: { name: 'Rowing barre', kind: 'STRENGTH' },
  curl: { name: 'Curl haltères', kind: 'STRENGTH' },
  legPress: { name: 'Presse à cuisses', kind: 'STRENGTH' },
  treadmill: { name: 'Tapis de course', kind: 'TREADMILL' },
  bike: { name: 'Vélo elliptique', kind: 'CARDIO' },
} as const;

type ExerciseKey = keyof typeof EXERCISES;

/** Starting load and weekly gain in kg, 0 for the body weight alone. */
const LOADS: Partial<Record<ExerciseKey, [number, number]>> = {
  bench: [60, 0.6],
  squat: [75, 0.9],
  deadlift: [90, 1],
  pullup: [0, 0],
  press: [35, 0.4],
  row: [50, 0.5],
  curl: [12, 0.15],
  legPress: [120, 2],
};

const SESSIONS: ExerciseKey[][] = [
  ['bench', 'press', 'curl', 'treadmill'],
  ['deadlift', 'pullup', 'row', 'bike'],
  ['squat', 'legPress', 'treadmill'],
];

/**
 * Fills an empty, migrated database with a believable user over the last
 * DEMO_DAYS days, up to `today`: a profile on a fat-loss goal, weigh-ins,
 * a food library, recipes, library meals, a logged day after day, sessions
 * three or four times a week, and a shopping list. Everything goes through
 * the data modules, so the seed follows their rules and the schema.
 */
export async function seedDemo(db: Database, today = new Date()) {
  const random = randomFrom(42);
  const dayAt = (offset: number, hour = 12) =>
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - offset,
      hour,
      Math.floor(random() * 60),
    );
  const first = DEMO_DAYS - 1;

  // The first weigh-in comes before the goal, which starts from it.
  const startWeight = 86.4;
  await logWeight(
    db,
    {
      weight: startWeight,
      bodyFat: 22.5,
      fatFreeMass: null,
      bodyWater: 55.2,
      muscleMass: 63.8,
    },
    dayAt(first, 7),
  );
  await updateProfile(
    db,
    {
      height: 180,
      gender: 'MALE',
      birthDate: '2000-03-14',
      activityLevel: 'MODERATELY_ACTIVE',
      goalType: 'LOSE_FAT',
      goalPace: 0.5,
      targetBodyFat: 15,
      dailyCalorieGoal: 2300,
      dailyProteinGoal: 170,
      dailyCarbsGoal: 240,
      dailyFatGoal: 70,
    },
    dayAt(first, 8),
  );

  for (let offset = first - 1; offset >= 0; offset -= 1) {
    // A weigh-in skipped now and then, never today's.
    if (offset > 0 && random() < 0.25) continue;
    const progress = (first - offset) / first;
    const weight = startWeight - 4.2 * progress + (random() - 0.5) * 0.8;
    const bodyFat = 22.5 - 3.4 * progress + (random() - 0.5) * 0.6;
    await logWeight(
      db,
      {
        weight: round(weight),
        bodyFat: round(bodyFat),
        fatFreeMass: null,
        bodyWater: round(55.2 + 2 * progress + (random() - 0.5) * 0.4),
        muscleMass: round(63.8 + 0.4 * progress + (random() - 0.5) * 0.4),
      },
      dayAt(offset, 7),
    );
  }

  const foods = {} as Record<FoodKey, number>;
  for (const [key, input] of Object.entries(FOODS)) {
    foods[key as FoodKey] = (await createFoodItem(db, input)).id;
  }

  const bowl = await createRecipe(db, {
    name: 'Bowl poulet riz brocoli',
    servings: 2,
    category: 'MAIN',
    prepMinutes: 25,
    cooking: 'Poêle, feu moyen',
    notes: null,
    ingredients: [
      { foodItemId: foods.chicken, quantity: 300 },
      { foodItemId: foods.rice, quantity: 150 },
      { foodItemId: foods.broccoli, quantity: 250 },
      { foodItemId: foods.oil, quantity: 10 },
    ],
    steps: [
      'Cuire le riz.',
      'Couper le poulet en dés et le saisir à l’huile.',
      'Cuire le brocoli à la vapeur, puis tout réunir.',
    ],
  });
  const porridge = await createRecipe(db, {
    name: 'Porridge protéiné',
    servings: 1,
    category: 'BREAKFAST',
    prepMinutes: 5,
    cooking: null,
    notes: 'Meilleur avec des mûres.',
    ingredients: [
      { foodItemId: foods.oats, quantity: 70 },
      { foodItemId: foods.milk, quantity: 250 },
      { foodItemId: foods.whey, quantity: 30 },
      { foodItemId: foods.banana, quantity: 1 },
    ],
    steps: [
      'Chauffer les flocons dans le lait.',
      'Ajouter la whey hors du feu.',
    ],
  });
  const tunaPasta = await createRecipe(db, {
    name: 'Pâtes au thon',
    servings: 2,
    category: 'MAIN',
    prepMinutes: 15,
    cooking: null,
    notes: null,
    ingredients: [
      { foodItemId: foods.pasta, quantity: 200 },
      { foodItemId: foods.tuna, quantity: 260 },
      { foodItemId: foods.tomato, quantity: 300 },
      { foodItemId: foods.oil, quantity: 10 },
    ],
    steps: [
      'Cuire les pâtes.',
      'Mélanger le thon et la tomate, puis les pâtes.',
    ],
  });

  const of = (key: FoodKey, quantity: number): MealItemInput => ({
    foodItemId: foods[key],
    quantity,
  });
  const recipe = (id: number, servings: number): MealItemInput => ({
    recipeId: id,
    quantity: servings,
  });

  await createMeal(db, {
    name: 'Petit-déj œufs',
    items: [of('egg', 3), of('bread', 80), of('cheese', 30)],
  });
  await createMeal(db, {
    name: 'Collation skyr',
    items: [of('skyr', 150), of('blackberry', 100), of('almonds', 20)],
  });
  await createMeal(db, {
    name: 'Saumon pommes de terre',
    items: [of('salmon', 150), of('potato', 300), of('broccoli', 150)],
  });

  const breakfasts = [
    () => [recipe(porridge.id, 1)],
    () => [of('egg', 3), of('bread', 80), of('cheese', 30)],
    () => [of('yogurt', 180), of('oats', 50), of('blackberry', 80)],
  ];
  const lunches = [
    () => [recipe(bowl.id, 1)],
    () => [recipe(tunaPasta.id, 1)],
    () => [of('chicken', 160), of('fries', 200), of('tomato', 150)],
    () => [of('bread', 120), of('tuna', 130), of('avocado', 1)],
  ];
  const dinners = [
    () => [of('salmon', 150), of('potato', 300), of('broccoli', 150)],
    () => [recipe(bowl.id, 1)],
    () => [of('egg', 3), of('potato', 250), of('tomato', 150), of('oil', 10)],
    () => [of('chicken', 180), of('rice', 80), of('broccoli', 200)],
  ];
  const snacks = [
    () => [of('skyr', 150), of('blackberry', 100)],
    () => [of('apple', 1), of('almonds', 30)],
    () => [of('banana', 1), of('whey', 30)],
    () => [of('chocolate', 20)],
  ];
  const pick = <T>(list: (() => T)[]) =>
    list[Math.floor(random() * list.length)]();

  for (let offset = first; offset >= 0; offset -= 1) {
    const day = toDateKey(dayAt(offset));
    // A day forgotten now and then, and today only up to lunch.
    if (offset > 0 && random() < 0.05) continue;
    const meals: [MealType, MealItemInput[]][] = [
      ['BREAKFAST', pick(breakfasts)],
      ['LUNCH', pick(lunches)],
    ];
    if (offset > 0) {
      meals.push(['DINNER', pick(dinners)]);
      if (random() < 0.7) meals.push(['SNACK', pick(snacks)]);
    }
    for (const [typeMeal, items] of meals) {
      await createMeal(db, { typeMeal, loggedAt: day, items });
    }
  }

  const exercises = {} as Record<ExerciseKey, number>;
  for (const [key, input] of Object.entries(EXERCISES)) {
    exercises[key as ExerciseKey] = (await createExercise(db, input)).id;
  }
  const names = ['Push', 'Pull', 'Jambes'];
  for (const [index, session] of SESSIONS.entries()) {
    await createTemplate(db, {
      name: names[index],
      items: session.map((key) => ({ exerciseId: exercises[key] })),
    });
  }

  let next = 0;
  for (let offset = first; offset >= 0; offset -= 1) {
    const date = dayAt(offset);
    // Monday, Wednesday, Friday, and a Saturday one week in two.
    const weekday = date.getDay();
    const trains =
      [1, 3, 5].includes(weekday) || (weekday === 6 && random() < 0.5);
    if (!trains || random() < 0.08) continue;
    const weeks = (first - offset) / 7;
    const session = SESSIONS[next % SESSIONS.length];
    next += 1;
    const items: WorkoutItemInput[] = session.map((key) => {
      const kind = EXERCISES[key].kind;
      if (kind !== 'STRENGTH') {
        return {
          exerciseId: exercises[key],
          cardioSets: [
            {
              durationMinutes: 15 + Math.floor(random() * 3) * 5,
              speedKmh: kind === 'TREADMILL' ? 5.5 : null,
              inclinePercent: kind === 'TREADMILL' ? 8 : null,
              resistance: kind === 'CARDIO' ? 6 : null,
            },
          ],
        };
      }
      const [start, gain] = LOADS[key] ?? [0, 0];
      const weightKg = Math.round((start + gain * weeks) / 2.5) * 2.5;
      const sets: WorkoutSet[] = [0, 1, 2].map((set) => ({
        reps: weightKg === 0 ? 8 - set : 8 + Math.floor(random() * 3) - set,
        weightKg,
      }));
      return { exerciseId: exercises[key], sets };
    });
    await saveDay(db, toDateKey(date), items);
  }

  await addFoodsToShopping(db, [
    { foodItemId: foods.chicken, quantity: 600 },
    { foodItemId: foods.skyr, quantity: 600 },
    { foodItemId: foods.banana, quantity: 6 },
  ]);
  await addLabelToShopping(db, 'Éponges');
}
