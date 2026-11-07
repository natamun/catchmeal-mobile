import { isValidBarcode } from '../components/food/barcode';
import type { OffProduct } from '../components/food/types';

const API_URL = 'https://world.openfoodfacts.org';
// `quantity` must stay: API v3.4 only returns product_quantity_unit with it.
const FIELDS =
  'code,product_name,product_name_fr,brands,quantity,product_quantity_unit,serving_size,serving_quantity,nutriments';
/** Open Food Facts asks every app to name itself and give a contact. */
export const USER_AGENT = 'CatCHMeal/1.0 (catchmeal07@gmail.com)';
const FOUND_TTL_MS = 24 * 60 * 60 * 1000;
const NOT_FOUND_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;
// Their limit is 15 product reads per minute and per IP address.
const MAX_CALLS_PER_MINUTE = 12;
const MINUTE_MS = 60 * 1000;
const KJ_PER_KCAL = 4.184;

/** Why a lookup gave no answer. */
export type OffErrorKind =
  'invalid-barcode' | 'too-many-lookups' | 'unavailable';

export class OffLookupError extends Error {
  readonly kind: OffErrorKind;

  constructor(kind: OffErrorKind) {
    super(`Open Food Facts lookup failed: ${kind}`);
    this.name = 'OffLookupError';
    this.kind = kind;
  }
}

export interface HttpResponse {
  status: number;
  data: unknown;
}

/** Sends a GET request; rejects only when no answer came back at all. */
export type HttpGet = (
  url: string,
  headers: Record<string, string>,
) => Promise<HttpResponse>;

interface OffResponse {
  code?: unknown;
  product?: {
    product_name?: unknown;
    product_name_fr?: unknown;
    brands?: unknown;
    product_quantity_unit?: unknown;
    serving_size?: unknown;
    serving_quantity?: unknown;
    nutriments?: Record<string, unknown>;
  };
}

const toText = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

const toAmount = (value: unknown) => {
  const amount =
    typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof amount === 'number' && Number.isFinite(amount) && amount >= 0
    ? Math.round(amount * 10) / 10
    : null;
};

/**
 * Checks the barcode (8 to 14 digits, right check digit) and writes it the way
 * Open Food Facts stores it: 8 digits for short codes, 13 for the others.
 */
export function normalizeBarcode(raw: string) {
  if (!isValidBarcode(raw)) {
    throw new OffLookupError('invalid-barcode');
  }
  const significant = raw.replace(/^0+/, '');
  return significant.padStart(significant.length <= 8 ? 8 : 13, '0');
}

/** "1 biscuit (12 g)" gives "biscuit"; "2 biscuits (25 g)" gives nothing. */
const ONE_PIECE = /^1\s+([^\d(=:]+?)\s*(?:[(=:]|$)/;
/** "30 g" or "250ml": a serving given by its weight alone. */
const WEIGHT_ONLY = /^\d+(?:[.,]\d+)?\s*(?:g|ml)\b/i;

/**
 * Their serving as a portion of the food, when it is one piece: "1 biscuit
 * (12 g)" becomes a biscuit of 12 g, "30 g" a portion of 30 g. A serving of
 * several pieces is left out: one piece would only be guessed.
 */
function toPortion(size: unknown, quantity: unknown) {
  const weight = toAmount(quantity);
  const text = toText(size);
  const none = { portionQuantity: null, portionName: null };
  if (!weight || !text) return none;
  const piece = ONE_PIECE.exec(text);
  if (piece) {
    const name = piece[1].trim().toLowerCase();
    return {
      portionQuantity: weight,
      portionName: name.length <= 30 ? name : null,
    };
  }
  return WEIGHT_ONLY.test(text)
    ? { portionQuantity: weight, portionName: null }
    : none;
}

/**
 * The product as the food form needs it: values per 100 g, or per 100 ml for a
 * drink, kcal computed from kJ when only kJ is known, and their serving as a
 * portion when it is one piece.
 */
function toProduct(barcode: string, body: OffResponse): OffProduct {
  const product = body.product ?? {};
  const nutriments = product.nutriments ?? {};
  const kj = toAmount(nutriments['energy-kj_100g'] ?? nutriments.energy_100g);

  return {
    barcode: toText(body.code) ?? barcode,
    name: toText(product.product_name_fr) ?? toText(product.product_name),
    brand: toText(toText(product.brands)?.split(',')[0]),
    baseQuantity: 100,
    baseUnit:
      toText(product.product_quantity_unit)?.toLowerCase() === 'ml'
        ? 'MILLILITER'
        : 'GRAM',
    kcal:
      toAmount(nutriments['energy-kcal_100g']) ??
      (kj === null ? null : toAmount(kj / KJ_PER_KCAL)),
    protein: toAmount(nutriments.proteins_100g),
    carbs: toAmount(nutriments.carbohydrates_100g),
    fat: toAmount(nutriments.fat_100g),
    ...toPortion(product.serving_size, product.serving_quantity),
  };
}

/**
 * Builds the lookup function. It remembers the answers (a found product for a
 * day, an unknown one for 10 minutes) and refuses to go over 12 requests a
 * minute, below the Open Food Facts limit.
 */
export function createOffLookup(get: HttpGet, now: () => number = Date.now) {
  const cache = new Map<
    string,
    { product: OffProduct | null; expiresAt: number }
  >();
  let callTimes: number[] = [];

  function remember(barcode: string, product: OffProduct | null) {
    cache.delete(barcode);
    if (cache.size >= MAX_CACHE_ENTRIES) {
      const [oldest] = cache.keys();
      cache.delete(oldest);
    }
    cache.set(barcode, {
      product,
      expiresAt: now() + (product ? FOUND_TTL_MS : NOT_FOUND_TTL_MS),
    });
  }

  async function fetchProduct(barcode: string) {
    const time = now();
    callTimes = callTimes.filter((call) => call > time - MINUTE_MS);
    if (callTimes.length >= MAX_CALLS_PER_MINUTE) {
      throw new OffLookupError('too-many-lookups');
    }
    callTimes.push(time);

    let response: HttpResponse;
    try {
      response = await get(
        `${API_URL}/api/v3.4/product/${barcode}?fields=${FIELDS}`,
        { 'User-Agent': USER_AGENT },
      );
    } catch {
      throw new OffLookupError('unavailable');
    }

    if (response.status === 404) return null;
    // Their overload protection answers 503 with an HTML page, not JSON.
    if (
      response.status < 200 ||
      response.status >= 300 ||
      typeof response.data !== 'object' ||
      response.data === null
    ) {
      throw new OffLookupError('unavailable');
    }

    const body = response.data as OffResponse;
    return body.product ? toProduct(barcode, body) : null;
  }

  /**
   * The product with this barcode, or null when Open Food Facts does not know
   * it. Throws an OffLookupError.
   */
  return async function lookup(rawBarcode: string) {
    const barcode = normalizeBarcode(rawBarcode);

    const cached = cache.get(barcode);
    if (cached && cached.expiresAt > now()) {
      return cached.product;
    }

    const product = await fetchProduct(barcode);
    remember(barcode, product);
    return product;
  };
}
