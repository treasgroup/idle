// The old panel's own look (its buttons and fields are styled by these classes in its stylesheet), so the new
// tabs sit in it as if they were always there.
const BASE = "inline-flex shrink-0 items-center justify-center text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";
export const BTN = BASE + " gap-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 has-[>svg]:px-3";
export const BTN_OUTLINE = BASE + " gap-2 rounded-md border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 has-[>svg]:px-3";
export const BTN_SM = BASE + " border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5";
export const INPUT = "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** What the old stylesheet has no class for: the two columns, the list, the recipe tiles. */
export const CSS = `
main.adm-main.cook-extra-on > :not(#cook-extra) { display: none !important; }
.cx-cols { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 18px; align-items: start; }
@media (max-width: 860px) { .cx-cols { grid-template-columns: 1fr; } }
.cx-list { padding: 8px; position: sticky; top: 76px; max-height: calc(100vh - 96px); overflow: auto; }
.cx-group { font-size: 12px; font-weight: 600; color: #6f7062; text-transform: uppercase; letter-spacing: .04em; padding: 12px 10px 4px; }
.cx-li { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px; border: 0; background: none; border-radius: 12px; text-align: left; font: inherit; font-size: 15px; color: inherit; }
.cx-li:hover { background: #f3eee2; }
.cx-li.on { background: #f3e5dd; color: #a83e2b; font-weight: 600; }
.cx-li .cx-ic { width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0; display: grid; place-items: center; font-size: 18px; background: #f0ece0; overflow: hidden; }
.cx-li .cx-ic img { width: 100%; height: 100%; object-fit: cover; }
.cx-li .cx-n { margin-left: auto; font-size: 13px; color: #6f7062; font-weight: 400; white-space: nowrap; }
.cx-li.off .cx-n { color: #a3311f; }
.cx-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.cx-fields { display: grid; grid-template-columns: 1fr 1fr 90px; gap: 12px; margin-top: 16px; }
@media (max-width: 640px) { .cx-fields { grid-template-columns: 1fr; } }
.cx-fields label, .cx-label { display: block; font-size: 13px; font-weight: 600; color: #6f7062; margin-bottom: 5px; }
.cx-covers { margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border); display: grid; gap: 22px; }
.cx-cover { display: grid; grid-template-columns: 210px 1fr; gap: 18px; align-items: start; }
@media (max-width: 640px) { .cx-cover { grid-template-columns: 1fr; } }
.cx-cover-img { border-radius: 16px; object-fit: cover; background: #f0ece0; display: grid; place-items: center; font-size: 42px; }
.cx-cover-tall { width: 150px; aspect-ratio: 4/5; }
.cx-cover-wide { width: 210px; aspect-ratio: 3/2; }
.cx-prompt { width: 100%; min-height: 96px; border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; font: 13px/1.45 ui-monospace, Menlo, monospace; background: #f7f3ea; resize: vertical; }
.cx-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 10px; }
.cx-section { margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border); }
.cx-pills { display: flex; gap: 6px; flex-wrap: wrap; margin: 8px 0 12px; }
.cx-pill { height: 32px; padding: 0 12px; border-radius: 99px; border: 1px solid var(--border); background: #fffdf8; font: inherit; font-size: 14px; color: inherit; }
.cx-pill.on { background: #2f3328; border-color: #2f3328; color: #fff; }
.cx-search { position: relative; }
.cx-found { position: absolute; z-index: 5; left: 0; right: 0; top: 42px; background: #fffdf8; border: 1px solid var(--border); border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.12); padding: 6px; max-height: 340px; overflow: auto; }
.cx-found-row { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 10px; }
.cx-found-row:hover { background: #f3eee2; }
.cx-found-row img, .cx-found-row .cx-ph { width: 40px; height: 40px; border-radius: 8px; object-fit: cover; background: #f0ece0; flex-shrink: 0; }
.cx-found-row span { flex: 1; min-width: 0; font-size: 14px; }
.cx-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
.cx-tile { position: relative; border: 1px solid var(--border); border-radius: 14px; overflow: hidden; background: #fffdf8; }
.cx-tile img, .cx-tile .cx-ph { width: 100%; aspect-ratio: 4/3; object-fit: cover; display: block; background: #f0ece0; }
.cx-tile b { display: block; font-size: 13px; font-weight: 600; line-height: 1.25; padding: 8px 10px 10px; }
.cx-tile .cx-x { position: absolute; top: 6px; right: 6px; height: 28px; padding: 0 10px; border-radius: 99px; border: 0; background: rgba(255,255,255,.95); font: inherit; font-size: 12px; font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,.15); }
.cx-tile .cx-badge { position: absolute; top: 6px; left: 6px; font-size: 11px; font-weight: 700; border-radius: 6px; padding: 2px 7px; background: #36703f; color: #fff; }
.cx-tile.out { opacity: .55; }
.cx-toggle { display: inline-flex; align-items: center; gap: 10px; font-size: 14px; cursor: pointer; }
.cx-toggle input { width: 18px; height: 18px; accent-color: #b7432f; }
.cx-saved { font-size: 13px; color: #36703f; }
.cx-err { font-size: 13px; color: #a3311f; }
/* The grouped menu: the old panel's own menu hidden, the sections in its place, the section's tabs under the header. */
header.adm-header > nav.adm-nav:not(.cx-nav) { display: none !important; }
nav.cx-sub { position: sticky; top: 61px; z-index: 19; background: rgba(255, 253, 248, .94); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); }
nav.cx-sub[hidden] { display: none; }
.cx-sub-in { max-width: 1180px; margin: 0 auto; padding: 0 28px; display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; }
.cx-sub-in a { display: inline-flex; align-items: center; white-space: nowrap; padding: 11px 12px; font-size: 14px; color: #5d6052; text-decoration: none; border-bottom: 2px solid transparent; }
.cx-sub-in a:hover { color: #2f3328; }
.cx-sub-in a.on { color: #a83e2b; border-bottom-color: #b7432f; font-weight: 600; }
/* The old panel's «Обзор · Запросы · Рецепты · Аудитория»: the tabs' -1px underline made it scroll up and down — a
   stray scrollbar at its right end. Sideways scroll on narrow screens stays, without the bar. */
.adm-subtabs { overflow-y: hidden; scrollbar-width: none; }
.adm-subtabs::-webkit-scrollbar { display: none; }
@media (max-width: 640px) { .cx-sub-in { padding: 0 12px; } }
.adm-nav a .cx-count, .cx-sub-in a .cx-count { display: inline-grid; place-items: center; min-width: 20px; height: 20px; padding: 0 6px; margin-left: 6px; border-radius: 99px; background: #b7432f; color: #fff; font-size: 12px; font-weight: 700; line-height: 1; }

/* The older scripts' blocks (messages, statistics, VK, catalog restore) in the panel's look. */
.ins { --brand: #b7432f; --herb: #36703f; --soft: #6f7062; --line: var(--border); }
.ins h2 { margin: 22px 0 10px; font-size: 18px; font-weight: 700; }
.ins .card { border: 1px solid var(--border); background: rgb(255, 253, 248); border-radius: 18px; padding: 20px 22px; margin-bottom: 16px; min-width: 0; }
.ins .muted, .ins .empty { color: #6f7062; font-size: 14px; }
.ins .empty { padding: 4px 0; }
.ins a { color: #a83e2b; }
.ins .row { display: flex; align-items: center; gap: 12px; padding: 9px 0; border-top: 1px solid var(--border); }
.ins .row:first-child { border-top: 0; }
.ins .bar { height: 10px; border-radius: 99px; background: #f2ece2; flex: 1; overflow: hidden; }
.ins .bar > span { display: block; height: 100%; background: #b7432f; border-radius: 99px; }
.ins .num { min-width: 64px; text-align: right; font-variant-numeric: tabular-nums; }
.ins .label { min-width: 190px; }
.ins .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px; }
.ins .grid .card { margin-bottom: 0; }
.ins .big { font-size: 30px; font-weight: 650; }
.ins .err { font-family: ui-monospace, Menlo, monospace; font-size: 13px; word-break: break-word; }
.ins button, #cook-extra select { font: inherit; font-size: 14px; height: 34px; padding: 0 14px; border-radius: 8px; border: 1px solid var(--border); background: #fffdf8; color: inherit; cursor: pointer; }
.ins button:hover { background: #f3eee2; }
.ins .reply { margin-top: 8px; padding: 8px 12px; border-radius: 12px; background: #eef5ee; font-size: 15px; }
.ins .reply-form { margin-top: 8px; display: grid; gap: 8px; }
.ins .reply-form[hidden] { display: none; }
.ins .reply-form textarea, .ins textarea { font: inherit; padding: 8px 12px; border-radius: 10px; border: 1px solid var(--border); width: 100%; box-sizing: border-box; }
.ins .reply-form button, .ins .vk-form .primary, .ins button.primary { background: #b7432f; color: #fff; border-color: #b7432f; justify-self: start; }
.ins .vk-form { display: grid; gap: 10px; }
.ins .vk-form input[type=text], .ins .vk-form input[type=password] { font: inherit; padding: 8px 12px; border-radius: 10px; border: 1px solid var(--border); width: 100%; box-sizing: border-box; }
.ins .vk-ok { color: #36703f; } .ins .vk-err { color: #a3311f; }
`;
