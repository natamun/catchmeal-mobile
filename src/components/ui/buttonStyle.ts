/** The main button of a form or dialog: filled, the whole width. */
export const PRIMARY_BUTTON_CLASS =
  'w-full cursor-pointer rounded-xl bg-theme-500 px-6 py-3 font-semibold text-on-accent transition-colors hover:bg-theme-600 disabled:cursor-not-allowed disabled:opacity-60';

const OUTLINED =
  'flex flex-1 cursor-pointer items-center justify-center rounded-xl border py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60';
const NEUTRAL = 'border-theme-200 text-theme-700 hover:bg-theme-100';
const RED = 'border-red-500/40 text-red-500 hover:bg-red-500/10';
const ROOMY = 'gap-2 px-4';
const COMPACT = 'min-w-0 gap-1.5 px-2 whitespace-nowrap';

/** A secondary button: outlined, sharing a row with others. */
export const SECONDARY_BUTTON_CLASS = `${OUTLINED} ${ROOMY} ${NEUTRAL}`;

/** A destructive secondary button: outlined in red, whatever the theme. */
export const DANGER_BUTTON_CLASS = `${OUTLINED} ${ROOMY} ${RED}`;

/** A secondary button among three or more short ones on a single line. */
export const COMPACT_BUTTON_CLASS = `${OUTLINED} ${COMPACT} ${NEUTRAL}`;

/** The same, destructive. */
export const COMPACT_DANGER_BUTTON_CLASS = `${OUTLINED} ${COMPACT} ${RED}`;

/** A step button beside a value, such as "+10" or a minus: filled, compact. */
export const STEP_BUTTON_CLASS =
  'tap-area relative flex h-10 w-12 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-theme-100 text-sm font-bold text-theme-600 transition-colors hover:bg-theme-200 disabled:cursor-not-allowed disabled:opacity-40';

/** A row that answers a tap, with the app's pressed background. */
export const TAP_ROW_CLASS =
  'flex cursor-pointer rounded-xl text-left transition-colors hover:bg-theme-100';

/**
 * A tappable row inside a padded card or sheet: it reaches 8 px past the
 * content on each side, so its pressed background frames the text.
 */
export const INSET_ROW_CLASS = `${TAP_ROW_CLASS} -mx-2 w-[calc(100%+1rem)] px-2`;
