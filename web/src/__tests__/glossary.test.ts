import { describe, expect, it } from "vitest";
import { splitTerms, TERMS } from "../app/glossary";
import { LESSONS } from "../screens/learn-data";

const words = (text: string) => splitTerms(text).filter((p) => typeof p !== "string").map((p) => (p as { text: string }).text);

describe("kitchen words in steps", () => {
  it("finds words in any form", () => {
    expect(words("Томите под крышкой 40 минут.")).toEqual(["Томите"]);
    expect(words("Взбейте сливки до мягких пиков.")).toEqual(["до мягких пиков"]);
    expect(words("Растопите шоколад на водяной бане.")).toEqual(["водяной бане"]);
    expect(words("Обваляйте котлеты в сухарях и жарьте во фритюре.")).toEqual(["Обваляйте", "фритюре"]);
  });
  it("at most two per step, text kept whole", () => {
    const text = "Замесите тесто, обваляйте в муке, обжарьте во фритюре и томите.";
    expect(words(text).length).toBe(2);
    expect(splitTerms(text).map((p) => (typeof p === "string" ? p : p.text)).join("")).toBe(text);
  });
  it("no false hits in plain steps", () => {
    for (const s of ["Нарежьте помидоры кубиками.", "Доведите до кипения и посолите.", "Обжарьте до золотистой корочки.", "Добавьте томатную пасту.", "Отбеливать не нужно."])
      expect(words(s), s).toEqual([]);
  });
  it("lesson links exist", () => {
    for (const t of TERMS) if (t.lesson) expect(LESSONS.some((l) => l.id === t.lesson), t.id).toBe(true);
  });
});
