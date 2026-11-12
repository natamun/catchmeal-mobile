import type { ReactNode } from 'react';

const TITLE_CLASS = 'text-xs font-semibold text-theme-500';

/** The column of a sheet's sections, with one gap between them everywhere. */
export const SHEET_BODY_CLASS = 'flex flex-col gap-4';

interface Props {
  title: string;
  /** Given, the title labels this field, which a tap on it focuses. */
  htmlFor?: string;
  /** Right after the title, such as an InfoBubble that explains it. */
  info?: ReactNode;
  children: ReactNode;
}

/**
 * One part of a sheet or a dialog: a small accent title, then its content,
 * with the same spacing everywhere. The title row keeps one height, with or
 * without an info bubble, so every section starts alike.
 */
export function SheetSection({ title, htmlFor, info, children }: Props) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex h-6 items-center gap-1">
        {htmlFor ? (
          <label htmlFor={htmlFor} className={TITLE_CLASS}>
            {title}
          </label>
        ) : (
          <h4 className={TITLE_CLASS}>{title}</h4>
        )}
        {info}
      </div>
      {children}
    </section>
  );
}
