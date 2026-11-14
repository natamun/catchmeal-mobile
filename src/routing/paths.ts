/**
 * Every URL of the app in one place: routes and links use these names instead
 * of raw strings.
 */
export const PATHS = {
  home: '/home',
  journalAdd: '/home/add/:mealType',
  trainingAdd: '/home/training',
  food: '/food',
  meal: '/food/meal/:mealId',
  recipe: '/food/recipe/:recipeId',
  recipeEdit: '/food/recipe/:recipeId/edit',
  shoppingAdd: '/food/shopping/add',
  fitness: '/fitness',
  template: '/fitness/session/:templateId',
  stats: '/stats',
  profile: '/profile',
} as const;
