<?php
// Pages for search engines and link previews: one HTML page per recipe (recipe.php), the list of all recipes
// (recipes.php) and sitemap.xml (sitemap.php). The app itself stays a single page; these pages are plain HTML
// with the same recipe, schema.org Recipe markup and Open Graph tags for VK and Telegram.
// Pretty addresses (/cook/recipe/borsch) are used when the hosting runs mod_rewrite (see .htaccess);
// otherwise recipe.php?id=borsch. Both show the same page with one canonical address.

const SEO_SITE = 'Что приготовить?';
const SEO_COURSES = ['soup' => ['Супы', 'Суп', 'супов'], 'main' => ['Вторые блюда', 'Второе блюдо', 'вторых блюд'], 'side' => ['Гарниры', 'Гарнир', 'гарниров'],
    'salad' => ['Салаты и закуски', 'Салат', 'салатов и закусок'], 'breakfast' => ['Завтраки', 'Завтрак', 'завтраков'], 'baking' => ['Выпечка', 'Выпечка', 'выпечки'],
    'dessert' => ['Десерты', 'Десерт', 'десертов'], 'snack' => ['Перекусы', 'Перекус', 'перекусов'], 'sauce' => ['Соусы', 'Соус', 'соусов'], 'drink' => ['Напитки', 'Напиток', 'напитков']];
const SEO_DIFFICULTY = ['easy' => 'Просто', 'medium' => 'Средне', 'hard' => 'Сложно'];
const SEO_CUISINE = ['russian' => 'Русская кухня', 'ukrainian' => 'Украинская кухня', 'belarusian' => 'Белорусская кухня', 'caucasian' => 'Кавказская кухня',
    'central-asian' => 'Среднеазиатская кухня', 'tatar' => 'Татарская кухня', 'international' => 'Европейская кухня'];

function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function seo_json($v): string { return json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_PRETTY_PRINT); }

// ---------- Addresses ----------
// Set by .htaccess when mod_rewrite works (directly or after an internal rewrite, with REDIRECT_).
function seo_pretty(): bool { return !empty($_SERVER['COOK_PRETTY']) || !empty($_SERVER['REDIRECT_COOK_PRETTY']); }
// The site folder as seen from the browser: /cook/ (pages live in its root, next to index.html).
function seo_path(): string {
    $dir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/recipe.php'));
    return rtrim($dir, '/') . '/';
}
function seo_origin(): string {
    $host = (string)($_SERVER['HTTP_HOST'] ?? 'localhost');
    if (!preg_match('/^[a-z0-9.-]+(:\d{1,5})?$/i', $host)) $host = 'localhost';
    return (is_https() ? 'https://' : 'http://') . strtolower($host);
}
function seo_abs(string $path): string { return seo_origin() . $path; }
function seo_recipe_path(string $id): string { return seo_path() . (seo_pretty() ? 'recipe/' . $id : 'recipe.php?id=' . $id); }
function seo_list_path(?string $course = null): string {
    if (seo_pretty()) return seo_path() . 'recipes/' . ($course ? $course : '');
    return seo_path() . 'recipes.php' . ($course ? '?c=' . $course : '');
}
// The same recipe in the app: portions, timers, shopping list, cooking step by step.
function seo_app_path(string $id): string { return seo_path() . '?recipe=' . rawurlencode($id); }

// ---------- Data ----------
// Recipes the site shows: valid enough to print, not hidden by the owner; the first one wins on a repeated id (as in the app).
function seo_recipes(): array {
    static $out = null;
    if ($out !== null) return $out;
    $hidden = [];
    try { $hidden = array_flip(array_map('strval', (array)setting('hidden', []))); } catch (Throwable $e) {}
    $out = [];
    foreach (catalog_files() as $f) {
        if (isset($f['error'])) continue;
        $mtime = @filemtime(catalog_dir() . '/' . $f['name']) ?: time();
        foreach (($f['data']['recipes'] ?? []) as $r) {
            if (!is_array($r) || !isset($r['id'], $r['title']) || !is_string($r['id']) || !preg_match(RECIPE_ID, $r['id']) || strlen($r['id']) > 60) continue;
            if (isset($out[$r['id']]) || isset($hidden[$r['id']])) continue;
            if (!is_array($r['ingredients'] ?? null) || !is_array($r['steps'] ?? null) || !$r['ingredients'] || count($r['steps']) < 2) continue;
            $r['_mtime'] = $mtime;
            $r['_course'] = seo_course($r);
            $out[$r['id']] = $r;
        }
    }
    return $out;
}
function seo_course(array $r): string {
    $c = (string)($r['course'] ?? '');
    if (isset(SEO_COURSES[$c])) return $c;
    $t = mb_strtolower((string)$r['title'], 'UTF-8');
    if (preg_match('/(суп|борщ|щи\b|солянк|уха\b|рассольник|окрошк|похлёбк|похлебк|бульон)/u', $t)) return 'soup';
    if (preg_match('/(салат|винегрет)/u', $t)) return 'salad';
    if (preg_match('/(пирог|пирож|булоч|кекс|маффин|хлеб|ватрушк)/u', $t)) return 'baking';
    if (preg_match('/(каша|омлет|яичниц|сырник|блин|олад)/u', $t)) return 'breakfast';
    if (in_array('sweet', (array)($r['tags'] ?? []), true)) return 'dessert';
    return 'main';
}
function seo_photo(string $id, bool $size = false): ?array {
    $file = photos_dir() . '/' . $id . '.jpg';
    if (!is_file($file)) return null;
    $size = $size ? @getimagesize($file) : null;
    return ['path' => seo_path() . 'photos/' . $id . '.jpg?v=' . filemtime($file), 'w' => $size[0] ?? null, 'h' => $size[1] ?? null, 'real' => in_array($id, real_photos(), true), 'mtime' => filemtime($file)];
}
// Per serving, as in the app: optional products are not counted; a product without grams makes it incomplete.
function seo_nutrition(array $r): ?array {
    static $info = null;
    if ($info === null) $info = catalog_ingredients();
    $aliases = ['зубчика' => 'зубчик', 'зубчиков' => 'зубчик', 'шт' => 'шт.', 'штук' => 'шт.', 'штуки' => 'шт.', 'ст.л.' => 'ст. л.', 'ч.л.' => 'ч. л.', 'гр' => 'г', 'гр.' => 'г', 'г.' => 'г', 'мл.' => 'мл'];
    $sum = ['kcal' => 0.0, 'protein' => 0.0, 'fat' => 0.0, 'carbs' => 0.0]; $complete = true;
    foreach ($r['ingredients'] as $i) {
        if (!is_array($i) || !empty($i['optional'])) continue;
        $in = $info[(string)($i['id'] ?? '')] ?? null; $n = $in['per100g'] ?? null;
        $u = trim((string)($i['unit'] ?? '')); $u = $aliases[$u] ?? $u; $amount = (float)($i['amount'] ?? 0);
        $per = (array)($in['gramsPerUnit'] ?? []);
        if ($u === 'г') $g = $amount; elseif ($u === 'кг') $g = $amount * 1000;
        elseif (isset($per[$u])) $g = $amount * (float)$per[$u];
        elseif ($u === 'мл') $g = $amount; elseif ($u === 'л') $g = $amount * (isset($per['мл']) ? (float)$per['мл'] * 1000 : 1000);
        else $g = null;
        if (!is_array($n) || $g === null) { $complete = false; continue; }
        foreach ($sum as $k => $_) $sum[$k] += (float)($n[$k] ?? 0) * $g / 100;
    }
    $s = max(1, (int)($r['servings'] ?? 1));
    if ($sum['kcal'] <= 0) return null;
    return ['kcal' => (int)round($sum['kcal'] / $s), 'protein' => (int)round($sum['protein'] / $s), 'fat' => (int)round($sum['fat'] / $s), 'carbs' => (int)round($sum['carbs'] / $s), 'complete' => $complete];
}
function seo_reviews(string $id): array {
    try {
        reviews_schema();
        $summary = review_summary($id);
        $st = db()->prepare("SELECT author, rating, text, created_at FROM reviews WHERE recipe_id = ? AND status = 'visible' AND text <> '' ORDER BY likes DESC, created_at DESC LIMIT 5");
        $st->execute([$id]);
        return ['summary' => $summary, 'list' => $st->fetchAll()];
    } catch (Throwable $e) { return ['summary' => ['avg' => 0, 'count' => 0], 'list' => []]; }
}

