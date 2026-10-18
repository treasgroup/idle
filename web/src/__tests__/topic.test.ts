import { describe, expect, test } from "vitest";
import { HEALTH, healthOf, isNewTopic, withHealth, withoutHealth } from "../app/topic";
import { DEFAULT_CONDITIONS, type Conditions } from "../engine";

describe("a new request or a refinement", () => {
  test.each([
    "нет духовки, есть фарш", "хочу что-нибудь сладкое", "что приготовить ребенку 3 года", "рецепт без мяса на 4 человека",
    "у меня осталось варёное рис и яйца", "пп ужин до 400 ккал", "курица с рисом для всей семьи", "у меня диабет, что можно",
  ])("new: %s", (t) => expect(isNewTopic(t)).toBe(true));
  test.each([
    "побыстрее", "без лука", "а на 4 человека", "а что-нибудь с курицей", "с курицей", "ещё проще", "покажи другое",
    "сколько варить гречку", "как долго тушить", "плов", "суп", "и без грибов", "а можно без духовки",
  ])("follow-up: %s", (t) => expect(isNewTopic(t)).toBe(false));
});

describe("health", () => {
  test("words", () => {
    expect(healthOf("у меня диабет, что можно")).toBe("diabetes");
    expect(healthOf("повышенное давление")).toBe("pressure");
    expect(healthOf("гастрит, что приготовить")).toBe("stomach");
    expect(healthOf("высокий холестерин")).toBe("cholesterol");
    expect(healthOf("что приготовить на ужин")).toBeNull();
  });
  test("applies and removes its products only", () => {
    const c: Conditions = { ...(DEFAULT_CONDITIONS as Conditions), excluded: ["onion", "sugar"] };
    const h = withHealth(c, "diabetes");
    expect(h.health).toBe("diabetes");
    expect(h.excluded).toEqual(expect.arrayContaining(["onion", ...HEALTH.diabetes.exclude]));
    expect(h.maxKcal).toBe(550);
    const back = withoutHealth(h, ["sugar"]);
    expect(back.health).toBeNull();
    expect(back.excluded.sort()).toEqual(["onion", "sugar"]);
    expect(back.maxKcal).toBeNull();
  });
});
