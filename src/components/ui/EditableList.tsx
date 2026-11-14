import { useState, type ReactNode } from 'react';

import { INSET_ROW_CLASS, TAP_ROW_CLASS } from './buttonStyle';
import { ItemSheet } from './ItemSheet';
import { SortableList } from './SortableList';

/** An item of a list being edited, such as a food of a meal or an exercise. */
export interface EditableRow {
  id: string;
  name: string;
  /** The quantity, on the row: "150g", "2 portions", "3 × 60 kg". */
  value: string;
  /** A dimmer figure after it, such as "165 kcal". */
  meta?: string;
  /** What it brings, live, at the top of its sheet: calories and macros. */
  detail?: ReactNode;
  /** A small control at the right of the detail, such as the unit toggle. */
  aside?: ReactNode;
  /** The controls that change it: a quantity stepper, sets. */
  editor?: ReactNode;
  /**
   * Drawn in place of the tappable line, with no sheet: a row that is not an
   * item, such as a section title being typed.
   */
  custom?: ReactNode;
  onRemove: () => void;
}

interface Props {
  rows: EditableRow[];
  /** Given, each row gets a handle that drags it to another place. */
  onMove?: (from: number, to: number) => void;
  className?: string;
}

/**
 * The items of a list being edited, one line each with its quantity and its
 * calories. A tap opens its sheet: its full name with a trash that asks
 * twice, what it brings, and its controls. The list itself never moves,
 * unless `onMove` lets each row be dragged by its handle.
 */
export function EditableList({ rows, onMove, className = '' }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  // Kept once the sheet closes, so it still shows the item while sliding away.
  const [shownId, setShownId] = useState<string | null>(null);
  const row = rows.find((item) => item.id === shownId);

  const rowButton = (item: EditableRow, rowClass: string) => (
    <button
      type="button"
      onClick={() => {
        setShownId(item.id);
        setIsOpen(true);
      }}
      className={`h-12 items-center gap-3 ${rowClass}`}
    >
      <span className="min-w-0 flex-1 truncate text-base font-medium text-theme-800">
        {item.name}
      </span>
      {item.value && (
        <span className="max-w-28 shrink-0 truncate font-semibold text-theme-500 tabular-nums">
          {item.value}
        </span>
      )}
      {item.meta && (
        <span className="w-18 shrink-0 text-right text-sm text-theme-600 tabular-nums">
          {item.meta}
        </span>
      )}
    </button>
  );

  return (
    <>
      {onMove ? (
        <SortableList
          items={rows}
          onMove={onMove}
          labelOf={(item) => item.name}
          className={`flex flex-col divide-y divide-theme-100 ${className}`}
          itemClassName="flex animate-fade-in-up items-center"
          renderItem={(item, _, handle) => (
            <>
              <span className="-ml-3 flex">{handle}</span>
              {item.custom ??
                rowButton(
                  item,
                  `${TAP_ROW_CLASS} -mr-2 min-w-0 flex-1 pr-2 pl-1`,
                )}
            </>
          )}
        />
      ) : (
        <ul className={`flex flex-col divide-y divide-theme-100 ${className}`}>
          {rows.map((item) => (
            <li key={item.id} className="flex animate-fade-in-up flex-col">
              {item.custom ?? rowButton(item, INSET_ROW_CLASS)}
            </li>
          ))}
        </ul>
      )}
      <ItemSheet
        open={isOpen && row !== undefined}
        onClose={() => setIsOpen(false)}
        title={row?.name ?? ''}
        onRemove={() => {
          setIsOpen(false);
          row?.onRemove();
        }}
        detail={row?.detail}
        aside={row?.aside}
      >
        {row?.editor}
      </ItemSheet>
    </>
  );
}
