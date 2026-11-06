import { useCallback, useEffect, useRef, useState } from 'react';

import { listFoodItems } from '../components/food/api';
import type { FoodItem } from '../components/food/types';
import { listMealsOnDate } from '../components/meal/api';
import type { Meal } from '../components/meal/types';
import { toDateKey } from '../utils/dateKey';
import { useDataVersion } from './useDataVersion';

const PREFETCH_DELAY_MS = 200;
const NO_MEALS: Meal[] = [];

/**
 * Date key of the day before (-1) or after (+1). Noon avoids any shift around
 * daylight saving time.
 */
function neighbourKey(dateKey: string, offset: number) {
  const day = new Date(`${dateKey}T12:00:00`);
  day.setDate(day.getDate() + offset);
  return toDateKey(day);
}

/**
 * The journal of one day plus the food library. Each day is cached once loaded,
 * and the days before and after are prefetched right after, so moving from day
 * to day is instant.
 */
export function useDailyMeals(date: Date) {
  const dateKey = toDateKey(date);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [foodsError, setFoodsError] = useState<string | null>(null);
  const [foodsAttempt, setFoodsAttempt] = useState(0);
  const [days, setDays] = useState<Record<string, Meal[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const loaded = useRef(new Set<string>());
  const pending = useRef(new Set<string>());
  // One controller for the whole life of the hook: a day still loading when the
  // user moves on is kept, it is only cancelled when the page closes.
  const lifetime = useRef<AbortController | null>(null);
  const version = useDataVersion();

  useEffect(() => {
    const controller = new AbortController();
    listFoodItems(controller.signal)
      .then(setFoodItems)
      .catch(() => {
        if (controller.signal.aborted) return;
        setFoodsError('Impossible de charger les aliments.');
      });
    return () => controller.abort();
  }, [foodsAttempt, version]);

  useEffect(() => {
    const controller = new AbortController();
    const inFlight = pending.current;
    lifetime.current = controller;
    return () => {
      controller.abort();
      inFlight.clear();
    };
  }, []);

  const loadDay = useCallback((dayKey: string) => {
    if (pending.current.has(dayKey)) return;
    pending.current.add(dayKey);
    const signal = lifetime.current?.signal;

    listMealsOnDate(dayKey, signal)
      .then((meals) => {
        loaded.current.add(dayKey);
        setDays((prev) => ({ ...prev, [dayKey]: meals }));
        setErrors((prev) => {
          if (!(dayKey in prev)) return prev;
          const next = { ...prev };
          delete next[dayKey];
          return next;
        });
      })
      .catch(() => {
        if (signal?.aborted) return;
        setErrors((prev) => ({
          ...prev,
          [dayKey]: 'Impossible de charger le journal.',
        }));
      })
      .finally(() => {
        if (!signal?.aborted) pending.current.delete(dayKey);
      });
  }, []);

  // After a change elsewhere, the cached days are out of date: read the shown
  // one again (its old meals stay on screen meanwhile) and forget the others.
  const seenVersion = useRef(version);
  useEffect(() => {
    if (seenVersion.current === version) return;
    seenVersion.current = version;
    loaded.current.clear();
    loadDay(dateKey);
  }, [version, dateKey, loadDay]);

  useEffect(() => {
    if (!loaded.current.has(dateKey)) loadDay(dateKey);

    const timer = setTimeout(() => {
      [-1, 1].forEach((offset) => {
        const neighbour = neighbourKey(dateKey, offset);
        if (!loaded.current.has(neighbour)) loadDay(neighbour);
      });
    }, PREFETCH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [dateKey, loadDay]);

  const meals = days[dateKey];
  const dayError = errors[dateKey];

  return {
    meals: meals ?? NO_MEALS,
    foodItems,
    isReady: meals !== undefined,
    isLoading: meals === undefined && dayError === undefined,
    loadError: dayError ?? foodsError,
    reload: () => loadDay(dateKey),
    retry: () => {
      if (foodsError !== null) {
        setFoodsError(null);
        setFoodsAttempt((attempt) => attempt + 1);
      }
      setErrors((prev) => {
        if (!(dateKey in prev)) return prev;
        const next = { ...prev };
        delete next[dateKey];
        return next;
      });
      loadDay(dateKey);
    },
  };
}
