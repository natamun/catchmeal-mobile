import { Plus, X } from 'lucide-react';

import { Input } from '../ui/Input';
import { CardioFields } from './CardioFields';
import type { ItemDraft, SetDraft } from './workoutDraft';

const REMOVE_BUTTON =
  'tap-area relative shrink-0 cursor-pointer text-theme-400 transition-colors hover:text-red-500';

interface Props {
  item: ItemDraft;
  onChange: (item: ItemDraft) => void;
  onRemove: () => void;
}

/**
 * An exercise of the day's session: its sets for strength, its duration for
 * cardio, with the speed and slope on a treadmill.
 */
export function ItemEditor({ item, onChange, onRemove }: Props) {
  const setSet = (index: number, set: SetDraft) =>
    onChange({
      ...item,
      sets: item.sets.map((current, i) => (i === index ? set : current)),
    });

  return (
    <li className="flex animate-fade-in-up flex-col gap-2.5 rounded-xl border border-theme-200 px-3 py-2.5">
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1 truncate text-base font-medium text-theme-800">
          {item.name}
        </span>
        <button type="button" onClick={onRemove} className={REMOVE_BUTTON}>
          <X className="h-5 w-5" />
        </button>
      </div>

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
              <span className="text-sm text-theme-500">kg</span>
              {item.sets.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...item,
                      sets: item.sets.filter((_, i) => i !== index),
                    })
                  }
                  className={`${REMOVE_BUTTON} ml-auto`}
                >
                  <X className="h-4 w-4" />
                </button>
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
            className="flex cursor-pointer items-center gap-1.5 self-start rounded-lg py-1 text-sm font-medium text-theme-600 transition-colors hover:text-theme-800"
          >
            <Plus className="h-4 w-4" />
            Ajouter une série
          </button>
        </>
      ) : (
        <CardioFields
          kind={item.kind}
          values={item}
          onChange={(values) => onChange({ ...item, ...values })}
        />
      )}
    </li>
  );
}
