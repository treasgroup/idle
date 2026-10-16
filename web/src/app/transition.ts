// The photo of the tapped card «flows» into the recipe page, as in phone apps. Done by the browser itself
// (View Transitions); where it is not supported, or motion is reduced, the page simply opens.
let pressed: Element | null = null;
if (typeof document !== "undefined") document.addEventListener("pointerdown", (e) => { pressed = e.target as Element; }, { capture: true, passive: true });

type Doc = Document & { startViewTransition?: (cb: () => Promise<void> | void) => { finished: Promise<void>; ready: Promise<void> } };

export function withPhotoTransition(recipeId: string, change: () => void): void {
  const d = document as Doc;
  // Not from a recipe page already open (two photos with one name would cancel the effect anyway).
  if (!d.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches || document.querySelector('[data-photo-hero="1"]')) return change();
  // The photo in the card that was pressed (several cards of one recipe can be on screen).
  const near = pressed?.closest("button, a, article, li");
  const from = (near?.querySelector(`[data-photo="${recipeId}"]`) ?? document.querySelector(`[data-photo="${recipeId}"]`)) as HTMLElement | null;
  if (from) from.style.setProperty("view-transition-name", "recipe-photo");
  const t = d.startViewTransition(() => new Promise<void>((done) => {
    // The old picture is already taken; the card stays under the recipe page, and two photos with one name abort it.
    from?.style.removeProperty("view-transition-name");
    change();
    // The recipe page may still be loading: never hold the screen longer than a moment. The browser does not draw
    // frames while it waits for us (requestAnimationFrame would never come and the screen would freeze for 4 s),
    // so plain timers.
    const start = performance.now();
    const wait = () => (document.querySelector('[data-photo-hero="1"]') || performance.now() - start > 250 ? done() : window.setTimeout(wait, 16));
    window.setTimeout(wait, 0);
  }));
  t.ready.catch(() => {});
  t.finished.catch(() => {});
}
