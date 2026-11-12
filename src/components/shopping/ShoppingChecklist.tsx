import { RemoveIconButton } from '../ui/RemoveIconButton';
import { SelectToggle } from '../ui/SelectToggle';
import type { ShoppingLine } from './lines';

interface ShoppingChecklistProps {
  lines: ShoppingLine[];
  onToggle: (line: ShoppingLine) => void;
  onRemove: (line: ShoppingLine) => void;
}

/**
 * The list to tick off, in the order it was written: each line with its box,
 * its name, how much to buy and a cross to remove it. A line in the basket
 * stays in its place, crossed out.
 */
export function ShoppingChecklist({
  lines,
  onToggle,
  onRemove,
}: ShoppingChecklistProps) {
  return (
    <ul className="divide-y divide-theme-100">
      {lines.map((line) => (
        <li key={line.id} className="flex items-center gap-3 px-5 py-3">
          <SelectToggle
            selected={line.checked}
            onToggle={() => onToggle(line)}
          />
          <button
            type="button"
            onClick={() => onToggle(line)}
            className={`min-w-0 flex-1 cursor-pointer truncate text-left text-sm font-semibold ${line.checked ? 'text-theme-400 line-through' : 'text-theme-800'}`}
          >
            {line.name}
          </button>
          {line.amount && (
            <span
              className={`shrink-0 text-sm tabular-nums ${line.checked ? 'text-theme-400 line-through' : 'text-theme-700'}`}
            >
              {line.amount}
            </span>
          )}
          <RemoveIconButton
            label={`Retirer ${line.name}`}
            onClick={() => onRemove(line)}
          />
        </li>
      ))}
    </ul>
  );
}
