<?php
// Collections for search engines: «Что приготовить на Новый год», «Постные блюда», «Блины на Масленицу»…
// The same idea as the seasonal shelves on the home screen; the one in season is listed first.
declare(strict_types=1);

const LENTEN_OFF = ['meat', 'poultry', 'fish', 'seafood', 'dairy', 'eggs'];

function seo_collections(): array {
    $title = fn(string $re) => fn(array $r) => (bool)preg_match($re, mb_strtolower((string)$r['title'], 'UTF-8'));
    $occ = fn(string $o) => fn(array $r) => in_array($o, (array)($r['occasions'] ?? []), true);
    $season = fn(string $s) => fn(array $r) => in_array($s, (array)($r['season'] ?? []), true);
    $ing = catalog_ingredients();
    $lenten = function (array $r) use ($ing) {
        foreach ((array)($r['ingredients'] ?? []) as $i) {
            $groups = (array)($i['groups'] ?? ($ing[(string)($i['id'] ?? '')]['groups'] ?? []));
            if (array_intersect($groups, LENTEN_OFF)) return false;
        }
        return in_array($r['_course'], ['main', 'soup', 'salad', 'side', 'breakfast', 'baking'], true);
    };
    return [
        'novyj-god' => ['На Новый год', 'Что приготовить на Новый год: салаты, горячее и закуски', 'праздничные салаты, горячее и закуски к новогоднему столу',
            fn($r) => $occ('new-year')($r) || $title('/оливье|шуб|холодец|заливн|запечён|запечен/u')($r), [12, 1]],
        'salaty-na-novyj-god' => ['Салаты на Новый год', 'Салаты на Новый год: оливье, шуба, мимоза и другие', 'новогодние салаты — классика и новые',
            fn($r) => $r['_course'] === 'salad' && ($occ('new-year')($r) || $occ('holiday')($r) || $title('/оливье|шуб|мимоз|крабов/u')($r)), [12, 1]],
        'goryachee-na-novyj-god' => ['Горячее на Новый год', 'Горячее на новогодний стол', 'горячие блюда к праздничному столу: мясо, птица, рыба',
            fn($r) => $r['_course'] === 'main' && ($occ('new-year')($r) || $occ('holiday')($r) || ($occ('guests')($r) && $title('/запеч|рулет|по-французски|утк|гус|буженин|окорок|целиком|в духовке|жульен/u')($r))), [12, 1]],
        'salaty-bez-majoneza' => ['Салаты без майонеза', 'Праздничные салаты без майонеза', 'салаты к праздничному и обычному столу без майонеза',
            fn($r) => $r['_course'] === 'salad' && !in_array('mayonnaise', array_map(fn($i) => (string)($i['id'] ?? ''), (array)($r['ingredients'] ?? [])), true), [11, 12, 1]],
        'posle-prazdnika' => ['После праздника', 'Что приготовить после праздников: лёгкие блюда и супы', 'лёгкие супы, каши и простые блюда на первые дни после праздничного стола',
            fn($r) => !$occ('new-year')($r) && (($r['difficulty'] ?? '') !== 'hard') && (in_array('light', (array)($r['tags'] ?? []), true) || in_array($r['_course'], ['soup', 'breakfast'], true)), [1]],
        'maslenica' => ['На Масленицу', 'Блины на Масленицу и всё к ним', 'блины, оладьи и начинки к Масленице',
            fn($r) => $occ('maslenitsa')($r) || $title('/блин|олад|сырник|панкейк/u')($r), [2, 3]],
        'post' => ['Постные блюда', 'Постные блюда на каждый день', 'постные супы, вторые блюда и выпечку без мяса, рыбы, молочного и яиц', $lenten, [3, 4, 11, 12]],
        'pasha' => ['К Пасхе', 'Что приготовить на Пасху', 'куличи, творожную пасху, выпечку и праздничные блюда',
            fn($r) => $occ('easter')($r) || $title('/кулич|пасх|творожн/u')($r) || ($r['_course'] === 'baking' && $occ('holiday')($r)), [4, 5]],
        'dlya-gostej' => ['Для гостей', 'Что приготовить для гостей', 'блюда к праздничному столу: салаты, горячее и закуски', fn($r) => $occ('guests')($r) || $occ('holiday')($r), []],
        'detyam' => ['Детям', 'Что приготовить ребёнку', 'простые блюда, которые нравятся детям', fn($r) => ($r['kids'] ?? null) === true || $occ('kids-party')($r), []],
        'bystro' => ['За 30 минут', 'Быстрые рецепты до 30 минут', 'ужины и обеды, которые готовятся за полчаса', fn($r) => (int)($r['totalMinutes'] ?? 999) <= 30, []],
        'letnee' => ['Летние блюда', 'Что приготовить летом', 'окрошку, холодные супы, салаты и блюда из овощей', fn($r) => $season('summer')($r) || $title('/окрошк|холодник|гаспачо|свекольник/u')($r), [6, 7, 8]],
        'osennee' => ['Осенние блюда', 'Что приготовить осенью', 'блюда из тыквы, грибов, яблок и осенних овощей', fn($r) => $season('autumn')($r) || $title('/тыкв|гриб|шампиньон|яблок|шарлотк/u')($r), [9, 10, 11]],
        'zimnee' => ['Согревающие блюда', 'Горячие блюда на зиму', 'супы, рагу и сытные горячие блюда', fn($r) => $season('winter')($r) || $r['_course'] === 'soup', [12, 1, 2]],
    ];
}
function seo_collection_path(string $key = ''): string {
    return seo_path() . (seo_pretty() ? 'podborka/' . ($key !== '' ? $key : '') : 'podborka.php' . ($key !== '' ? '?k=' . $key : ''));
}
/** Collections with enough recipes, the ones in season first. */
function seo_collection_list(): array {
    $all = seo_recipes();
    $m = (int)date('n');
    $out = [];
    foreach (seo_collections() as $key => [$short, $h1, $what, $test, $months]) {
        $items = array_values(array_filter($all, $test));
        if (count($items) < 6) continue;
        $out[$key] = ['short' => $short, 'h1' => $h1, 'what' => $what, 'items' => $items, 'now' => in_array($m, $months, true)];
    }
    uasort($out, fn($a, $b) => $b['now'] <=> $a['now']);
    return $out;
}

