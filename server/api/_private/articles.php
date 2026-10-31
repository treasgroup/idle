<?php
// «Статьи»: twice a week the site puts together an article from its own recipes — «7 праздничных салатов без
// майонеза», «Что приготовить из кабачков: 7 рецептов» — in season first. No paid AI: the words are the recipes'
// own (summary, tip, products) and an opening written here for each theme. The articles are pages of the site
// (/stati/…) and go to Дзен by its RSS feed (/dzen.xml), which Дзен reads by itself.
declare(strict_types=1);

const ART_PER = 7;            // dishes in an article
const ART_EVERY = 302400;     // a new one every 3½ days (Monday and Thursday)
const ART_FIRST = 10;         // Дзен wants ten in the feed the first time

function art_file(): string { return rtrim((string)config()['storage_dir'], '/') . '/articles.json'; }
function art_list(): array {
    $d = json_decode((string)@file_get_contents(art_file()), true);
    return is_array($d['items'] ?? null) ? $d['items'] : [];
}
function art_path(string $slug = ''): string {
    return seo_path() . (seo_pretty() ? 'stati/' . $slug : 'stati.php' . ($slug !== '' ? '?s=' . $slug : ''));
}

/** The themes: [months (empty — any time), title with {n}, opening, the recipes]. */
function art_themes(): array {
    $c = seo_collection_list();
    $col = fn(string $k) => fn() => $c[$k]['items'] ?? [];
    $ny = seo_ny_year();
    $t = [
        'salaty-bez-majoneza' => [[11, 12, 1], '{n} праздничных салатов без майонеза',
            'Оливье и шуба — традиция, но на праздничном столе всегда нужен салат полегче. Собрали салаты без майонеза: со свежими овощами, сыром, мясом и рыбой. Они не «плывут» за вечер и хорошо смотрятся на общем блюде.', $col('salaty-bez-majoneza')],
        'goryachee-na-novyj-god' => [[11, 12], 'Горячее на Новый год ' . $ny . ': {n} блюд для праздничного стола',
            'Горячее — главное блюдо новогоднего вечера, и его лучше выбрать заранее. Здесь мясо, птица и рыба, которые готовятся в духовке почти без вашего участия, пока вы заняты салатами и гостями.', $col('goryachee-na-novyj-god')],
        'salaty-na-novyj-god' => [[12], '{n} салатов на новогодний стол: классика и новые',
            'Без салатов новогодний стол не стол. Собрали и классику, которую ждут все, и пару новых вариантов, чтобы было чем удивить. У каждого — время, калорийность и список продуктов, чтобы сразу дописать их в покупки.', $col('salaty-na-novyj-god')],
        'novyj-god' => [[12], 'Что приготовить на Новый год ' . $ny . ': {n} проверенных блюд',
            'Меню на Новый год проще собрать из проверенных блюд: салат, закуска, горячее. Вот семь рецептов, которые готовят каждый год и не прогадывают.', $col('novyj-god')],
        'posle-prazdnika' => [[1], '{n} лёгких блюд после праздников',
            'После праздничного стола хочется простой домашней еды: супа, каши, овощей. Собрали лёгкие блюда, которые готовятся без суеты и не нагружают.', $col('posle-prazdnika')],
        'zimnee' => [[12, 1, 2], '{n} согревающих блюд на холодный вечер',
            'Когда за окном мороз, лучше всего греет горячий суп или сытное рагу. Вот блюда, после которых вечер становится уютнее.', $col('zimnee')],
        'maslenica' => [[2, 3], '{n} рецептов на Масленицу: блины и не только',
            'Масленичная неделя — время блинов, оладий и сырников. Собрали рецепты, которые получаются с первого раза, даже если блины вы печёте редко.', $col('maslenica')],
        'post' => [[3, 4, 11, 12], '{n} постных блюд на каждый день',
            'Постные блюда могут быть сытными и вкусными. Здесь рецепты без мяса, рыбы, молочного и яиц — для обеда, ужина и перекуса.', $col('post')],
        'pasha' => [[4, 5], 'Что приготовить на Пасху: {n} рецептов',
            'Куличи, творожная пасха и праздничные блюда — собрали рецепты к Пасхе с понятными шагами, чтобы всё успеть к празднику.', $col('pasha')],
        'letnee' => [[6, 7, 8], '{n} летних блюд, когда жарко',
            'Летом не хочется стоять у плиты. Холодные супы, салаты и блюда из сезонных овощей — то, что нужно в жару.', $col('letnee')],
        'osennee' => [[9, 10, 11], '{n} осенних блюд из тыквы, грибов и яблок',
            'Осень — время тыквы, грибов и яблок. Собрали блюда, в которых сезонные продукты раскрываются лучше всего.', $col('osennee')],
        'bystro' => [[], '{n} ужинов за 30 минут',
            'Вечером после работы нет сил на долгую готовку. Эти блюда готовятся за полчаса или быстрее — от первой нарезки до тарелки.', $col('bystro')],
        'dlya-gostej' => [[], '{n} блюд, которые не стыдно подать гостям',
            'Гости на пороге, а меню не придумано? Вот блюда, которые выглядят празднично, но готовятся без лишних сложностей.', $col('dlya-gostej')],
        'detyam' => [[], '{n} блюд, которые с удовольствием съедят дети',
            'Детям нравится простая и понятная еда. Собрали блюда, которые готовятся легко и обычно съедаются до последней ложки.', $col('detyam')],
    ];
    // A product: «Что приготовить из кабачков: 7 рецептов» — in its season or any time.
    $idx = seo_combo_index(); $all = seo_recipes();
    $products = ['chicken-fillet' => [], 'potato' => [], 'minced-pork-beef' => [], 'egg' => [], 'cottage-cheese' => [], 'cabbage' => [9, 10, 11, 12, 1, 2],
        'zucchini' => [7, 8, 9], 'buckwheat' => [], 'pork' => [], 'beef' => [], 'rice' => [], 'pasta' => [], 'mushroom' => [8, 9, 10], 'apple' => [8, 9, 10],
        'beet' => [10, 11, 12, 1, 2], 'eggplant' => [7, 8, 9], 'pumpkin' => [9, 10, 11], 'kefir' => [], 'chicken-thigh-fillet' => [], 'minced-beef' => []];
    foreach ($products as $id => $months) {
        $of = seo_of($id);
        if (!$of || count($idx[$id] ?? []) < ART_PER) continue;
        $name = seo_ing_name($id);
        $t['iz-' . $id] = [$months, 'Что приготовить из ' . $of . ': {n} рецептов на каждый день',
            'Когда дома есть ' . mb_strtolower($name, 'UTF-8') . ', а идей нет, выручат проверенные рецепты. Собрали семь блюд из ' . $of . ' — от простых будничных до тех, что можно подать гостям.',
            fn() => array_values(array_filter(array_map(fn($rid) => $all[$rid] ?? null, $idx[$id])))];
    }
    return $t;
}

