const SIZE = {
  sm: { text: 'gap-1 text-xs', dot: 'h-2 w-2' },
  md: { text: 'gap-1.5 text-sm', dot: 'h-2.5 w-2.5' },
} as const;

interface MacroBadgeProps {
  label: string;
  value: number;
  color: string;
  size?: keyof typeof SIZE;
}

/** A colored dot and a number of grams; the full label shows on hover. */
export function MacroBadge({
  label,
  value,
  color,
  size = 'sm',
}: MacroBadgeProps) {
  return (
    <span
      title={`${label} : ${value}g`}
      className={`flex items-center font-semibold text-theme-700 ${SIZE[size].text}`}
    >
      <span className={`rounded-full ${SIZE[size].dot} ${color}`} />
      <span>{value}</span>
    </span>
  );
}
