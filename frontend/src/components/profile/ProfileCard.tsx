import { useRef, useState } from 'react';

import { useFormValidation } from '../../hooks/useFormValidation';
import {
  hasTooManyDecimals,
  parseDecimal,
  TOO_MANY_DECIMALS,
  WHOLE_NUMBER_ONLY,
} from '../../utils/decimals';
import { failureMessage } from '../../utils/failureMessage';
import { BaseDialog } from '../ui/BaseDialog';
import { EditIconButton } from '../ui/EditIconButton';
import { FieldError } from '../ui/FieldError';
import { LABEL_CLASS } from '../ui/fieldStyle';
import { Input } from '../ui/Input';
import { SelectDropdown } from '../ui/SelectDropdown';
import { updateProfile, type Profile, type UpdateProfileInput } from './api';
import { BirthDatePicker } from './BirthDatePicker';
import { getAge } from './bmr';
import { formatMeasure } from './measures';

interface Props {
  profile: Profile;
  onUpdate: (partial: Partial<Profile>) => void;
}

type Field =
  | 'height'
  | 'targetWeight'
  | 'dailyCalorieGoal'
  | 'dailyProteinGoal'
  | 'dailyCarbsGoal'
  | 'dailyFatGoal';

interface FormState {
  height: string;
  targetWeight: string;
  dailyCalorieGoal: string;
  dailyProteinGoal: string;
  dailyCarbsGoal: string;
  dailyFatGoal: string;
  gender: string;
  birthDate: string;
  activityLevel: string;
}

/** Allowed range of each daily goal. */
const GOAL_LIMITS = [
  { field: 'dailyCalorieGoal', min: 500, max: 10000, unit: 'kcal' },
  { field: 'dailyProteinGoal', min: 10, max: 500, unit: 'g' },
  { field: 'dailyCarbsGoal', min: 10, max: 2000, unit: 'g' },
  { field: 'dailyFatGoal', min: 10, max: 1000, unit: 'g' },
] as const;

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Homme' },
  { value: 'FEMALE', label: 'Femme' },
  { value: 'OTHER', label: 'Autre' },
];

const ACTIVITY_OPTIONS = [
  { value: 'SEDENTARY', label: 'Sédentaire' },
  { value: 'LIGHTLY_ACTIVE', label: 'Légèrement actif' },
  { value: 'MODERATELY_ACTIVE', label: 'Modérément actif' },
  { value: 'VERY_ACTIVE', label: 'Très actif' },
  { value: 'EXTRA_ACTIVE', label: 'Extrêmement actif' },
];

/**
 * One line about the person: gender, age, height and activity, or a hint when
 * nothing is filled in yet.
 */
function summarize(profile: Profile) {
  const parts = [
    GENDER_OPTIONS.find((o) => o.value === profile.gender)?.label,
    profile.birthDate ? `${getAge(profile.birthDate)} ans` : undefined,
    profile.height === null ? undefined : formatMeasure(profile.height, 'cm'),
    ACTIVITY_OPTIONS.find((o) => o.value === profile.activityLevel)?.label,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' · ') : 'Profil à compléter';
}

/**
 * Height, target weight and goals within their limits; goals as whole numbers.
 */
