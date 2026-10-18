// Two things Шеф has to notice before searching:
// 1. A new request is not a refinement of the last one. «Хочу сладкое», then «нет духовки, есть фарш» — the second is a
//    new dinner, «сладкое» must not stick to it; «а без лука» or «побыстрее» keep what was said before.
// 2. Health words («у меня диабет», «давление», «гастрит»): the products to leave out and a short honest note.
import type { Conditions } from "../engine";

const low = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();

// Starts of a follow-up: «а …», «и ещё …», «без лука», «побыстрее», «на 4 человека».
const FOLLOW = /^(а|и|но|ещ[её]|только|лучше|тогда|теперь|плюс|также|так|ну|или|можно|давай(те)? (ещ[её]|другое|по)|без|с|со|из того же|на \d|для|покажи|друго|не то|не надо|побыстр|быстрее|попроще|проще|полегче|подешевле|посытнее|сытнее|поменьше|побольше)( |$|,)/;
// Questions about cooking itself do not change what is being looked for.
const QUESTION = /^(сколько|как |чем |почему|зачем|когда|можно ли|что такое|что значит|какая температура|какой температур)/;
// What a new request sounds like.
const NEW = /(что (бы )?(приготовить|сделать|поесть|сготовить|покушать|на (ужин|обед|завтрак|полдник))|хочу|хочется|(^|[\s,])есть\s|у меня|из (того|чего|остатк)|остал(ось|ись|ся)|рецепт|посоветуй|подскажи|придумай|предложи|на (ужин|обед|завтрак|полдник|праздник|новый год|день рождения)|ужин|завтрак|обед)/;

/** True for a request that starts a new search (the conditions from earlier messages should be dropped). */
export function isNewTopic(text: string): boolean {
  const t = low(text);
  if (!t || FOLLOW.test(t) || QUESTION.test(t)) return false;
  if (NEW.test(t)) return true;
  // A long message that is not a follow-up is a request of its own («курица с рисом для всей семьи»).
  return t.split(" ").filter((w) => w.length > 1).length >= 4;
}

/** Whether the conditions say anything beyond the starting ones (otherwise there is nothing to drop). */
export function hasTopic(c: Conditions, base: Conditions): boolean {
  return !!(c.mood || c.desired.length || c.available.length || c.maxKcal || c.minProtein || c.occasion || c.maxMinutes || c.strictPantry
    || c.excluded.some((x) => !base.excluded.includes(x)) || c.appliances.length !== base.appliances.length || c.health);
}

export type Health = "diabetes" | "pressure" | "stomach" | "cholesterol";
interface HealthRule { re: RegExp; label: string; exclude: string[]; maxKcal?: number; reply: string }

const DOCTOR = " Это подсказка по рецептам, а не совет врача: своё питание лучше обсудить с ним.";
export const HEALTH: Record<Health, HealthRule> = {
  diabetes: {
    re: /диабет|сахар(ом)? в крови|инсулин/,
    label: "при диабете",
    exclude: ["sugar", "vanilla-sugar", "honey", "sweetened-condensed-milk", "boiled-condensed-milk", "apricot-jam", "dark-chocolate", "plain-sugar-biscuits", "vanilla-ice-cream", "tomato-ketchup"],
    maxKcal: 550,
    reply: "Подобрал блюда без сахара и не тяжёлые: овощи, мясо, рыба, крупы. Хлеб, картошку и макароны — понемногу." + DOCTOR,
  },
  pressure: {
    re: /давлени|гипертон/,
    label: "при давлении",
    exclude: ["smoked-pork", "boiled-sausage", "ham", "bacon", "salted-herring-fillet", "pickled-cucumber", "marinated-champignons", "soy-sauce", "dark-soy-sauce", "black-olive", "tomato-ketchup", "mayonnaise"],
    reply: "Подобрал блюда без копчёностей, колбасы и солений. Соль в рецептах «по вкусу» — кладите меньше обычного, добавьте зелень и лимон." + DOCTOR,
  },
  stomach: {
    re: /гастрит|язв[аыу]|желуд|изжог|панкреат|после операци|щадящ|жкт|кишечник/,
    label: "щадящее",
    exclude: ["chili", "fresh-chili", "prepared-mustard", "horseradish-root", "table-vinegar-9", "rice-vinegar", "smoked-pork", "bacon", "mayonnaise", "tomato-ketchup", "soy-sauce", "dark-soy-sauce"],
    reply: "Подобрал блюда без острого, копчёного и уксуса. Лучше варить, тушить и запекать, а не жарить; перец — по самому минимуму." + DOCTOR,
  },
  cholesterol: {
    re: /холестерин/,
    label: "меньше жирного",
    exclude: ["bacon", "smoked-pork", "boiled-sausage", "ham", "mayonnaise", "heavy-cream"],
    maxKcal: 600,
    reply: "Подобрал блюда без колбасы, копчёностей, майонеза и жирных сливок. Чаще рыба, птица, овощи и крупы." + DOCTOR,
  },
};

/** «у меня диабет, что можно» → which rule applies (null when the message is not about health). */
export function healthOf(text: string): Health | null {
  const t = low(text);
  for (const k of Object.keys(HEALTH) as Health[]) if (HEALTH[k].re.test(t)) return k;
  return null;
}

/** The conditions with a health rule applied: its products left out, a lighter mood. */
export function withHealth(c: Conditions, h: Health): Conditions {
  const r = HEALTH[h];
  return { ...c, health: h, excluded: [...new Set([...c.excluded, ...r.exclude])], mood: c.mood ?? "light", maxKcal: r.maxKcal && !c.maxKcal ? r.maxKcal : c.maxKcal };
}

/** The same conditions without the health rule (its products are allowed again). */
export function withoutHealth(c: Conditions, keep: string[] = []): Conditions {
  if (!c.health) return c;
  const r = HEALTH[c.health];
  return { ...c, health: null, excluded: c.excluded.filter((x) => !r.exclude.includes(x) || keep.includes(x)), maxKcal: r.maxKcal === c.maxKcal ? null : c.maxKcal };
}