// A person (not a robot) opened the page: one more view for this recipe, day and source. Never breaks the page.
function seo_count_view(string $id): void {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET' || is_bot_ua()) return;
    try {
        $ref = ref_key((string)($_SERVER['HTTP_REFERER'] ?? ''));
        if ($ref === 'treas' && preg_match('#(recipe\.php|/recipes?/|recipes\.php)#', (string)($_SERVER['HTTP_REFERER'] ?? ''))) $ref = 'recipe-page';
        $pdo = db(); $day = today();
        $pdo->prepare('INSERT OR IGNORE INTO page_views (day, recipe_id, ref, n) VALUES (?, ?, ?, 0)')->execute([$day, $id, $ref]);
        $pdo->prepare('UPDATE page_views SET n = n + 1 WHERE day = ? AND recipe_id = ? AND ref = ?')->execute([$day, $id, $ref]);
    } catch (Throwable $e) {}
}

// ---------- Words ----------
function seo_plural(int $n, string $one, string $few, string $many): string { $a = $n % 10; $b = $n % 100; return $a === 1 && $b !== 11 ? $one : ($a >= 2 && $a <= 4 && ($b < 12 || $b > 14) ? $few : $many); }
function seo_minutes(int $m): string {
    if ($m < 60) return $m . ' мин';
    $hours = intdiv($m, 60); $rest = $m % 60;
    return $hours . ' ч' . ($rest ? ' ' . $rest . ' мин' : '');
}
function seo_iso_minutes(int $m): string { $hours = intdiv($m, 60); $rest = $m % 60; return 'PT' . ($hours ? $hours . 'H' : '') . ($rest || !$hours ? $rest . 'M' : ''); }
function seo_amount($a): string {
    $a = (float)$a;
    $s = abs($a - round($a)) < 0.001 ? (string)(int)round($a) : rtrim(rtrim(number_format($a, 2, ',', ''), '0'), ',');
    return $s;
}
function seo_ingredient_line(array $i): string { return trim((string)($i['name'] ?? '')) . ' — ' . seo_amount($i['amount'] ?? 0) . ' ' . trim((string)($i['unit'] ?? '')); }
function seo_cut(string $s, int $max): string {
    $s = trim(preg_replace('/\s+/u', ' ', $s));
    if (mb_strlen($s, 'UTF-8') <= $max) return $s;
    $s = mb_substr($s, 0, $max - 1, 'UTF-8');
    return preg_replace('/\s+\S*$/u', '', $s) . '…';
}
function seo_lower_first(string $s): string { return mb_strtolower(mb_substr($s, 0, 1, 'UTF-8'), 'UTF-8') . mb_substr($s, 1, null, 'UTF-8'); }
// «Борщ классический — рецепт с фото пошагово, 1 ч 30 мин» — what people search for.
function seo_title(array $r, ?array $photo): string {
    return $r['title'] . ' — ' . ($photo ? 'рецепт с фото пошагово' : 'пошаговый рецепт') . ', ' . seo_minutes((int)($r['totalMinutes'] ?? 0));
}
function seo_description(array $r, ?array $kcal): string {
    $main = array_slice(array_values(array_filter(array_map(function ($i) { return is_array($i) && empty($i['optional']) && !preg_match('/^(water|salt|black-pepper|vegetable-oil|sunflower-oil|sugar)$/', (string)($i['id'] ?? '')) ? mb_strtolower((string)$i['name'], 'UTF-8') : null; }, $r['ingredients']))), 0, 5);
    $bits = [rtrim(trim((string)($r['summary'] ?? '')), '.') . '.'];
    $bits[] = 'Время: ' . seo_minutes((int)($r['totalMinutes'] ?? 0)) . ', ' . (int)($r['servings'] ?? 1) . ' ' . seo_plural((int)($r['servings'] ?? 1), 'порция', 'порции', 'порций') . ($kcal ? ', ' . $kcal['kcal'] . ' ккал на порцию' : '') . '.';
    if ($main) $bits[] = 'Понадобится: ' . implode(', ', $main) . '.';
    return seo_cut(implode(' ', $bits), 200);
}

