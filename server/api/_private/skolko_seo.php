<?php
// Справочник «Сколько…» for search engines: /skolko/, grams in a glass and a spoon (/skolko/gramm-muki), roasting by
// weight (/skolko/zapekat-kuricu-celikom), boiling times (/skolko/varit-grechku). The answer in one line on top, a
// small calculator, a table, a few dishes and «Спросить Шефа». Data: data/skolko.json, built from the tables Шеф
// answers with (web/scripts/skolko-json.mjs), so the pages and the app say the same.

function skolko_data(): array {
    static $d = null;
    if ($d !== null) return $d;
    $raw = @file_get_contents(__DIR__ . '/data/skolko.json');
    $d = $raw ? (json_decode($raw, true) ?: []) : [];
    return $d;
}
function skolko_path(string $slug = ''): string {
    if (seo_pretty()) return seo_path() . 'skolko/' . $slug;
    return seo_path() . 'skolko.php' . ($slug !== '' ? '?k=' . rawurlencode($slug) : '');
}
const SKOLKO_SECTION = ['measure' => 'Граммы в стакане и ложке', 'roast' => 'Сколько запекать', 'boil' => 'Сколько варить'];
const SKOLKO_ICON = ['measure' => '🥄', 'roast' => '🔥', 'boil' => '⏱'];

function skolko_css(): string {
    return '.ans{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:18px 20px;max-width:620px}'
        . '.ans .big{font-size:clamp(30px,6vw,38px);font-weight:700;line-height:1.1;letter-spacing:-.02em}.ans .big small{font-size:17px;font-weight:500;color:var(--muted);letter-spacing:0;margin-left:6px}'
        . '.ans p{margin:10px 0 0;color:var(--muted)}'
        . '.calc{margin-top:14px;background:var(--soft);border-radius:16px;padding:12px 14px}.calc label{display:block;font-size:13px;font-weight:700;color:#8a2e1c;text-transform:uppercase;letter-spacing:.03em}'
        . '.calc .f{display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap}.calc input,.calc select{height:46px;border:1px solid #e2cfc5;border-radius:12px;background:#fff;padding:0 12px;font:inherit;font-size:17px;color:var(--ink)}'
        . '.calc input{width:96px}.calc select{flex:1 1 120px;min-width:0}.calc output{font-size:21px;font-weight:700;margin-left:auto;white-space:nowrap}'
        . '.tip{display:flex;gap:10px;background:#e7f0e3;border-radius:16px;padding:12px 14px;margin:14px 0 0;max-width:620px}'
        . 'td.n{white-space:nowrap}tr.on td{background:#fdf1e7;font-weight:600}td a{color:var(--ink);text-decoration:none}td a:hover{color:var(--accent)}th{font-size:12px;color:var(--muted);font-weight:600;text-transform:uppercase;padding:9px 16px;text-align:left;background:#fbf8f3}th.n{text-align:right}'
        . '.secs{display:grid;gap:12px;margin-top:18px}@media(min-width:900px){.secs{grid-template-columns:repeat(3,minmax(0,1fr))}}'
        . '.sec{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:14px 16px}.sec h2{display:flex;align-items:center;gap:10px;font-size:19px;margin:0 0 12px}.sec h2 i{font-style:normal;width:38px;height:38px;border-radius:50%;background:var(--sunken);display:grid;place-items:center;font-size:19px;flex:none}'
        . '.chips{display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0;margin:0}.chips a{display:inline-block;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:6px 14px;color:var(--ink);text-decoration:none;font-size:15px}.chips a:hover{border-color:var(--accent);color:var(--accent)}';
}
/** «1 ч 20 мин», «45 мин». */
function skolko_time(int $m): string { $h = intdiv($m, 60); $r = $m % 60; return $h ? $h . ' ч' . ($r ? ' ' . $r . ' мин' : '') : $m . ' мин'; }
function skolko_kg(float $kg): string { return str_replace('.', ',', (string)$kg) . ' кг'; }
function skolko_roast_minutes(array $k, float $kg): int {
    $m = $k['perKg'] ? $k['base'] + $k['perKg'] * $kg : $k['base'];
    return (int)(round(min($k['max'], max($k['min'], $m)) / 5) * 5);
}
function skolko_ucfirst(string $s): string { return mb_strtoupper(mb_substr($s, 0, 1, 'UTF-8'), 'UTF-8') . mb_substr($s, 1, null, 'UTF-8'); }

