import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';

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

export const DEFAULT_THEME: ThemeId = 'foret';

/**
 * A copy of the choice kept by the WebView, read before the first screen so
 * the app never flashes the default theme while the profile loads.
 */
const STORAGE_KEY = 'theme';

const themeOf = (id: string | null) =>
  THEMES.find((theme) => theme.id === id) ??
  THEMES.find((theme) => theme.id === DEFAULT_THEME)!;

/**
 * Shows the app in a theme: the colors (data-theme on <html>) and the status
 * bar icons, light on a dark theme and dark on a light one.
 */
export function applyTheme(id: string | null) {
  const theme = themeOf(id);
  const root = document.documentElement;
  if (theme.id === DEFAULT_THEME) {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = theme.id;
  }

  try {
    localStorage.setItem(STORAGE_KEY, theme.id);
  } catch {
    // Without storage the profile still applies the theme once loaded.
  }

  if (Capacitor.isNativePlatform()) {
    void SystemBars.setStyle({
      style: theme.dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
    });
  }
}

/** Applies the theme chosen last time, before the profile is read. */
export function applySavedTheme() {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    saved = null;
  }
  applyTheme(saved);
}
