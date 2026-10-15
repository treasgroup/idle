// One-time hints: each is shown until the person has used the thing once, then never again.
import { useCallback, useState } from "react";

const KEY = "cook-hints-seen";
const read = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };

export function useHint(id: string): [boolean, () => void] {
  const [show, setShow] = useState(() => !read().includes(id));
  const done = useCallback(() => {
    setShow(false);
    try { const seen = read(); if (!seen.includes(id)) localStorage.setItem(KEY, JSON.stringify([...seen, id])); } catch { /* private mode */ }
  }, [id]);
  return [show, done];
}