/** Up to four dishes: the product is the main one first, then any that use it; photos first. need: oven / boil. */
function skolko_recipes(array $main, array $ing = [], string $need = ''): array {
    if (!$main && !$ing) return [];
    $first = []; $then = [];
    foreach (seo_recipes() as $r) {
        $text = implode(' ', array_map(fn($s) => (string)($s['text'] ?? ''), $r['steps']));
        if ($need === 'oven' && !preg_match('/духовк/u', $text)) continue;
        if ($need === 'boil' && (!preg_match('/вар/u', $text) || preg_match('/духовк/u', $text))) continue;
        if (in_array((string)($r['mainIngredient'] ?? ''), $main, true)) $first[] = $r;
        elseif ($ing && array_intersect($ing, array_map(fn($i) => (string)($i['id'] ?? ''), $r['ingredients']))) $then[] = $r;
    }
    $photo = fn($a, $b) => (seo_thumb($a['id']) ? 0 : 1) <=> (seo_thumb($b['id']) ? 0 : 1);
    usort($first, $photo); usort($then, $photo);
    return array_slice(array_merge($first, $then), 0, 4);
}
function skolko_grid(string $title, array $list): string {
    if (!$list) return '';
    return '<h2>' . h($title) . "</h2>\n<ul class=\"grid\">" . implode('', array_map('seo_card', $list)) . "</ul>\n";
}
function skolko_more(string $section, string $slug, array $items): string {
    $o = '<h2>Ещё: ' . h(mb_strtolower(SKOLKO_SECTION[$section], 'UTF-8')) . "</h2>\n<ul class=\"chips\">";
    foreach ($items as $x) if ($x['slug'] !== $slug) $o .= '<li><a href="' . h(skolko_path($x['slug'])) . '">' . h($x['chip']) . '</a></li>';
    return $o . "</ul>\n";
}
function skolko_chef(string $text, string $button = 'Спросить Шефа'): string {
    return '<div class="cta"><p>' . h($text) . '</p><a class="btn" href="' . h(seo_path()) . '">' . h($button) . "</a></div>\n";
}
function skolko_calc_js(): string {
    // One small script for both calculators: grams from a glass or a spoon, minutes from the weight.
    return "<script>document.querySelectorAll('.calc').forEach(function(f){var i=f.querySelector('input'),s=f.querySelector('select'),o=f.querySelector('output'),d=f.dataset;"
        . "function r(){var n=parseFloat(String(i.value).replace(',','.'))||0,v;if(d.kind==='m'){var g=n*parseFloat(s.value);v=g<20?Math.round(g):g<100?Math.round(g/5)*5:Math.round(g/10)*10;o.textContent='= '+v+' '+d.u}"
        . "else{var m=Math.round(Math.min(+d.max,Math.max(+d.min,+d.base+(+d.perkg)*n))/5)*5,h=Math.floor(m/60),mm=m%60;o.textContent='= '+(h?h+' ч'+(mm?' '+mm+' мин':''):m+' мин')}}"
        . "i.addEventListener('input',r);if(s)s.addEventListener('change',r);r()})</script>\n";
}
/** Every page of a section with its chip label. */
function skolko_items(string $section): array {
    $d = skolko_data();
    $out = [];
    foreach (($d[$section] ?? []) as $x) {
        $x['chip'] = $section === 'measure' ? skolko_ucfirst(preg_replace('/\s*\(.*\)$/u', '', $x['label'])) : ($section === 'roast' ? preg_replace('/\s*\(.*\)$/u', '', $x['label']) : skolko_ucfirst($x['what']));
        $x['_section'] = $section;
        $out[$x['slug']] = $x;
    }
    return $out;
}
function skolko_faq(array $qa): array {
    return ['@context' => 'https://schema.org', '@type' => 'FAQPage', 'mainEntity' => array_map(fn($q) => ['@type' => 'Question', 'name' => $q[0], 'acceptedAnswer' => ['@type' => 'Answer', 'text' => $q[1]]], $qa)];
}
function skolko_start(string $title, string $desc, string $canonical, array $ld = []): void {
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: public, max-age=3600');
    echo seo_head(['title' => $title . ' | ' . SEO_SITE, 'description' => seo_cut($desc, 200), 'canonical' => seo_abs($canonical), 'ld' => $ld, 'css' => skolko_css()]);
}
function skolko_crumbs(string $section): string {
    return '<nav class="crumbs" aria-label="Навигация"><a href="' . h(skolko_path()) . '">Кухонный справочник</a> · ' . h(SKOLKO_SECTION[$section]) . "</nav>\n";
}

