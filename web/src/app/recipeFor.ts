// A recipe opened for a certain number of people — a dish taken in «Стол в складчину» opens for everybody coming,
// not for the person's usual 2. Said once, for that one opening.
let next: { id: string; servings: number; note: string } | null = null;
export function openForMany(id: string, servings: number, note: string): void { next = { id, servings, note }; }
export function takeServingsFor(id: string): { servings: number; note: string } | null {
  if (!next || next.id !== id) return null;
  const n = next; next = null;
  return { servings: n.servings, note: n.note };
}
