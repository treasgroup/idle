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
    expect(ask("где мой список покупок")?.go?.to).toBe("#/shopping");
    expect(ask("список покупок")?.go?.to).toBe("#/shopping");
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

describe("Шеф knows the newer parts", () => {
  it("answers about them with a button", () => {
    expect(ask("собираемся с друзьями на шашлыки, кто что принесёт")?.go?.to).toBe("party");
    expect(ask("хочу собрать стол вскладчину")?.go?.to).toBe("party");
    expect(ask("я соблюдаю пост")?.go?.to).toBe("set:fast:on");
    expect(ask("пощусь")?.go?.to).toBe("set:fast:on");
    expect(navigatorAnswer("я соблюдаю пост", state, { ...DEFAULT_PROFILE, fast: { on: true, weekly: true, fish: false } })?.text).toContain("уже включён");
    expect(ask("что у меня в морозилке")?.go?.to).toBe("#/pantry");
    expect(navigatorAnswer("что в морозилке", { ...state, freezer: [{ id: "a", title: "Котлеты", portions: 2, at: 1 }] } as EngineState, DEFAULT_PROFILE)?.text).toContain("котлеты (2 порции)");
    expect(ask("хочу считать калории")?.go?.to).toBe("diary");
    expect(ask("сколько я съел сегодня")?.go?.to).toBe("diary");
  });
  it("leaves questions about dishes to the recipe search", () => {
    for (const q of ["постный борщ", "что приготовить в пост", "можно ли заморозить котлеты", "блюда для морозилки", "сколько калорий в борще", "шашлык на мангале"])
      expect(ask(q)).toBeNull();
  });
});