function skolko_page(string $slug): void {
    if ($slug === '') { skolko_index(); return; }
    foreach (array_keys(SKOLKO_SECTION) as $s) {
        $items = skolko_items($s);
        if (!isset($items[$slug])) continue;
        $x = $items[$slug];
        if ($s === 'measure') skolko_measure($x, $items);
        elseif ($s === 'roast') skolko_roast($x, $items);
        else skolko_boil($x, $items);
        return;
    }
    seo_not_found();
}

function skolko_index(): void {
    $title = 'Сколько грамм, сколько варить и запекать — кухонный справочник';
    $desc = 'Короткие ответы без длинных статей: сколько грамм в стакане и ложке, сколько варить крупы, яйца и овощи, сколько запекать мясо, курицу и рыбу.';
    skolko_start($title, $desc, skolko_path());
    echo '<nav class="crumbs" aria-label="Навигация">Кухонный справочник</nav>' . "\n";
    echo '<h1>Сколько грамм, сколько варить и запекать</h1><p class="lead">' . h($desc) . "</p>\n<div class=\"secs\">";
    foreach (SKOLKO_SECTION as $s => $label) {
        echo '<section class="sec"><h2><i aria-hidden="true">' . SKOLKO_ICON[$s] . '</i>' . h($label) . '</h2><ul class="chips">';
        foreach (skolko_items($s) as $x) echo '<li><a href="' . h(skolko_path($x['slug'])) . '">' . h($x['chip']) . '</a></li>';
        echo "</ul></section>\n";
    }
    echo "</div>\n" . skolko_chef('Не нашли ответ? Спросите Шефа своими словами: «сколько грамм в 3 ложках сахара», «сколько запекать курицу 1,8 кг».');
    echo seo_footer();
}

