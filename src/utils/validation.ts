/** Length limits shared by the forms. */
export const MAX_LENGTH = {
  foodName: 120,
  brand: 80,
  mealName: 120,
  templateName: 80,
} as const;

export function maxLengthMessage(max: number) {
  return `${max} caractères maximum`;
}
