import { describe, expect, it } from "vitest";
import { navigatorAnswer } from "../app/navigator";
import { DEFAULT_PROFILE } from "../app/profile";
import type { EngineState } from "../engine";

const state = { menu: [], shopping: [{ checked: false }, { checked: true }], fridge: [], favorites: [], cooking: null } as unknown as EngineState;
const ask = (t: string) => navigatorAnswer(t, state, DEFAULT_PROFILE);

describe("Шеф as a navigator", () => {
  it("opens places by a button, never by itself", () => {
    expect(ask("где мой план?")?.go?.to).toBe("#/menu");
    expect(ask("Открой покупки")?.go?.to).toBe("#/shopping");
    expect(ask("открой покупки")?.text).toContain("1 продукт");
    expect(ask("покажи избранное")?.go?.to).toBe("#/favorites");
    expect(ask("мой план")?.go?.to).toBe("#/menu");
    expect(ask("составь план на неделю")?.go?.to).toBe("#/menu");
    expect(ask("где школа готовки")?.go?.to).toBe("#/learn");
    expect(ask("где настройки")?.go?.to).toBe("#/profile");
  });
  it("changes settings only through the button", () => {
    expect(ask("сделай шрифт крупнее")?.go?.to).toBe("set:textSize:l");
    expect(ask("включи тёмную тему")?.go?.to).toBe("set:theme:dark");
    expect(ask("выключи звук")?.go?.to).toBe("set:sounds:off");
    expect(ask("включи простой режим")?.go?.to).toBe("set:simple:on");
  });
  it("explains how to", () => {
    expect(ask("как поставить таймер")?.text).toContain("часами");
    expect(ask("что ты умеешь?")?.text).toContain("где мой план");
  });
  it("leaves food questions to the search", () => {
    for (const q of ["курица и картошка", "суп без мяса", "что приготовить из продуктов дома", "план ужина на двоих", "что купить к ужину",
      "сколько варить гречку", "покажи рецепт плова", "хочу суп", "блюдо на главное", "тёмный шоколад десерт", "крупная рыба в духовке", "что-то быстрое на ужин"])
      expect(ask(q), q).toBeNull();
  });
});