// ---------- Page frame ----------
function seo_head(array $o): string {
    $t = h($o['title']); $d = h($o['description']); $url = h($o['canonical']);
    $img = $o['image'] ?? seo_abs(seo_path() . 'icons/icon-512.png');
    $out = "<!doctype html>\n<html lang=\"ru\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<title>$t</title>\n<meta name=\"description\" content=\"$d\">\n<link rel=\"canonical\" href=\"$url\">\n"
        . "<meta property=\"og:type\" content=\"" . h($o['ogType'] ?? 'website') . "\">\n<meta property=\"og:site_name\" content=\"" . h(SEO_SITE) . "\">\n<meta property=\"og:locale\" content=\"ru_RU\">\n"
        . "<meta property=\"og:title\" content=\"" . h($o['ogTitle'] ?? $o['title']) . "\">\n<meta property=\"og:description\" content=\"$d\">\n<meta property=\"og:url\" content=\"$url\">\n<meta property=\"og:image\" content=\"" . h($img) . "\">\n";
    if (!empty($o['imageW'])) $out .= '<meta property="og:image:width" content="' . (int)$o['imageW'] . "\">\n<meta property=\"og:image:height\" content=\"" . (int)$o['imageH'] . "\">\n";
    if (!empty($o['imageAlt'])) $out .= '<meta property="og:image:alt" content="' . h($o['imageAlt']) . "\">\n";
    $out .= '<meta name="twitter:card" content="' . (isset($o['image']) ? 'summary_large_image' : 'summary') . "\">\n<meta name=\"theme-color\" content=\"#FAF7F0\">\n<meta name=\"color-scheme\" content=\"only light\">\n<link rel=\"icon\" href=\"" . h(seo_path()) . "favicon.svg\" type=\"image/svg+xml\">\n<link rel=\"apple-touch-icon\" href=\"" . h(seo_path()) . "icons/apple-touch-icon.png\">\n";
    foreach (($o['ld'] ?? []) as $ld) $out .= "<script type=\"application/ld+json\">\n" . seo_json($ld) . "\n</script>\n";
    return $out . '<style>' . seo_css() . "</style>\n</head>\n<body" . (!empty($o['bodyClass']) ? ' class="' . h($o['bodyClass']) . '"' : '') . ">\n" . seo_header();
}
function seo_header(): string {
    $p = h(seo_path());
    // Phones: the name and «Открыть приложение»; the other links are in the footer and the breadcrumbs.
    return "<header class=\"top\"><div class=\"wrap\"><a class=\"brand\" href=\"$p\"><img src=\"{$p}logo-round.svg\" alt=\"\" width=\"34\" height=\"34\"><span>" . h(SEO_SITE) . "</span></a>"
        . "<nav aria-label=\"Разделы\"><a class=\"wide\" href=\"" . h(seo_list_path()) . "\">Рецепты</a><a class=\"wide\" href=\"" . h(seo_collection_path_safe()) . "\">Подборки</a><a class=\"wide\" href=\"" . h(seo_combo_path('')) . "\">По продуктам</a><a class=\"wide\" href=\"" . h(seo_path() . (seo_pretty() ? 'shkola/' : 'shkola.php')) . "\">Школа</a>"
        . "<a class=\"pill\" href=\"$p\">Открыть<span class=\"wide\"> приложение</span></a></nav></div></header>\n<main class=\"wrap\">\n";
}
/** Подборки' address (collections.php is not loaded on every page). */
function seo_collection_path_safe(): string { return seo_path() . (seo_pretty() ? 'podborka/' : 'podborka.php'); }
function seo_footer(): string {
    $p = h(seo_path());
    return "</main>\n<footer class=\"foot\"><div class=\"wrap\"><a class=\"brand\" href=\"$p\"><img src=\"{$p}logo-round.svg\" alt=\"\" width=\"28\" height=\"28\" loading=\"lazy\"><span>" . h(SEO_SITE) . "</span></a>"
        . "<p>Подбор домашних рецептов по продуктам, времени и настроению. Голосом или текстом, бесплатно и без регистрации.</p>"
        . "<nav aria-label=\"Ещё\"><a href=\"" . h(seo_list_path()) . "\">Все рецепты</a><a href=\"" . h(seo_collection_path_safe()) . "\">Подборки</a><a href=\"" . h(seo_combo_path('')) . "\">Что приготовить из продуктов</a><a href=\"" . h(seo_path() . (seo_pretty() ? 'shkola/' : 'shkola.php')) . "\">Школа готовки</a><a href=\"{$p}#info\">Откуда сведения</a><a href=\"{$p}#privacy\">Конфиденциальность</a></nav></div></footer>\n</body>\n</html>\n";
}
/** The site's own font (Golos Text), served from /fonts next to the app. */
function seo_fonts(): string {
    $f = seo_path() . 'fonts/';
    return "@font-face{font-family:'Golos Text';font-style:normal;font-weight:400 900;font-display:swap;src:url({$f}GolosText-cyrillic.woff2) format('woff2');unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}"
        . "@font-face{font-family:'Golos Text';font-style:normal;font-weight:400 900;font-display:swap;src:url({$f}GolosText-latin.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}"
        ;
}
function seo_css(): string {
    // The app's colours and font; cards and chips as in the app.
    return ':root{--bg:#faf7f0;--card:#fff;--ink:#211d1a;--muted:#5c544d;--faint:#8a8178;--line:#ebe4d8;--accent:#b7432f;--accent-ink:#fff;--soft:#f8e7e0;--herb:#36703f;--sunken:#f3ede3;--warn:#b7791f;color-scheme:only light}'
        . seo_fonts()
        . '*{box-sizing:border-box}html{scroll-padding-top:80px}body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.6 "Golos Text",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;-webkit-text-size-adjust:100%;text-rendering:optimizeLegibility}'
        . 'h1,h2,h3,.brand{letter-spacing:-.015em;font-weight:600}'
        . 'a{color:var(--accent);text-decoration-thickness:1px;text-underline-offset:3px}img{max-width:100%;display:block}.wrap{max-width:1120px;margin:0 auto;padding:0 20px}@media(max-width:560px){.wrap{padding:0 16px}}'
        // Header: one line everywhere, white and calm.
        . '.top{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.92);-webkit-backdrop-filter:saturate(1.4) blur(10px);backdrop-filter:saturate(1.4) blur(10px);border-bottom:1px solid var(--line)}'
        . '.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:64px}'
        . '.brand{display:flex;align-items:center;gap:10px;font-weight:650;font-size:18px;color:var(--ink);text-decoration:none;white-space:nowrap}'
        . '.top nav{display:flex;gap:4px;align-items:center;font-size:15px;white-space:nowrap}.top nav a{color:var(--ink);text-decoration:none;padding:8px 12px;border-radius:999px}.top nav a.wide:hover{background:var(--sunken)}'
        . '.pill,.top nav a.pill{background:var(--accent);color:var(--accent-ink);padding:9px 18px;border-radius:999px;text-decoration:none;font-weight:600;margin-left:6px}'
        . '@media(max-width:820px){.top nav a.wide,.pill .wide{display:none}.top .wrap{min-height:58px}.brand{font-size:17px}.pill,.top nav a.pill{padding:8px 14px;font-size:14px}}'
        . '@media(max-width:360px){.brand span{display:none}}'
        // Text.
        . '.crumbs{font-size:14px;color:var(--muted);margin:20px 0 4px}.crumbs a{color:var(--muted);text-decoration:none}.crumbs a:hover{color:var(--accent)}'
        . 'h1{font-size:clamp(28px,4.6vw,42px);line-height:1.12;margin:8px 0 12px}main>h1:first-child{margin-top:28px}'
        . '.lead{font-size:18px;color:var(--muted);margin:0 0 16px;max-width:68ch}h2{font-size:clamp(22px,3vw,26px);margin:36px 0 12px;line-height:1.25}h2 a{color:inherit;text-decoration:none}h2 a:hover{color:var(--accent)}.note{color:var(--muted);font-size:15px;margin:-6px 0 12px}'
        // Chips with the facts.
        . '.meta{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px;padding:0;list-style:none}.meta li{display:inline-flex;align-items:center;gap:6px;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:5px 12px;font-size:15px}.meta svg{width:16px;height:16px;color:var(--muted);flex:none}'
        . '.rating{display:inline-flex;align-items:center;gap:6px;font-size:15px;color:var(--muted);margin:0 0 10px}.rating b{color:var(--ink)}.stars{color:var(--warn);letter-spacing:1px}'
        // The recipe: photo and facts side by side on wide screens; ingredients beside the steps.
        . '.hero{display:grid;gap:20px;margin:6px 0 8px}@media(min-width:900px){.hero{grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:36px;align-items:center}.hero h1{margin-top:0}}'
        . 'figure{margin:0}figure img{width:100%;height:auto;aspect-ratio:4/3;object-fit:cover;border-radius:24px;background:var(--soft)}figcaption{font-size:13px;color:var(--faint);margin-top:6px}'
        . '.go{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:4px}.go p{margin:0;font-size:14px;color:var(--muted);flex:1 1 220px}'
        . '.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:var(--accent);color:var(--accent-ink);text-decoration:none;font-weight:600;padding:13px 22px;border-radius:999px;min-height:48px}.btn:hover{filter:brightness(1.06)}'
        . '.cols{display:grid;gap:8px 40px}@media(min-width:900px){.cols{grid-template-columns:340px minmax(0,1fr)}.cols aside{position:sticky;top:88px;align-self:start}}'
        . '.ing{list-style:none;padding:0;margin:0;background:var(--card);border:1px solid var(--line);border-radius:20px;overflow:hidden}.ing li{display:flex;justify-content:space-between;gap:12px;padding:11px 16px;border-top:1px solid var(--line)}.ing li:first-child{border-top:0}.ing b{white-space:nowrap;font-weight:600}.ing small{color:var(--muted)}'
        . '.steps{counter-reset:s;list-style:none;padding:0;margin:0;display:grid;gap:10px}.steps li{counter-increment:s;position:relative;padding:14px 16px 14px 60px;background:var(--card);border:1px solid var(--line);border-radius:18px}.steps li:before{content:counter(s);position:absolute;left:14px;top:12px;width:32px;height:32px;border-radius:50%;background:var(--soft);color:var(--accent);display:grid;place-items:center;font-weight:700;font-size:15px}'
        . '.tips{background:var(--soft);border-radius:20px;padding:6px 18px}.tips p{margin:12px 0}'
        . '.faq details{background:var(--card);border:1px solid var(--line);border-radius:16px;margin:0 0 8px;padding:0 16px}.faq summary{cursor:pointer;font-weight:600;padding:13px 0;list-style:none;display:flex;justify-content:space-between;gap:12px}.faq summary::-webkit-details-marker{display:none}.faq summary:after{content:"+";color:var(--muted);font-weight:400;font-size:22px;line-height:1}.faq details[open] summary:after{content:"–"}.faq details p{margin:0 0 14px;color:var(--muted)}'
        . 'table{border-collapse:separate;border-spacing:0;width:100%;max-width:460px;background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden}td,th{padding:9px 16px;border-top:1px solid var(--line);text-align:left}tr:first-child td{border-top:0}td.n{text-align:right;font-variant-numeric:tabular-nums}'
        . '.review{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:12px 16px;margin:0 0 10px}.review p{margin:4px 0 0}'
        // Cards: always a picture (the photo, or the kind of dish drawn), then the title and the facts.
        . '.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;list-style:none;padding:0;margin:0}@media(min-width:700px){.grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}}@media(min-width:1000px){.grid{grid-template-columns:repeat(4,minmax(0,1fr))}}'
        . '.grid li{min-width:0}.card{display:flex;flex-direction:column;height:100%;background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden;text-decoration:none;color:var(--ink);transition:border-color .15s,transform .15s}.card:hover{border-color:#d9cdbb;transform:translateY(-1px)}'
        . '.pic{position:relative;aspect-ratio:4/3;background:var(--sunken)}.pic img{width:100%;height:100%;object-fit:cover}.pic .art{position:absolute;inset:0;display:grid;place-items:center;font-size:46px;background:radial-gradient(120% 120% at 30% 15%,#fbeee6 0%,#f3e2d3 100%)}'
        . '.pic .art:before{content:"";position:absolute;width:62%;aspect-ratio:1;border-radius:50%;background:rgba(255,255,255,.8);box-shadow:0 4px 14px rgba(60,30,10,.1)}.pic .art span{position:relative}'
        . '.pic .score{position:absolute;right:8px;top:8px;display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,.95);border-radius:999px;padding:2px 9px;font-size:13px;font-weight:600;box-shadow:0 1px 4px rgba(0,0,0,.08)}.pic .score i{color:var(--warn);font-style:normal}'
        . '.card b{display:block;padding:10px 12px 0;font-weight:600;font-size:16px;line-height:1.3;overflow-wrap:break-word;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.card small{display:block;padding:4px 12px 12px;color:var(--muted);font-size:14px;margin-top:auto}'
        . '@media(max-width:560px){.grid{gap:10px}.card b{font-size:15px;padding:8px 10px 0}.card small{padding:3px 10px 10px;font-size:13px}}'
        . '.more{margin:14px 0 0}.more a{font-weight:600;text-decoration:none}'
        // Chips to choose a section; «Спросить Шефа» as a quiet card.
        . '.cats{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 18px;padding:0;list-style:none}.cats a{display:block;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:7px 14px;text-decoration:none;color:var(--ink);font-size:15px}.cats a:hover{border-color:#d9cdbb}.cats a.on{background:var(--ink);color:#fff;border-color:var(--ink)}.cats small{color:var(--faint);font-size:13px;margin-left:4px}.cats a.on small{color:rgba(255,255,255,.7)}'
        . '.cta{background:var(--soft);border-radius:22px;padding:18px 20px;margin:4px 0 24px;display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap}.cta p{margin:0;font-size:16px;flex:1 1 260px}'
        // Phones, recipe page: «Готовить по шагам» always at hand.
        . '.dock{display:none}@media(max-width:899px){.go{display:none}.dock{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:30;gap:10px;align-items:center;padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:rgba(255,255,255,.95);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-top:1px solid var(--line)}.dock .btn{flex:1}body.has-dock{padding-bottom:84px}}'
        . '.foot{margin-top:56px;border-top:1px solid var(--line);background:var(--card);color:var(--muted);font-size:14px;padding:24px 0 36px}.foot p{margin:8px 0 12px;max-width:60ch}.foot nav{display:flex;flex-wrap:wrap;gap:6px 18px}.foot nav a{color:var(--muted);text-decoration:none}.foot nav a:hover{color:var(--accent)}'
        // Школа готовки: lesson cards as a numbered list, lists of lessons, questions and answers (details).
        . '.lesson{list-style:none;counter-reset:c;padding:0;margin:8px 0 8px;display:grid;gap:12px;max-width:68ch}.lesson li{counter-increment:c;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px 18px}'
        . '.lesson li img{width:100%;height:auto;border-radius:12px;margin:0 0 12px;display:block}.lesson h2{font-size:19px;margin:0 0 6px}.lesson h2:before{content:counter(c) ". ";color:var(--herb)}.lesson p{margin:0;color:var(--muted)}'
        . '.links{list-style:none;padding:0;margin:0;display:grid;gap:8px;max-width:68ch}.links li{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 16px}.links a{font-weight:600;color:var(--ink);text-decoration:none}.links a:hover{color:var(--accent)}.links small{display:block;color:var(--muted);font-size:14px;margin-top:2px}'
        . '.quiz{max-width:68ch}.quiz ol{margin:0 0 14px;padding-left:22px;color:var(--muted)}.quiz ol li{margin:0 0 6px}'
        . '@media print{.top,.cta,.foot,.related,.dock,.go{display:none}body{background:#fff}}';
}

