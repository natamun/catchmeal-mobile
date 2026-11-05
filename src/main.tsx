import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource-variable/inter';
import './index.css';

import { App } from './App';
import { applySavedTheme } from './components/theme/themes';
import { getDatabase } from './db/appDatabase';
import { handleAndroidBackButton } from './native/androidBackButton';

applySavedTheme();
handleAndroidBackButton();

// Opens and updates the database right away, so the first screen does not
// wait for it.
getDatabase().catch((error: unknown) => {
  console.error('Database unavailable', error);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
