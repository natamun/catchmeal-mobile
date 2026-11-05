/** What the person aims at, as stored in the profile. */
export type GoalType = 'LOSE_FAT' | 'LOSE_WEIGHT' | 'MAINTAIN' | 'GAIN_MUSCLE';

/**
 * Paces offered for each goal, in % of the body weight per week, the default
 * first. Losing fat goes slower than losing weight so the muscle stays.
 */
export const PACES: Record<GoalType, readonly number[]> = {
  LOSE_FAT: [0.5, 0.25, 0.75],
  LOSE_WEIGHT: [0.75, 0.5, 1],
  MAINTAIN: [0],
  GAIN_MUSCLE: [0.25, 0.1, 0.5],
};

/** Protein in g per kg of body weight: more when losing fat or building. */
const PROTEIN_PER_KG: Record<GoalType, number> = {
  LOSE_FAT: 2,
  LOSE_WEIGHT: 1.6,
  MAINTAIN: 1.6,
  GAIN_MUSCLE: 1.8,
};

/** Energy of one kg of body weight lost (mostly fat) or gained (with muscle). */
const KCAL_PER_KG_LOST = 7700;
const KCAL_PER_KG_GAINED = 4800;

/** Fat: a quarter of the calories, never under 0.8 g per kg of body weight. */
const FAT_SHARE = 0.25;
const FAT_MIN_PER_KG = 0.8;

export interface GoalInput {
  /** Latest weight, in kg. */
  weight: number;
  /** Calories burned at rest. */
  bmr: number;
  /** Calories burned per day, estimated or measured. */
  expenditure: number;
  goalType: GoalType;
  /** % of the body weight per week. */
  pace: number;
}

export interface Recommendation {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  /** Expected change of weight per week, in kg (negative when losing). */
  weeklyChangeKg: number;
  /** True when the pace asked would go under the BMR, so it was capped. */
  limitedByBmr: boolean;
}

const roundTo10 = (kcal: number) => Math.round(kcal / 10) * 10;

/**
 * Daily calories and macros for a goal. The calories follow the pace (a
 * deficit to lose, a surplus to gain) but never go under the BMR; protein
 * depends on the goal, fat has a floor, and carbs take what is left.
 */
export function recommendGoals(input: GoalInput): Recommendation {
  const { weight, bmr, expenditure, goalType, pace } = input;
  const losing = goalType === 'LOSE_FAT' || goalType === 'LOSE_WEIGHT';
  const gaining = goalType === 'GAIN_MUSCLE';
  const weeklyKg = (weight * pace) / 100;

  const dailyDelta = losing
    ? -(weeklyKg * KCAL_PER_KG_LOST) / 7
    : gaining
      ? (weeklyKg * KCAL_PER_KG_GAINED) / 7
      : 0;
  const wanted = expenditure + dailyDelta;
  const limitedByBmr = wanted < bmr;
  const kcal = roundTo10(limitedByBmr ? bmr : wanted);

  const protein = Math.round(weight * PROTEIN_PER_KG[goalType]);
  const fat = Math.round(
    Math.max(weight * FAT_MIN_PER_KG, (kcal * FAT_SHARE) / 9),
  );
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));

  // When capped, the weight changes only by the deficit actually kept.
  const keptDelta = kcal - expenditure;
  const weeklyChangeKg = losing
    ? (keptDelta * 7) / KCAL_PER_KG_LOST
    : gaining
      ? weeklyKg
      : 0;

  return { kcal, protein, fat, carbs, weeklyChangeKg, limitedByBmr };
}

/**
 * The goal that fits the target weight when none was chosen: losing fat above
 * the target, building muscle below it, maintaining otherwise.
 */
export function suggestGoalType(
  weight: number,
  targetWeight: number | null,
): GoalType {
  if (targetWeight === null || Math.abs(weight - targetWeight) < 0.5) {
    return 'MAINTAIN';
  }
  return targetWeight < weight ? 'LOSE_FAT' : 'GAIN_MUSCLE';
}

/**
 * When the target weight should be reached at this weekly change, or null
 * when the change does not lead to it.
 */
export function estimateReachDate(
  weight: number,
  targetWeight: number,
  weeklyChangeKg: number,
  from: Date,
): Date | null {
  const gap = targetWeight - weight;
  if (weeklyChangeKg === 0 || Math.sign(gap) !== Math.sign(weeklyChangeKg)) {
    return null;
  }
  const days = Math.ceil((gap / weeklyChangeKg) * 7);
  return new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
}