// ---------- recipe.php ----------
/** Questions people ask about a dish, answered from the recipe itself: time, keeping, freezing, swaps, calories. */
function seo_recipe_faq(array $r, ?array $kcal, int $servings): array {
    $name = '«' . (string)$r['title'] . '»';
    $out = [];
    $total = (int)($r['totalMinutes'] ?? 0); $active = (int)($r['activeMinutes'] ?? 0);
    if ($total) $out[] = ['Сколько готовится ' . $name . '?', 'Всего ' . seo_minutes($total) . ($active && $active < $total ? ', из них у плиты — ' . seo_minutes($active) . ', остальное время можно заниматься своими делами' : '') . '.'];
    $fridge = (int)($r['storageDays'] ?? 0); $freezer = (int)($r['freezerDays'] ?? 0);
    if ($fridge) $out[] = ['Сколько хранится ' . $name . '?', 'В холодильнике — до ' . $fridge . ' ' . seo_plural($fridge, 'дня', 'дней', 'дней') . ', в закрытом контейнере.'];
    if ($freezer) $out[] = ['Можно ли заморозить ' . $name . '?', 'Да, в морозилке блюдо хранится до ' . $freezer . ' ' . seo_plural($freezer, 'дня', 'дней', 'дней') . '. Размораживайте в холодильнике.'];
    $swaps = 0;
    foreach ($r['ingredients'] as $i) {
        if (!is_array($i) || empty($i['swap']) || $swaps >= 2) continue;
        $alt = array_values(array_filter(array_map(fn($x) => mb_strtolower(seo_ing_name((string)$x), 'UTF-8'), (array)$i['swap']), fn($n) => $n !== '' && !preg_match('/^[a-z0-9-]+$/', $n)));
        if (!$alt) continue;
        $what = mb_strtolower((string)($i['name'] ?? ''), 'UTF-8');
        $out[] = ['Чем заменить ' . $what . '?', 'Подойдёт ' . implode(' или ', array_slice($alt, 0, 3)) . '.'];
        $swaps++;
    }
    if ($kcal) $out[] = ['Сколько калорий в одной порции?', 'Около ' . $kcal['kcal'] . ' ккал: белки ' . $kcal['protein'] . ' г, жиры ' . $kcal['fat'] . ' г, углеводы ' . $kcal['carbs'] . ' г.'];
    $out[] = ['На сколько порций рассчитан рецепт?', 'На ' . $servings . ' ' . seo_plural($servings, 'порцию', 'порции', 'порций') . '. В приложении «Что приготовить?» продукты пересчитываются на любое число человек.'];
    return $out;
}
function seo_faq_ld(array $faq): ?array {
    if (count($faq) < 2) return null;
    return ['@context' => 'https://schema.org', '@type' => 'FAQPage', 'mainEntity' => array_map(fn($x) => ['@type' => 'Question', 'name' => $x[0],
        'acceptedAnswer' => ['@type' => 'Answer', 'text' => $x[1]]], $faq)];
}

