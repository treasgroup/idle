// «Спросить Шефа про этот рецепт»: the everyday questions (app/recipeQuestions), voice commands while cooking, and
// the words of a typed list (app/knownProducts).
import { beforeAll, expect, test } from "vitest";
import { parseVoiceCommand, recipes } from "../engine";
import { extraAnswer } from "../app/recipeQuestions";
import { knownProduct } from "../app/knownProducts";
import { speechText } from "../app/speech";
import { loadCatalog } from "./chefTurn";

beforeAll(loadCatalog);
const r = (title: string) => recipes().find((x) => x.title === title)!;
const say = (q: string, t: string) => extraAnswer(q, r(t))?.text ?? "";

test("without a product, what to serve, how long, ahead, a multicooker, burnt", () => {
  expect(say("можно без яиц?", "Борщ с говядиной")).toMatch(/яиц нет/);
  expect(say("а без лука?", "Котлеты домашние")).toMatch(/^Да, можно обойтись/);
  expect(say("можно без яиц?", "Сырники со сметаной")).toMatch(/манки/);
  expect(say("можно без яиц?", "Оливье с колбасой")).toMatch(/^Да/);
  expect(say("что подать к нему?", "Котлеты домашние")).toMatch(/^Подойдут: /);
  expect(say("что подать к нему?", "Сырники со сметаной")).toMatch(/вареньем/);
  expect(say("сколько варить?", "Борщ с говядиной")).toMatch(/^Варите 1 ч 30 мин \(шаг \d+\)/);
  expect(say("можно заранее приготовить?", "Оливье с колбасой")).toMatch(/заправьте/);
  expect(say("можно в мультиварке?", "Борщ с говядиной")).toMatch(/«Суп»/);
  expect(say("что делать если подгорело?", "Котлеты домашние")).toMatch(/^Подгорело: /);
  expect(say("чем заменить сыр?", "Котлеты домашние")).toMatch(/гауда/);
  expect(say("сколько варить без крышки?", "Борщ с говядиной")).not.toMatch(/крышки нет/);
});

test("voice: a timer in seconds, stop, pause, a minute more, a step by number", () => {
  expect(parseVoiceCommand("таймер на 5 минут")).toEqual({ type: "timer", seconds: 300 });
  expect(parseVoiceCommand("таймер на 30 секунд")).toEqual({ type: "timer", seconds: 30 });
  expect(parseVoiceCommand("таймер на полтора часа")).toEqual({ type: "timer", seconds: 5400 });
  expect(parseVoiceCommand("таймер на 1 час 20 минут")).toEqual({ type: "timer", seconds: 4800 });
  expect(parseVoiceCommand("стоп")).toEqual({ type: "timerStop" });
  expect(parseVoiceCommand("поставь на паузу")).toEqual({ type: "timerPause" });
  expect(parseVoiceCommand("добавь минуту")).toEqual({ type: "timerAdd" });
  expect(parseVoiceCommand("шаг 3")).toEqual({ type: "goto", step: 3 });
  expect(parseVoiceCommand("первый шаг")).toEqual({ type: "goto", step: 1 });
});

test("read aloud: symbols in words", () => {
  expect(speechText("Форма 30×40 см.")).toBe("Форма 30 на 40 сантиметров.");
  expect(speechText("Сотейник Ø16 см.")).toBe("Сотейник диаметром 16 сантиметров.");
  expect(speechText("Храните при −18 градусов.")).toBe("Храните при минус 18 градусов.");
  expect(speechText("Варите 5–7 минут.")).toBe("Варите от 5 до 7 минут.");
  expect(speechText("Добавьте ½ ч. л. соли.")).toBe("Добавьте половину чайной ложки соли.");
});

test("a typed shopping list: the usual words", () => {
  expect(knownProduct("масло")).toEqual(["butter"]);
  expect(knownProduct("сок")).toEqual([]);
  expect(knownProduct("огурцы")).toEqual(["cucumber"]);
  expect(knownProduct("гречка")).toBeUndefined();
});
