// One-time hints: each is shown until the person has used the thing once, then never again.
// With `visits`, a hint also goes away on its own after that many app starts: a newcomer reads it, a regular has a clean screen.
import { useCallback, useEffect, useState } from "react";

const KEY = "cook-hints-seen";
const VIEWS = "cook-hints-views";
const read = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
const views = (): Record<string, number> => { try { return JSON.parse(localStorage.getItem(VIEWS) || "{}"); } catch { return {}; } };
// Counted once per app start (a page load), not on every screen opened.
const counted = new Set<string>();

export function useHint(id: string, visits?: number): [boolean, () => void] {
  const [show, setShow] = useState(() => !read().includes(id) && (visits == null || (views()[id] ?? 0) < visits));
  useEffect(() => {
    if (!show || visits == null || counted.has(id)) return;
    counted.add(id);
    try { const v = views(); v[id] = (v[id] ?? 0) + 1; localStorage.setItem(VIEWS, JSON.stringify(v)); } catch { /* private mode */ }
  }, [id, show, visits]);
  const done = useCallback(() => {
    setShow(false);
    try { const seen = read(); if (!seen.includes(id)) localStorage.setItem(KEY, JSON.stringify([...seen, id])); } catch { /* private mode */ }
  }, [id]);
  return [show, done];
}