function seo_recipe_page(string $id): void {
    $all = seo_recipes();
    $r = $all[$id] ?? null;
    if (!$r) { seo_not_found(); return; }
    seo_count_view($id);
    $photo = seo_photo($id, true);
    $kcal = seo_nutrition($r);
    $rev = seo_reviews($id);
    $course = $r['_course'];
    $canonical = seo_abs(seo_pretty() ? seo_path() . 'recipe/' . $id : seo_path() . 'recipe.php?id=' . $id);
    $title = seo_title($r, $photo);
    $desc = seo_description($r, $kcal);
    $servings = max(1, (int)($r['servings'] ?? 1));
    $image = $photo ? seo_abs($photo['path']) : null;

    $ld = ['@context' => 'https://schema.org', '@type' => 'Recipe', 'name' => (string)$r['title'], 'description' => (string)($r['summary'] ?? ''), 'url' => $canonical,
        'recipeCategory' => SEO_COURSES[$course][1], 'recipeYield' => $servings . ' ' . seo_plural($servings, 'порция', 'порции', 'порций'),
        'totalTime' => seo_iso_minutes((int)($r['totalMinutes'] ?? 0)),
        'recipeIngredient' => array_values(array_map('seo_ingredient_line', array_filter($r['ingredients'], 'is_array'))),
        'recipeInstructions' => array_values(array_map(function ($s, $k) use ($canonical) { return ['@type' => 'HowToStep', 'position' => $k + 1, 'text' => (string)($s['text'] ?? ''), 'url' => $canonical . '#step-' . ($k + 1)]; }, array_values(array_filter($r['steps'], 'is_array')), array_keys(array_values(array_filter($r['steps'], 'is_array'))))),
        'author' => ['@type' => 'Organization', 'name' => SEO_SITE, 'url' => seo_abs(seo_path())], 'inLanguage' => 'ru',
        'datePublished' => date('Y-m-d', (int)$r['_mtime'])];
    if (!empty($r['activeMinutes'])) $ld['prepTime'] = seo_iso_minutes((int)$r['activeMinutes']);
    if ($image) $ld['image'] = [$image];
    if (isset(SEO_CUISINE[$r['cuisine'] ?? ''])) $ld['recipeCuisine'] = SEO_CUISINE[$r['cuisine']];
    $keywords = [mb_strtolower((string)$r['title'], 'UTF-8'), 'рецепт', mb_strtolower(SEO_COURSES[$course][1], 'UTF-8')];
    if (in_array('vegetarian', (array)($r['tags'] ?? []), true)) { $keywords[] = 'вегетарианское'; $ld['suitableForDiet'] = 'https://schema.org/VegetarianDiet'; }
    if (in_array('quick', (array)($r['tags'] ?? []), true) || (int)($r['totalMinutes'] ?? 99) <= 30) $keywords[] = 'быстро';
    $ld['keywords'] = implode(', ', array_unique($keywords));
    if ($kcal) $ld['nutrition'] = ['@type' => 'NutritionInformation', 'servingSize' => '1 порция', 'calories' => $kcal['kcal'] . ' ккал', 'proteinContent' => $kcal['protein'] . ' г', 'fatContent' => $kcal['fat'] . ' г', 'carbohydrateContent' => $kcal['carbs'] . ' г'];
    if ($rev['summary']['count'] > 0) {
        $ld['aggregateRating'] = ['@type' => 'AggregateRating', 'ratingValue' => $rev['summary']['avg'], 'ratingCount' => $rev['summary']['count'], 'bestRating' => 5, 'worstRating' => 1];
        $ld['review'] = array_map(function ($x) { return ['@type' => 'Review', 'author' => ['@type' => 'Person', 'name' => (string)$x['author']], 'datePublished' => date('Y-m-d', (int)($x['created_at'] / 1000)),
            'reviewBody' => (string)$x['text'], 'reviewRating' => ['@type' => 'Rating', 'ratingValue' => (int)$x['rating'], 'bestRating' => 5, 'worstRating' => 1]]; }, $rev['list']);
    }
    $crumbs = ['@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => [
        ['@type' => 'ListItem', 'position' => 1, 'name' => 'Рецепты', 'item' => seo_abs(seo_list_path())],
        ['@type' => 'ListItem', 'position' => 2, 'name' => SEO_COURSES[$course][0], 'item' => seo_abs(seo_list_path($course))],
        ['@type' => 'ListItem', 'position' => 3, 'name' => (string)$r['title'], 'item' => $canonical]]];

    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: public, max-age=300');
    header('Last-Modified: ' . gmdate('D, d M Y H:i:s', max((int)$r['_mtime'], $photo['mtime'] ?? 0)) . ' GMT');
    echo seo_head(['title' => $title . ' | ' . SEO_SITE, 'ogTitle' => (string)$r['title'], 'description' => $desc, 'canonical' => $canonical, 'ogType' => 'article', 'bodyClass' => 'has-dock',
        'image' => $image, 'imageW' => $photo['w'] ?? null, 'imageH' => $photo['h'] ?? null, 'imageAlt' => $photo ? (string)$r['title'] : null,
        'ld' => array_merge([$ld, $crumbs], ($faqLd = seo_faq_ld(seo_recipe_faq($r, $kcal, $servings))) ? [$faqLd] : [])]);

    $app = h(seo_app_path($id));
    $icon = [
        'clock' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
        'hand' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12h20"/><path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"/><path d="m4 8 16-4"/><path d="m8.86 6.78-.45-1.81a2 2 0 0 1 1.45-2.43l1.94-.48a2 2 0 0 1 2.43 1.46l.45 1.8"/></svg>',
        'users' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        'level' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20v-4M10 20v-8M16 20V8M22 20V4"/></svg>',
        'flame' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
    ];
    echo '<nav class="crumbs" aria-label="Навигация"><a href="' . h(seo_list_path()) . '">Рецепты</a> › <a href="' . h(seo_list_path($course)) . '">' . h(SEO_COURSES[$course][0]) . "</a></nav>\n";
    $meta = [[$icon['clock'], 'Всего ' . seo_minutes((int)($r['totalMinutes'] ?? 0))]];
    if (!empty($r['activeMinutes']) && (int)$r['activeMinutes'] < (int)$r['totalMinutes']) $meta[] = [$icon['hand'], 'у плиты ' . seo_minutes((int)$r['activeMinutes'])];
    $meta[] = [$icon['users'], $servings . ' ' . seo_plural($servings, 'порция', 'порции', 'порций')];
    if (isset(SEO_DIFFICULTY[$r['difficulty'] ?? ''])) $meta[] = [$icon['level'], SEO_DIFFICULTY[$r['difficulty']]];
    if ($kcal) $meta[] = [$icon['flame'], $kcal['kcal'] . ' ккал на порцию'];
    // Top: the photo and, beside it on a wide screen, the name, the mark, what the dish is, the facts and «Готовить по шагам».
    echo '<article><div class="hero">';
    if ($photo) echo '<figure><img src="' . h($photo['path']) . '" alt="' . h($r['title']) . '"' . ($photo['w'] ? ' width="' . (int)$photo['w'] . '" height="' . (int)$photo['h'] . '"' : '') . ' fetchpriority="high">' . ($photo['real'] ? '' : '<figcaption>Иллюстрация создана нейросетью по описанию рецепта и показывает примерную подачу.</figcaption>') . "</figure>\n";
    echo '<div><h1>' . h($r['title']) . "</h1>\n";
    if ($rev['summary']['count'] > 0) {
        $avg = (float)$rev['summary']['avg'];
        echo '<p class="rating"><span class="stars" aria-hidden="true">' . str_repeat('★', (int)round($avg)) . str_repeat('☆', 5 - (int)round($avg)) . '</span><b>' . h(str_replace('.', ',', (string)$avg)) . '</b> · <a href="#reviews">' . $rev['summary']['count'] . ' ' . seo_plural((int)$rev['summary']['count'], 'отзыв', 'отзыва', 'отзывов') . "</a></p>\n";
    }
    if (!empty($r['summary'])) echo '<p class="lead">' . h($r['summary']) . "</p>\n";
    echo '<ul class="meta">' . implode('', array_map(function ($m) { return '<li>' . $m[0] . h($m[1]) . '</li>'; }, $meta)) . "</ul>\n";
    echo '<div class="go"><a class="btn" href="' . $app . '">Готовить по шагам</a><p>Таймеры на шагах, пересчёт на любое число порций и список покупок — бесплатно.</p></div>';
    echo "</div></div>\n";

    // Ingredients beside the steps on a wide screen (they stay in view while reading the steps).
    echo '<div class="cols"><aside><h2>Ингредиенты</h2><p class="note">На ' . $servings . ' ' . seo_plural($servings, 'порцию', 'порции', 'порций') . "</p>\n<ul class=\"ing\">";
    foreach ($r['ingredients'] as $i) if (is_array($i)) echo '<li><span>' . h($i['name'] ?? '') . (!empty($i['optional']) ? ' <small>по желанию</small>' : '') . '</span><b>' . h(seo_amount($i['amount'] ?? 0) . ' ' . ($i['unit'] ?? '')) . '</b></li>';
    echo "</ul></aside>\n<div><h2>Как приготовить</h2>\n<ol class=\"steps\">";
    $k = 0; foreach ($r['steps'] as $s) if (is_array($s)) { $k++; echo '<li id="step-' . $k . '">' . h($s['text'] ?? '') . '</li>'; }
    echo "</ol>\n";
    $tips = array_values(array_filter((array)($r['tips'] ?? []), 'is_string'));
    if ($tips) echo '<h2>Советы</h2><div class="tips">' . implode('', array_map(function ($t) { return '<p>' . h($t) . '</p>'; }, $tips)) . "</div>\n";
    if ($kcal) echo '<h2>Калорийность и БЖУ</h2><p class="note">На одну порцию' . ($kcal['complete'] ? '' : ', без продуктов, для которых нет данных') . '</p><table><tbody><tr><td>Калории</td><td class="n">' . $kcal['kcal'] . ' ккал</td></tr><tr><td>Белки</td><td class="n">' . $kcal['protein'] . ' г</td></tr><tr><td>Жиры</td><td class="n">' . $kcal['fat'] . ' г</td></tr><tr><td>Углеводы</td><td class="n">' . $kcal['carbs'] . " г</td></tr></tbody></table>\n";
    // Частые вопросы: the answers are in the recipe already; folded here (the text is on the page, marked up for search engines).
    $faq = seo_recipe_faq($r, $kcal, $servings);
    if ($faq) {
        echo '<h2>Частые вопросы</h2><div class="faq">';
        foreach ($faq as [$q, $a]) echo '<details><summary>' . h($q) . '</summary><p>' . h($a) . '</p></details>';
        echo "</div>\n";
    }
    if ($rev['list']) {
        echo '<h2 id="reviews">Отзывы</h2>';
        foreach ($rev['list'] as $x) echo '<div class="review"><b>' . h($x['author']) . '</b> <span class="stars" aria-label="Оценка ' . (int)$x['rating'] . ' из 5">' . str_repeat('★', (int)$x['rating']) . str_repeat('☆', 5 - (int)$x['rating']) . '</span><p>' . nl2br(h($x['text'])) . '</p></div>';
        echo '<p><a href="' . $app . "\">Все отзывы и написать свой</a></p>\n";
    }
    echo '<p class="note" style="margin-top:24px">Время, калорийность и сроки хранения ориентировочные. Доводите мясо, рыбу и яйца до готовности.</p></div></div></article>' . "\n";
    // Phones: the main action stays at hand while scrolling.
    echo '<div class="dock"><a class="btn" href="' . $app . "\">Готовить по шагам</a></div>\n";

    // Other variants of the same dish first, then dishes of the same kind with the same main product, then the rest of the kind.
    $dish = (string)($r['dish'] ?? ''); $mainIng = (string)($r['mainIngredient'] ?? '');
    $others = array_filter($all, function ($x) use ($id) { return $x['id'] !== $id; });
    $score = function ($x) use ($dish, $mainIng, $course) { return ($dish !== '' && ($x['dish'] ?? '') === $dish ? 4 : 0) + ($x['_course'] === $course ? 2 : 0) + ($mainIng !== '' && ($x['mainIngredient'] ?? '') === $mainIng ? 1 : 0); };
    $others = array_filter($others, function ($x) use ($score) { return $score($x) >= 2; });
    uasort($others, function ($a, $b) use ($score) { return $score($b) <=> $score($a) ?: strcmp($a['title'], $b['title']); });
    $others = array_slice($others, 0, 8, true);
    if ($others) {
        echo '<section class="related"><h2>Похожие рецепты</h2><ul class="grid">';
        foreach ($others as $x) echo seo_card($x);
        echo '</ul><p class="more"><a href="' . h(seo_list_path($course)) . '">Все ' . h(mb_strtolower(SEO_COURSES[$course][0], 'UTF-8')) . "</a></p></section>\n";
    }
    echo seo_footer();
}
/** Emoji for a dish without a photo, by its kind. */
const SEO_ART = ['soup' => '🍲', 'main' => '🍽️', 'side' => '🥔', 'salad' => '🥗', 'breakfast' => '🍳', 'baking' => '🥧', 'dessert' => '🍰', 'snack' => '🥪', 'sauce' => '🥣', 'drink' => '🥤'];
/** All averages at once: [recipe id => [average, count]] (one query per page). */
function seo_ratings(): array {
    static $out = null;
    if ($out !== null) return $out;
    $out = [];
    try { reviews_schema(); foreach (db()->query("SELECT recipe_id, AVG(rating) a, COUNT(*) n FROM reviews WHERE status = 'visible' GROUP BY recipe_id")->fetchAll() as $r) $out[(string)$r['recipe_id']] = [round((float)$r['a'], 1), (int)$r['n']]; } catch (Throwable $e) {}
    return $out;
}
/** The card's small copy of the photo when it is ready (as on the app's cards), else the photo itself. */
function seo_thumb(string $id): ?string {
    $file = photos_dir() . '/' . $id . '.jpg';
    if (!is_file($file)) return null;
    $v = filemtime($file);
    return seo_path() . (is_file(photos_dir() . '/s/' . $id . '-' . $v . '.jpg') ? 'photos/s/' . $id . '-' . $v . '.jpg' : 'photos/' . $id . '.jpg?v=' . $v);
}
function seo_card(array $x, bool $withPhoto = true): string {
    $src = seo_thumb($x['id']);
    $pic = $src ? '<img src="' . h($src) . '" alt="" loading="lazy" decoding="async" width="400" height="300">'
        : '<span class="art" aria-hidden="true"><span>' . (SEO_ART[$x['_course'] ?? 'main'] ?? '🍽️') . '</span></span>';
    $r = seo_ratings()[$x['id']] ?? null;
    $score = $r ? '<span class="score" aria-label="Оценка ' . h(str_replace('.', ',', (string)$r[0])) . ' из 5"><i>★</i>' . h(str_replace('.', ',', (string)$r[0])) . '</span>' : '';
    $kcal = seo_nutrition($x);
    $facts = seo_minutes((int)($x['totalMinutes'] ?? 0)) . ($kcal ? ' · ' . $kcal['kcal'] . ' ккал' : '');
    return '<li><a class="card" href="' . h(seo_recipe_path($x['id'])) . '"><span class="pic">' . $pic . $score . '</span><b>' . h($x['title']) . '</b><small>' . h($facts) . '</small></a></li>';
}
function seo_not_found(): void {
    http_response_code(404);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache');
    echo seo_head(['title' => 'Рецепт не найден | ' . SEO_SITE, 'description' => 'Такого рецепта нет или его убрали.', 'canonical' => seo_abs(seo_list_path())]);
    echo '<h1>Рецепт не найден</h1><p>Возможно, его переименовали или убрали. Посмотрите <a href="' . h(seo_list_path()) . '">все рецепты</a> или <a href="' . h(seo_path()) . '">подберите блюдо</a> по продуктам и настроению.</p>';
    echo seo_footer();
}

