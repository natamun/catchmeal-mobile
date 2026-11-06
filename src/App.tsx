import { lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';

import { AppLayout } from './components/layout/AppLayout';
import { ProfileProvider } from './components/profile/ProfileProvider';
import { NotFoundPage } from './pages/NotFoundPage';
import { PATHS } from './routing/paths';

const JournalAddPage = lazy(() => import('./pages/JournalAddPage'));

/**
 * All the routes of the app. The app opens on the journal. The four tabs are
 * drawn by AppLayout, which keeps them mounted: their routes only exist so the
 * URL is known.
 */
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={PATHS.home} replace />} />
      <Route element={<AppLayout />}>
        <Route path={PATHS.home} element={null} />
        <Route path={PATHS.food} element={null} />
        <Route path={PATHS.stats} element={null} />
        <Route path={PATHS.profile} element={null} />
        <Route path={PATHS.journalAdd} element={<JournalAddPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

/** Root component: the router and the profile. */
export function App() {
  return (
    <BrowserRouter>
      <ProfileProvider>
        <AppRoutes />
      </ProfileProvider>
    </BrowserRouter>
  );
}
