// «С какой попытки нашли блюдо»: when a dish is opened from a list (Шеф's answer, the home screen, search), which one
// it was — the first offered or the fifth. The owner sees the share of «first» in the admin panel; it shows whether
// the suggestions are getting better. Lists are marked with data-list; cards carry data-photo (the dish's id).
let pending: { id: string; pos: number; list: string; at: number } | null = null;

export function watchPicks(): void {
  if (typeof document === "undefined") return;
  document.addEventListener("click", (e) => {
    const el = e.target as Element | null;
    if (!el || !(el instanceof Element)) return;
    const list = el.closest("[data-list]");
    // «Вы смотрели» and the like are not suggestions: they do not count, and do not take a place in the order.
    if (!list || el.closest("[data-pick-skip]")) return;
    // The card: the nearest block around the tap that holds one dish.
    let node: Element | null = el, id: string | null = null;
    while (node && node !== list) {
      const own = node.matches("[data-photo]") ? [node] : [...node.querySelectorAll("[data-photo]")];
      const ids = new Set(own.map((x) => x.getAttribute("data-photo")));
      if (ids.size === 1) { id = [...ids][0]; break; }
      if (ids.size > 1) break;
      node = node.parentElement;
    }
    if (!id) return;
    const order = [...new Set([...list.querySelectorAll("[data-photo]")].filter((x) => !x.closest("[data-pick-skip]")).map((x) => x.getAttribute("data-photo")))];
    pending = { id, pos: order.indexOf(id) + 1, list: list.getAttribute("data-list") || "", at: Date.now() };
  }, { capture: true, passive: true });
}

/** The position the dish had in its list, when it was opened from one just now. */
export function takePick(id: string): { pos: number; list: string } | null {
  const p = pending;
  pending = null;
  return p && p.id === id && Date.now() - p.at < 2500 && p.pos > 0 ? { pos: p.pos, list: p.list } : null;
}
