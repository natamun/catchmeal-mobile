import { JSON_HEADERS, request } from '../../utils/request';

const BASE_URL = import.meta.env.VITE_API_URL;

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
  gender?: string;
  birthDate?: string;
  activityLevel?: string;
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

/** Saves the profile fields that changed. */
export function updateProfile(input: UpdateProfileInput) {
  return request<Profile>(`${BASE_URL}/profile`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
}

/** Corrects a weigh-in. */
export function updateWeight(entryId: number, input: LogWeightInput) {
  return request<WeightEntry>(`${BASE_URL}/weight/${entryId}`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
}

/** Deletes a weigh-in. */
export function deleteWeight(entryId: number) {
  return request<WeightEntry>(`${BASE_URL}/weight/${entryId}`, {
    method: 'DELETE',
  });
}

/** Records a new weigh-in, dated now. */
export function logWeight(input: LogWeightInput) {
  return request<WeightEntry>(`${BASE_URL}/weight`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
}

/** Every weigh-in, the most recent first. */
export function getWeightHistory(signal?: AbortSignal) {
  return request<WeightEntry[]>(`${BASE_URL}/weight`, { signal });
}
