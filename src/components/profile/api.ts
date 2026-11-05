import { measureExpenditure } from '../../data/energy';
import { throwIfAborted } from '../../data/errors';
import * as profileData from '../../data/profile';
import * as weights from '../../data/weights';
import { getDatabase } from '../../db/appDatabase';

/** The body measures and daily goals of the person using the app. */
export interface Profile {
  height: number | null;
  targetWeight: number | null;
  dailyCalorieGoal: number | null;
  dailyProteinGoal: number | null;
  dailyCarbsGoal: number | null;
  dailyFatGoal: number | null;
  gender: string | null;
  birthDate: string | null;
  activityLevel: string | null;
  goalType: string | null;
  theme: string | null;
}

/**
 * Fields to change in the profile; the fields left out stay as they are, and
 * null clears a measure or a goal.
 */
export interface UpdateProfileInput {
  height?: number | null;
  targetWeight?: number | null;
  dailyCalorieGoal?: number | null;
  dailyProteinGoal?: number | null;
  dailyCarbsGoal?: number | null;
  dailyFatGoal?: number | null;
  gender?: string | null;
  birthDate?: string | null;
  activityLevel?: string | null;
  goalType?: string | null;
  theme?: string | null;
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
  return profileData.updateProfile(await getDatabase(), input);
}

/** Corrects a weigh-in. */
export async function updateWeight(entryId: number, input: LogWeightInput) {
  return weights.updateWeight(await getDatabase(), entryId, input);
}

/** Deletes a weigh-in. */
export async function deleteWeight(entryId: number) {
  return weights.deleteWeight(await getDatabase(), entryId);
}

/** Records a new weigh-in, dated now. */
export async function logWeight(input: LogWeightInput) {
  return weights.logWeight(await getDatabase(), input);
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