// ---------- recipes.php ----------
function seo_list_page(?string $course): void {
    $all = seo_recipes();
    if ($course !== null && !isset(SEO_COURSES[$course])) { seo_not_found(); return; }
    $by = [];
    foreach ($all as $r) $by[$r['_course']][] = $r;
    foreach ($by as &$list) usort($list, function ($a, $b) { return strcmp(mb_strtolower($a['title'], 'UTF-8'), mb_strtolower($b['title'], 'UTF-8')); });
    unset($list);
    $count = count($all);
    if ($course) {
        $n = count($by[$course] ?? []);
        $title = SEO_COURSES[$course][0] . ' — ' . $n . ' ' . seo_plural($n, 'домашний рецепт', 'домашних рецепта', 'домашних рецептов') . ' с пошаговым описанием';
        $desc = 'Рецепты ' . SEO_COURSES[$course][2] . ' на каждый день: время приготовления, ингредиенты, шаги, калорийность. Подбор по продуктам, которые есть дома.';
    } else {
        $title = 'Все рецепты — ' . $count . ' ' . seo_plural($count, 'домашний рецепт', 'домашних рецепта', 'домашних рецептов') . ' на каждый день';
        $desc = 'Каталог домашних рецептов: супы, вторые блюда, салаты, выпечка, завтраки. У каждого — время, ингредиенты, пошаговое описание и калорийность.';
    }
    $canonical = seo_abs(seo_list_path($course));
    $items = $course ? ($by[$course] ?? []) : array_merge(...array_values(array_map(function ($c) use ($by) { return $by[$c] ?? []; }, array_keys(SEO_COURSES))));
    $ld = ['@context' => 'https://schema.org', '@type' => 'ItemList', 'name' => $course ? SEO_COURSES[$course][0] : 'Все рецепты', 'numberOfItems' => count($items),
        'itemListElement' => array_values(array_map(function ($r, $k) { return ['@type' => 'ListItem', 'position' => $k + 1, 'url' => seo_abs(seo_recipe_path($r['id'])), 'name' => (string)$r['title']]; }, $items, array_keys($items)))];
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: public, max-age=300');
    echo seo_head(['title' => $title . ' | ' . SEO_SITE, 'description' => $desc, 'canonical' => $canonical, 'ld' => [$ld]]);
    if ($course) echo '<nav class="crumbs" aria-label="Навигация"><a href="' . h(seo_list_path()) . "\">Рецепты</a></nav>\n";
    echo '<h1>' . h($course ? SEO_COURSES[$course][0] : 'Все рецепты') . '</h1><p class="lead">' . h($desc) . "</p>\n";
    echo '<ul class="cats"><li><a href="' . h(seo_list_path()) . '"' . ($course ? '' : ' class="on"') . '>Все<small>' . $count . '</small></a></li>';
    foreach (SEO_COURSES as $c => $names) if (!empty($by[$c])) echo '<li><a href="' . h(seo_list_path($c)) . '"' . ($course === $c ? ' class="on"' : '') . '>' . h($names[0]) . '<small>' . count($by[$c]) . '</small></a></li>';
    echo "</ul>\n";
    echo '<div class="cta"><p>Не знаете, что выбрать? Назовите продукты, время или настроение — Шеф подберёт рецепт.</p><a class="btn" href="' . h(seo_path()) . "\">Спросить Шефа</a></div>\n";
    // Dishes with a photo first, then by name.
    $photoFirst = function (array $list): array { usort($list, fn($a, $b) => (seo_thumb($b['id']) ? 1 : 0) <=> (seo_thumb($a['id']) ? 1 : 0) ?: strcmp(mb_strtolower($a['title'], 'UTF-8'), mb_strtolower($b['title'], 'UTF-8'))); return $list; };
    foreach (SEO_COURSES as $c => $names) {
        if (empty($by[$c]) || ($course && $course !== $c)) continue;
        // All recipes: eight of each kind and the way to the rest; a kind's page: every recipe of it.
        $list = $photoFirst($by[$c]);
        if (!$course) echo '<h2><a href="' . h(seo_list_path($c)) . '">' . h($names[0]) . '</a></h2>';
        echo '<ul class="grid">';
        foreach ($course ? $list : array_slice($list, 0, 8) as $r) echo seo_card($r);
        echo "</ul>\n";
        if (!$course && count($list) > 8) echo '<p class="more"><a href="' . h(seo_list_path($c)) . '">Все ' . h(mb_strtolower($names[0], 'UTF-8')) . ' · ' . count($list) . " →</a></p>\n";
    }
    if (!$all) echo '<p>Рецепты скоро появятся.</p>';
    echo seo_footer();
}

