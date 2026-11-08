import type { Profile, UpdateProfileInput } from '../components/profile/api';
import { THEME_IDS } from '../components/theme/themeList';
import type { Database, Executor, SqlValue } from '../db/database';
import { effectiveTargetWeight, fatFreeMassOf } from './composition';
import { goalStartOf } from './goals';
import {
  checkBoolean,
  checkChoice,
  checkDateOnly,
  checkOptionalNumber,
} from './validation';

const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;

const GOAL_TYPES = [
  'LOSE_FAT',
  'LOSE_WEIGHT',
  'MAINTAIN',
  'GAIN_MUSCLE',
] as const;

const ACTIVITY_LEVELS = [
  'SEDENTARY',
  'LIGHTLY_ACTIVE',
  'MODERATELY_ACTIVE',
  'VERY_ACTIVE',
  'EXTRA_ACTIVE',
] as const;

interface ProfileRow {
  height: number | null;
  target_weight: number | null;
  target_body_fat: number | null;
  daily_calorie_goal: number | null;
  daily_protein_goal: number | null;
  daily_carbs_goal: number | null;
  daily_fat_goal: number | null;
  gender: string | null;
  birth_date: string | null;
  activity_level: string | null;
  goal_type: string | null;
  goal_pace: number | null;
  theme: string | null;
  lean_loss_alert: number;
}

/** Where each profile field is stored, and the rule its value follows. */
const NUMBER_FIELDS = [
  {
    field: 'height',
    column: 'height',
    label: 'taille',
    rule: { min: 0, exclusive: true, max: 300 },
  },
  {
    field: 'targetWeight',
    column: 'target_weight',
    label: 'poids cible',
    rule: { min: 0, exclusive: true, max: 500 },
  },
  {
    field: 'targetBodyFat',
    column: 'target_body_fat',
    label: 'masse grasse cible',
    rule: { min: 3, max: 60, integer: true },
  },
  {
    field: 'goalPace',
    column: 'goal_pace',
    label: 'rythme',
    rule: { min: 0, max: 5 },
  },
  {
    field: 'dailyCalorieGoal',
    column: 'daily_calorie_goal',
    label: 'objectif calorique',
    rule: { min: 0, exclusive: true, max: 10000, integer: true },
  },
  {
    field: 'dailyProteinGoal',
    column: 'daily_protein_goal',
    label: 'objectif protéines',
    rule: { min: 0, exclusive: true, max: 1000, integer: true },
  },
  {
    field: 'dailyCarbsGoal',
    column: 'daily_carbs_goal',
    label: 'objectif glucides',
    rule: { min: 0, exclusive: true, max: 2000, integer: true },
  },
  {
    field: 'dailyFatGoal',
    column: 'daily_fat_goal',
    label: 'objectif lipides',
    rule: { min: 0, exclusive: true, max: 1000, integer: true },
  },
] as const;

const PROFILE_COLUMNS =
  'height, target_weight, target_body_fat, daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal, gender, birth_date, activity_level, goal_type, goal_pace, theme, lean_loss_alert';

function toProfile(row: ProfileRow): Profile {
  return {
    height: row.height,
    targetWeight: row.target_weight,
    targetBodyFat: row.target_body_fat,
    dailyCalorieGoal: row.daily_calorie_goal,
    dailyProteinGoal: row.daily_protein_goal,
    dailyCarbsGoal: row.daily_carbs_goal,
    dailyFatGoal: row.daily_fat_goal,
    gender: row.gender,
    birthDate: row.birth_date,
    activityLevel: row.activity_level,
    goalType: row.goal_type,
    goalPace: row.goal_pace,
    theme: row.theme,
    leanLossAlert: row.lean_loss_alert === 1,
  };
}

/** The profile of the person using the app (one row, created empty). */
export async function getProfile(db: Executor) {
  const [row] = await db.query<ProfileRow>(
    `SELECT ${PROFILE_COLUMNS} FROM profile WHERE id = 1`,
  );
  return toProfile(row);
}

/**
 * Checks the fields given and returns the columns to write. A field left out
 * stays as it is; null clears it.
 */
