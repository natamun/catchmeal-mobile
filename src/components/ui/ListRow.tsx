import type { ReactNode } from 'react';

/** The column of rows of a library list, ruled between rows. */
export function ListRows({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-theme-200">{children}</ul>;
}

interface ListRowProps {
  title: string;
  /** The second line, in the accent, such as the brand or the last time. */
  subtitle?: ReactNode;
  /** Before the text, such as an unfold arrow. */
  leading?: ReactNode;
  /** At the right end, such as the calories. */
  trailing?: ReactNode;
  /** A tap on the row, such as opening the item or unfolding it. */
  onClick?: () => void;
  /** A control after the row, such as a picker's selection. */
  action?: ReactNode;
  /** Shown under the row, such as its unfolded content. */
  children?: ReactNode;
}

const ROW_CLASS = 'flex min-h-12 items-center gap-3 py-3';

/**
 * One row of a library list (foods, meals, recipes, exercises, favorites):
 * one height, a name truncated on one line, an optional second line, rows
 * striped one in two. With `onClick` alone the whole row is the button; with
 * an `action` too, the button stops before it.
 */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onClick,
  action,
  children,
}: ListRowProps) {
  const content = (
    <>
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-theme-800">
          {title}
        </span>
        {subtitle && (
          <span className="block truncate text-xs text-theme-500">
            {subtitle}
          </span>
        )}
      </span>
      {trailing}
    </>
  );
  const button = (className: string) => (
    <button
      type="button"
      onClick={onClick}
      className={`${ROW_CLASS} cursor-pointer text-left transition-colors hover:bg-theme-100 ${className}`}
    >
      {content}
    </button>
  );

  return (
    <li className="even:bg-theme-50/60">
      {onClick && !action && button('w-full px-5')}
      {onClick && action && (
        <div className="flex items-center gap-3 pr-5">
          {button('min-w-0 flex-1 pl-5')}
          {action}
        </div>
      )}
      {!onClick && (
        <div className={`${ROW_CLASS} px-5`}>
          {content}
          {action}
        </div>
      )}
      {children}
    </li>
  );
}
