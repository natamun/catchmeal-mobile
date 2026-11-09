import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, type LucideIcon } from 'lucide-react';

import { Toast } from './Toast';
import { ToastContext, type ShowToast } from './toastContext';

const TOAST_DURATION_MS = 3000;

/**
 * Displays one toast at a time for the logged-in part of the app; a new message
 * replaces the current one, with its own 3 seconds. It vanishes after them, or
 * at once when swiped away.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{
    message: string | null;
    icon: LucideIcon;
    /** Counts the toasts shown, so each one starts its own timer. */
    count: number;
  }>({ message: null, icon: CheckCircle2, count: 0 });

  // Only the message is cleared: the icon must stay during the fade-out
  // animation.
  const hide = useCallback(
    () => setToast((current) => ({ ...current, message: null })),
    [],
  );

  useEffect(() => {
    if (!toast.message) return;
    const timer = setTimeout(hide, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast.count, toast.message, hide]);

  const showToast = useCallback<ShowToast>(
    (message, icon = CheckCircle2) =>
      setToast((current) => ({ message, icon, count: current.count + 1 })),
    [],
  );

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <Toast message={toast.message} icon={toast.icon} onDismiss={hide} />
    </ToastContext.Provider>
  );
}
