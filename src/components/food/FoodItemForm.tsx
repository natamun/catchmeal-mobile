import { useRef, useState, type RefObject } from 'react';

import { useFormValidation } from '../../hooks/useFormValidation';
import {
  hasTooManyDecimals,
  parseDecimal,
  TOO_MANY_DECIMALS,
} from '../../utils/decimals';
import { failureMessage } from '../../utils/failureMessage';
import { MAX_LENGTH, maxLengthMessage } from '../../utils/validation';
import { NUTRITION_FIELDS } from '../meal/quickMealAdd';
import { BaseDialog } from '../ui/BaseDialog';
import { PRIMARY_BUTTON_CLASS } from '../ui/buttonStyle';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { FieldError } from '../ui/FieldError';
import { LABEL_CLASS } from '../ui/fieldStyle';
import { Input } from '../ui/Input';
import { PillTabs } from '../ui/PillTabs';
import { useToast } from '../ui/toastContext';
import { createFoodItem, deleteFoodItem, updateFoodItem } from './api';
import { BarcodeField } from './BarcodeField';
import {
  UNIT_LABELS,
  type FoodItem,
  type OffProduct,
  type QuantityUnit,
} from './types';

interface FoodItemFormState {
  barcode: string;
  name: string;
  brand: string;
  baseQuantity: string;
  baseUnit: QuantityUnit;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  /** Both empty for no portion. */
  portionName: string;
  portionQuantity: string;
}

const EMPTY_FORM: FoodItemFormState = {
  barcode: '',
  name: '',
  brand: '',
  baseQuantity: '',
  baseUnit: 'GRAM',
  kcal: '',
  protein: '',
  carbs: '',
  fat: '',
  portionName: '',
  portionQuantity: '',
};

/** The limits the database keeps for a portion. */
const MAX_PORTION = 5000;
const MAX_PORTION_NAME = 30;

const UNIT_OPTIONS = [
  { value: 'GRAM', label: 'g' },
  { value: 'MILLILITER', label: 'ml' },
  { value: 'PIECE', label: 'pièce' },
] as const;

/** Fills the form with the food being edited. */
function itemToForm(item: FoodItem): FoodItemFormState {
  return {
    barcode: item.barcode ?? '',
    name: item.name,
    brand: item.brand ?? '',
    baseQuantity: String(item.baseQuantity),
    baseUnit: item.baseUnit,
    kcal: String(item.kcal),
    protein: String(item.protein),
    carbs: String(item.carbs),
    fat: String(item.fat),
    portionName: item.portionName ?? '',
    portionQuantity:
      item.portionQuantity === null ? '' : String(item.portionQuantity),
  };
}

/** The portion to save: none for a food by the piece, or without a weight. */
function portionOf(form: FoodItemFormState) {
  const portionQuantity =
    form.baseUnit === 'PIECE' ? null : parseDecimal(form.portionQuantity);
  return portionQuantity === null
    ? { portionQuantity: null, portionName: null }
    : { portionQuantity, portionName: form.portionName.trim() || null };
}

/**
 * Leading zeros do not count: the same product can be written with or without
 * them (EAN-13 and UPC-A).
 */
const significantDigits = (barcode: string) => barcode.replace(/^0+/, '');

/**
 * Fills the form with an Open Food Facts product; the values they lack stay
 * empty.
 */
function productToForm(product: OffProduct): FoodItemFormState {
  const toField = (value: number | null) =>
    value === null ? '' : String(value);

  return {
    barcode: product.barcode,
    name: product.name ?? '',
    brand: product.brand ?? '',
    baseQuantity: String(product.baseQuantity),
    baseUnit: product.baseUnit,
    kcal: toField(product.kcal),
    protein: toField(product.protein),
    carbs: toField(product.carbs),
    fat: toField(product.fat),
    portionName: product.portionName ?? '',
    portionQuantity: toField(product.portionQuantity),
  };
}

