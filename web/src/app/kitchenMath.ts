// Kitchen arithmetic people ask about all the time: cups and spoons ↔ grams («2 стакана муки — это сколько?»)
// and how long to roast something of a given weight. Plain tables, on the device, no server.

// ——— Cups and spoons ———
// Grams in a glass (гранёный, 200 мл), a tablespoon and a teaspoon — the usual home tables.
export const DENSITY: [RegExp, string, number, number, number][] = [
  [/^мук/, "мука", 130, 25, 8],
  [/^сахарн\S* пудр|^пудр/, "сахарная пудра", 140, 25, 8],
  [/^сахар/, "сахар", 180, 25, 8],
  [/^сол/, "соль", 260, 25, 8],
  [/^рис/, "рис", 180, 25, 8],
  [/^греч/, "гречка", 170, 25, 8],
  [/^ман/, "манка", 160, 25, 8],
  [/^пшен/, "пшено", 180, 25, 8],
  [/^(овсян|геркулес|хлоп)/, "овсяные хлопья", 80, 12, 4],
  [/^крахмал/, "крахмал", 150, 30, 10],
  [/^какао/, "какао", 110, 20, 7],
  [/^(сод)/, "сода", 200, 28, 12],
  [/^разрыхл/, "разрыхлитель", 160, 20, 5],
  [/^(молок|кефир|ряжен|сливк)/, "молоко", 200, 18, 5],
  [/^вод/, "вода", 200, 15, 5],
  [/^сметан/, "сметана", 210, 25, 10],
  [/^(масл\S* раст|подсолн|оливк|растит)/, "растительное масло", 190, 17, 5],
  [/^(масл\S* слив|сливочн)/, "сливочное масло (растопленное)", 190, 20, 5],
  [/^(мед|мёд)/, "мёд", 280, 30, 10],
  [/^(орех)/, "орехи", 120, 20, 7],
  [/^(изюм)/, "изюм", 160, 25, 8],
  [/^(творог)/, "творог", 160, 25, 8],
];
const NUM: Record<string, number> = { "пол": 0.5, "половина": 0.5, "четверть": 0.25, "треть": 1 / 3, "один": 1, "одна": 1, "одну": 1, "два": 2, "две": 2, "три": 3, "четыре": 4, "пять": 5, "полтора": 1.5, "полторы": 1.5 };
const UNITS: [RegExp, 0 | 1 | 2][] = [[/^стак/, 0], [/^(ст\.?\s*л|столов)/, 1], [/^(ч\.?\s*л|чайн)/, 2]];

function num(s: string): number | null {
  const t = s.trim().toLowerCase().replace(",", ".");
  if (/^\d+\s*\/\s*\d+$/.test(t)) { const [a, b] = t.split("/").map(Number); return b ? a / b : null; }
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
  if (/^\d+\s*[-–]\s*\d+$/.test(t)) { const [a, b] = t.split(/[-–]/).map(Number); return (a + b) / 2; }
  return NUM[t] ?? null;
}
const round = (g: number) => (g < 20 ? Math.round(g) : g < 100 ? Math.round(g / 5) * 5 : Math.round(g / 10) * 10);

/** «2 стакана муки», «Мука — 3 ст. л.», «полстакана сахара» → «≈ 260 г»; null when it is not about cups or spoons. */
export function gramsHint(line: string): string | null {
  const l = line.toLowerCase().replace(/ё/g, "е").replace(/полстакана/g, "0.5 стакана").replace(/[—–-]\s*/g, " ").replace(/\s+/g, " ").trim();
  // amount + unit + product, or product + amount + unit
  const m = l.match(/(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?|\d+\s*[-–]\s*\d+|пол|половина|четверть|треть|один|одна|одну|два|две|три|четыре|пять|полтора|полторы)\s*(стакан\S*|ст\.?\s*л\.?|столов\S*\s*ложк\S*|ч\.?\s*л\.?|чайн\S*\s*ложк\S*)\s*(.*)$/);
  if (!m) return null;
  const n = num(m[1]);
  const u = UNITS.find(([re]) => re.test(m[2]))?.[1];
  if (n === null || u === undefined) return null;
  const before = l.slice(0, m.index).trim(), after = m[3].trim();
  const what = after || before;
  const d = DENSITY.find(([re]) => re.test(what));
  if (!d) return null;
  const g = n * [d[2], d[3], d[4]][u];
  if (!g || g > 5000) return null;
  return "≈ " + round(g) + (d[1] === "молоко" || d[1] === "вода" || d[1].includes("масло") ? (d[1] === "сливочное масло (растопленное)" ? " г" : " мл") : " г");
}

