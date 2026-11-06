import { prepareZXingModule } from '@yudiel/react-qr-scanner';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

// The barcode decoder is WebAssembly. Vite bundles its .wasm file, and the
// decoder must load it from there instead of a CDN.
const OVERRIDES = {
  locateFile: (path: string, prefix: string) =>
    path.endsWith('.wasm') ? wasmUrl : prefix + path,
};

prepareZXingModule({ overrides: OVERRIDES, equalityFn: Object.is });

/** Loads and compiles the decoder now, so the first scan does not wait. */
export function warmUpDecoder() {
  return prepareZXingModule({
    overrides: OVERRIDES,
    equalityFn: Object.is,
    fireImmediately: true,
  });
}
