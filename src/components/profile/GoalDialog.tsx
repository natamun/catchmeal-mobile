import { useState, type RefObject } from 'react';

import { useFormValidation } from '../../hooks/useFormValidation';
import {
  hasTooManyDecimals,
  parseDecimal,
  TOO_MANY_DECIMALS,
  WHOLE_NUMBER_ONLY,
} from '../../utils/decimals';
import { failureMessage } from '../../utils/failureMessage';
import { BaseDialog } from '../ui/BaseDialog';
import { PRIMARY_BUTTON_CLASS } from '../ui/buttonStyle';
import { FieldError } from '../ui/FieldError';
import { LABEL_CLASS } from '../ui/fieldStyle';
import { Input } from '../ui/Input';
import { SelectDropdown } from '../ui/SelectDropdown';
import { updateProfile, type Profile, type UpdateProfileInput } from './api';
import { bodyFatOptions } from './bodyFatLevels';

interface Props {
  dialogRef: RefObject<HTMLDialogElement | null>;
  /** Changes with each opening, so the form starts from the saved profile. */
  openCount: number;
  profile: Profile;
  onUpdate: (partial: Partial<Profile>) => void;
}

type Field =
  | 'targetWeight'
  | 'dailyCalorieGoal'
  | 'dailyProteinGoal'
  | 'dailyCarbsGoal'
  | 'dailyFatGoal';

interface FormState extends Record<Field, string> {
  /** '' for none: the target weight typed is then the target. */
  targetBodyFat: string;
}

/** Allowed range of each daily goal. */
const GOAL_LIMITS = [
  { field: 'dailyCalorieGoal', min: 500, max: 10000, unit: 'kcal' },
  { field: 'dailyProteinGoal', min: 10, max: 500, unit: 'g' },
  { field: 'dailyCarbsGoal', min: 10, max: 2000, unit: 'g' },
  { field: 'dailyFatGoal', min: 10, max: 1000, unit: 'g' },
] as const;

const DAILY_FIELDS = [
  { field: 'dailyCalorieGoal', label: 'Calories (kcal)', example: '2000' },
  { field: 'dailyProteinGoal', label: 'Protéines (g)', example: '120' },
  { field: 'dailyCarbsGoal', label: 'Glucides (g)', example: '230' },
  { field: 'dailyFatGoal', label: 'Lipides (g)', example: '65' },
] as const;

const text = (value: number | null) =>
  value?.toString().replace('.', ',') ?? '';

const toForm = (profile: Profile): FormState => ({
  targetBodyFat: profile.targetBodyFat?.toString() ?? '',
  targetWeight: text(profile.targetWeight),
  dailyCalorieGoal: text(profile.dailyCalorieGoal),
  dailyProteinGoal: text(profile.dailyProteinGoal),
  dailyCarbsGoal: text(profile.dailyCarbsGoal),
  dailyFatGoal: text(profile.dailyFatGoal),
});

/** Target weight and goals within their limits; goals as whole numbers. */
function validate(form: FormState): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  if (form.targetWeight && !form.targetBodyFat) {
    const w = parseDecimal(form.targetWeight);
    if (w === null || isNaN(w)) errors.targetWeight = 'Valeur invalide';
    else if (w < 20 || w > 500) errors.targetWeight = 'Entre 20 et 500 kg';
    else if (hasTooManyDecimals(form.targetWeight))
      errors.targetWeight = TOO_MANY_DECIMALS;
  }
  for (const { field, min, max, unit } of GOAL_LIMITS) {
    if (!form[field]) continue;
    const value = parseDecimal(form[field]);
    if (value === null || isNaN(value)) errors[field] = 'Valeur invalide';
    else if (!Number.isInteger(value)) errors[field] = WHOLE_NUMBER_ONLY;
    else if (value < min || value > max)
      errors[field] = `Entre ${min} et ${max} ${unit}`;
  }
  return errors;
}

/**
 * The target (a body fat share or a weight) and the daily goals. Only the
 * fields that changed are saved.
 */
export function GoalDialog(props: Props) {
  return (
    <BaseDialog dialogRef={props.dialogRef} title="Mes objectifs">
      <GoalForm key={props.openCount} {...props} />
    </BaseDialog>
  );
}

function GoalForm({ dialogRef, profile, onUpdate }: Props) {
  const {
    form,
    setForm,
    handleFocus,
    handleBlur,
    handleChange,
    isInvalid,
    errorMessage,
    attemptSubmit,
  } = useFormValidation<FormState>(() => toForm(profile), validate);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const isComputed = form.targetBodyFat !== '';

  async function handleSave() {
    if (!attemptSubmit()) return;

    const input: UpdateProfileInput = {};
    // A target body fat sets the target weight: the one typed waits, unchanged.
    const targetWeight = parseDecimal(form.targetWeight);
    if (!isComputed && targetWeight !== (profile.targetWeight ?? null))
      input.targetWeight = targetWeight;
    const targetBodyFat = isComputed ? Number(form.targetBodyFat) : null;
    if (targetBodyFat !== profile.targetBodyFat)
      input.targetBodyFat = targetBodyFat;
    for (const { field } of DAILY_FIELDS) {
      // An emptied field sends null, which clears the goal.
      const value = parseDecimal(form[field]);
      if (value !== (profile[field] ?? null)) input[field] = value;
    }

    if (Object.keys(input).length === 0) {
      dialogRef.current?.close();
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      onUpdate(await updateProfile(input));
      dialogRef.current?.close();
    } catch (err) {
      setSaveError(failureMessage(err, 'Erreur lors de la sauvegarde'));
    } finally {
      setSaving(false);
    }
  }

  const numberField = (
    field: Field,
    id: string,
    label: string,
    example: string,
  ) => {
    const disabled = field === 'targetWeight' && isComputed;
    return (
      <div key={field} className="relative flex flex-col justify-end gap-1">
        <label htmlFor={id} className={LABEL_CLASS}>
          {label}
        </label>
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          placeholder={disabled ? 'Calculé' : `Ex : ${example}`}
          disabled={disabled}
          value={disabled ? '' : form[field]}
          onChange={(e) => handleChange(field, e.target.value)}
          onFocus={() => handleFocus(field)}
          onBlur={() => handleBlur(field)}
          data-invalid={isInvalid(field)}
        />
        <FieldError message={errorMessage(field)} />
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="pf-target-body-fat" className={LABEL_CLASS}>
            Masse grasse cible
          </label>
          <SelectDropdown
            id="pf-target-body-fat"
            value={form.targetBodyFat}
            options={bodyFatOptions(
              profile.gender,
              form.targetBodyFat ? Number(form.targetBodyFat) : null,
            )}
            onChange={(v) => setForm((p) => ({ ...p, targetBodyFat: v }))}
          />
        </div>
        {numberField(
          'targetWeight',
          'pf-target-weight',
          'Poids cible (kg)',
          '70',
        )}
        {isComputed && (
          <p className="-mt-2 text-xs text-theme-600">
            Le poids cible se calcule depuis la masse maigre, à chaque pesée.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h4 className="text-base font-semibold text-theme-500">Par jour</h4>
        <div className="grid grid-cols-2 gap-4">
          {DAILY_FIELDS.map(({ field, label, example }) =>
            numberField(field, `pf-${field}`, label, example),
          )}
        </div>
      </div>

      {saveError && <p className="text-xs text-red-500">{saveError}</p>}

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className={PRIMARY_BUTTON_CLASS}
      >
        {saving ? 'Enregistrement...' : 'Enregistrer les objectifs'}
      </button>
    </div>
  );
}
