import { CapacitorHttp } from '@capacitor/core';

import type { HttpGet } from '../data/openFoodFacts';

const TIMEOUT_MS = 5000;

/**
 * GET through Android's own HTTP client instead of the WebView's fetch, which
 * is not allowed to set a User-Agent header. In a browser it falls back to
 * fetch.
 */
export const nativeGet: HttpGet = async (url, headers) => {
  const response = await CapacitorHttp.get({
    url,
    headers,
    connectTimeout: TIMEOUT_MS,
    readTimeout: TIMEOUT_MS,
    responseType: 'json',
  });
  return { status: response.status, data: response.data as unknown };
};
