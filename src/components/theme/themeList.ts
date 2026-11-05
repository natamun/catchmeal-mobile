/** The color themes; their colors are in index.css ([data-theme='...']). */
export const THEMES = [
  { id: 'foret', label: 'Forêt', dark: false },
  { id: 'sable', label: 'Sable', dark: false },
  { id: 'nuit', label: 'Nuit', dark: true },
  { id: 'ocean', label: 'Océan', dark: true },
  { id: 'graphite', label: 'Graphite', dark: true },
  { id: 'prune', label: 'Prune', dark: true },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

export const THEME_IDS: readonly ThemeId[] = THEMES.map((theme) => theme.id);

export const DEFAULT_THEME: ThemeId = 'foret';
