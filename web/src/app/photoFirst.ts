// Most dishes still have a drawn plate instead of a photo. In the short picks (popular, the day's recipe, shelves)
// dishes with a photo go first among the equally fitting ones — the order is kept otherwise.
import { photoSmallUrl } from "../engine";

export const hasPhoto = (id: string): boolean => photoSmallUrl(id) !== null;

/** Within the first `window` items, those with a photo go first; the rest of the list stays as it was. */
export function photoFirst<T extends { id: string }>(list: T[], window = 40): T[] {
  const head = list.slice(0, window);
  return [...head.filter((r) => hasPhoto(r.id)), ...head.filter((r) => !hasPhoto(r.id)), ...list.slice(window)];
}
