// The baking form a recipe was written for, and how much to take for another one (by area).
import type { Recipe } from "../engine";

export type Pan = { kind: "round"; d: number } | { kind: "rect"; a: number; b: number };

const ROUND = /форм[а-яё]*\s+(?:примерно\s+|около\s+|диаметром\s+)?(\d{2})\s*см/i;
const RECT = /форм[а-яё]*\s+(?:примерно\s+|около\s+)?(\d{2})\s*[×xх]\s*(\d{2})\s*см/i;

export function panOf(r: Recipe): Pan | null {
  const texts = [...r.ingredients.map((i) => i.unit || ""), ...r.steps.map((s) => s.text)];
  for (const t of texts) {
    if (/формуйте/i.test(t)) continue;
    const m = RECT.exec(t);
    if (m) return { kind: "rect", a: +m[1], b: +m[2] };
    const n = ROUND.exec(t);
    if (n && +n[1] >= 14 && +n[1] <= 32) return { kind: "round", d: +n[1] };
  }
  return null;
}

export const area = (p: Pan) => (p.kind === "round" ? Math.PI * (p.d / 2) ** 2 : p.a * p.b);
export const panText = (p: Pan) => (p.kind === "round" ? p.d + " см" : p.a + "×" + p.b + " см");

export const PAN_CHOICES: Pan[] = [
  ...[18, 20, 22, 24, 26, 28].map((d) => ({ kind: "round", d }) as Pan),
  ...([[20, 20], [30, 20], [30, 22], [35, 25], [40, 30]] as const).map(([a, b]) => ({ kind: "rect", a, b }) as Pan),
];
