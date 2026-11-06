/** Lower case without accents, to compare names the way people type them. */
const simplify = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/** True when `name` holds the typed `query`, case and accents aside. */
export function matchesSearch(name: string, query: string) {
  return simplify(name).includes(simplify(query));
}

/** True when two names are the same, case and accents aside. */
export function isSameName(a: string, b: string) {
  return simplify(a) === simplify(b);
}