function skolko_measure(array $x, array $items): void {
    $u = $x['unit'];
    $what = $u === 'мл' ? 'мл' : 'грамм';
    $h1 = 'Сколько ' . $what . ' ' . $x['gen'] . ' в стакане';
    $answer = 'В гранёном стакане (200 мл) — примерно ' . $x['glass'] . ' ' . $u . ', в столовой ложке — ' . $x['tbsp'] . ' ' . $u . ', в чайной — ' . $x['tsp'] . ' ' . $u . '.';
    $ld = [skolko_faq([
        ['Сколько ' . $what . ' ' . $x['gen'] . ' в стакане?', 'Примерно ' . $x['glass'] . ' ' . $u . ' в гранёном стакане на 200 мл.'],
        ['Сколько ' . $what . ' ' . $x['gen'] . ' в столовой ложке?', 'Примерно ' . $x['tbsp'] . ' ' . $u . ' (с небольшой горкой).'],
        ['Сколько ' . $what . ' ' . $x['gen'] . ' в чайной ложке?', 'Примерно ' . $x['tsp'] . ' ' . $u . ' (с небольшой горкой).'],
    ])];
    skolko_start($h1 . ' и ложке — ' . $x['glass'] . ' ' . $u, $answer . ' Калькулятор и таблица для других продуктов.', skolko_path($x['slug']), $ld);
    echo skolko_crumbs('measure') . '<h1>' . h($h1) . "</h1>\n";
    echo '<div class="ans"><div class="big">≈ ' . $x['glass'] . ' ' . h($u) . '<small>в гранёном стакане</small></div>';
    echo '<p>Стакан — гранёный, 200 мл. В столовой ложке — ' . $x['tbsp'] . ' ' . h($u) . ', в чайной — ' . $x['tsp'] . ' ' . h($u) . ' (с небольшой горкой).</p>';
    echo '<div class="calc" data-kind="m" data-u="' . h($u) . '"><label for="n">Посчитать</label><div class="f"><input id="n" type="text" inputmode="decimal" value="2" aria-label="Сколько">'
        . '<select aria-label="Чем мерить"><option value="' . $x['glass'] . '">стакана</option><option value="' . $x['tbsp'] . '">столовых ложек</option><option value="' . $x['tsp'] . '">чайных ложек</option></select><output></output></div></div></div>' . "\n";
    echo "<h2>Другие продукты</h2>\n<table><tr><th>Продукт</th><th class=\"n\">Стакан</th><th class=\"n\">Ст. л.</th></tr>";
    foreach ($items as $y) {
        $on = $y['slug'] === $x['slug'];
        echo '<tr' . ($on ? ' class="on"' : '') . '><td>' . ($on ? h($y['chip']) : '<a href="' . h(skolko_path($y['slug'])) . '">' . h($y['chip']) . '</a>') . '</td><td class="n">' . $y['glass'] . ' ' . h($y['unit']) . '</td><td class="n">' . $y['tbsp'] . ' ' . h($y['unit']) . '</td></tr>';
    }
    echo "</table>\n";
    if ($x['ins'] !== '') echo skolko_grid('Рецепты ' . $x['ins'], skolko_recipes($x['ing'], $x['ing']));
    echo skolko_chef('Не нашли ответ? Спросите Шефа своими словами: «сколько грамм в 3 ложках ' . ($x['slug'] === 'gramm-sahara' ? 'муки' : 'сахара') . '».');
    echo skolko_calc_js() . seo_footer();
}

