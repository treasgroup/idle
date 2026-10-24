// Steps written for the recipe's own portions, read by someone cooking for another number (app/stepServings).
import { describe, expect, it } from "vitest";
import { forServings, sizesFor } from "../app/stepServings";

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

describe("sizes for every portion count at once", () => {
  it("keeps only the one for the portions cooked", () => {
    const form = "Форму на 4/8/12 порций возьмите диаметром 14/20/24 см; дно застелите.";
    expect(sizesFor(form, 4)).toBe("Форму возьмите диаметром 14 см; дно застелите.");
    expect(sizesFor(form, 6)).toBe("Форму возьмите диаметром 20 см; дно застелите.");
    expect(sizesFor(form, 16)).toBe(form); // more than the list knows: as written
    expect(sizesFor("Распределите тесто по формам: на 4/8/12 порций нужна 1/2/3 формы.", 8)).toBe("Распределите тесто по формам: нужны 2 формы.");
    expect(forServings("Перелейте в форму 14/20/24 см на 4/8/12 порций.", 8, 8).text).toBe("Перелейте в форму 20 см.");
  });
});