/** The next theme: what is in season and was not written this year; else the one written longest ago. */
function art_next_theme(array $themes, array $done, int $now, array $skip = []): ?string {
    $m = (int)date('n', $now);
    $last = [];
    foreach ($done as $a) $last[$a['theme']] = max($last[$a['theme']] ?? 0, (int)$a['at']);
    $best = null; $bestKey = null;
    // Kinds take turns: a collection, then a product («из кабачков»), so the feed is not seven «из…» in a row.
    $prev = $done ? (string)end($done)['theme'] : '';
    $isProduct = fn(string $k) => strncmp($k, 'iz-', 3) === 0;
    $order = 0;
    foreach ($themes as $key => [$months]) {
        $order++;
        if (isset($skip[$key])) continue;
        $ago = isset($last[$key]) ? $now - $last[$key] : PHP_INT_MAX;
        $season = $months && in_array($m, $months, true);
        if ($months && !$season) continue;
        if ($ago < ($season ? 200 : 90) * 86400) continue;
        // In season first; between equals, never written or written longest ago; then the list's order.
        $score = [$prev !== '' && $isProduct($prev) === $isProduct($key) ? 1 : 0, $season ? 0 : 1, -min($ago, 10 ** 12), $order];
        if ($best === null || $score < $best) { $best = $score; $bestKey = $key; }
    }
    if ($bestKey) return $bestKey;
    // Everything was written lately: the evergreen one written longest ago.
    uksort($last, fn($a, $b) => $last[$a] <=> $last[$b]);
    foreach ($last as $key => $_) if (isset($themes[$key]) && !$themes[$key][0] && !isset($skip[$key])) return $key;
    return null;
}

