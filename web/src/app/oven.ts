// «Запекайте при 190 °C 20–25 минут» on step 6, with no word about the oven before it: the person reaches the step and
// waits another quarter of an hour for it to heat. The step before (or the first step, when baking starts at once)
// says to turn the oven on.
import type { Recipe } from "../engine";

const BAKE = /(?:запек|выпек|пеките|испеките|запеките|поставьте[^.]*в\s+духовк|отправьте[^.]*в\s+духовк|в\s+(?:разогрет|горяч)\S*\s+(?:до\s+\d{3}\s*°C?\s+)?духовк)/i;
const TEMP = /(\d{3})\s*°/;
const HEAT = /(?:разогре|включ|нагре|прогре)\S*[^.]{0,30}духовк|духовк\S*[^.]{0,20}(?:разогре|включ|нагре|прогре)/i;

export interface OvenAhead { bake: number; temp: number | null }

/** The step that bakes, when no step before it heats the oven; null when the recipe says it in time. */
export function ovenAhead(r: Recipe): OvenAhead | null {
  const bake = r.steps.findIndex((s) => BAKE.test(s.text) && (TEMP.test(s.text) || /духовк/i.test(s.text)));
  if (bake < 0) return null;
  const text = r.steps[bake].text;
  // Pots that go into a cold oven on purpose.
  if (/холодн\S*\s+духовк/i.test(text)) return null;
  // «За 15 минут до конца маринования разогрейте духовку»: the step itself says it in time. («Выпекайте в заранее
  // разогретой духовке» does not — nothing asked to heat it.)
  if (/за\s+(?:\d+|последн\p{L}*)\s+(?:\d+\s+)?минут[^.]*(?:разогре|включ|нагре)|(?:разогре|включ)\S*[^.]{0,30}заранее/iu.test(text)) return null;
  if (r.steps.slice(0, bake).some((s) => HEAT.test(s.text))) return null;
  // On the first step the step itself says it («Разогрейте духовку до 200 °C, запеките свёклу»).
  if (bake === 0 && HEAT.test(text)) return null;
  const t = TEMP.exec(text);
  return { bake, temp: t ? Number(t[1]) : null };
}

/** The line for step `step`, or null: on the step before the baking one (the first step, when it bakes at once). */
export function ovenLine(o: OvenAhead | null, step: number): string | null {
  if (!o || step !== Math.max(0, o.bake - 1)) return null;
  const on = "Включите духовку" + (o.temp ? " на " + o.temp + " °C" : "");
  return o.bake === 0 ? on + " сразу — она понадобится уже в этом шаге." : on + " — она понадобится на следующем шаге.";
}
