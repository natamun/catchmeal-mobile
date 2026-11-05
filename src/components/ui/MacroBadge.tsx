interface MacroBadgeProps {
  label: string;
  value: number;
  color: string;
}

/** A colored dot and a number of grams; the full label shows on hover. */
export function MacroBadge({ label, value, color }: MacroBadgeProps) {
  return (
    <span
      title={`${label} : ${value}g`}
      className="flex items-center gap-1 text-xs font-semibold text-theme-700"
    >
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span>{value}</span>
    </span>
  );
}