/** Seven dishes with a photo, familiar first; dishes of the last articles are kept for later when there is enough. */
function art_pick(array $pool, array $done, bool $kids = false): array {
    $recent = [];
    foreach (array_slice($done, -8) as $a) foreach ($a['ids'] as $id) $recent[$id] = true;
    $with = array_values(array_filter($pool, fn($r) => seo_photo($r['id']) !== null));
    // Dishes for babies only in the article for children.
    if (!$kids) $with = array_values(array_filter($with, fn($r) => !preg_match('/для детей|для малыш|детск/u', mb_strtolower((string)$r['title'], 'UTF-8'))));
    $with = seo_familiar_first($with);
    // One of a kind: «Каша пшённая с тыквой» and «Пшённая каша с тыквой в мультиварке» are the same dish to a reader.
    $kind = function (array $r): string {
        $w = preg_split('/[^\p{L}]+/u', mb_strtolower((string)$r['title'], 'UTF-8'), -1, PREG_SPLIT_NO_EMPTY);
        $w = array_filter($w, fn($x) => mb_strlen($x, 'UTF-8') >= 4 && !preg_match('/^(мультивар|духовк|сковород|домашн|классич|быстр|прост|аэрогрил|микроволн)/u', $x));
        $w = array_unique(array_map(fn($x) => mb_substr($x, 0, 5, 'UTF-8'), $w));
        sort($w);
        return implode(' ', $w);
    };
    $seen = [];
    $with = array_values(array_filter($with, function ($r) use (&$seen, $kind) { $k = $kind($r); if (isset($seen[$k])) return false; return $seen[$k] = true; }));

    $fresh = array_values(array_filter($with, fn($r) => !isset($recent[$r['id']])));
    $list = count($fresh) >= ART_PER ? $fresh : $with;
    return array_map(fn($r) => $r['id'], array_slice($list, 0, ART_PER));
}

/** Writes what is due: ten the first time, then one every 3½ days. Returns whether something was added. */
function art_tick(): bool {
    $items = art_list();
    $now = time();
    $want = !$items ? ART_FIRST : (($now - (int)end($items)['at']) >= ART_EVERY ? 1 : 0);
    if (!$want) return false;
    $fp = @fopen(art_file() . '.lock', 'c');
    if (!$fp || !flock($fp, LOCK_EX | LOCK_NB)) return false;
    $items = art_list(); // again, under the lock
    $want = !$items ? ART_FIRST : (($now - (int)end($items)['at']) >= ART_EVERY ? 1 : 0);
    $themes = art_themes(); $added = false;
    for ($k = 0; $k < $want; $k++) {
        // The first ten: a minute apart, the newest last.
        $at = $now - ($want - 1 - $k) * 60;
        // A theme without five dishes with a photo is passed over (not written down: it may have them later).
        $skip = []; $key = null; $ids = [];
        while ($key = art_next_theme($themes, $items, $at, $skip)) {
            $ids = art_pick(($themes[$key][3])(), $items, $key === 'detyam');
            if (count($ids) >= 5) break;
            $skip[$key] = true;
        }
        if (!$key) break;
        $slug = $key . '-' . date('Y', $at);
        foreach ($items as $a) if ($a['slug'] === $slug) $slug = $key . '-' . date('Y-m-d', $at);
        $items[] = ['theme' => $key, 'slug' => $slug, 'title' => str_replace('{n}', (string)count($ids), $themes[$key][1]), 'intro' => $themes[$key][2], 'ids' => $ids, 'at' => $at];
        $added = true;
    }
    @file_put_contents(art_file(), json_encode(['items' => $items], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), LOCK_EX);
    flock($fp, LOCK_UN); fclose($fp);
    return $added;
}
/** Published articles, the newest first. */
function art_published(): array {
    return array_reverse(art_list());
}

