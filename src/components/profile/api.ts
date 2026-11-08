import { changing } from '../../data/changes';
import { measureExpenditure } from '../../data/energy';
import { throwIfAborted } from '../../data/errors';
import * as profileData from '../../data/profile';
import * as weights from '../../data/weights';
import { getDatabase } from '../../db/appDatabase';

/** The body measures and daily goals of the person using the app. */
export interface Profile {
  height: number | null;
  targetWeight: number | null;
  /** Target share of body fat in %; it sets the target weight when known. */
  targetBodyFat: number | null;
  dailyCalorieGoal: number | null;
  dailyProteinGoal: number | null;
  dailyCarbsGoal: number | null;
  dailyFatGoal: number | null;
  gender: string | null;
  birthDate: string | null;
  activityLevel: string | null;
  goalType: string | null;
  /** Weekly pace picked for the goal, in % of the body weight. */
  goalPace: number | null;
  theme: string | null;
  /** Whether losing weight warns when the fat-free mass falls too fast. */
  leanLossAlert: boolean;
}

/**
 * Fields to change in the profile; the fields left out stay as they are, and
 * null clears a measure or a goal.
 */
export interface UpdateProfileInput {
  height?: number | null;
  targetWeight?: number | null;
  targetBodyFat?: number | null;
  dailyCalorieGoal?: number | null;
  dailyProteinGoal?: number | null;
  dailyCarbsGoal?: number | null;
  dailyFatGoal?: number | null;
  gender?: string | null;
  birthDate?: string | null;
  activityLevel?: string | null;
  goalType?: string | null;
  goalPace?: number | null;
  theme?: string | null;
  leanLossAlert?: boolean;
}

export interface WeightEntry {
  id: number;
  weight: number;
  bodyFat: number | null;
  fatFreeMass: number | null;
  bodyWater: number | null;
  muscleMass: number | null;
  loggedAt: string;
}

export interface LogWeightInput {
  weight: number;
  bodyFat: number | null;
  fatFreeMass: number | null;
  bodyWater: number | null;
  muscleMass: number | null;
}

/** The profile stored on the phone. */
export async function getProfile() {
  return profileData.getProfile(await getDatabase());
}

/** Saves the profile fields that changed. */
export async function updateProfile(input: UpdateProfileInput) {
  return changing(profileData.updateProfile(await getDatabase(), input));
}

/** When the current goal began (ISO), or null before any goal. */
export async function getGoalStart() {
  return profileData.getGoalStart(await getDatabase());
}

/** Corrects a weigh-in. */
export async function updateWeight(entryId: number, input: LogWeightInput) {
  return changing(weights.updateWeight(await getDatabase(), entryId, input));
}

/** Deletes a weigh-in. */
export async function deleteWeight(entryId: number) {
  return changing(weights.deleteWeight(await getDatabase(), entryId));
}

/** Records a new weigh-in, dated now. */
export async function logWeight(input: LogWeightInput) {
  return changing(weights.logWeight(await getDatabase(), input));
}

/** Every weigh-in, the most recent first. */
export async function getWeightHistory(signal?: AbortSignal) {
  const history = await weights.listWeights(await getDatabase());
  throwIfAborted(signal);
  return history;
}

/**
 * The daily expenditure measured from the last four weeks of journal and
 * weigh-ins, or null while there is not enough data.
 */
export async function getMeasuredExpenditure() {
  return measureExpenditure(await getDatabase());
}
