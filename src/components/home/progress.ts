/**
 * Places a progress and its goal on one scale, for a bar or a ring. Up to the
 * goal, the scale is the goal: `reached` grows and `goalAt` stays at the end.
 * Beyond it, the scale is the value: the whole bar is filled, `goalAt` marks
 * where the goal sits and what follows it is the excess.
 */
export function progressScale(value: number, goal: number) {
  if (goal <= 0 || value <= 0) return { reached: 0, goalAt: 1 };
  if (value <= goal) return { reached: value / goal, goalAt: 1 };
  return { reached: 1, goalAt: goal / value };
}
