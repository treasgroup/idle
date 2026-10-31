// A clean printable page (recipe, menu, shopping list) in a new window: no buttons, no navigation, black on white.
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export interface PrintSection { title?: string; items?: string[]; ordered?: boolean; text?: string }

const part = (s: PrintSection) => (s.title ? `<h2>${esc(s.title)}</h2>` : "")
  + (s.text ? `<p>${esc(s.text).replace(/\n/g, "<br>")}</p>` : "")
  + (s.items?.length ? `<${s.ordered ? "ol" : "ul"}>${s.items.map((i) => `<li>${esc(i)}</li>`).join("")}</${s.ordered ? "ol" : "ul"}>` : "");

/** `side`: sections printed in a narrow left column (a recipe: products on the left, steps on the right), in large type
 *  — a sheet to keep on the fridge. */
export function printPage(title: string, sections: PrintSection[], note?: string, side?: PrintSection[]): void {
  const body = side?.length
    ? `<div class="cols"><div>${side.map(part).join("")}</div><div>${sections.map(part).join("")}</div></div>`
    : sections.map(part).join("");
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    body{font:15px/1.5 Georgia,"Times New Roman",serif;color:#000;margin:24px auto;max-width:720px;padding:0 16px}
    h1{font-size:26px;margin:0 0 6px}h2{font-size:18px;margin:22px 0 8px;border-bottom:1px solid #ccc;padding-bottom:4px}
    ul,ol{margin:0;padding-left:22px}li{margin:4px 0}p{margin:6px 0}.note{color:#555;font-size:12px;margin-top:28px}
    .big{font-size:19px;line-height:1.55;max-width:900px}.big h1{font-size:32px}.big h2{font-size:22px}.big li{margin:7px 0}
    .cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.7fr);gap:32px}
    @media print{body{margin:0 auto}}</style></head><body${side?.length ? ' class="big"' : ""}><h1>${esc(title)}</h1>${body}
    <p class="note">${esc(note ?? "Шефли — " + location.host + location.pathname)}</p>
    <script>window.onload=function(){window.print()}</script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/** Plain text (a menu or a list as it is shared) → a printable page, one line per item. */
export function printText(title: string, text: string): void {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const first = lines[0]?.replace(/[:：]$/, "") === title ? lines.slice(1) : lines;
  printPage(title, [{ text: first.join("\n") }]);
}
