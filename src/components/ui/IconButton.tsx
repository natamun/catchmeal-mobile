import type { ComponentProps } from 'react';

const TONE = {
  /** A secondary control: closing, the "⋯" menu, the filters. */
  muted: 'text-theme-400 hover:text-theme-600',
  /** A way to move: back, previous and next, clearing a search. */
  strong: 'text-theme-600',
} as const;

interface IconButtonProps extends Omit<
  ComponentProps<'button'>,
  'aria-label' | 'type'
> {
  /** What the button does, read out since it shows only an icon. */
  label: string;
  tone?: keyof typeof TONE;
}

/**
 * The round 44 px icon button of headers, sheets, fields and calendars, with
 * the app's pressed state. No focus ring: a dialog focuses its first button
 * as it opens, and a ring there looked like a selected button.
 */
export function IconButton({
  label,
  tone = 'muted',
  className = '',
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      {...props}
      className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors outline-none hover:bg-theme-100 disabled:pointer-events-none disabled:opacity-30 ${TONE[tone]} ${className}`}
    >
      {children}
    </button>
  );
}