// ---------- sitemap.php ----------
function seo_sitemap(): void {
    $all = seo_recipes();
    header('Content-Type: application/xml; charset=utf-8');
    header('Cache-Control: public, max-age=3600');
    $newest = $all ? max(array_column($all, '_mtime')) : time();
    $x = function ($s) { return htmlspecialchars((string)$s, ENT_XML1 | ENT_QUOTES, 'UTF-8'); };
    echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">' . "\n";
    $url = function (string $loc, int $mtime, string $extra = '') use ($x) { echo '<url><loc>' . $x($loc) . '</loc><lastmod>' . gmdate('Y-m-d', $mtime) . '</lastmod>' . $extra . "</url>\n"; };
    $url(seo_abs(seo_path()), $newest);
    $url(seo_abs(seo_list_path()), $newest);
    $courses = [];
    foreach ($all as $r) $courses[$r['_course']] = max($courses[$r['_course']] ?? 0, (int)$r['_mtime']);
    foreach (SEO_COURSES as $c => $_) if (isset($courses[$c])) $url(seo_abs(seo_list_path($c)), $courses[$c]);
    if (function_exists('seo_collection_list')) {
        $url(seo_abs(seo_collection_path()), $newest);
        foreach (seo_collection_list() as $k => $_) $url(seo_abs(seo_collection_path($k)), $newest);
    }
    if (function_exists('school_sitemap')) school_sitemap($url);
    $url(seo_abs(seo_combo_path('')), $newest);
    foreach (seo_combo_index() as $id => $_) $url(seo_abs(seo_combo_path($id)), $newest);
    foreach (seo_combo_pairs() as [$a, $b]) $url(seo_abs(seo_combo_path($a, $b)), $newest);
    foreach ($all as $r) {
        $p = seo_photo($r['id']);
        $url(seo_abs(seo_recipe_path($r['id'])), max((int)$r['_mtime'], $p['mtime'] ?? 0), $p ? '<image:image><image:loc>' . $x(seo_abs($p['path'])) . '</image:loc></image:image>' : '');
    }
    echo "</urlset>\n";
}

// Entry for the three page files: errors never reach the page as text.
function seo_run(callable $page): void {
    @ini_set('display_errors', '0');
    try { config(); $page(); }
    catch (Throwable $e) {
        error_log('[what-to-cook] seo: ' . $e->getMessage());
        if (!headers_sent()) { http_response_code(503); header('Content-Type: text/html; charset=utf-8'); header('Retry-After: 120'); }
        echo '<!doctype html><meta charset="utf-8"><title>' . h(SEO_SITE) . '</title><p>Страница временно недоступна. <a href="' . h(seo_path()) . '">Открыть «' . h(SEO_SITE) . '»</a></p>';
    }
}

// ---------- combo.php: "что приготовить из X и Y" ----------
// Pages for what people actually search: one product or a pair of products, with every recipe that has them.
// Only combinations with at least SEO_COMBO_MIN recipes get a page, so there are no thin pages.
const SEO_COMBO_MIN = 3;
const SEO_COMBO_SKIP = ['water', 'salt', 'black-pepper', 'sugar', 'vegetable-oil', 'sunflower-oil', 'bay-leaf', 'wheat-flour', 'butter'];

