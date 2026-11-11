/**
 * Every URL of the app in one place: routes and links use these names instead
 * of raw strings.
 */
export const PATHS = {
  home: '/home',
  journalAdd: '/home/add/:mealType',
  journalEdit: '/home/edit/:mealType',
  trainingAdd: '/home/training',
  trainingEdit: '/home/training/edit',
  food: '/food',
  meal: '/food/meal/:mealId',
  recipe: '/food/recipe/:recipeId',
  recipeEdit: '/food/recipe/:recipeId/edit',
  shoppingAdd: '/food/shopping/add',
  fitness: '/fitness',
  stats: '/stats',
  profile: '/profile',
} as const;
