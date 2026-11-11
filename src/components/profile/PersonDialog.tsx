import { useState, type RefObject } from 'react';
import { Check } from 'lucide-react';

import { useFormValidation } from '../../hooks/useFormValidation';
import {
  hasTooManyDecimals,
  parseDecimal,
  TOO_MANY_DECIMALS,
} from '../../utils/decimals';
import { failureMessage } from '../../utils/failureMessage';
import { BaseDialog } from '../ui/BaseDialog';
import { PRIMARY_BUTTON_CLASS } from '../ui/buttonStyle';
import { FieldError } from '../ui/FieldError';
import { LABEL_CLASS } from '../ui/fieldStyle';
import { Input } from '../ui/Input';
import { PillTabs } from '../ui/PillTabs';
import { updateProfile, type Profile, type UpdateProfileInput } from './api';
import { BirthDatePicker } from './BirthDatePicker';
import { ACTIVITY_OPTIONS, GENDER_OPTIONS } from './profileOptions';

interface Props {
  dialogRef: RefObject<HTMLDialogElement | null>;
  /** Changes with each opening, so the form starts from the saved profile. */
  openCount: number;
  profile: Profile;
  onUpdate: (partial: Partial<Profile>) => void;
}

interface FormState {
  gender: string;
  birthDate: string;
  height: string;
  activityLevel: string;
}

const toForm = (profile: Profile): FormState => ({
  gender: profile.gender ?? '',
  birthDate: profile.birthDate ? profile.birthDate.slice(0, 10) : '',
  height: profile.height?.toString().replace('.', ',') ?? '',
  activityLevel: profile.activityLevel ?? '',
});

/** Height between 50 and 300 cm, with 2 decimals at most. */
function validate(form: FormState): Partial<Record<'height', string>> {
  if (!form.height) return {};
  const h = parseDecimal(form.height);
  if (h === null || isNaN(h)) return { height: 'Valeur invalide' };
  if (h < 50 || h > 300) return { height: 'Entre 50 et 300 cm' };
  if (hasTooManyDecimals(form.height)) return { height: TOO_MANY_DECIMALS };
  return {};
}

/**
 * The person behind the numbers: gender, birth date, height and activity, the
 * inputs of the expenditure estimate. Short choices are shown in place, so no
 * sheet opens over the dialog except for the birth date. Only the fields that
 * changed are saved.
 */
export function PersonDialog(props: Props) {
  return (
    <BaseDialog dialogRef={props.dialogRef} title="Mon profil">
      <PersonForm key={props.openCount} {...props} />
    </BaseDialog>
  );
}

function PersonForm({ dialogRef, profile, onUpdate }: Props) {
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

  async function handleSave() {
    if (!attemptSubmit()) return;

    const input: UpdateProfileInput = {};
    const height = parseDecimal(form.height);
    if (height !== (profile.height ?? null)) input.height = height;
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
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>Genre</span>
        <PillTabs
          name="pf-gender"
          options={GENDER_OPTIONS}
          value={form.gender || null}
          onChange={(gender) => setForm((p) => ({ ...p, gender }))}
          fill
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <BirthDatePicker
          id="pf-birthdate"
          label="Date de naissance"
          value={form.birthDate}
          onChange={(birthDate) => setForm((p) => ({ ...p, birthDate }))}
        />
        <div className="relative flex flex-col gap-1">
          <label htmlFor="pf-height" className={LABEL_CLASS}>
            Taille (cm)
          </label>
          <Input
            id="pf-height"
            type="text"
            inputMode="decimal"
            placeholder="Ex : 175"
            value={form.height}
            onChange={(e) => handleChange('height', e.target.value)}
            onFocus={() => handleFocus('height')}
            onBlur={() => handleBlur('height')}
            data-invalid={isInvalid('height')}
          />
          <FieldError message={errorMessage('height')} />
        </div>
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className={`mb-1 ${LABEL_CLASS}`}>Niveau d'activité</legend>
        <div className="flex flex-col">
          {ACTIVITY_OPTIONS.map((option) => {
            const checked = form.activityLevel === option.value;
            return (
              <label
                key={option.value}
                className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 border-t border-theme-100 px-1 text-base transition-colors first:border-t-0 hover:bg-theme-100 ${
                  checked ? 'font-semibold text-theme-800' : 'text-theme-700'
                }`}
              >
                <input
                  type="radio"
                  name="pf-activity"
                  value={option.value}
                  checked={checked}
                  onChange={() =>
                    setForm((p) => ({ ...p, activityLevel: option.value }))
                  }
                  className="sr-only"
                />
                {option.label}
                {checked && (
                  <Check className="h-5 w-5 shrink-0 text-theme-500" />
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      {saveError && <p className="text-xs text-red-500">{saveError}</p>}

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className={PRIMARY_BUTTON_CLASS}
      >
        {saving ? 'Enregistrement...' : 'Enregistrer le profil'}
      </button>
    </div>
  );
}