/** One dish of an article: its words, its numbers, its products, a tip. */
function art_dish(array $r): array {
    $kcal = seo_nutrition($r);
    $main = array_slice(array_values(array_unique(array_filter(array_map(fn($i) => is_array($i) && empty($i['optional']) && !preg_match('/^(water|salt|black-pepper|vegetable-oil|sunflower-oil|sugar)$/', (string)($i['id'] ?? '')) ? seo_ing_name((string)$i['id']) : null, $r['ingredients'])))), 0, 7);
    $tip = '';
    // A tip for a reader, not for the cook at the stove with the recipe open.
    foreach ((array)($r['tips'] ?? []) as $x) if (is_string($x) && !preg_match('/порци|диапазон|кастрюл[юя] на \d|указан|объём|ярус|ребён|детям|малыш|с \d+ (года|лет|месяц)/u', $x) && mb_strlen($x, 'UTF-8') < 240) { $tip = preg_replace('/\.{2,}/', '.', $x); break; }
    $diff = ['easy' => 'просто', 'medium' => 'средне', 'hard' => 'сложно'][$r['difficulty'] ?? ''] ?? '';
    $facts = implode(' · ', array_filter([seo_minutes((int)($r['totalMinutes'] ?? 0)), $diff, $kcal ? $kcal['kcal'] . ' ккал на порцию' : '']));
    return ['summary' => trim((string)($r['summary'] ?? '')), 'facts' => $facts, 'main' => $main, 'tip' => $tip];
}
function art_date(int $at): string {
    $m = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    return (int)date('j', $at) . ' ' . $m[(int)date('n', $at) - 1] . ' ' . date('Y', $at);
}
const ART_OUTRO = 'Не нашли подходящего? Напишите Шефу на сайте «Шефли», что есть дома, — он подберёт блюдо из ваших продуктов, посчитает их на всех и проведёт по шагам с таймерами. Бесплатно и без регистрации.';

/** The article's body for Дзен: allowed tags only (p, h2, figure, img, figcaption, a, b, ul, li), absolute addresses. */
function art_feed_html(array $a): string {
    $all = seo_recipes(); $o = '<p>' . h($a['intro']) . '</p>';
    foreach (array_values($a['ids']) as $k => $id) {
        $r = $all[$id] ?? null; if (!$r) continue;
        $d = art_dish($r); $url = seo_abs(seo_recipe_path($id));
        $o .= '<h2>' . ($k + 1) . '. ' . h($r['title']) . '</h2>';
        if (seo_photo($id)) $o .= '<figure><img src="' . h(seo_abs(seo_path() . 'photos/' . $id . '.jpg')) . '"><figcaption>' . h($r['title']) . '</figcaption></figure>';
        if ($d['summary'] !== '') $o .= '<p>' . h($d['summary']) . '</p>';
        $o .= '<p><b>' . h($d['facts']) . '</b></p>';
        if ($d['main']) $o .= '<p>Понадобится: ' . h(implode(', ', $d['main'])) . '.</p>';
        if ($d['tip'] !== '') $o .= '<p><i>Совет:</i> ' . h($d['tip']) . '</p>';
        $o .= '<p><a href="' . h($url) . '">Пошаговый рецепт с фото и таймерами</a></p>';
    }
    return $o . '<p>' . h(ART_OUTRO) . ' <a href="' . h(seo_abs(seo_path())) . '">shefly.ru</a></p>';
}

