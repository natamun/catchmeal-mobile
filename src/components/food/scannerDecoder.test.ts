import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const versionOf = (path: string) =>
  (JSON.parse(readFileSync(path, 'utf8')) as { version: string }).version;

it('serves the decoder file of the zxing version the scanner expects', () => {
  const scanner = JSON.parse(
    readFileSync('node_modules/barcode-detector/package.json', 'utf8'),
  ) as { dependencies: Record<string, string> };

  // The app hands its own zxing_reader.wasm to the scanner: a different
  // version fails to start ("LinkError") and the camera shows an error.
  expect(versionOf('node_modules/zxing-wasm/package.json')).toBe(
    scanner.dependencies['zxing-wasm'],
  );
});
