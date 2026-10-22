// «Меры без весов»: vegetables in pieces and herbs in sprigs on a recipe; pieces, bunches and loaves in the shop.
import { describe, expect, it } from "vitest";
import { homeAmount, homeQuantity, shopQuantity } from "../app/amounts";
import { speechText } from "../app/speech";

const ing = (id: string, amount: number, unit = "г") => ({ id, name: id, amount, unit });

describe("amounts as people count them at home", () => {
  it("shows vegetables in medium pieces with the grams under them", () => {
    expect(homeQuantity(ing("beet", 125))).toMatchObject({ text: "½ шт.", grams: "125 г" });
    expect(homeQuantity(ing("potato", 150)).text).toBe("1 шт.");
    expect(homeQuantity(ing("onion", 60)).text).toBe("½ шт.");
    expect(homeQuantity(ing("onion", 150)).text).toBe("1,5 шт.");
    expect(homeQuantity(ing("carrot", 300)).text).toBe("3 шт.");
    // A little of one stays in grams; cabbage and meat too.
    expect(homeQuantity(ing("onion", 20)).text).toBe("20 г");
    expect(homeQuantity(ing("cabbage", 125)).text).toBe("125 г");
    expect(homeAmount(ing("beet", 125))).toBe("½ шт. · 125 г");
  });
  it("counts whole pieces from two on, halves only below", () => {
    expect(homeAmount(ing("potato", 400))).toBe("3 шт. · 400 г");
    expect(homeQuantity(ing("potato", 900)).text).toBe("8 шт.");
    expect(homeQuantity(ing("tomato", 300)).text).toBe("3 шт.");
    expect(homeQuantity(ing("apple", 220)).text).toBe("1,5 шт.");
  });
  it("rounds grams after scaling: whole under 10, by 5 under 100, by 10 above", () => {
    expect(homeAmount(ing("butter", 10 / 3))).toBe("3 г · ½ ч. л.");
    expect(homeAmount(ing("sugar", 5.33))).toBe("5 г · ½ ч. л.");
    expect(homeQuantity(ing("olives", 53)).text).toBe("55 г");
    expect(homeQuantity(ing("pork", 333.3)).text).toBe("330 г");
    expect(homeQuantity(ing("milk", 7.5, "мл")).text).toBe("8 мл");
    // Leavening keeps its half grams.
    expect(homeQuantity({ id: "dry-yeast", name: "Дрожжи сухие", amount: 3.3, unit: "г" }).text).toBe("3,5 г");
  });
  it("shows herbs in sprigs and bunches", () => {
    expect(homeQuantity(ing("dill", 6))).toMatchObject({ text: "2–3 веточки", grams: "6 г" });
    expect(homeQuantity(ing("parsley", 2)).text).toBe("1–2 веточки");
    expect(homeQuantity(ing("green-onion", 8)).text).toBe("2–3 пера");
    expect(homeQuantity(ing("cilantro", 15)).text).toBe("½ пучка");
    expect(homeQuantity(ing("parsley", 60)).text).toBe("2 пучка");
  });
  it("rounds the shopping list up to what is sold", () => {
    expect(shopQuantity("onion", 555, "г")).toEqual({ text: "6 шт.", need: "нужно 555 г" });
    expect(shopQuantity("carrot", 60, "г")?.text).toBe("1 шт.");
    expect(shopQuantity("zucchini", 250, "г")?.text).toBe("1 шт.");
    expect(shopQuantity("garlic", 22, "г")).toEqual({ text: "1 головка", need: "нужно 4 зубчика" });
    expect(shopQuantity("garlic", 12, "зубчиков")?.text).toBe("2 головки");
    expect(shopQuantity("parsley", 41, "г")?.text).toBe("2 пучка");
    expect(shopQuantity("dill", 7.5, "г")?.text).toBe("1 пучок");
    expect(shopQuantity("lemon-juice", 10, "г")).toEqual({ name: "Лимон", text: "1 шт.", need: "на сок, нужно 10 г" });
    expect(shopQuantity("white-bread", 60, "г")).toEqual({ name: "Белый хлеб", text: "1 батон", need: "нужно 60 г" });
    expect(shopQuantity("beef", 300, "г")).toBeNull();
  });
  it("reads half a piece aloud", () => {
    expect(speechText("Свёкла ½ шт.")).toBe("Свёкла половина штуки");
  });
});
