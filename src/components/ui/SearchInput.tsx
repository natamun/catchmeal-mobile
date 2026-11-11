import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { Search, X } from 'lucide-react';

import { Input } from './Input';

interface SearchInputProps extends Omit<
  ComponentProps<'input'>,
  'value' | 'onChange' | 'type'
> {
  value: string;
  onValueChange: (value: string) => void;
  /** A control at the right end of the field, such as a filter button. */
  trailing?: ReactNode;
  wrapperClassName?: string;
}

/**
 * Search field: a magnifier on the left and, once it holds text, a button that
 * clears it and keeps the focus in the field. The buttons at its right end are
 * 44 px squares side by side, so their touch areas never overlap. The ref is
 * the input.
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onValueChange,
      trailing,
      wrapperClassName = '',
      className = '',
      placeholder = 'Rechercher...',
      ...props
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current!, []);
    const hasText = value !== '';

    return (
      <div className={`relative flex-1 ${wrapperClassName}`}>
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-theme-400" />
        <Input
          ref={inputRef}
          type="text"
          autoComplete="off"
          placeholder={placeholder}
          {...props}
          className={`pl-9 ${trailing ? 'pr-22' : 'pr-11'} ${className}`}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
        />
        {hasText && (
          <button
            type="button"
            aria-label="Effacer la recherche"
            // Keeps the focus in the field, so a list opened by it stays open.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onValueChange('');
              inputRef.current?.focus();
            }}
            className={`absolute top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-theme-600 transition-colors hover:bg-theme-100 ${trailing ? 'right-11' : 'right-0'}`}
          >
            <X className="h-5 w-5" />
          </button>
        )}
        {trailing && (
          <div className="absolute top-1/2 right-0 flex -translate-y-1/2">
            {trailing}
          </div>
        )}
      </div>
    );
  },
);
SearchInput.displayName = 'SearchInput';
