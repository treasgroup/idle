// Steps written for the recipe's own portions, read by someone cooking for another number (app/stepServings).
import { describe, expect, it } from "vitest";
import { forServings } from "../app/stepServings";

describe("steps for the chosen number of portions", () => {
  it("recounts the plain «для 4 порций — 12 штук»", () => {
    expect(forServings("Разделите фарш на 3 котлеты на порцию: для 4 порций — 12 штук.", 4, 2))
      .toEqual({ text: "Разделите фарш на 3 котлеты на порцию: для 2 порций — 6 штук." });
  });
  it("leaves free wording as it is, with a note", () => {
    const r = forServings("На базовые четыре порции нужно около 16–20 минут жарки суммарно.", 4, 2);
    expect(r.text).toBe("На базовые четыре порции нужно около 16–20 минут жарки суммарно.");
    expect(r.note).toBe("Числа в этом шаге — на 4 порции, у вас 2.");
  });
  it("says nothing for the recipe's own number or a step without portions", () => {
    expect(forServings("Для 4 порций — 12 штук.", 4, 4)).toEqual({ text: "Для 4 порций — 12 штук." });
    expect(forServings("Нарежьте лук.", 4, 2)).toEqual({ text: "Нарежьте лук." });
  });
});
