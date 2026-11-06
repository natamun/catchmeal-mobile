/**
 * Every URL of the app in one place: routes and links use these names instead
 * of raw strings.
 */
export const PATHS = {
  home: '/home',
  journalAdd: '/home/add/:mealType',
  food: '/food',
  fitness: '/fitness',
  stats: '/stats',
  profile: '/profile',
} as const;
