import { lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';

import { AppLayout } from './components/layout/AppLayout';
import { ProfileProvider } from './components/profile/ProfileProvider';
import { NotFoundPage } from './pages/NotFoundPage';
import { PATHS } from './routing/paths';
import { ScrollToTop } from './routing/ScrollToTop';

/**
 * The pages live in their own files and are loaded on demand (lazy), so the
 * charts library is only read when the stats page opens.
 */
const HomePage = lazy(() => import('./pages/HomePage'));
const JournalAddPage = lazy(() => import('./pages/JournalAddPage'));
const FoodPage = lazy(() => import('./pages/FoodPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

/** All the routes of the app. The app opens on the journal. */
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={PATHS.home} replace />} />
      <Route element={<AppLayout />}>
        <Route path={PATHS.home} element={<HomePage />} />
        <Route path={PATHS.journalAdd} element={<JournalAddPage />} />
        <Route path={PATHS.food} element={<FoodPage />} />
        <Route path={PATHS.stats} element={<StatsPage />} />
        <Route path={PATHS.profile} element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

/** Root component: the router, the scroll handling and the profile. */
export function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ProfileProvider>
        <AppRoutes />
      </ProfileProvider>
    </BrowserRouter>
  );
}
