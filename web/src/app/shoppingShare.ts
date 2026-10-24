// The shopping list as it is sent, copied or printed — in the same words and amounts as on the screen («Лук — 4 шт.»,
// «Капуста — 1 кочан»), not the catalog's («Репчатый лук — 340 г», «Белокочанная капуста — 650 г»): the person in the
// shop reads what the one at home saw.
import { groupShopping, shoppingText, type ShoppingItem } from "../engine";
import { shopLine } from "./amounts";

export function listText(list: ShoppingItem[], title = "Список покупок"): string {
  const body = groupShopping(list.filter((i) => !i.checked)).map((g) => g.label + ":\n" + g.items.map((i) => {
    const l = shopLine(i);
    return "• " + l.name + " — " + l.text + (l.need ? " (" + l.need + ")" : "");
  }).join("\n")).join("\n\n");
  // The title and the closing line («Собрано в …» and the link) as the engine writes them.
  const frame = shoppingText([], title);
  return frame.replace(title + "\n\n", title + "\n\n" + body);
}
