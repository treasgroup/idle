// «В покупки» from the week plan — in the plan itself and in an empty shopping list («Взять продукты из плана»).
// The rows it made last time are remembered, so pressing it again rebuilds them instead of adding twice.
import { menuShopping, type EngineState, type MenuDay, type ShoppingItem } from "../engine";
import { haveIds } from "./actions";

const MENU_ROWS = "cook-menu-shopping-v1";
const loadRows = (): string[] => { try { const v = JSON.parse(localStorage.getItem(MENU_ROWS) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
const saveRows = (keys: string[]) => { try { localStorage.setItem(MENU_ROWS, JSON.stringify(keys)); } catch { /* ignore */ } };

/** The list with the week's products in place of the ones the last «В покупки» put there; bought ones stay. */
export function withWeek(st: EngineState, week: MenuDay[]): ShoppingItem[] {
  const prev = loadRows();
  const rest = st.shopping.filter((x) => x.checked || !prev.includes(x.key));
  const fresh = menuShopping(week, [], haveIds(st)).filter((f) => !rest.some((k) => k.key === f.key));
  saveRows(fresh.map((f) => f.key));
  return [...rest, ...fresh];
}
