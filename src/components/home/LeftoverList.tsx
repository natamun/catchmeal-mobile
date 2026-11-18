import { useState } from 'react';

import { formatSince } from '../../utils/format';
import { discardLeftover } from '../recipe/api';
import { perServing, servingsLabel } from '../recipe/servings';
import type { Batch } from '../recipe/types';
import { Card, CardEmpty, CardLoading } from '../ui/Card';
import { ItemSheet } from '../ui/ItemSheet';
import { ListRow, ListRows } from '../ui/ListRow';
import { MacroSummary } from '../ui/MacroSummary';
import { MacroTrail } from '../ui/MacroTrail';
import { SelectToggle } from '../ui/SelectToggle';
import { useToast } from '../ui/toastContext';

/** "Hier", "Il y a 3 jours"... from the day it was cooked. */
const cookedSince = (batch: Batch) => formatSince(`${batch.cookedOn}T12:00:00`);

interface Props {
  leftovers: Batch[];
  isLoading: boolean;
  isSelected: (batch: Batch) => boolean;
  onToggle: (batch: Batch) => void;
}

/**
 * The leftovers of the recipes cooked, a tab of the journal picker: each one
 * picked like a food, or opened to be removed once it will not be eaten.
 */
export function LeftoverList({
  leftovers,
  isLoading,
  isSelected,
  onToggle,
}: Props) {
  const showToast = useToast();
  const [sheet, setSheet] = useState<{
    batch: Batch | null;
    isOpen: boolean;
  }>({ batch: null, isOpen: false });

  const discard = async (batch: Batch) => {
    setSheet((current) => ({ ...current, isOpen: false }));
    try {
      await discardLeftover(batch.id);
      showToast('Portions retirées');
    } catch {
      showToast('Suppression impossible, réessayez.');
    }
  };

  const { batch } = sheet;

  return (
    <Card flush className="@container">
      {isLoading && <CardLoading />}
      {!isLoading && leftovers.length === 0 && (
        <CardEmpty>Rien de préparé.</CardEmpty>
      )}
      <ListRows>
        {leftovers.map((leftover) => (
          <ListRow
            key={leftover.id}
            title={leftover.name}
            subtitle={[
              servingsLabel(leftover.remaining),
              cookedSince(leftover),
              ...(leftover.adapted ? ['adaptée'] : []),
            ].join(' · ')}
            trailing={<MacroTrail values={perServing(leftover)} />}
            onClick={() => setSheet({ batch: leftover, isOpen: true })}
            action={
              <SelectToggle
                selected={isSelected(leftover)}
                onToggle={() => onToggle(leftover)}
              />
            }
          />
        ))}
      </ListRows>

      <ItemSheet
        open={sheet.isOpen && batch !== null}
        onClose={() => setSheet((current) => ({ ...current, isOpen: false }))}
        title={batch?.name ?? ''}
        onRemove={() => batch && void discard(batch)}
        detail={batch && <MacroSummary totals={perServing(batch)} />}
      >
        {batch && (
          <p className="text-sm text-theme-600">
            {[
              `Il reste ${servingsLabel(batch.remaining)} sur ${batch.servings}`,
              cookedSince(batch),
              ...(batch.adapted ? ['adaptée'] : []),
            ].join(' · ')}
          </p>
        )}
      </ItemSheet>
    </Card>
  );
}
