/** Lower case without accents, to compare names the way people type them. */
const simplify = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/**
 * True when every word of the typed `query` sits in one of `texts`, in any
 * order, case and accents aside: "frite coop" finds "Frites" of brand "Coop".
 */
export function matchesSearch(
  texts: string | readonly (string | null | undefined)[],
  query: string,
) {
  const haystack = (typeof texts === 'string' ? [texts] : texts)
    .filter((text): text is string => typeof text === 'string')
    .map(simplify);
  return simplify(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.some((text) => text.includes(word)));
}

/** True when two names are the same, case and accents aside. */
export function isSameName(a: string, b: string) {
  return simplify(a) === simplify(b);
}
