/**
 * PostgREST embeds a to-one relation as a single object when it can
 * unambiguously resolve the foreign key, but falls back to an array in some
 * schema configurations. Since we can't verify the live behavior against
 * this project from this environment, unwrap defensively either way.
 */
export function toOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function toMany<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}
