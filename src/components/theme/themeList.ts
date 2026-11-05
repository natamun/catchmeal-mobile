/**
 * The color themes, each from a known palette; their colors are in index.css
 * ([data-theme='...']). The labels only name them in the code.
 */
export const THEMES = [
  { id: 'graphite', label: 'Graphite', dark: true },
  { id: 'nord', label: 'Nord', dark: true },
  { id: 'dracula', label: 'Dracula', dark: true },
  { id: 'gruvbox', label: 'Gruvbox', dark: true },
  { id: 'catppuccin', label: 'Catppuccin Mocha', dark: true },
  { id: 'rose-pine', label: 'Rosé Pine', dark: true },
  { id: 'solarized', label: 'Solarized', dark: true },
  { id: 'solarized-light', label: 'Solarized clair', dark: false },
  { id: 'marine', label: 'Marine et corail', dark: true },
  { id: 'klein', label: 'Klein et crème', dark: false },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

export const THEME_IDS: readonly ThemeId[] = THEMES.map((theme) => theme.id);

export const DEFAULT_THEME: ThemeId = 'graphite';
