import { useLocation, useNavigate } from 'react-router';

/**
 * Goes back to the previous page, or to `fallback` when the page was opened
 * directly and there is no previous page in the app.
 */
export function useGoBack(fallback: string) {
  const navigate = useNavigate();
  const location = useLocation();

  return () =>
    void (location.key === 'default'
      ? navigate(fallback, { replace: true })
      : navigate(-1));
}
