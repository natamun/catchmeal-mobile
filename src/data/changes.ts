type Listener = () => void;

let version = 0;
const listeners = new Set<Listener>();

/**
 * Tells every screen that the stored data changed. The tabs stay mounted in
 * the background, so this is how a hidden one knows to read its data again.
 */
export function notifyDataChanged() {
  version += 1;
  for (const listener of listeners) listener();
}

export function subscribeToDataChanges(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** A number that grows at each change of the stored data. */
export function getDataVersion() {
  return version;
}

/** Runs a write, then tells the screens the data changed. */
export async function changing<T>(write: Promise<T>): Promise<T> {
  const result = await write;
  notifyDataChanged();
  return result;
}
