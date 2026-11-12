import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, LoaderCircle, ScanBarcode, Search } from 'lucide-react';

import { OffLookupError, type OffErrorKind } from '../../data/openFoodFacts';
import { useHasCamera } from '../../hooks/useHasCamera';
import { useTimeout } from '../../hooks/useTimeout';
import { scanBarcode, ScannerNotReadyError } from '../../native/barcodeScanner';
import { FieldError } from '../ui/FieldError';
import { LABEL_CLASS } from '../ui/fieldStyle';
import { Input } from '../ui/Input';
import { lookupOffProduct } from './api';
import { isValidBarcode } from './barcode';
import type { OffProduct } from './types';

const ICON_BUTTON_CLASS =
  'flex w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-theme-200 text-theme-600 transition-colors hover:bg-theme-50 disabled:cursor-not-allowed disabled:opacity-60';

const OFF_URL = 'https://world.openfoodfacts.org';

const INVALID_BARCODE = 'Code-barres invalide';

const LOOKUP_ERRORS: Record<OffErrorKind, string> = {
  'invalid-barcode': INVALID_BARCODE,
  'too-many-lookups': 'Trop de recherches, patientez 1 min',
  unavailable: 'Open Food Facts ne répond pas',
};

interface BarcodeFieldProps {
  value: string;
  error?: string;
  showError: boolean;
  onChange: (value: string) => void;
  onProduct: (product: OffProduct) => void;
}

/**
 * Barcode field of the food form, typed or scanned with the camera, then looked
 * up on Open Food Facts to fill the form. The number is checked first
 * (isValidBarcode), so a typo never sends a request.
 */
export function BarcodeField({
  value,
  error,
  showError,
  onChange,
  onProduct,
}: BarcodeFieldProps) {
  const hasCamera = useHasCamera();
  const [isTouched, setIsTouched] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [foundBarcode, setFoundBarcode] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<{
    message: string;
    onField: boolean;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Each lookup gets a number: an answer that arrives after a newer lookup
  // started, or after the form closed, is ignored.
  const lookupIdRef = useRef(0);

  if (showError && !isTouched) {
    setIsTouched(true);
  }

  useEffect(() => {
    const lookupId = lookupIdRef;
    return () => {
      lookupId.current += 1;
    };
  }, []);

  useTimeout(() => setLookupError(null), lookupError ? 5000 : null);

  const barcode = value.trim();

  const runLookup = async (code: string) => {
    lookupIdRef.current += 1;
    const lookupId = lookupIdRef.current;
    if (!isValidBarcode(code)) {
      setLookupError({ message: INVALID_BARCODE, onField: true });
      return;
    }
    setIsLookingUp(true);
    try {
      const product = await lookupOffProduct(code);
      if (lookupId !== lookupIdRef.current) {
        return;
      }
      if (!product) {
        setLookupError({ message: 'Produit introuvable', onField: false });
        return;
      }
      setFoundBarcode(product.barcode);
      setIsTouched(false);
      onProduct(product);
    } catch (err: unknown) {
      if (lookupId !== lookupIdRef.current) {
        return;
      }
      const kind = err instanceof OffLookupError ? err.kind : null;
      setLookupError({
        message: kind ? LOOKUP_ERRORS[kind] : 'Une erreur est survenue',
        onField: kind === 'invalid-barcode',
      });
    } finally {
      if (lookupId === lookupIdRef.current) {
        setIsLookingUp(false);
      }
    }
  };

  const handleLookup = async () => {
    if (barcode === '' || isLookingUp) {
      return;
    }
    setLookupError(null);
    if (error) {
      setIsTouched(true);
      inputRef.current?.focus();
      return;
    }

    await runLookup(barcode);
  };

  // Google's scanner opens over the app; closing it without a code is no
  // error.
  const handleScan = async () => {
    setLookupError(null);
    try {
      const scanned = await scanBarcode();
      if (!scanned) return;
      onChange(scanned);
      await runLookup(scanned);
    } catch (err: unknown) {
      setLookupError({
        message:
          err instanceof ScannerNotReadyError
            ? 'Scanner en préparation, réessayez dans 1 min'
            : 'Scanner indisponible',
        onField: false,
      });
    }
  };

  const formatError = isTouched && (isFocused || showError) ? error : undefined;

  return (
    <>
      <div className="relative flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="food-barcode" className={LABEL_CLASS}>
            Code-barres
          </label>
          <a
            href={
              foundBarcode !== null && foundBarcode === barcode
                ? `${OFF_URL}/product/${foundBarcode}`
                : OFF_URL
            }
            target="_blank"
            rel="noreferrer"
            title="Données fournies par Open Food Facts"
            className="flex shrink-0 items-center gap-1 text-xs text-theme-500 transition-colors hover:text-theme-700"
          >
            <span>
              via <span className="max-[400px]:hidden">Open Food Facts</span>
              <span className="min-[400px]:hidden">OFF</span>
            </span>
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
        <div className="flex gap-2">
          <Input
            id="food-barcode"
            type="text"
            inputMode="numeric"
            placeholder="Ex : 7612100018477"
            ref={inputRef}
            value={value}
            readOnly={isLookingUp}
            onChange={(e) => {
              onChange(e.target.value);
              setLookupError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleLookup();
              }
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsTouched(true);
              setIsFocused(false);
            }}
            data-invalid={Boolean(isTouched && error) || lookupError?.onField}
          />
          {hasCamera && (
            <button
              type="button"
              onClick={() => void handleScan()}
              disabled={isLookingUp}
              className={ICON_BUTTON_CLASS}
            >
              <ScanBarcode className="h-4 w-4" />
            </button>
          )}
          <div className="relative flex shrink-0">
            <button
              type="button"
              onClick={() => void handleLookup()}
              disabled={barcode === '' || isLookingUp}
              className={ICON_BUTTON_CLASS}
            >
              {isLookingUp ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </button>
            <FieldError
              align="right"
              message={
                lookupError && !lookupError.onField
                  ? lookupError.message
                  : undefined
              }
            />
          </div>
        </div>
        <FieldError
          message={lookupError?.onField ? lookupError.message : formatError}
        />
      </div>
    </>
  );
}
