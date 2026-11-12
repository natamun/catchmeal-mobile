const TILE = 'rounded-xl px-3 py-1.5 text-left';

/**
 * One value of a sheet's grid: a small label, the value, and a note under it
 * such as the day it was reached. With `onSelect` it is a button that can be
 * the selected one.
 */
export function StatTile({
  label,
  value,
  note,
  isSelected,
  onSelect,
}: {
  label: string;
  value: string;
  note?: string;
  isSelected?: boolean;
  onSelect?: () => void;
}) {
  const content = (
    <>
      <span className="block text-xs text-theme-600">{label}</span>
      <span className="block font-semibold text-theme-800">{value}</span>
      {note && <span className="block text-xs text-theme-600">{note}</span>}
    </>
  );
  if (!onSelect) return <div className={`${TILE} bg-theme-50`}>{content}</div>;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`${TILE} cursor-pointer transition-colors ${
        isSelected
          ? 'bg-theme-100 ring-2 ring-theme-400'
          : 'bg-theme-50 hover:bg-theme-100'
      }`}
    >
      {content}
    </button>
  );
}