/** A question to Шеф: «сколько грамм в стакане муки», «2 ст. л. сахара это сколько». */
export function measureAnswer(q: string): string | null {
  const l = q.toLowerCase().replace(/ё/g, "е");
  if (!/(сколько|это)/.test(l) || !/(стакан|ложк|ст\.?\s*л|ч\.?\s*л)/.test(l)) return null;
  const one = l.replace(/в (одном |1 )?стакане/, "1 стакан ").replace(/в (одной |1 )?(столовой ложке|ст\.?\s*л\.?)/, "1 ст. л. ").replace(/в (одной |1 )?(чайной ложке|ч\.?\s*л\.?)/, "1 ч. л. ")
    .replace(/сколько (грамм\S*|г)\s*/, "").replace(/\bэто сколько\b|\?/g, "").trim();
  const hint = gramsHint(one);
  if (!hint) return null;
  return one.charAt(0).toUpperCase() + one.slice(1) + " — " + hint.replace("≈ ", "примерно ") + ". Стакан — гранёный, 200 мл; ложки — с небольшой горкой.";
}

// ——— Roasting ———
export interface RoastKind { id: string; label: string; temp: number; perKg: number; base: number; min: number; max: number; tip: string }
export const ROAST: RoastKind[] = [
  { id: "chicken", label: "Курица целиком", temp: 190, perKg: 40, base: 20, min: 50, max: 150, tip: "Готова, когда сок у кости прозрачный. Дайте полежать 10 минут под фольгой." },
  { id: "chicken-parts", label: "Курица кусочками (бёдра, ножки)", temp: 200, perKg: 0, base: 40, min: 35, max: 50, tip: "Кожей вверх, не накрывая — будет румяная корочка." },
  { id: "pork", label: "Свинина куском", temp: 180, perKg: 55, base: 15, min: 50, max: 180, tip: "Первые 20 минут — под фольгой, потом снимите для корочки." },
  { id: "beef", label: "Говядина куском", temp: 180, perKg: 60, base: 20, min: 60, max: 200, tip: "После духовки 15 минут под фольгой — так мясо останется сочным." },
  { id: "turkey", label: "Индейка (грудка, бедро)", temp: 180, perKg: 45, base: 15, min: 40, max: 150, tip: "Чтобы не была сухой, запекайте в фольге или рукаве и полейте соком." },
  { id: "fish", label: "Рыба целиком", temp: 190, perKg: 25, base: 10, min: 20, max: 60, tip: "Готова, когда мясо легко отходит от хребта." },
  { id: "fish-fillet", label: "Рыба филе", temp: 200, perKg: 0, base: 18, min: 12, max: 25, tip: "Тонкое филе — 12–15 минут, толстые стейки — до 25." },
  { id: "potato", label: "Картофель дольками", temp: 200, perKg: 0, base: 35, min: 30, max: 45, tip: "В один слой, перевернуть один раз. Тесно — будет тушёный, а не румяный." },
];

/** Minutes for a kind and weight (kg), rounded to five. */
export function roastMinutes(k: RoastKind, kg: number): number {
  const m = k.perKg ? k.base + k.perKg * kg : k.base;
  return Math.round(Math.min(k.max, Math.max(k.min, m)) / 5) * 5;
}

/** «сколько запекать курицу 1,8 кг» → an answer; null when it is not such a question. */
export function roastAnswer(q: string): string | null {
  const l = q.toLowerCase().replace(/ё/g, "е");
  if (!/(сколько|как долго|время).*(запек|в духовк)|(запек\S*).*(сколько|как долго)/.test(l)) return null;
  const k = /курин|курица|курицу|кур[уы]? /.test(l) ? (/(бедр|ножк|голен|крыл|кусоч)/.test(l) ? ROAST[1] : ROAST[0])
    : /свин/.test(l) ? ROAST[2] : /говяд/.test(l) ? ROAST[3] : /индейк/.test(l) ? ROAST[4]
      : /(рыб|скумбри|форел|горбуш|семг|лосос|судак|карп|дорад)/.test(l) ? (/филе|стейк/.test(l) ? ROAST[6] : ROAST[5])
        : /картош|картоф/.test(l) ? ROAST[7] : null;
  if (!k) return null;
  const w = l.match(/(\d+(?:[.,]\d+)?)\s*(кг|килограм\S*|кило|г\b|грам\S*)/);
  let kg = w ? Number(w[1].replace(",", ".")) : NaN;
  if (w && /^г/.test(w[2])) kg = kg / 1000;
  if (k.perKg && !(kg > 0)) return k.label + ": при " + k.temp + " °C примерно " + k.perKg + " минут на каждый килограмм плюс " + k.base + ". Напишите вес — посчитаю точно. " + k.tip;
  const min = roastMinutes(k, kg > 0 ? kg : 1);
  const h = Math.floor(min / 60), mm = min % 60;
  const t = h ? h + " ч" + (mm ? " " + mm + " мин" : "") : min + " мин";
  return k.label + (k.perKg && kg > 0 ? ", " + String(kg).replace(".", ",") + " кг" : "") + ": " + k.temp + " °C, примерно " + t + ". " + k.tip;
}
