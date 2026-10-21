import { describe, expect, it } from "vitest";
import { schedule, stepTimes } from "../app/dinner";
import type { Recipe } from "../engine";

const r = (id: string, total: number, active: number, steps: [string, number?][]): Recipe =>
  ({ id, title: id, totalMinutes: total, activeMinutes: active, steps: steps.map(([text, min]) => ({ text, ...(min ? { timerSeconds: min * 60 } : {}) })) } as unknown as Recipe);

const serve = new Date(2026, 9, 21, 19, 0).getTime();
const plov = r("plov", 80, 30, [["Нарежьте мясо, лук и морковь. ".repeat(3)], ["Обжарьте мясо с овощами до золотистого цвета. ".repeat(2)], ["Засыпьте рис, влейте воду и томите под крышкой.", 40]]);
const salad = r("salad", 15, 15, [["Нарежьте огурцы и помидоры."], ["Заправьте сметаной и посолите."]]);
const pie = r("pie", 60, 15, [["Взбейте яйца с сахаром, вмешайте муку и яблоки."], ["Выпекайте в духовке.", 40]]);

describe("Ужин к сроку", () => {
  it("each dish's step times add up", () => {
    const t = stepTimes(plov);
    expect(t[2]).toEqual({ hands: 2, wait: 40 });
    expect(t[0].hands + t[1].hands).toBeGreaterThanOrEqual(4);
  });
  it("everything ends by serving time, hands never overlap", () => {
    const s = schedule([plov, salad, pie], serve);
    for (const it of s.items) expect(it.handsEnd).toBeLessThanOrEqual(serve);
    for (const a of s.items) for (const b of s.items) if (a !== b) expect(a.start < b.handsEnd && b.start < a.handsEnd, a.key + " vs " + b.key).toBe(false);
    // The longest dish ends exactly on time.
    const last = s.items.filter((i) => i.recipeId === "plov").pop()!;
    expect(last.start + (last.handsEnd - last.start) + last.wait * 1000).toBe(serve);
    expect(s.start).toBeLessThan(serve - 80 * 60e3 + 1);
  });
  it("the hot main ends on time even when a dessert takes longer", () => {
    const main = { ...r("main", 45, 18, [["Нарежьте курицу и овощи. ".repeat(3)], ["Обжарьте.".repeat(10)], ["Готовьте под крышкой.", 20]]), course: "main" } as Recipe;
    const sweet = { ...r("apples", 60, 15, [["Вырежьте сердцевину, насыпьте сахар."], ["Запекайте.", 40]]), course: "dessert" } as Recipe;
    const s = schedule([sweet, main], serve);
    const last = s.items.filter((i) => i.recipeId === "main").pop()!;
    expect(last.handsEnd + last.wait * 1000).toBe(serve);
  });
  it("finds free time while things stew and bake", () => {
    const s = schedule([plov, pie], serve);
    expect(s.free.some((f) => f.to - f.from >= 10 * 60e3)).toBe(true);
    expect(s.handsOn).toBeLessThan(60);
  });
});
