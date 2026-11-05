/** Compare two participant names the way a person would: ignore case,
 *  extra spaces and the invisible direction marks phone keyboards insert
 *  around Arabic text. Used by checkout to tell a repeat submission by the
 *  same person apart from a relative or friend sharing one email address. */
export function sameName(a: string, b: string): boolean {
  const norm = (v: string) =>
    v
      .replace(/[‎‏‪-‮⁦-⁩]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  return norm(a) === norm(b);
}