function skolko_roast(array $x, array $items): void {
    $h1 = 'Сколько запекать ' . $x['what'];
    $byWeight = $x['perKg'] > 0;
    $usual = $byWeight ? skolko_roast_minutes($x, (float)$x['usual']) : (int)$x['base'];
    $rule = $byWeight ? 'Примерно ' . $x['perKg'] . ' минут на каждый килограмм плюс ' . $x['base'] . ' минут.' : 'Обычно от ' . $x['min'] . ' до ' . $x['max'] . ' минут.';
    $answer = $x['label'] . ': при ' . $x['temp'] . ' °C ' . ($byWeight ? skolko_kg((float)$x['usual']) . ' — около ' . skolko_time($usual) : 'около ' . skolko_time($usual)) . '. ' . $rule;
    $qa = [[$h1 . '?', $answer . ' ' . $x['tip']]];
    foreach ($x['weights'] as $kg) $qa[] = ['Сколько запекать ' . $x['what'] . ' ' . skolko_kg((float)$kg) . '?', 'При ' . $x['temp'] . ' °C примерно ' . skolko_time(skolko_roast_minutes($x, (float)$kg)) . '.'];
    skolko_start($h1 . ($byWeight ? ' — время по весу' : ' — ' . skolko_time($usual)), $answer . ($byWeight ? ' Таблица по весу и калькулятор.' : ''), skolko_path($x['slug']), [skolko_faq($qa)]);
    echo skolko_crumbs('roast') . '<h1>' . h($h1) . "</h1>\n";
    echo '<div class="ans"><div class="big">' . h(skolko_time($usual)) . '<small>при ' . $x['temp'] . ' °C' . ($byWeight ? ', ' . h(skolko_kg((float)$x['usual'])) : '') . '</small></div><p>' . h($rule) . '</p>';
    if ($byWeight) echo '<div class="calc" data-kind="r" data-base="' . $x['base'] . '" data-perkg="' . $x['perKg'] . '" data-min="' . $x['min'] . '" data-max="' . $x['max'] . '"><label for="n">Ваш вес, кг</label><div class="f"><input id="n" type="text" inputmode="decimal" value="' . h(str_replace('.', ',', (string)$x['usual'])) . '" aria-label="Вес в килограммах"><output></output></div></div>';
    echo "</div>\n";
    if ($byWeight) {
        echo "<h2>По весу</h2>\n<table><tr><th>Вес</th><th class=\"n\">Время при " . $x['temp'] . " °C</th></tr>";
        foreach ($x['weights'] as $kg) echo '<tr' . ((float)$kg === (float)$x['usual'] ? ' class="on"' : '') . '><td>' . h(skolko_kg((float)$kg)) . '</td><td class="n">' . h(skolko_time(skolko_roast_minutes($x, (float)$kg))) . '</td></tr>';
        echo "</table>\n";
    }
    echo '<p class="tip"><span aria-hidden="true">💡</span><span>' . h($x['tip']) . "</span></p>\n";
    echo skolko_grid('Рецепты', skolko_recipes($x['main'], [], 'oven'));
    echo skolko_chef('Готовите прямо сейчас? В приложении таймер позвонит, даже если экран телефона выключен.', 'Открыть приложение');
    echo skolko_more('roast', $x['slug'], $items) . skolko_calc_js() . seo_footer();
}

function skolko_boil(array $x, array $items): void {
    $h1 = 'Сколько варить ' . $x['what'];
    $answer = skolko_ucfirst($x['big']) . ' ' . $x['small'] . '. ' . $x['text'];
    $qa = [[$h1 . '?', $answer]];
    foreach ($x['rows'] as [$how, $time]) $qa[] = [$h1 . ': ' . mb_strtolower($how, 'UTF-8') . '?', $time . '.'];
    skolko_start($h1 . ' — ' . $x['big'], $answer, skolko_path($x['slug']), [skolko_faq($qa)]);
    echo skolko_crumbs('boil') . '<h1>' . h($h1) . "</h1>\n";
    echo '<div class="ans"><div class="big">' . h($x['big']) . '<small>' . h($x['small']) . '</small></div><p>' . h($x['text']) . "</p></div>\n";
    if (count($x['rows']) > 1) {
        echo "<h2>Смотря как</h2>\n<table><tr><th>Как</th><th class=\"n\">Сколько</th></tr>";
        foreach ($x['rows'] as $k => [$how, $time]) echo '<tr' . ($k === 0 ? ' class="on"' : '') . '><td>' . h($how) . '</td><td class="n">' . h($time) . '</td></tr>';
        echo "</table>\n";
    }
    echo '<p class="tip"><span aria-hidden="true">🌿</span><span>' . h($x['tip']) . "</span></p>\n";
    if ($x['ins'] !== '') echo skolko_grid('Рецепты ' . $x['ins'], skolko_recipes($x['main'], [], 'boil'));
    echo skolko_chef('Не нашли ответ? Спросите Шефа своими словами — он подскажет и подберёт блюдо из того, что есть дома.');
    echo skolko_more('boil', $x['slug'], $items) . seo_footer();
}

function skolko_sitemap(callable $url): void {
    $f = __DIR__ . '/data/skolko.json';
    $m = is_file($f) ? (int)filemtime($f) : time();
    $url(seo_abs(skolko_path()), $m);
    foreach (array_keys(SKOLKO_SECTION) as $s) foreach (skolko_items($s) as $x) $url(seo_abs(skolko_path($x['slug'])), $m);
}
