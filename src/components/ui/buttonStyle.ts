/** The main button of a form or dialog: filled, the whole width. */
export const PRIMARY_BUTTON_CLASS =
  'w-full cursor-pointer rounded-xl bg-theme-500 px-6 py-3 font-semibold text-on-accent transition-colors hover:bg-theme-600 disabled:cursor-not-allowed disabled:opacity-60';

/** A secondary button: outlined, sharing a row with others. */
export const SECONDARY_BUTTON_CLASS =
  'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-theme-200 px-4 py-2.5 text-sm font-medium text-theme-700 transition-colors hover:bg-theme-100 disabled:cursor-not-allowed disabled:opacity-60';

/** A destructive secondary button: outlined in red, whatever the theme. */
export const DANGER_BUTTON_CLASS =
  'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-500/40 px-4 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60';

/** A row that answers a tap, with the app's pressed background. */
export const TAP_ROW_CLASS =
  'flex cursor-pointer rounded-xl text-left transition-colors hover:bg-theme-100';

/**
 * A tappable row inside a padded card or sheet: it reaches 8 px past the
 * content on each side, so its pressed background frames the text.
 */
export const INSET_ROW_CLASS = `${TAP_ROW_CLASS} -mx-2 w-[calc(100%+1rem)] px-2`;
