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
    $out .= '<meta name="twitter:card" content="' . (isset($o['image']) ? 'summary_large_image' : 'summary') . "\">\n<meta name=\"theme-color\" content=\"#b7432f\">\n<link rel=\"icon\" href=\"" . h(seo_path()) . "favicon.svg\" type=\"image/svg+xml\">\n<link rel=\"apple-touch-icon\" href=\"" . h(seo_path()) . "icons/apple-touch-icon.png\">\n";
    foreach (($o['ld'] ?? []) as $ld) $out .= "<script type=\"application/ld+json\">\n" . seo_json($ld) . "\n</script>\n";
    return $out . '<style>' . seo_css() . "</style>\n</head>\n<body>\n" . seo_header();
}
function seo_header(): string {
    $p = h(seo_path());
    return "<header class=\"top\"><div class=\"wrap\"><a class=\"brand\" href=\"$p\"><img src=\"{$p}favicon.svg\" alt=\"\" width=\"32\" height=\"32\"><span>" . h(SEO_SITE) . "</span></a><nav><a href=\"" . h(seo_list_path()) . "\">Все рецепты</a><a href=\"" . h(seo_combo_path('')) . "\">По продуктам</a><a class=\"pill\" href=\"$p\">Подобрать блюдо</a></nav></div></header>\n<main class=\"wrap\">\n";
}
function seo_footer(): string {
    $p = h(seo_path());
    return "</main>\n<footer class=\"wrap foot\"><p><a href=\"$p\">«" . h(SEO_SITE) . "»</a> — подбор домашних рецептов по продуктам, времени и настроению. Голосом или текстом, без регистрации.</p>"
        . "<p><a href=\"" . h(seo_list_path()) . "\">Все рецепты</a> · <a href=\"{$p}#info\">Откуда сведения</a> · <a href=\"{$p}#privacy\">Конфиденциальность</a></p></footer>\n</body>\n</html>\n";
}
function seo_css(): string {
    return ':root{--bg:#f7f2e9;--card:#fffdf8;--ink:#23241f;--muted:#5b5d53;--line:#e6ddcc;--accent:#b7432f;--accent-ink:#fff;--soft:#f1e6d6}'
        . '@media(prefers-color-scheme:dark){:root{--bg:#1b1a17;--card:#25231f;--ink:#f1ece2;--muted:#b9b3a6;--line:#3a362f;--accent:#e0775f;--accent-ink:#1b1a17;--soft:#2f2b25}}'
        . '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;-webkit-text-size-adjust:100%}'
        . 'a{color:var(--accent)}img{max-width:100%;display:block}.wrap{max-width:860px;margin:0 auto;padding:0 16px}'
        . '.top{background:var(--card);border-bottom:1px solid var(--line)}.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:60px;flex-wrap:wrap}'
        . '.brand{display:flex;align-items:center;gap:10px;font-weight:700;color:var(--ink);text-decoration:none}.top nav{display:flex;gap:14px;align-items:center;font-size:15px}'
        . '.pill{background:var(--accent);color:var(--accent-ink);padding:7px 14px;border-radius:999px;text-decoration:none;font-weight:600}'
        . '.crumbs{font-size:14px;color:var(--muted);margin:18px 0 6px}.crumbs a{color:var(--muted)}h1{font-size:clamp(28px,5vw,40px);line-height:1.15;margin:6px 0 10px}main>h1:first-child{margin-top:22px}'
        . '.lead{font-size:19px;color:var(--muted);margin:0 0 14px}.meta{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px;padding:0;list-style:none}'
        . '.meta li{background:var(--card);border:1px solid var(--line);border-radius:999px;padding:4px 12px;font-size:15px}'
        . 'figure{margin:0 0 18px}figure img{width:100%;height:auto;aspect-ratio:4/3;object-fit:cover;border-radius:20px;background:var(--soft)}@media(min-width:700px){figure img{aspect-ratio:16/10}}figcaption{font-size:13px;color:var(--muted);margin-top:6px}'
        . '.cta{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:16px 18px;margin:0 0 26px;display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap}'
        . '.cta p{margin:0;font-size:15px;color:var(--muted);flex:1 1 260px}.btn{display:inline-block;background:var(--accent);color:var(--accent-ink);text-decoration:none;font-weight:700;padding:12px 20px;border-radius:14px}'
        . 'h2{font-size:24px;margin:30px 0 10px}.note{color:var(--muted);font-size:15px;margin:-4px 0 10px}'
        . '.ing{list-style:none;padding:0;margin:0;background:var(--card);border:1px solid var(--line);border-radius:18px}.ing li{display:flex;justify-content:space-between;gap:12px;padding:10px 16px;border-top:1px solid var(--line)}.ing li:first-child{border-top:0}.ing b{white-space:nowrap;font-weight:600}.ing small{color:var(--muted)}'
        . '.steps{counter-reset:s;list-style:none;padding:0;margin:0}.steps li{counter-increment:s;position:relative;padding:0 0 16px 48px}.steps li:before{content:counter(s);position:absolute;left:0;top:0;width:34px;height:34px;border-radius:50%;background:var(--soft);display:grid;place-items:center;font-weight:700}'
        . '.tips{background:var(--soft);border-radius:18px;padding:6px 18px}.tips p{margin:10px 0}'
        . 'table{border-collapse:collapse;width:100%;max-width:460px;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}td,th{padding:8px 14px;border-top:1px solid var(--line);text-align:left}td.n{text-align:right;font-variant-numeric:tabular-nums}'
        . '.review{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 16px;margin:0 0 10px}.review p{margin:4px 0 0}.stars{color:#c98a12;letter-spacing:1px}'
        . '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,230px),1fr));gap:12px;list-style:none;padding:0;margin:0}.grid a{display:block;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 14px;text-decoration:none;color:var(--ink);height:100%}'
        . '.grid a:hover{border-color:var(--accent)}.grid small{display:block;color:var(--muted);font-size:14px}.grid b{display:block;overflow-wrap:break-word}@media(max-width:560px){.grid{gap:8px}.grid a{padding:10px 14px}.grid a:not(:has(img)){display:flex;justify-content:space-between;gap:12px;align-items:baseline}.grid a:not(:has(img)) small{white-space:nowrap}}.grid li{min-width:0}.grid img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:10px;margin-bottom:8px;background:var(--soft)}'
        . '.cats{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 16px;padding:0;list-style:none}.cats a{display:block;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:6px 14px;text-decoration:none;color:var(--ink)}.cats a.on{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}'
        . '.more{margin:10px 0 0}.foot{color:var(--muted);font-size:14px;border-top:1px solid var(--line);margin-top:40px;padding-top:12px;padding-bottom:30px}'
        . '@media print{.top,.cta,.foot,.related{display:none}body{background:#fff}}';
}