function validate(form: FormState): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  if (form.height) {
    const h = parseDecimal(form.height);
    if (h === null || isNaN(h)) errors.height = 'Valeur invalide';
    else if (h < 50 || h > 300) errors.height = 'Entre 50 et 300 cm';
    else if (hasTooManyDecimals(form.height)) errors.height = TOO_MANY_DECIMALS;
  }
  if (form.targetWeight) {
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
 * Profile card: a summary of the body measures, and a dialog to edit them with
 * the goals. Only the fields that changed are saved.
 */
export function ProfileCard({ profile, onUpdate }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [dialogNode, setDialogNode] = useState<HTMLDialogElement | null>(null);

  const initForm = (): FormState => ({
    height: profile.height?.toString() ?? '',
    targetWeight: profile.targetWeight?.toString() ?? '',
    dailyCalorieGoal: profile.dailyCalorieGoal?.toString() ?? '',
    dailyProteinGoal: profile.dailyProteinGoal?.toString() ?? '',
    dailyCarbsGoal: profile.dailyCarbsGoal?.toString() ?? '',
    dailyFatGoal: profile.dailyFatGoal?.toString() ?? '',
    gender: profile.gender ?? '',
    birthDate: profile.birthDate ? profile.birthDate.slice(0, 10) : '',
    activityLevel: profile.activityLevel ?? '',
  });

  const {
    form,
    setForm,
    handleFocus,
    handleBlur,
    handleChange,
    isInvalid,
    errorMessage,
    attemptSubmit,
    resetValidation,
  } = useFormValidation<FormState>(initForm, validate);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function handleEdit() {
    setForm(initForm());
    resetValidation();
    setSaveError(null);
    setDialogNode(dialogRef.current);
    dialogRef.current?.showModal();
  }

  async function handleSave() {
    if (!attemptSubmit()) {
      return;
    }

    const input: UpdateProfileInput = {};

    // An emptied field sends null, which clears the value.
    const parsedHeight = parseDecimal(form.height);
    if (parsedHeight !== (profile.height ?? null)) input.height = parsedHeight;
    const parsedTargetWeight = parseDecimal(form.targetWeight);
    if (parsedTargetWeight !== (profile.targetWeight ?? null))
      input.targetWeight = parsedTargetWeight;
    const parsedDailyCalorieGoal = parseDecimal(form.dailyCalorieGoal);
    if (parsedDailyCalorieGoal !== (profile.dailyCalorieGoal ?? null))
      input.dailyCalorieGoal = parsedDailyCalorieGoal;
    const parsedDailyProteinGoal = parseDecimal(form.dailyProteinGoal);
    if (parsedDailyProteinGoal !== (profile.dailyProteinGoal ?? null))
      input.dailyProteinGoal = parsedDailyProteinGoal;
    const parsedDailyCarbsGoal = parseDecimal(form.dailyCarbsGoal);
    if (parsedDailyCarbsGoal !== (profile.dailyCarbsGoal ?? null))
      input.dailyCarbsGoal = parsedDailyCarbsGoal;
    const parsedDailyFatGoal = parseDecimal(form.dailyFatGoal);
    if (parsedDailyFatGoal !== (profile.dailyFatGoal ?? null))
      input.dailyFatGoal = parsedDailyFatGoal;
    if (form.gender !== (profile.gender ?? ''))
      input.gender = form.gender || undefined;
    if (
      form.birthDate !==
      (profile.birthDate ? profile.birthDate.slice(0, 10) : '')
    )
      input.birthDate = form.birthDate || undefined;
    if (form.activityLevel !== (profile.activityLevel ?? ''))
      input.activityLevel = form.activityLevel || undefined;

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

  return (
    <>
      <div className="rounded-2xl border border-green-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-green-800">
              Mon profil
            </p>
            <p className="truncate text-xs text-green-500">
              {summarize(profile)}
            </p>
          </div>
          <EditIconButton
            label="Modifier le profil"
            onClick={handleEdit}
            size="lg"
          />
        </div>
      </div>

      <BaseDialog
        dialogRef={dialogRef}
        title="Modifier le profil"
        onClose={() => setSaveError(null)}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="pf-gender" className={LABEL_CLASS}>
              Genre
            </label>
            <SelectDropdown
              id="pf-gender"
              value={form.gender}
              options={GENDER_OPTIONS}
              onChange={(v) => setForm((p) => ({ ...p, gender: v }))}
              container={dialogNode}
              placeholder="Sélectionner"
            />
          </div>

          <BirthDatePicker
            id="pf-birthdate"
            label="Date de naissance"
            value={form.birthDate}
            onChange={(birthDate) => setForm((p) => ({ ...p, birthDate }))}
          />

          <div className="col-span-2 flex flex-col gap-1">
            <label htmlFor="pf-activity" className={LABEL_CLASS}>
              Niveau d'activité
            </label>
            <SelectDropdown
              id="pf-activity"
              value={form.activityLevel}
              options={ACTIVITY_OPTIONS}
              onChange={(v) => setForm((p) => ({ ...p, activityLevel: v }))}
              container={dialogNode}
              placeholder="Sélectionner"
            />
          </div>

          {[
            {
              field: 'height' as Field,
              id: 'pf-height',
              label: 'Taille',
              unit: 'cm',
              example: '175',
            },
            {
              field: 'targetWeight' as Field,
              id: 'pf-target-weight',
              label: 'Poids cible',
              unit: 'kg',
              example: '70',
            },
            {
              field: 'dailyCalorieGoal' as Field,
              id: 'pf-calorie-goal',
              label: 'Objectif calorique',
              unit: 'kcal/jour',
              example: '2000',
            },
            {
              field: 'dailyProteinGoal' as Field,
              id: 'pf-protein-goal',
              label: 'Objectif protéines',
              unit: 'g/jour',
              example: '120',
            },
            {
              field: 'dailyCarbsGoal' as Field,
              id: 'pf-carbs-goal',
              label: 'Objectif glucides',
              unit: 'g/jour',
              example: '230',
            },
            {
              field: 'dailyFatGoal' as Field,
              id: 'pf-fat-goal',
              label: 'Objectif lipides',
              unit: 'g/jour',
              example: '65',
            },
          ].map(({ field, id, label, unit, example }) => (
            <div
              key={field}
              className="relative flex flex-col justify-end gap-1"
            >
              <label htmlFor={id} className={LABEL_CLASS}>
                {label}{' '}
                <span
                  className={unit.endsWith('/jour') ? 'max-[500px]:block' : ''}
                >
                  ({unit})
                </span>
              </label>
              <Input
                id={id}
                type="text"
                inputMode="decimal"
                placeholder={`Ex : ${example}`}
                value={form[field]}
                onChange={(e) => handleChange(field, e.target.value)}
                onFocus={() => handleFocus(field)}
                onBlur={() => handleBlur(field)}
                aria-invalid={isInvalid(field)}
              />
              <FieldError id={`${id}-error`} message={errorMessage(field)} />
            </div>
          ))}

          {saveError && (
            <p className="col-span-2 text-xs text-red-500">{saveError}</p>
          )}

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="col-span-2 mt-2 w-full cursor-pointer rounded-xl bg-green-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </BaseDialog>
    </>
  );
}
