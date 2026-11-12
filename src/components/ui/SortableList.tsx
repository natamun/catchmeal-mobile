import type { ReactNode } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface ItemProps {
  id: string;
  label: string;
  className: string;
  children: (handle: ReactNode) => ReactNode;
}

function SortableItem({ id, label, className, children }: ItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Déplacer ${label}`}
      // touch-none: on the handle, a finger drags the row instead of
      // scrolling the page; everywhere else the page scrolls as usual.
      className="flex h-12 w-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl text-theme-400 transition-colors hover:bg-theme-100 hover:text-theme-600 active:cursor-grabbing"
    >
      <GripVertical className="h-5 w-5" />
    </button>
  );

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`${className} ${
        isDragging ? 'relative z-10 rounded-xl bg-surface shadow-lg' : ''
      }`}
    >
      {children(handle)}
    </li>
  );
}

interface Props<T extends { id: string }> {
  items: T[];
  /** Moves the item at `from` to `to`, the others shifting around it. */
  onMove: (from: number, to: number) => void;
  /** The name of an item, read out by the handle: "Déplacer Poulet". */
  labelOf: (item: T, index: number) => string;
  /** Draws an item, with the handle that drags it put where it belongs. */
  renderItem: (item: T, index: number, handle: ReactNode) => ReactNode;
  ordered?: boolean;
  className?: string;
  itemClassName?: string;
}

/**
 * A list reordered by dragging each item's handle (⋮⋮), up and down only,
 * the other items making room as it passes. Elsewhere on a row a finger
 * scrolls the page and taps as usual.
 */
export function SortableList<T extends { id: string }>({
  items,
  onMove,
  labelOf,
  renderItem,
  ordered = false,
  className = '',
  itemClassName = '',
}: Props<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const end = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex(({ id }) => id === active.id);
    const to = items.findIndex(({ id }) => id === over.id);
    if (from !== -1 && to !== -1) onMove(from, to);
  };

  const List = ordered ? 'ol' : 'ul';
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={end}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <List className={className}>
          {items.map((item, index) => (
            <SortableItem
              key={item.id}
              id={item.id}
              label={labelOf(item, index)}
              className={itemClassName}
            >
              {(handle) => renderItem(item, index, handle)}
            </SortableItem>
          ))}
        </List>
      </SortableContext>
    </DndContext>
  );
}
