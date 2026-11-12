import { useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

import { BottomSheet } from './BottomSheet';

interface Option {
  value: string;
  label: string;
}

const SIZE = {
  md: {
    trigger: 'rounded-xl px-4 py-2.75 text-base',
    width: 'w-full',
    icon: 'h-4 w-4',
  },
  sm: {
    trigger: 'tap-area relative gap-1 rounded-lg px-3 py-1.5 text-sm',
    width: 'w-28',
    icon: 'h-3.5 w-3.5',
  },
} as const;

interface SelectDropdownProps {
  id?: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  /** Title of the sheet; the field's label when left out. */
  title?: string;
  placeholder?: string;
  size?: keyof typeof SIZE;
  className?: string;
}

/**
 * A select in the app's style: a button that opens the options in a sheet from
 * the bottom, one large row each, the current one checked. A click on the
 * field's label opens it like the button does.
 */
export function SelectDropdown({
  id,
  value,
  options,
  onChange,
  title,
  placeholder = '—',
  size = 'md',
  className = SIZE[size].width,
}: SelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((o) => o.value === value);
  const [sheetTitle, setSheetTitle] = useState('');

  return (
    <>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        onClick={(event) => {
          setSheetTitle(
            title ?? event.currentTarget.labels?.[0]?.textContent ?? 'Choisir',
          );
          setOpen(true);
        }}
        data-state={open ? 'open' : 'closed'}
        className={`flex cursor-pointer items-center justify-between gap-2 border border-theme-200 bg-surface text-left text-theme-800 transition-colors outline-none hover:bg-theme-100 focus:border-theme-400 data-[state=open]:bg-theme-100 ${SIZE[size].trigger} ${className}`}
      >
        <span
          className={`min-w-0 truncate ${selected ? '' : 'text-theme-800/50'}`}
        >
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={`shrink-0 text-theme-400 ${SIZE[size].icon}`} />
      </button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={sheetTitle}
      >
        <div className="flex flex-col">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 border-t border-theme-100 px-1 text-left text-base transition-colors first:border-t-0 hover:bg-theme-100 ${
                o.value === value
                  ? 'font-semibold text-theme-800'
                  : 'text-theme-700'
              }`}
            >
              {o.label}
              {o.value === value && (
                <Check className="h-5 w-5 shrink-0 text-theme-500" />
              )}
            </button>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
