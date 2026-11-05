import { Link } from 'react-router';

import { Brand } from '../components/ui/Brand';
import { PATHS } from '../routing/paths';

/** Page shown for any unknown URL. */
export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-theme-50 px-6 text-center">
      <Brand size="lg" />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-theme-800">Page introuvable</h1>
        <p className="text-sm text-theme-600">
          Cette page n'existe pas ou a été déplacée.
        </p>
      </div>
      <Link
        to={PATHS.home}
        className="rounded-xl bg-theme-500 px-6 py-3 font-semibold text-on-accent transition-colors hover:bg-theme-600"
      >
        Retour à l'accueil
      </Link>
    </main>
  );
}