/**
 * Name required, name and brand within the saved limits, base quantity above
 * 0, macros 0 or more, 2 decimals at most. The barcode and the portion are
 * optional, but a portion named needs its weight.
 */
function validateForm(
  form: FoodItemFormState,
): Partial<Record<keyof FoodItemFormState, string>> {
  const errors: Partial<Record<keyof FoodItemFormState, string>> = {};

  const barcode = form.barcode.trim();
  if (barcode !== '' && !/^\d{8,14}$/.test(barcode)) {
    errors.barcode = '8 à 14 chiffres';
  }

  const name = form.name.trim();
  if (name === '') {
    errors.name = 'Nom requis';
  } else if (name.length > MAX_LENGTH.foodName) {
    errors.name = maxLengthMessage(MAX_LENGTH.foodName);
  }

  if (form.brand.trim().length > MAX_LENGTH.brand) {
    errors.brand = maxLengthMessage(MAX_LENGTH.brand);
  }

  const quantity = parseDecimal(form.baseQuantity);
  if (quantity === null || Number.isNaN(quantity) || quantity <= 0) {
    errors.baseQuantity = 'Supérieur à 0';
  } else if (hasTooManyDecimals(form.baseQuantity)) {
    errors.baseQuantity = TOO_MANY_DECIMALS;
  }

  for (const field of ['kcal', 'protein', 'carbs', 'fat'] as const) {
    const value = parseDecimal(form[field]);
    if (value === null || Number.isNaN(value) || value < 0) {
      errors[field] = 'Minimum 0';
    } else if (hasTooManyDecimals(form[field])) {
      errors[field] = TOO_MANY_DECIMALS;
    }
  }

  if (form.baseUnit !== 'PIECE') {
    const portion = parseDecimal(form.portionQuantity);
    if (form.portionQuantity.trim() === '') {
      if (form.portionName.trim() !== '')
        errors.portionQuantity = 'Poids requis';
    } else if (portion === null || Number.isNaN(portion) || portion <= 0) {
      errors.portionQuantity = 'Supérieur à 0';
    } else if (portion > MAX_PORTION) {
      errors.portionQuantity = `${MAX_PORTION} au plus`;
    } else if (hasTooManyDecimals(form.portionQuantity)) {
      errors.portionQuantity = TOO_MANY_DECIMALS;
    }
    if (form.portionName.trim().length > MAX_PORTION_NAME) {
      errors.portionName = maxLengthMessage(MAX_PORTION_NAME);
    }
  }

  return errors;
}

interface FoodItemFormProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  editingItem: FoodItem | null;
  foodItems: FoodItem[];
}

/**
 * Dialog to create or edit a food: barcode lookup, name, brand, base quantity
 * and macros. It warns before adding a second food with the same barcode.
 * Deleting archives the food.
 */
