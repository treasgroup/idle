// Walks the site like a person on a phone and on a computer, and fails on any page error.
// Run before uploading:  node e2e/smoke.cjs http://127.0.0.1:8099/cook/
// (needs Playwright: npm i -g playwright, and a local PHP server: php -S 127.0.0.1:8099 -t <folder with cook -> server>)
// Statistics, accounts and push are stubbed, so a run against the live site does not touch real data.
const path = require("path");
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require(path.join(require("child_process").execSync("npm root -g").toString().trim(), "playwright"))); }

const BASE = process.argv[2] || process.env.SITE || "http://127.0.0.1:8099/cook/";
const problems = [];
const step = (name) => console.log("  ✓ " + name);

async function walk(size, mobile) {
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const ctx = await browser.newContext({ viewport: size, isMobile: mobile, hasTouch: mobile, locale: "ru-RU" });
  await ctx.route(/api\/index\.php\?r=(event|session|account\.|push\.|feedback|poll\.create|reviews\.save|error|taps)/, (r) => r.fulfill({ status: 200, body: "{}", contentType: "application/json" }));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => problems.push((mobile ? "phone" : "desktop") + ": " + e.message));
  const go = async (hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(700); };
  // Visible text only (the computer's side menu is in the page on phones too, just hidden).
  const must = async (text, what) => {
    const l = page.getByText(text);
    for (let i = 0; i < Math.min(await l.count(), 20); i++) if (await l.nth(i).isVisible().catch(() => false)) return step(what);
    problems.push((mobile ? "phone" : "desktop") + ": not shown — " + what);
  };

  console.log(mobile ? "Phone" : "Computer");
  await page.goto(BASE, { waitUntil: "networkidle" });
  const skip = page.getByRole("button", { name: "Пропустить" });
  if (await skip.count()) await skip.first().click();
  await page.waitForTimeout(600);
  await must(/Что приготовим/, "home");
  await go("#/recipes"); await page.getByPlaceholder("Найти рецепт").fill("картоха"); await page.waitForTimeout(800); await must(/Нашлось/, "search");
  await go("#/recipes/r/rice-noodles-shrimp"); await page.waitForTimeout(800); await must(/Продукты/, "recipe");
  await page.getByRole("button", { name: /Начать готовить/ }).first().click(); await page.waitForTimeout(900); await must(/Шаг 1 из/, "cooking");
  await page.getByRole("button", { name: /^Дальше/ }).last().click(); await page.waitForTimeout(400); await must(/Шаг 2 из/, "next step");
  await page.keyboard.press("Escape"); await page.waitForTimeout(600);
  await go("#/chat"); await page.getByRole("textbox").last().fill("курица и картошка"); await page.keyboard.press("Enter"); await page.waitForTimeout(2000); await must(/Открыть рецепт/, "chat answer");
  await go("#/shopping"); await must(/Список покупок пуст|Осталось купить/, "shopping");
  await go("#/menu"); await must(/План на неделю/, "plan");
  await go("#/pantry"); await must(/Мои продукты/, "my products");
  await go("#/profile"); await must(/Размер текста/, "profile");
  await go("#/learn"); await must(/Школа готовки/, "school");
  await browser.close();
}

(async () => {
  await walk({ width: 390, height: 844 }, true);
  await walk({ width: 1440, height: 900 }, false);
  if (problems.length) { console.log("\nProblems:\n- " + problems.join("\n- ")); process.exit(1); }
  console.log("\nAll good.");
})().catch((e) => { console.error(e); process.exit(1); });
