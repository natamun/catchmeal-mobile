import { useEffect, type RefObject } from 'react';

/**
 * Android keeps the focus when its back button closes the keyboard: this
 * drops it once the page is back to full height, so a list search that hides
 * the tab bar while typing gives it back.
 */
export function useBlurOnKeyboardClose(
  inputRef: RefObject<HTMLInputElement | null>,
) {
  useEffect(() => {
    let fullHeight = window.innerHeight;
    const handleResize = () => {
      if (window.innerHeight < fullHeight) return;
      fullHeight = window.innerHeight;
      if (document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [inputRef]);
}