function changesFrom(input: UpdateProfileInput) {
  const changes: [string, SqlValue][] = [];

  for (const { field, column, label, rule } of NUMBER_FIELDS) {
    if (input[field] !== undefined) {
      changes.push([column, checkOptionalNumber(input[field], label, rule)]);
    }
  }
  if (input.gender !== undefined) {
    changes.push([
      'gender',
      input.gender === null
        ? null
        : checkChoice(input.gender, 'genre', GENDERS),
    ]);
  }
  if (input.birthDate !== undefined) {
    changes.push([
      'birth_date',
      input.birthDate === null
        ? null
        : checkDateOnly(input.birthDate, 'date de naissance'),
    ]);
  }
  if (input.activityLevel !== undefined) {
    changes.push([
      'activity_level',
      input.activityLevel === null
        ? null
        : checkChoice(
            input.activityLevel,
            "niveau d'activité",
            ACTIVITY_LEVELS,
          ),
    ]);
  }
  if (input.goalType !== undefined) {
    changes.push([
      'goal_type',
      input.goalType === null
        ? null
        : checkChoice(input.goalType, 'objectif', GOAL_TYPES),
    ]);
  }
  if (input.leanLossAlert !== undefined) {
    changes.push([
      'lean_loss_alert',
      checkBoolean(input.leanLossAlert, 'alerte de masse maigre') ? 1 : 0,
    ]);
  }
  if (input.theme !== undefined) {
    changes.push([
      'theme',
      input.theme === null
        ? null
        : checkChoice(input.theme, 'thème', THEME_IDS),
    ]);
  }
  return changes;
}

/** When the current goal began (see goalStartOf), or null before any goal. */
export async function getGoalStart(db: Executor) {
  const rows = await db.query<{ objective: string | null; start_date: string }>(
    'SELECT objective, start_date FROM goal_setting',
  );
  return goalStartOf(
    rows.map((row) => ({
      objective: row.objective,
      startDate: row.start_date,
    })),
  );
}

/**
 * Saves the fields that changed. A new daily calorie goal is also added to the
 * goal history, with the objective of that moment: lose or gain weight, from
 * the latest weigh-in and the target weight, the one the target body fat
 * sets when the scale tells the fat-free mass.
 */
export async function updateProfile(
  db: Database,
  input: UpdateProfileInput,
  now = new Date(),
) {
  const changes = changesFrom(input);

  return db.transaction(async (tx) => {
    const before = await getProfile(tx);
    if (changes.length > 0) {
      await tx.run(
        `UPDATE profile SET ${changes.map(([column]) => `${column} = ?`).join(', ')} WHERE id = 1`,
        changes.map(([, value]) => value),
      );
    }
    const after = await getProfile(tx);

    if (
      after.dailyCalorieGoal !== null &&
      after.dailyCalorieGoal !== before.dailyCalorieGoal
    ) {
      const [latest] = await tx.query<{ weight: number }>(
        'SELECT weight FROM weight_log ORDER BY logged_at DESC, id DESC LIMIT 1',
      );
      const [measured] = await tx.query<{
        weight: number;
        body_fat: number | null;
        fat_free_mass: number | null;
      }>(
        `SELECT weight, body_fat, fat_free_mass FROM weight_log
         WHERE body_fat IS NOT NULL OR fat_free_mass IS NOT NULL
         ORDER BY logged_at DESC, id DESC LIMIT 1`,
      );
      const target = effectiveTargetWeight(
        after,
        measured
          ? fatFreeMassOf({
              weight: measured.weight,
              bodyFat: measured.body_fat,
              fatFreeMass: measured.fat_free_mass,
            })
          : null,
      );
      const objective =
        latest && target !== null
          ? target < latest.weight
            ? 'lose'
            : target > latest.weight
              ? 'gain'
              : null
          : null;

      await tx.run(
        `INSERT INTO goal_setting (daily_calories, daily_protein, daily_carbs, daily_fat, objective, start_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          after.dailyCalorieGoal,
          after.dailyProteinGoal,
          after.dailyCarbsGoal,
          after.dailyFatGoal,
          objective,
          now.toISOString(),
        ],
      );
    }
    return after;
  });
}