/** /dzen.xml: the last 20 articles, full text, as Дзен's help asks. */
function art_feed(): void {
    art_tick();
    $all = seo_recipes();
    header('Content-Type: application/rss+xml; charset=utf-8');
    header('Cache-Control: public, max-age=600');
    $x = fn($s) => htmlspecialchars((string)$s, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n"
        . '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">' . "\n<channel>\n"
        . '<title>' . $x(SEO_SITE) . "</title>\n<link>" . $x(seo_abs(seo_path())) . "</link>\n"
        . '<description>Домашние рецепты с фото и шагами: подборки к сезону и празднику, что приготовить из того, что есть дома.</description>' . "\n<language>ru</language>\n"
        . '<atom:link href="' . $x(seo_abs(seo_path() . (seo_pretty() ? 'dzen.xml' : 'stati.php?rss=1'))) . '" rel="self" type="application/rss+xml"/>' . "\n";
    foreach (array_slice(art_published(), 0, 20) as $a) {
        $url = seo_abs(art_path($a['slug']));
        $cover = null;
        foreach ($a['ids'] as $id) if (isset($all[$id]) && seo_photo($id)) { $cover = seo_abs(seo_path() . 'photos/' . $id . '.jpg'); break; }
        echo "<item>\n<title>" . $x($a['title']) . "</title>\n<link>" . $x($url) . "</link>\n<guid isPermaLink=\"true\">" . $x($url) . "</guid>\n"
            . '<pubDate>' . date('r', (int)$a['at']) . "</pubDate>\n<category>format-article</category>\n<category>Рецепты</category>\n"
            . '<description>' . $x(seo_cut($a['intro'], 240)) . "</description>\n"
            . ($cover ? '<enclosure url="' . $x($cover) . '" type="image/jpeg"/>' . "\n" : '')
            . '<content:encoded><![CDATA[' . str_replace(']]>', ']]&gt;', art_feed_html($a)) . "]]></content:encoded>\n</item>\n";
    }
    echo "</channel>\n</rss>\n";
}

/** /stati/ — the list; /stati/<slug> — one article. */
function art_page(string $slug): void {
    art_tick();
    $list = art_published(); $all = seo_recipes();
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: public, max-age=600');
    $cover = function (array $a) use ($all): ?string { foreach ($a['ids'] as $id) if (isset($all[$id]) && seo_thumb($id)) return seo_thumb($id); return null; };
    if ($slug === '') {
        $title = 'Статьи о домашней еде: подборки к сезону и празднику';
        echo seo_head(['title' => $title . ' | ' . SEO_SITE, 'description' => 'Подборки домашних рецептов: что приготовить на праздник и по сезону, из того, что есть дома, быстро и для гостей.', 'canonical' => seo_abs(art_path())]);
        echo '<h1>Статьи</h1><p class="lead">Подборки домашних рецептов к сезону и празднику — новые дважды в неделю.</p><ul class="grid">';
        foreach ($list as $a) {
            $src = $cover($a);
            echo '<li><a class="card" href="' . h(art_path($a['slug'])) . '"><span class="pic">' . ($src ? '<img src="' . h($src) . '" alt="" loading="lazy" decoding="async" width="400" height="300">' : '') . '</span><b>' . h($a['title']) . '</b><small>' . h(art_date((int)$a['at'])) . '</small></a></li>';
        }
        echo "</ul>\n" . seo_footer();
        return;
    }
    $a = null;
    foreach ($list as $x) if ($x['slug'] === $slug) $a = $x;
    if (!$a) { seo_not_found(); return; }
    $url = seo_abs(art_path($slug)); $photo = null;
    $css = '.art{max-width:720px}.art h2{font-size:22px;margin:30px 0 8px}.art h2 a{color:inherit;text-decoration:none}.art img{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover;border-radius:20px;margin:6px 0 10px;background:var(--sunken)}'
        . '.art p{margin:0 0 10px;line-height:1.6}.date{color:var(--faint);font-size:14px;margin:-4px 0 12px}.facts{font-weight:600}.tip{background:var(--sunken);border-radius:14px;padding:10px 14px}.more{font-weight:600}.art .cta{margin-top:30px}';
    foreach ($a['ids'] as $id) if (isset($all[$id]) && seo_photo($id)) { $photo = seo_abs(seo_path() . 'photos/' . $id . '.jpg'); break; }
    $ld = ['@context' => 'https://schema.org', '@type' => 'Article', 'headline' => $a['title'], 'datePublished' => date('c', (int)$a['at']),
        'author' => ['@type' => 'Organization', 'name' => SEO_SITE, 'url' => seo_abs(seo_path())], 'publisher' => ['@type' => 'Organization', 'name' => SEO_SITE],
        'mainEntityOfPage' => $url] + ($photo ? ['image' => $photo] : []);
    echo seo_head(['title' => $a['title'] . ' | ' . SEO_SITE, 'description' => seo_cut($a['intro'], 200), 'canonical' => $url, 'ld' => [$ld], 'ogType' => 'article', 'css' => $css] + ($photo ? ['image' => $photo] : []));
    echo '<nav class="crumbs" aria-label="Навигация"><a href="' . h(art_path()) . "\">Статьи</a></nav>\n";
    echo '<article class="art"><h1>' . h($a['title']) . '</h1><p class="date">' . h(art_date((int)$a['at'])) . '</p><p class="lead">' . h($a['intro']) . "</p>\n";
    foreach (array_values($a['ids']) as $k => $id) {
        $r = $all[$id] ?? null; if (!$r) continue;
        $d = art_dish($r); $src = seo_thumb($id);
        echo '<section><h2>' . ($k + 1) . '. <a href="' . h(seo_recipe_path($id)) . '">' . h($r['title']) . '</a></h2>'
            . ($src ? '<a href="' . h(seo_recipe_path($id)) . '"><img src="' . h($src) . '" alt="' . h($r['title']) . '" loading="' . ($k ? 'lazy' : 'eager') . '" decoding="async" width="640" height="480"></a>' : '')
            . ($d['summary'] !== '' ? '<p>' . h($d['summary']) . '</p>' : '') . '<p class="facts">' . h($d['facts']) . '</p>'
            . ($d['main'] ? '<p>Понадобится: ' . h(implode(', ', $d['main'])) . '.</p>' : '')
            . ($d['tip'] !== '' ? '<p class="tip"><b>Совет.</b> ' . h($d['tip']) . '</p>' : '')
            . '<p><a class="more" href="' . h(seo_recipe_path($id)) . '">Пошаговый рецепт →</a></p></section>' . "\n";
    }
    echo '<div class="cta"><p>' . h(ART_OUTRO) . '</p><a class="btn" href="' . h(seo_path()) . "\">Спросить Шефа</a></div></article>\n";
    $more = array_slice(array_values(array_filter($list, fn($x) => $x['slug'] !== $slug)), 0, 4);
    if ($more) {
        echo '<h2>Ещё статьи</h2><ul class="grid">';
        foreach ($more as $x) { $src = $cover($x); echo '<li><a class="card" href="' . h(art_path($x['slug'])) . '"><span class="pic">' . ($src ? '<img src="' . h($src) . '" alt="" loading="lazy" decoding="async" width="400" height="300">' : '') . '</span><b>' . h($x['title']) . '</b><small>' . h(art_date((int)$x['at'])) . '</small></a></li>'; }
        echo "</ul>\n";
    }
    echo seo_footer();
}
