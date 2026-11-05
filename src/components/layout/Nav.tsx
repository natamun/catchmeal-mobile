import { Apple, ChartColumn, House, User, type LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router';

import { PATHS } from '../../routing/paths';
import { Brand } from '../ui/Brand';

type Tab = 'home' | 'food' | 'stats' | 'profile';

interface TabDef {
  id: Tab;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
}

interface NavItemProps {
  tab: TabDef;
  variant: 'top' | 'bottom';
}

const TABS: TabDef[] = [
  { id: 'home', label: 'Accueil', icon: House },
  { id: 'food', label: 'Alimentation', shortLabel: 'Aliments', icon: Apple },
  {
    id: 'stats',
    label: 'Statistiques',
    shortLabel: 'Stats',
    icon: ChartColumn,
  },
  { id: 'profile', label: 'Profil', icon: User },
];

const NAV_ITEM_CLASS = 'cursor-pointer transition-colors';

/** A tab link, in the top bar or in the bottom bar. */
function NavItem({ tab, variant }: NavItemProps) {
  const Icon = tab.icon;

  if (variant === 'top') {
    return (
      <NavLink
        to={PATHS[tab.id]}
        title={tab.label}
        className={({ isActive }) =>
          `${NAV_ITEM_CLASS} flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
            isActive
              ? 'animate-pill-select bg-theme-100 text-theme-800'
              : 'text-theme-700 hover:bg-theme-100'
          }`
        }
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="hidden md:inline">{tab.label}</span>
      </NavLink>
    );
  }

  return (
    <NavLink
      to={PATHS[tab.id]}
      className={({ isActive }) =>
        `${NAV_ITEM_CLASS} block w-full px-1 py-1.5 text-xs font-medium ${
          isActive ? 'text-theme-800' : 'text-theme-600'
        }`
      }
    >
      {({ isActive }) => (
        <span
          className={`flex flex-col items-center gap-1 rounded-xl py-1.5 ${isActive ? 'animate-pill-select bg-theme-100' : ''}`}
        >
          <Icon className="h-5 w-5 shrink-0" />
          {tab.shortLabel ?? tab.label}
        </span>
      )}
    </NavLink>
  );
}

/**
 * Navigation of the app. With a mouse: a top bar, the labels hidden on narrow
 * screens. On touch screens: a bottom tab bar, hidden while searching a list.
 */
export function Nav() {
  return (
    <>
      <header className="sticky top-0 z-10 h-header border-b border-theme-200 bg-surface/75 backdrop-blur-md pointer-coarse:hidden">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
          <div className="flex">
            <Brand />
          </div>
          <nav>
            <ul className="flex items-center gap-1">
              {TABS.map((tab) => (
                <li key={tab.id}>
                  <NavItem tab={tab} variant="top" />
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <footer className="fixed right-0 bottom-0 left-0 z-10 hidden border-t border-theme-200 bg-surface pr-[max(0.5rem,env(safe-area-inset-right))] pb-[env(safe-area-inset-bottom)] pl-[max(0.5rem,env(safe-area-inset-left))] pointer-coarse:block list-search:hidden!">
        <nav>
          <ul className="flex h-bottom-nav">
            {TABS.map((tab) => (
              <li key={tab.id} className="flex-1">
                <NavItem tab={tab} variant="bottom" />
              </li>
            ))}
          </ul>
        </nav>
      </footer>
    </>
  );
}
