import { describe, expect, it, vi } from 'vitest';

import {
  createOffLookup,
  normalizeBarcode,
  OffLookupError,
  USER_AGENT,
  type HttpGet,
  type HttpResponse,
} from './openFoodFacts';

const NUTELLA = '3017620422003';

const NUTELLA_BODY = {
  code: NUTELLA,
  product: {
    product_name: 'Nutella',
    product_name_fr: 'Nutella pâte à tartiner',
    brands: 'Ferrero, Nutella',
    product_quantity_unit: 'g',
    nutriments: {
      'energy-kcal_100g': 539,
      proteins_100g: 6.3,
      carbohydrates_100g: 57.5,
      fat_100g: 30.94,
    },
  },
};

function answering(response: HttpResponse) {
  return vi.fn<HttpGet>().mockResolvedValue(response);
}

async function kindOf(promise: Promise<unknown>) {
  const error: unknown = await promise.catch((e: unknown) => e);
  return error instanceof OffLookupError ? error.kind : error;
}

describe('normalizeBarcode', () => {
  it('keeps EAN-13 and EAN-8 codes', () => {
    expect(normalizeBarcode(NUTELLA)).toBe(NUTELLA);
    expect(normalizeBarcode('96385074')).toBe('96385074');
  });

  it('writes a 12 digit UPC code on 13 digits', () => {
    expect(normalizeBarcode('036000291452')).toBe('0036000291452');
  });

  it.each([
    ['a wrong check digit', '3017620422004'],
    ['letters', '30176204220AB'],
    ['7 digits', '1234567'],
  ])('refuses %s', (_, code) => {
    expect(() => normalizeBarcode(code)).toThrow(OffLookupError);
  });
});

describe('lookup', () => {
  it('asks for the product with the app name and a contact', async () => {
    const get = answering({ status: 200, data: NUTELLA_BODY });

    await createOffLookup(get)(NUTELLA);

    const [url, headers] = get.mock.calls[0];
    expect(url).toMatch(
      /^https:\/\/world\.openfoodfacts\.org\/api\/v3\.4\/product\/3017620422003\?fields=.*quantity/,
    );
    expect(headers).toEqual({ 'User-Agent': USER_AGENT });
  });

  it('turns the answer into a food per 100 g', async () => {
    const lookup = createOffLookup(
      answering({ status: 200, data: NUTELLA_BODY }),
    );

    expect(await lookup(NUTELLA)).toEqual({
      barcode: NUTELLA,
      name: 'Nutella pâte à tartiner',
      brand: 'Ferrero',
      baseQuantity: 100,
      baseUnit: 'GRAM',
      kcal: 539,
      protein: 6.3,
      carbs: 57.5,
      fat: 30.9,
      portionQuantity: null,
      portionName: null,
    });
  });

  it('reads a drink per 100 ml, kcal from kJ and missing values as null', async () => {
    const lookup = createOffLookup(
      answering({
        status: 200,
        data: {
          code: '5449000000996',
          product: {
            product_name: 'Coca-Cola',
            product_quantity_unit: 'ml',
            nutriments: { 'energy-kj_100g': 180, carbohydrates_100g: '10.6' },
          },
        },
      }),
    );

    expect(await lookup('5449000000996')).toEqual({
      barcode: '5449000000996',
      name: 'Coca-Cola',
      brand: null,
      baseQuantity: 100,
      baseUnit: 'MILLILITER',
      kcal: 43,
      protein: null,
      carbs: 10.6,
      fat: null,
      portionQuantity: null,
      portionName: null,
    });
  });

  it.each<[string, string, number | null, string | null]>([
    ['one named piece', '1 biscuit (12,5 g)', 12.5, 'biscuit'],
    ['a weight alone', '30 g', 30, null],
    ['several pieces', '2 biscuits (25 g)', null, null],
  ])(
    'reads a serving of %s as a portion or not',
    async (_, size, weight, name) => {
      const lookup = createOffLookup(
        answering({
          status: 200,
          data: {
            code: '3017760000109',
            product: {
              serving_size: size,
              serving_quantity: weight ? String(weight) : '25',
            },
          },
        }),
      );

      expect(await lookup('3017760000109')).toMatchObject({
        portionQuantity: weight,
        portionName: name,
      });
    },
  );

  it('answers null for an unknown product', async () => {
    const lookup = createOffLookup(answering({ status: 404, data: {} }));

    expect(await lookup(NUTELLA)).toBeNull();
  });

  it('refuses an invalid barcode without any request', async () => {
    const get = answering({ status: 200, data: NUTELLA_BODY });

    expect(await kindOf(createOffLookup(get)('3017620422004'))).toBe(
      'invalid-barcode',
    );
    expect(get).not.toHaveBeenCalled();
  });

  it.each<[string, HttpGet]>([
    ['the network fails', vi.fn<HttpGet>().mockRejectedValue(new Error())],
    ['the server answers 503', answering({ status: 503, data: {} })],
    [
      'the answer is an HTML page',
      answering({ status: 200, data: '<html>busy</html>' }),
    ],
  ])('reports Open Food Facts as unavailable when %s', async (_, get) => {
    expect(await kindOf(createOffLookup(get)(NUTELLA))).toBe('unavailable');
  });

  it('remembers a found product for a day', async () => {
    let time = 0;
    const get = answering({ status: 200, data: NUTELLA_BODY });
    const lookup = createOffLookup(get, () => time);

    await lookup(NUTELLA);
    time = 23 * 60 * 60 * 1000;
    await lookup(NUTELLA);
    expect(get).toHaveBeenCalledTimes(1);

    time = 25 * 60 * 60 * 1000;
    await lookup(NUTELLA);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('remembers an unknown product for 10 minutes', async () => {
    let time = 0;
    const get = answering({ status: 404, data: {} });
    const lookup = createOffLookup(get, () => time);

    await lookup(NUTELLA);
    time = 9 * 60 * 1000;
    await lookup(NUTELLA);
    expect(get).toHaveBeenCalledTimes(1);

    time = 11 * 60 * 1000;
    await lookup(NUTELLA);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('refuses a 13th request within a minute, then accepts again', async () => {
    let time = 0;
    const get = answering({ status: 404, data: {} });
    const lookup = createOffLookup(get, () => time);
    const codes = [
      '3017620422003',
      '5449000000996',
      '7612100018477',
      '7610200337467',
      '96385074',
      '036000291452',
      '4006381333931',
      '5000112637922',
      '8000500310427',
      '7613035974685',
      '3274080005003',
      '5411188112709',
    ];

    for (const code of codes) await lookup(code);
    expect(await kindOf(lookup('4008400401621'))).toBe('too-many-lookups');

    time = 61 * 1000;
    expect(await lookup('4008400401621')).toBeNull();
  });
});