// ---------- recipe.php ----------
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
    echo seo_head(['title' => $title . ' | ' . SEO_SITE, 'ogTitle' => (string)$r['title'], 'description' => $desc, 'canonical' => $canonical, 'ogType' => 'article',
        'image' => $image, 'imageW' => $photo['w'] ?? null, 'imageH' => $photo['h'] ?? null, 'imageAlt' => $photo ? (string)$r['title'] : null, 'ld' => [$ld, $crumbs]]);

    $app = h(seo_app_path($id));
    echo '<nav class="crumbs" aria-label="Навигация"><a href="' . h(seo_list_path()) . '">Рецепты</a> › <a href="' . h(seo_list_path($course)) . '">' . h(SEO_COURSES[$course][0]) . "</a></nav>\n";
    echo '<article><h1>' . h($r['title']) . "</h1>\n";
    if (!empty($r['summary'])) echo '<p class="lead">' . h($r['summary']) . "</p>\n";
    $meta = ['Всего ' . seo_minutes((int)($r['totalMinutes'] ?? 0))];
    if (!empty($r['activeMinutes']) && (int)$r['activeMinutes'] < (int)$r['totalMinutes']) $meta[] = 'у плиты ' . seo_minutes((int)$r['activeMinutes']);
    $meta[] = $servings . ' ' . seo_plural($servings, 'порция', 'порции', 'порций');
    if (isset(SEO_DIFFICULTY[$r['difficulty'] ?? ''])) $meta[] = SEO_DIFFICULTY[$r['difficulty']];
    if ($kcal) $meta[] = $kcal['kcal'] . ' ккал на порцию';
    if ($rev['summary']['count'] > 0) $meta[] = '★ ' . str_replace('.', ',', (string)$rev['summary']['avg']) . ' · ' . $rev['summary']['count'] . ' ' . seo_plural((int)$rev['summary']['count'], 'отзыв', 'отзыва', 'отзывов');
    echo '<ul class="meta">' . implode('', array_map(function ($m) { return '<li>' . h($m) . '</li>'; }, $meta)) . "</ul>\n";
    if ($photo) echo '<figure><img src="' . h($photo['path']) . '" alt="' . h($r['title']) . '"' . ($photo['w'] ? ' width="' . (int)$photo['w'] . '" height="' . (int)$photo['h'] . '"' : '') . '>' . ($photo['real'] ? '' : '<figcaption>Иллюстрация создана нейросетью по описанию рецепта и показывает примерную подачу.</figcaption>') . "</figure>\n";
    echo '<div class="cta"><p>В приложении: пересчёт на любое число порций, таймеры на шагах, список покупок и готовка по шагам голосом.</p><a class="btn" href="' . $app . "\">Готовить по шагам</a></div>\n";

    echo '<h2>Ингредиенты</h2><p class="note">На ' . $servings . ' ' . seo_plural($servings, 'порцию', 'порции', 'порций') . "</p>\n<ul class=\"ing\">";
    foreach ($r['ingredients'] as $i) if (is_array($i)) echo '<li><span>' . h($i['name'] ?? '') . (!empty($i['optional']) ? ' <small>по желанию</small>' : '') . '</span><b>' . h(seo_amount($i['amount'] ?? 0) . ' ' . ($i['unit'] ?? '')) . '</b></li>';
    echo "</ul>\n<h2>Как приготовить</h2>\n<ol class=\"steps\">";
    $k = 0; foreach ($r['steps'] as $s) if (is_array($s)) { $k++; echo '<li id="step-' . $k . '">' . h($s['text'] ?? '') . '</li>'; }
    echo "</ol>\n";
    $tips = array_values(array_filter((array)($r['tips'] ?? []), 'is_string'));
    if ($tips) echo '<h2>Советы</h2><div class="tips">' . implode('', array_map(function ($t) { return '<p>' . h($t) . '</p>'; }, $tips)) . "</div>\n";
    if ($kcal) echo '<h2>Калорийность и БЖУ</h2><p class="note">На одну порцию' . ($kcal['complete'] ? '' : ', без продуктов, для которых нет данных') . '</p><table><tbody><tr><td>Калории</td><td class="n">' . $kcal['kcal'] . ' ккал</td></tr><tr><td>Белки</td><td class="n">' . $kcal['protein'] . ' г</td></tr><tr><td>Жиры</td><td class="n">' . $kcal['fat'] . ' г</td></tr><tr><td>Углеводы</td><td class="n">' . $kcal['carbs'] . " г</td></tr></tbody></table>\n";
    $store = [];
    if (!empty($r['storageDays'])) $store[] = 'в холодильнике до ' . (int)$r['storageDays'] . ' ' . seo_plural((int)$r['storageDays'], 'дня', 'дней', 'дней');
    if (!empty($r['freezerDays'])) $store[] = 'в морозилке до ' . (int)$r['freezerDays'] . ' ' . seo_plural((int)$r['freezerDays'], 'дня', 'дней', 'дней');
    if ($store) echo '<h2>Хранение</h2><p>Хранится ' . h(implode(', ', $store)) . ".</p>\n";
    if ($rev['list']) {
        echo '<h2>Отзывы</h2>';
        foreach ($rev['list'] as $x) echo '<div class="review"><b>' . h($x['author']) . '</b> <span class="stars" aria-label="Оценка ' . (int)$x['rating'] . ' из 5">' . str_repeat('★', (int)$x['rating']) . str_repeat('☆', 5 - (int)$x['rating']) . '</span><p>' . nl2br(h($x['text'])) . '</p></div>';
        echo '<p><a href="' . $app . "\">Все отзывы и написать свой</a></p>\n";
    }
    echo '<p class="note" style="margin-top:22px">Время, калорийность и сроки хранения ориентировочные. Доводите мясо, рыбу и яйца до готовности.</p></article>' . "\n";

    // Other variants of the same dish first, then dishes of the same kind with the same main product, then the rest of the kind.
    $dish = (string)($r['dish'] ?? ''); $mainIng = (string)($r['mainIngredient'] ?? '');
    $others = array_filter($all, function ($x) use ($id) { return $x['id'] !== $id; });
    $score = function ($x) use ($dish, $mainIng, $course) { return ($dish !== '' && ($x['dish'] ?? '') === $dish ? 4 : 0) + ($x['_course'] === $course ? 2 : 0) + ($mainIng !== '' && ($x['mainIngredient'] ?? '') === $mainIng ? 1 : 0); };
    $others = array_filter($others, function ($x) use ($score) { return $score($x) >= 2; });
    uasort($others, function ($a, $b) use ($score) { return $score($b) <=> $score($a) ?: strcmp($a['title'], $b['title']); });
    $others = array_slice($others, 0, 8, true);
    if ($others) {
        echo '<section class="related"><h2>Похожие рецепты</h2><ul class="grid">';
        foreach ($others as $x) echo seo_card($x, false);
        echo '</ul><p class="more"><a href="' . h(seo_list_path($course)) . '">Все ' . h(mb_strtolower(SEO_COURSES[$course][0], 'UTF-8')) . "</a></p></section>\n";
    }
    echo seo_footer();
}
function seo_card(array $x, bool $withPhoto): string {
    $p = $withPhoto ? seo_photo($x['id']) : null;
    return '<li><a href="' . h(seo_recipe_path($x['id'])) . '">' . ($p ? '<img src="' . h($p['path']) . '" alt="" loading="lazy" width="320" height="240">' : '') . '<b>' . h($x['title']) . '</b><small>' . h(seo_minutes((int)($x['totalMinutes'] ?? 0))) . '</small></a></li>';
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
    echo '<ul class="cats"><li><a href="' . h(seo_list_path()) . '"' . ($course ? '' : ' class="on"') . '>Все · ' . $count . '</a></li>';
    foreach (SEO_COURSES as $c => $names) if (!empty($by[$c])) echo '<li><a href="' . h(seo_list_path($c)) . '"' . ($course === $c ? ' class="on"' : '') . '>' . h($names[0]) . ' · ' . count($by[$c]) . '</a></li>';
    echo "</ul>\n";
    echo '<div class="cta"><p>Не знаете, что выбрать? Скажите, что есть дома и сколько времени, — подберём рецепт.</p><a class="btn" href="' . h(seo_path()) . "\">Подобрать блюдо</a></div>\n";
    foreach (SEO_COURSES as $c => $names) {
        if (empty($by[$c]) || ($course && $course !== $c)) continue;
        if (!$course) echo '<h2>' . h($names[0]) . '</h2>';
        echo '<ul class="grid">';
        foreach ($by[$c] as $r) echo seo_card($r, (bool)$course);
        echo "</ul>\n";
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
    return mb_strtolower(preg_replace('/,.*$/u', '', (string)$ing['name']), 'UTF-8');
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
    echo '<div class="cta"><p>Есть ещё продукты? Скажите голосом или напишите всё, что есть дома, — подберём блюдо и посчитаем, что докупить.</p><a class="btn" href="' . h(seo_path()) . "\">Подобрать по продуктам</a></div>\n";
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
        foreach (array_slice($with, 0, 24, true) as $other => $k) echo '<li><a href="' . h($b ? seo_combo_path($other) : seo_combo_path($a, $other)) . '">' . h(seo_ing_name($other)) . ' · ' . $k . '</a></li>';
        echo "</ul>\n";
    }
    echo seo_footer();
}
function seo_combo_list(): void {
    $idx = seo_combo_index();
    uasort($idx, fn($x, $y) => count($y) <=> count($x));
    $title = 'Что приготовить из того, что есть дома — рецепты по продуктам';
    $desc = 'Выберите продукт, который есть дома, — покажем все рецепты с ним и удачные сочетания: картофель и фарш, курица и рис, яйца и сыр.';
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: public, max-age=600');
    echo seo_head(['title' => $title . ' | ' . SEO_SITE, 'description' => $desc, 'canonical' => seo_abs(seo_combo_path(''))]);
    echo '<h1>Что приготовить из того, что есть дома</h1><p class="lead">' . h($desc) . "</p>\n";
    echo '<ul class="cats">';
    foreach ($idx as $id => $rs) echo '<li><a href="' . h(seo_combo_path($id)) . '">' . h(seo_ing_name($id)) . ' · ' . count($rs) . '</a></li>';
    echo "</ul>\n<h2>Популярные сочетания</h2><ul class=\"cats\">";
    foreach (seo_combo_pairs(60) as [$x, $y, $n]) echo '<li><a href="' . h(seo_combo_path($x, $y)) . '">' . h(seo_ing_name($x) . ' и ' . seo_ing_name($y)) . ' · ' . $n . '</a></li>';
    echo "</ul>\n" . seo_footer();
}
