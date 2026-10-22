// «Откуда открывают рецепты» for the owner's admin: which place a recipe was opened from — the big card, «На сегодня»,
// a holiday or season shelf, a collection, «Выбрать за меня», Шеф, search… The places carry data-from; a tap
// remembers the nearest one, and opening a recipe within a moment of it sends that place with the «open» event.
// Nothing about the person, only the name of the place. Elsewhere the screen («chat», «recipes», …) is the place.

let last: { from: string; at: number } | null = null;

export function watchOpenFrom(): void {
  if (typeof document === "undefined") return;
  document.addEventListener("click", (e) => {
    const el = (e.target as Element | null)?.closest?.("[data-from]");
    last = el ? { from: (el as HTMLElement).dataset.from ?? "", at: Date.now() } : null;
  }, true);
}

/** The place of the tap that opened the recipe, or the screen it is on. */
export function openedFrom(tab: string): string {
  const from = last && Date.now() - last.at < 2000 ? last.from : "";
  last = null;
  return from || tab;
}
