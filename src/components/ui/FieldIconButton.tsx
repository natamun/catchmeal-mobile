import type { ComponentProps } from 'react';

interface FieldIconButtonProps extends Omit<
  ComponentProps<'button'>,
  'aria-label'
> {
  /** What the button does, read out since it shows only an icon. */
  label: string;
}

/**
 * The square outlined icon button beside a field, as tall as an `Input`
 * (48 px): scanning or looking up a barcode, adding a shopping line. Dimmed
 * while it waits for the field to be filled.
 */
export function FieldIconButton({
  label,
  type = 'button',
  className = '',
  children,
  ...props
}: FieldIconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      {...props}
      className={`flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-theme-200 text-theme-600 transition-colors hover:bg-theme-100 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}