function seo_collection_page(string $key): void {
    $list = seo_collection_list();
    if ($key !== '' && !isset($list[$key])) { seo_not_found(); return; }
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: public, max-age=600');
    $nav = function () use ($list, $key) {
        $o = '<ul class="cats">';
        foreach ($list as $k => $c) $o .= '<li><a href="' . h(seo_collection_path($k)) . '"' . ($k === $key ? ' class="on"' : '') . '>' . h($c['short']) . '<small>' . count($c['items']) . '</small></a></li>';
        return $o . "</ul>\n";
    };
    if ($key === '') {
        $title = 'Подборки рецептов: к празднику, по сезону, для гостей и детей';
        $desc = 'Что приготовить на Новый год, Масленицу и Пасху, постные и летние блюда, быстрые ужины и блюда для гостей — домашние рецепты с пошаговым описанием.';
        echo seo_head(['title' => $title . ' | ' . SEO_SITE, 'description' => $desc, 'canonical' => seo_abs(seo_collection_path())]);
        echo '<h1>Подборки рецептов</h1><p class="lead">' . h($desc) . "</p>\n" . $nav();
        foreach ($list as $k => $c) {
            echo '<h2><a href="' . h(seo_collection_path($k)) . '">' . h($c['h1']) . '</a></h2><ul class="grid">';
            $items = $c['items'];
            usort($items, fn($a, $b) => (seo_thumb($b['id']) ? 1 : 0) <=> (seo_thumb($a['id']) ? 1 : 0));
            foreach (array_slice($items, 0, 4) as $r) echo seo_card($r);
            echo "</ul>\n";
        }
        echo seo_footer();
        return;
    }
    $c = $list[$key];
    $n = count($c['items']);
    usort($c['items'], fn($a, $b) => (seo_thumb($b['id']) ? 1 : 0) <=> (seo_thumb($a['id']) ? 1 : 0) ?: strcmp($a['title'], $b['title']));
    $title = $c['h1'] . ' — ' . $n . ' ' . seo_plural($n, 'рецепт', 'рецепта', 'рецептов');
    $desc = 'Домашние рецепты: ' . $c['what'] . '. Время, ингредиенты, шаги и калорийность — и подбор по продуктам, которые есть дома.';
    $ld = ['@context' => 'https://schema.org', '@type' => 'ItemList', 'name' => $c['h1'], 'numberOfItems' => $n,
        'itemListElement' => array_values(array_map(fn($r, $k) => ['@type' => 'ListItem', 'position' => $k + 1, 'url' => seo_abs(seo_recipe_path($r['id'])), 'name' => (string)$r['title']], $c['items'], array_keys($c['items'])))];
    echo seo_head(['title' => $title . ' | ' . SEO_SITE, 'description' => $desc, 'canonical' => seo_abs(seo_collection_path($key)), 'ld' => [$ld]]);
    echo '<nav class="crumbs" aria-label="Навигация"><a href="' . h(seo_collection_path()) . "\">Подборки</a></nav>\n";
    echo '<h1>' . h($c['h1']) . '</h1><p class="lead">' . h($desc) . "</p>\n" . $nav();
    echo '<div class="cta"><p>Соберите стол за минуту: Шеф подберёт блюда, посчитает продукты на всех и подскажет, когда что начинать.</p><a class="btn" href="' . h(seo_path()) . "\">Спросить Шефа</a></div>\n";
    echo '<ul class="grid">';
    foreach ($c['items'] as $r) echo seo_card($r, true);
    echo "</ul>\n" . seo_footer();
}
