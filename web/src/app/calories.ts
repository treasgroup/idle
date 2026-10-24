// «Калории в борще», «сколько ккал в плове», «КБЖУ сырников»: the number per portion of the dishes by that name.
// Before, the words were read as «полегче» and the answer was a list of borscht recipes with no number in it.
import { nutritionOf, searchRecipes, type Match, type Recipe } from "../engine";

const ASK = /(?<!\p{L})(?:калори\p{L}*|калорийн\p{L}*|ккал|кбжу|бжу|сколько\s+белк\p{L}*)(?!\p{L})/iu;
const FILLER = /(?<!\p{L})(?:сколько|какая|какой|какие|в|во|у|на|одной|одну|одна|порци\p{L}*|тарелк\p{L}*|грамм\p{L}*|100|г|блюд\p{L}*|рецепт\p{L}*|подскажи|скажи)(?!\p{L})/giu;

const line = (r: Recipe) => {
  const n = nutritionOf(r).perServing;
  return "• " + r.title + " — " + Math.round(n.kcal) + " ккал на порцию (белки " + Math.round(n.protein) + " г, жиры " + Math.round(n.fat) + " г, углеводы " + Math.round(n.carbs) + " г)";
};

/** The calories of the dishes asked about, or null when it is not such a question or no dish is named. */
export function caloriesAnswer(text: string): { text: string; results: Match[] } | null {
  const t = text.toLowerCase().replace(/ё/g, "е");
  if (!ASK.test(t)) return null;
  const rest = t.replace(ASK, " ").replace(FILLER, " ").replace(/[?!.,:;]/g, " ").replace(/\s+/g, " ").trim();
  if (!rest) return null;
  const found = searchRecipes(rest).filter((r) => nutritionOf(r).perServing.kcal > 0).slice(0, 3);
  if (!found.length) return null;
  return {
    text: found.map(line).join("\n") + "\nВ рецепте — на порцию, как в нём написано; у вас может немного отличаться.",
    results: found.map((recipe) => ({ recipe, available: [], missing: [], unknown: [], toBuy: [], reason: recipe.summary })),
  };
}
