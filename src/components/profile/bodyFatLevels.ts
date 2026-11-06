interface Level {
  /** The highest share of body fat of the level, in %. */
  upTo: number;
  label: string;
}

/**
 * The usual body fat levels, from the leanest; a woman holds about 8 points
 * more than a man for the same look. "Athlétique" is the look of a good
 * shape. A scale is off by a few points but always the same way, so the
 * level is a starting point, set again in front of the mirror.
 */
const LEVELS: Record<string, { from: number; levels: Level[] }> = {
  MALE: {
    from: 8,
    levels: [
      { upTo: 12, label: 'sec' },
      { upTo: 15, label: 'athlétique' },
      { upTo: 19, label: 'en forme' },
      { upTo: 24, label: 'moyen' },
    ],
  },
  FEMALE: {
    from: 15,
    levels: [
      { upTo: 20, label: 'sèche' },
      { upTo: 24, label: 'athlétique' },
      { upTo: 28, label: 'en forme' },
      { upTo: 33, label: 'moyenne' },
    ],
  },
};

/** Without a gender, the range of both, with no level named. */
const ANY = { from: 8, to: 33 };

/** The level of a share of body fat, such as "athlétique", or null. */
export function bodyFatLevel(gender: string | null, percent: number) {
  const scale = gender ? LEVELS[gender] : undefined;
  return scale?.levels.find(({ upTo }) => percent <= upTo)?.label ?? null;
}

/**
 * The targets offered, one per point, such as "14 % · athlétique", after a
 * choice for none. The current target stays offered when out of the range.
 */
export function bodyFatOptions(gender: string | null, current: number | null) {
  const scale = gender ? LEVELS[gender] : undefined;
  const from = scale?.from ?? ANY.from;
  const to = scale?.levels.at(-1)!.upTo ?? ANY.to;
  const percents = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  if (current !== null && !percents.includes(current)) {
    percents.push(current);
    percents.sort((a, b) => a - b);
  }
  return [
    { value: '', label: 'Aucune, je vise un poids' },
    ...percents.map((percent) => {
      const level = bodyFatLevel(gender, percent);
      return {
        value: String(percent),
        label: level ? `${percent} % · ${level}` : `${percent} %`,
      };
    }),
  ];
}