function seo_combo_path(string $a, ?string $b = null): string {
    if ($b !== null && strcmp($a, $b) > 0) [$a, $b] = [$b, $a];
    if (seo_pretty()) return seo_path() . 'iz/' . $a . ($b ? '/' . $b : '');
    return seo_path() . 'combo.php?a=' . $a . ($b ? '&b=' . $b : '');
}
/** Short product name for headings: "картофель", "говяжий фарш". */
function seo_ing_name(string $id): string {
    $ing = catalog_ingredients()[$id] ?? null;
    if (!$ing) return $id;
    foreach ((array)($ing['aliases'] ?? []) as $a) if (mb_strlen($a, 'UTF-8') <= 22 && !preg_match('/\d/', $a)) return mb_strtolower($a, 'UTF-8');
    return mb_strtolower(preg_replace('/,.*$|\s+\d[\d.,]*\s*%?.*$/u', '', (string)$ing['name']), 'UTF-8');
}
function seo_ucfirst(string $s): string { return mb_strtoupper(mb_substr($s, 0, 1, 'UTF-8'), 'UTF-8') . mb_substr($s, 1, null, 'UTF-8'); }
/** [ingredient id => [recipe ids]] for products worth a page. */
function seo_combo_index(): array {
    static $idx = null;
    if ($idx !== null) return $idx;
    $idx = [];
    foreach (seo_recipes() as $r) foreach ($r['ingredients'] as $i) {
        $id = (string)($i['id'] ?? '');
        if ($id === '' || !empty($i['optional']) || in_array($id, SEO_COMBO_SKIP, true)) continue;
        $idx[$id][$r['id']] = true;
    }
    $idx = array_filter(array_map('array_keys', $idx), fn($l) => count($l) >= SEO_COMBO_MIN);
    return $idx;
}
/** Pairs with enough recipes, most recipes first. */
function seo_combo_pairs(int $limit = 1500): array {
    $idx = seo_combo_index(); $ids = array_keys($idx); $pairs = [];
    for ($i = 0; $i < count($ids); $i++) for ($j = $i + 1; $j < count($ids); $j++) {
        $n = count(array_intersect($idx[$ids[$i]], $idx[$ids[$j]]));
        if ($n >= SEO_COMBO_MIN) { [$a, $b] = strcmp($ids[$i], $ids[$j]) < 0 ? [$ids[$i], $ids[$j]] : [$ids[$j], $ids[$i]]; $pairs[] = [$a, $b, $n]; }
    }
    usort($pairs, fn($x, $y) => $y[2] <=> $x[2]);
    return array_slice($pairs, 0, $limit);
}
function seo_combo_page(string $a, ?string $b): void {
    $idx = seo_combo_index();
    if ($a === '' && $b === null) { seo_combo_list(); return; }
    if (!isset($idx[$a]) || ($b !== null && (!isset($idx[$b]) || $a === $b))) { seo_not_found(); return; }
    if ($b !== null && strcmp($a, $b) > 0) { header('Location: ' . seo_combo_path($b, $a), true, 301); return; }
    $all = seo_recipes();
    $ids = $b ? array_values(array_intersect($idx[$a], $idx[$b])) : $idx[$a];
    if (count($ids) < SEO_COMBO_MIN) { seo_not_found(); return; }
    $list = array_map(fn($id) => $all[$id], $ids);
    usort($list, fn($x, $y) => ((int)$x['totalMinutes'] <=> (int)$y['totalMinutes']) ?: strcmp($x['title'], $y['title']));
    $n = count($list);
    $names = $b ? seo_ing_name($a) . ' и ' . seo_ing_name($b) : seo_ing_name($a);
    $quick = count(array_filter($list, fn($r) => (int)$r['totalMinutes'] <= 30));
    $title = seo_ucfirst($names) . ': что приготовить — ' . $n . ' ' . seo_plural($n, 'рецепт', 'рецепта', 'рецептов');
    $desc = 'Что приготовить, если дома есть ' . $names . ': ' . $n . ' ' . seo_plural($n, 'домашний рецепт', 'домашних рецепта', 'домашних рецептов')
        . ($quick ? ', из них ' . $quick . ' — за 30 минут и быстрее' : '') . '. Время, ингредиенты, шаги и калорийность.';
    $canonical = seo_abs(seo_combo_path($a, $b));
    $ld = ['@context' => 'https://schema.org', '@type' => 'ItemList', 'name' => $title, 'numberOfItems' => $n,
        'itemListElement' => array_values(array_map(fn($r, $k) => ['@type' => 'ListItem', 'position' => $k + 1, 'url' => seo_abs(seo_recipe_path($r['id'])), 'name' => (string)$r['title']], $list, array_keys($list)))];
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: public, max-age=600');
    echo seo_head(['title' => $title . ' | ' . SEO_SITE, 'description' => $desc, 'canonical' => $canonical, 'ld' => [$ld]]);
    echo '<nav class="crumbs" aria-label="Навигация"><a href="' . h(seo_combo_path('')) . '">Что приготовить из продуктов</a>' . ($b ? ' › <a href="' . h(seo_combo_path($a)) . '">' . h(seo_ucfirst(seo_ing_name($a))) . '</a>' : '') . "</nav>\n";
    echo '<h1>' . h(seo_ucfirst($names)) . ': что приготовить</h1><p class="lead">' . h($desc) . "</p>\n";
    echo '<div class="cta"><p>Есть ещё продукты? Скажите голосом или напишите всё, что есть дома, — Шеф подберёт блюдо и подскажет, что докупить.</p><a class="btn" href="' . h(seo_path()) . "\">Спросить Шефа</a></div>\n";
    echo '<ul class="grid">';
    foreach ($list as $r) echo seo_card($r, true);
    echo "</ul>\n";
    // Neighbours: other products that go with this one.
    $with = [];
    foreach ($idx as $other => $rs) {
        if ($other === $a || $other === $b) continue;
        $k = count(array_intersect($ids, $rs));
        if ($k >= SEO_COMBO_MIN) $with[$other] = $k;
    }
    arsort($with);
    if ($with) {
        echo '<h2>' . ($b ? 'А если есть ещё' : 'С чем ещё ' . h(seo_ing_name($a))) . '</h2><ul class="cats">';
        foreach (array_slice($with, 0, 24, true) as $other => $k) echo '<li><a href="' . h($b ? seo_combo_path($other) : seo_combo_path($a, $other)) . '">' . h(seo_ucfirst(seo_ing_name($other))) . '<small>' . $k . '</small></a></li>';
        echo "</ul>\n";
    }
    echo seo_footer();
}
// Seasonings, baking things and sauces: real products, but nobody starts a dinner from them. On the index page they
// are only in «Все продукты», and not in «Популярные сочетания».
const SEO_COMBO_MINOR = ['garlic', 'lemon-juice', 'vanilla-sugar', 'tomato-paste', 'parsley', 'dill', 'mayonnaise', 'paprika', 'green-onion', 'cilantro',
    'cumin', 'canned-tomato', 'instant-yeast', 'soy-sauce', 'chili', 'coriander', 'breadcrumbs', 'ginger', 'cinnamon', 'baking-soda', 'baking-powder',
    'potato-starch', 'rice-vinegar', 'egg-yolk', 'egg-white', 'prepared-mustard', 'dried-oregano', 'lime-juice', 'fresh-basil', 'ground-nutmeg',
    'toasted-sesame-oil', 'dried-thyme', 'turmeric', 'garam-masala', 'sesame-seed', 'tomato-ketchup', 'dried-basil', 'fresh-mint', 'oyster-sauce',
    'table-vinegar-9', 'cocoa-powder', 'raisins', 'walnut', 'honey', 'heavy-cream', 'red-onion', 'white-bread'];
function seo_combo_list(): void {
    $idx = seo_combo_index();
    uasort($idx, fn($x, $y) => count($y) <=> count($x));
    $main = array_filter($idx, fn($id) => !in_array($id, SEO_COMBO_MINOR, true), ARRAY_FILTER_USE_KEY);
    $title = 'Что приготовить из того, что есть дома — рецепты по продуктам';
    $desc = 'Выберите продукт, который есть дома, — покажем все рецепты с ним и удачные сочетания: картофель и фарш, курица и рис, яйца и сыр.';
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: public, max-age=600');
    echo seo_head(['title' => $title . ' | ' . SEO_SITE, 'description' => $desc, 'canonical' => seo_abs(seo_combo_path(''))]);
    echo '<h1>Что приготовить из того, что есть дома</h1><p class="lead">' . h($desc) . "</p>\n";
    echo '<div class="cta"><p>Дома несколько продуктов? Напишите или скажите их все сразу — Шеф подберёт блюдо и подскажет, что докупить.</p><a class="btn" href="' . h(seo_path()) . "\">Спросить Шефа</a></div>\n";
    $chip = fn($id, $n) => '<li><a href="' . h(seo_combo_path($id)) . '">' . h(seo_ucfirst(seo_ing_name($id))) . '<small>' . $n . '</small></a></li>';
    echo '<h2>Основные продукты</h2><ul class="cats">';
    foreach (array_slice($main, 0, 40, true) as $id => $rs) echo $chip($id, count($rs));
    echo "</ul>\n<h2>Удачные сочетания</h2><ul class=\"cats\">";
    $pairs = array_filter(seo_combo_pairs(400), fn($x) => !in_array($x[0], SEO_COMBO_MINOR, true) && !in_array($x[1], SEO_COMBO_MINOR, true));
    foreach (array_slice($pairs, 0, 36) as [$x, $y, $n]) echo '<li><a href="' . h(seo_combo_path($x, $y)) . '">' . h(seo_ucfirst(seo_ing_name($x)) . ' и ' . seo_ing_name($y)) . '<small>' . $n . '</small></a></li>';
    echo "</ul>\n";
    // Every product with a page, for those who look for something rarer (and for search engines).
    echo '<details class="faq" style="margin-top:28px"><summary>Все продукты · ' . count($idx) . '</summary><ul class="cats" style="margin-top:4px">';
    foreach ($idx as $id => $rs) echo $chip($id, count($rs));
    echo "</ul></details>\n" . seo_footer();
}
