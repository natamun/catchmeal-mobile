import type { ReactNode } from 'react';

interface Props {
  label: string;
  children: ReactNode;
}

/**
 * Small tile with a label and a value. It renders <dt> and <dd>, so it goes
 * inside a <dl>.
 */
export function StatTile({ label, children }: Props) {
  return (
    <div className="rounded-xl bg-theme-50 px-3 py-1.5">
      <dt className="text-xs text-theme-600">{label}</dt>
      <dd className="font-semibold text-theme-800">{children}</dd>
    </div>
  );
}
