import { useRef, useState } from 'react';

import { formatKg, formatSince } from '../../utils/format';
import { AddCircleButton } from '../ui/AddCircleButton';
import { ChevronRow } from '../ui/ChevronRow';
import { LoadError } from '../ui/LoadError';
import { Skeleton } from '../ui/Skeleton';
import { SummaryCard } from '../ui/SummaryCard';
import type { Profile, WeightEntry } from './api';
import { getAge } from './bmr';
import { COMPOSITION, formatMeasure } from './measures';
import { PersonDialog } from './PersonDialog';
import { GENDER_OPTIONS } from './profileOptions';
import type { WeighIns } from './useWeighIns';

interface Props {
  weighIns: WeighIns;
  profile: Profile;
  onUpdate: (partial: Partial<Profile>) => void;
}

/** Gender, age and height on one line, or null when none is filled in. */
function describe(profile: Profile) {
  const parts = [
    GENDER_OPTIONS.find((o) => o.value === profile.gender)?.label,
    profile.birthDate ? `${getAge(profile.birthDate)} ans` : undefined,
    profile.height === null ? undefined : formatMeasure(profile.height, 'cm'),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** The latest weigh-in that tells this value. */
const latestWith = (
  history: WeightEntry[],
  key: (typeof COMPOSITION)[number]['key'],
) => history.find((entry) => entry[key] !== null);

/**
 * Body card: the latest weigh-in with its composition, a row to every
 * weigh-in, and a row to the person's profile (gender, age, height,
 * activity), which the expenditure estimate needs.
 */
export function WeightCard({ weighIns, profile, onUpdate }: Props) {
  const { history } = weighIns;
  const latest = history?.[0];
  const personRef = useRef<HTMLDialogElement>(null);
  const [personOpenCount, setPersonOpenCount] = useState(0);

  const openPerson = () => {
    setPersonOpenCount((count) => count + 1);
    personRef.current?.showModal();
  };

  return (
    <>
      <SummaryCard
        title="Composition corporelle"
        aside={<AddCircleButton onClick={() => weighIns.openDialog(null)} />}
      >
        <div className="-mb-3 flex flex-col gap-4">
          {weighIns.isLoading && (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
          )}
          {weighIns.hasError && (
            <LoadError
              message="Impossible de charger les pesées."
              onRetry={weighIns.retry}
            />
          )}
          {history && !latest && (
            <p className="text-sm text-theme-600">
              Aucune pesée enregistrée. Le + ajoute la première.
            </p>
          )}
          {history && latest && (
            <>
              <div className="flex flex-col">
                <p className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-theme-800 tabular-nums">
                    {formatKg(latest.weight)}
                  </span>
                  <span className="text-theme-600">kg</span>
                </p>
                <span className="text-xs text-theme-600">
                  Pesée : {formatSince(latest.loggedAt).toLowerCase()}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                {COMPOSITION.map(({ key, label, unit }) => (
                  <div key={key} className="flex flex-col gap-0.5">
                    <dt className="text-xs font-medium text-theme-500">
                      {label}
                    </dt>
                    <dd className="text-base font-semibold text-theme-800 tabular-nums">
                      {formatMeasure(
                        latestWith(history, key)?.[key] ?? null,
                        unit,
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )}
          <div className="flex flex-col border-t border-theme-100 pt-1">
            {history && history.length > 0 && (
              <ChevronRow
                label="Historique des pesées"
                value={String(history.length)}
                onClick={weighIns.openHistory}
              />
            )}
            <ChevronRow
              label="Mon profil"
              value={describe(profile) ?? 'À compléter'}
              onClick={openPerson}
            />
          </div>
        </div>
      </SummaryCard>

      <PersonDialog
        dialogRef={personRef}
        openCount={personOpenCount}
        profile={profile}
        onUpdate={onUpdate}
      />
    </>
  );
}
