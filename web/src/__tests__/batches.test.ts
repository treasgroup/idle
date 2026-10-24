// Frying in batches: the step timer goes side by side (app/batches), not one long timer for all the batches.
import { expect, test } from "vitest";
import { batchPhase, batchesOf } from "../app/batches";

const draniki = "Каждую партию жарьте по 4 минуты с каждой стороны на среднем или умеренно слабом огне. Для 4 порций обычно остаётся ещё 4 партии: около 32 минут жарки. Таймер — на эти партии.";

test("reads the rhythm of the batches", () => {
  expect(batchesOf(draniki, 32 * 60)).toEqual({ side: 240, flips: true, rounds: 4 });
  expect(batchesOf("Обжарьте говядину тремя очередями по 5 минут на средне-сильном огне.", 15 * 60)).toEqual({ side: 300, flips: false, rounds: 3 });
});

test("leaves an ordinary timer alone", () => {
  expect(batchesOf("Жарьте по 4 минуты с каждой стороны.", 8 * 60)).toBeNull(); // one batch
  expect(batchesOf("Обжарьте сердце двумя очередями по 5 минут, затем тушите под крышкой 40 минут.", 60 * 60)).toBeNull();
  expect(batchesOf("Варите 20 минут.", 20 * 60)).toBeNull();
});

test("says what to do at each bell", () => {
  const b = batchesOf(draniki, 32 * 60)!;
  expect(batchPhase(b, 0)).toMatchObject({ label: "партия 1 из 4, первая сторона", ring: "переверните", last: false });
  expect(batchPhase(b, 1)).toMatchObject({ label: "партия 1 из 4, вторая сторона", ring: "партия готова, кладите следующую" });
  expect(batchPhase(b, 7)).toMatchObject({ batch: 4, last: true, ring: "последняя партия готова" });
});
