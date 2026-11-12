import { Plus } from 'lucide-react';

import { Input } from '../ui/Input';
import { RemoveIconButton } from '../ui/RemoveIconButton';
import { ADD_SET_CLASS, CardioSetsEditor } from './CardioSetsEditor';
import type { ItemDraft, SetDraft } from './workoutDraft';

interface Props {
  item: ItemDraft;
  onChange: (item: ItemDraft) => void;
}

/**
 * The sets of an exercise of the day's session: repetitions at a load for
 * strength, minutes for cardio, with the speed and slope on a treadmill.
 */
export function ItemSets({ item, onChange }: Props) {
  const setSet = (index: number, set: SetDraft) =>
    onChange({
      ...item,
      sets: item.sets.map((current, i) => (i === index ? set : current)),
    });

  return (
    <div className="flex flex-col gap-2.5">
      {item.kind === 'STRENGTH' ? (
        <>
          {item.sets.map((set, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-center text-sm font-semibold text-theme-400 tabular-nums">
                {index + 1}
              </span>
              <div className="w-18 shrink-0">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="reps"
                  className="px-2 text-center"
                  value={set.reps}
                  onChange={(e) =>
                    setSet(index, { ...set, reps: e.target.value })
                  }
                />
              </div>
              <span className="text-theme-400">×</span>
              <div className="w-20 shrink-0">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  className="px-2 text-center"
                  value={set.weight}
                  onChange={(e) =>
                    setSet(index, { ...set, weight: e.target.value })
                  }
                />
              </div>
              <span className="text-sm text-theme-600">kg</span>
              {item.sets.length > 1 && (
                <RemoveIconButton
                  label={`Retirer la série ${index + 1}`}
                  onClick={() =>
                    onChange({
                      ...item,
                      sets: item.sets.filter((_, i) => i !== index),
                    })
                  }
                  className="ml-auto"
                />
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({
                ...item,
                sets: [
                  ...item.sets,
                  item.sets.at(-1) ?? { reps: '', weight: '' },
                ],
              })
            }
            className={ADD_SET_CLASS}
          >
            <Plus className="h-4 w-4" />
            Ajouter une série
          </button>
        </>
      ) : (
        <CardioSetsEditor
          kind={item.kind}
          sets={item.cardioSets}
          onChange={(cardioSets) => onChange({ ...item, cardioSets })}
        />
      )}
    </div>
  );
}
