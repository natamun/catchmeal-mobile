import { EditableList } from '../ui/EditableList';
import type { MealItemDraft } from './draft';
import { draftRow } from './draftRow';

interface DraftItemListProps {
  items: MealItemDraft[];
  /** Gives back an item with its quantity or its unit changed. */
  onChange: (item: MealItemDraft) => void;
  onRemove: (id: string) => void;
  /** Given, each item is dragged by a handle to another place. */
  onMove?: (from: number, to: number) => void;
  /** Shows each item's calories; the shopping list leaves them out. */
  showKcal?: boolean;
  className?: string;
}

/**
 * Items of a meal being edited: a food with its quantity buttons, counted in
 * portions when it has some, a recipe counted in servings, or a quick add with
 * its calories. Each one shows its calories and can be removed.
 */
export function DraftItemList({
  items,
  onChange,
  onRemove,
  onMove,
  showKcal = true,
  className = '',
}: DraftItemListProps) {
  return (
    <EditableList
      rows={items.map((item) => draftRow(item, onChange, onRemove, showKcal))}
      onMove={onMove}
      className={className}
    />
  );
}