export function FoodItemForm({
  dialogRef,
  editingItem,
  foodItems,
}: FoodItemFormProps) {
  const {
    form,
    setForm,
    errors,
    submitAttempted,
    handleFocus,
    handleBlur,
    handleChange,
    isInvalid,
    errorMessage,
    attemptSubmit,
    resetValidation,
  } = useFormValidation(EMPTY_FORM, validateForm);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const showToast = useToast();
  const [barcodeFieldKey, setBarcodeFieldKey] = useState(0);
  const [syncedItemId, setSyncedItemId] = useState<number | null>(
    editingItem?.id ?? null,
  );
  const confirmDialogRef = useRef<HTMLDialogElement>(null);
  const duplicateDialogRef = useRef<HTMLDialogElement>(null);

  // Updating state during render, the React way to react to a prop change
  // without an effect: when the dialog opens on another food, the form is
  // refilled before it is displayed.
  if ((editingItem?.id ?? null) !== syncedItemId) {
    setSyncedItemId(editingItem?.id ?? null);
    setForm(editingItem ? itemToForm(editingItem) : EMPTY_FORM);
    resetValidation();
    setError(null);
  }

  const closeDialog = () => {
    dialogRef.current?.close();
  };

  const barcode = form.barcode.trim();
  const duplicates =
    editingItem || barcode === ''
      ? []
      : foodItems.filter(
          (item) =>
            !item.archived &&
            item.barcode !== null &&
            significantDigits(item.barcode) === significantDigits(barcode),
        );

  const handleProduct = (product: OffProduct) => {
    setForm(productToForm(product));
    resetValidation();
    setError(null);
  };

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!attemptSubmit()) {
      return;
    }
    if (duplicates.length > 0) {
      duplicateDialogRef.current?.showModal();
      return;
    }

    await save();
  };

  const save = async () => {
    setIsSubmitting(true);
    try {
      const input = {
        name: form.name,
        brand: form.brand.trim() === '' ? null : form.brand,
        barcode: barcode === '' ? null : barcode,
        baseQuantity: parseDecimal(form.baseQuantity) ?? 0,
        baseUnit: form.baseUnit,
        kcal: parseDecimal(form.kcal) ?? 0,
        protein: parseDecimal(form.protein) ?? 0,
        carbs: parseDecimal(form.carbs) ?? 0,
        fat: parseDecimal(form.fat) ?? 0,
        ...portionOf(form),
      };
      if (editingItem) {
        await updateFoodItem(editingItem.id, input);
      } else {
        await createFoodItem(input);
        setForm(EMPTY_FORM);
        setBarcodeFieldKey((key) => key + 1);
      }
      resetValidation();
      closeDialog();
      showToast(
        editingItem
          ? 'Produit modifié avec succès'
          : 'Produit enregistré avec succès',
      );
    } catch (err: unknown) {
      setError(failureMessage(err, 'Une erreur est survenue, réessayez.'));
    } finally {
      setIsSubmitting(false);
      duplicateDialogRef.current?.close();
    }
  };

  const handleDelete = async () => {
    if (!editingItem) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await deleteFoodItem(editingItem.id);
      closeDialog();
      showToast('Produit supprimé');
    } catch {
      setError('Suppression impossible, réessayez.');
    } finally {
      setIsSubmitting(false);
      confirmDialogRef.current?.close();
    }
  };

  return (
    <>
      <BaseDialog
        dialogRef={dialogRef}
        title={editingItem ? 'Modifier un aliment' : 'Ajouter un aliment'}
        onDelete={
          editingItem ? () => confirmDialogRef.current?.showModal() : undefined
        }
      >
        <form
          onSubmit={(e) => void handleSubmit(e)}
          noValidate
          autoComplete="off"
          className="contents"
        >
          {!editingItem && (
            <BarcodeField
              key={barcodeFieldKey}
              value={form.barcode}
              error={errors.barcode}
              showError={submitAttempted}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, barcode: value }))
              }
              onProduct={handleProduct}
            />
          )}

          <div className="flex flex-col gap-5 sm:flex-row sm:gap-3">
            <div className="relative flex flex-col gap-1.5 sm:flex-1">
              <label htmlFor="food-name" className={LABEL_CLASS}>
                Nom
              </label>
              <Input
                id="food-name"
                type="text"
                placeholder="Ex : Riz blanc"
                maxLength={MAX_LENGTH.foodName}
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                onFocus={() => handleFocus('name')}
                onBlur={() => handleBlur('name')}
                data-invalid={isInvalid('name')}
              />
              <FieldError message={errorMessage('name')} />
            </div>

            <div className="relative flex flex-col gap-1.5 sm:flex-1">
              <label htmlFor="food-brand" className={LABEL_CLASS}>
                Marque
              </label>
              <Input
                id="food-brand"
                type="text"
                placeholder="Ex : Knorr"
                maxLength={MAX_LENGTH.brand}
                value={form.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
                onFocus={() => handleFocus('brand')}
                onBlur={() => handleBlur('brand')}
                data-invalid={isInvalid('brand')}
              />
              <FieldError message={errorMessage('brand')} />
            </div>
          </div>

          <div className="relative flex flex-col gap-1.5">
            <label htmlFor="food-quantity" className={LABEL_CLASS}>
              Quantité de référence
            </label>
            <div className="flex gap-2">
              <Input
                id="food-quantity"
                type="text"
                inputMode="decimal"
                placeholder="Ex : 100"
                value={form.baseQuantity}
                onChange={(e) => handleChange('baseQuantity', e.target.value)}
                onFocus={() => handleFocus('baseQuantity')}
                onBlur={() => handleBlur('baseQuantity')}
                data-invalid={isInvalid('baseQuantity')}
              />
              <PillTabs
                name="baseUnit"
                options={UNIT_OPTIONS}
                value={form.baseUnit}
                onChange={(baseUnit) =>
                  setForm((prev) => ({ ...prev, baseUnit }))
                }
              />
            </div>
            <FieldError message={errorMessage('baseQuantity')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <p className={LABEL_CLASS}>Valeurs nutritionnelles</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {NUTRITION_FIELDS.map(({ field, label }) => (
                <div key={field} className="relative flex flex-col gap-1">
                  <label
                    htmlFor={`food-${field}`}
                    className="text-xs text-theme-500"
                  >
                    {label}
                  </label>
                  <Input
                    id={`food-${field}`}
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={form[field]}
                    onChange={(e) => handleChange(field, e.target.value)}
                    onFocus={() => handleFocus(field)}
                    onBlur={() => handleBlur(field)}
                    data-invalid={isInvalid(field)}
                  />
                  <FieldError message={errorMessage(field)} />
                </div>
              ))}
            </div>
          </div>

          {form.baseUnit !== 'PIECE' && (
            <div className="relative flex flex-col gap-1.5">
              <label htmlFor="food-portion-name" className={LABEL_CLASS}>
                Portion
              </label>
              <div className="flex gap-2">
                <Input
                  id="food-portion-name"
                  type="text"
                  placeholder="Ex : biscuit"
                  maxLength={MAX_PORTION_NAME}
                  value={form.portionName}
                  onChange={(e) => handleChange('portionName', e.target.value)}
                  onFocus={() => handleFocus('portionName')}
                  onBlur={() => handleBlur('portionName')}
                  data-invalid={isInvalid('portionName')}
                />
                <div className="relative w-32 shrink-0">
                  <Input
                    id="food-portion-quantity"
                    type="text"
                    inputMode="decimal"
                    aria-label="Poids de la portion"
                    placeholder="Ex : 12"
                    value={form.portionQuantity}
                    onChange={(e) =>
                      handleChange('portionQuantity', e.target.value)
                    }
                    onFocus={() => handleFocus('portionQuantity')}
                    onBlur={() => handleBlur('portionQuantity')}
                    data-invalid={isInvalid('portionQuantity')}
                    className="pr-11"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-base text-theme-500">
                    {UNIT_LABELS[form.baseUnit]}
                  </span>
                </div>
              </div>
              <FieldError
                message={
                  errorMessage('portionQuantity') ?? errorMessage('portionName')
                }
              />
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className={PRIMARY_BUTTON_CLASS}
          >
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </BaseDialog>

      <ConfirmDialog
        dialogRef={confirmDialogRef}
        title="Supprimer cet aliment ?"
        description={`${editingItem?.name ?? ''} sera retiré de votre liste.`}
        confirmLabel="Supprimer"
        pendingLabel="Suppression..."
        isPending={isSubmitting}
        onConfirm={() => void handleDelete()}
      />

      <ConfirmDialog
        dialogRef={duplicateDialogRef}
        title="Aliment déjà enregistré"
        description={
          duplicates.length > 1
            ? `${duplicates.length} aliments existent déjà avec ce code-barres. En ajouter un autre ?`
            : `« ${duplicates[0]?.name ?? ''} » existe déjà avec ce code-barres. L'ajouter quand même ?`
        }
        confirmLabel="Ajouter"
        pendingLabel="Enregistrement..."
        isPending={isSubmitting}
        onConfirm={() => void save()}
        tone="primary"
      />
    </>
  );
}
