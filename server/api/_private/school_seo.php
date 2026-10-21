<?php
// Школа готовки for search engines: the list of lessons, a page per lesson («как жарить, а не тушить») and
// «Спасение» — what to do when the dish goes wrong. Data: data/school.json, built from the app's own lessons
// (web/scripts/school-json.mjs), so the pages and the app never drift apart. Card pictures uploaded in the admin
// (school/<lesson>-<n>.jpg) show here too.

function school_data(): array {
    static $d = null;
    if ($d !== null) return $d;
    $raw = @file_get_contents(__DIR__ . '/data/school.json');
    $d = $raw ? (json_decode($raw, true) ?: []) : [];
    return $d;
}
function school_path(string $id = ''): string {
    if (seo_pretty()) return seo_path() . 'shkola/' . $id;
    return seo_path() . 'shkola.php' . ($id !== '' ? '?id=' . rawurlencode($id) : '');
}
/** The lesson inside the app (cards, «Проверь себя», progress). */
function school_app_path(string $id): string { return seo_path() . '#/learn/' . rawurlencode($id); }
function school_image(string $lesson, int $n): ?string {
    $file = dirname(__DIR__, 2) . '/school/' . $lesson . '-' . $n . '.jpg';
    return is_file($file) ? seo_path() . 'school/' . $lesson . '-' . $n . '.jpg?v=' . filemtime($file) : null;
}
const SCHOOL_SECTION = ['basics' => 'Основы', 'technique' => 'Техники', 'products' => 'Продукты'];

function school_page(string $id): void {
    $d = school_data();
    $lessons = [];
    foreach (($d['lessons'] ?? []) as $l) $lessons[$l['id']] = $l;
    if ($id === '') { school_index($lessons); return; }
    if ($id === 'spasenie') { school_rescue($d['rescue'] ?? []); return; }
    if (!isset($lessons[$id])) { seo_not_found(); return; }
    $l = $lessons[$id];
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: public, max-age=3600');
    $title = $l['title'];
    $desc = $l['skill'] . ' ' . implode(' ', array_map(fn($c) => $c['title'] . '.', array_slice($l['cards'], 0, 3)));
    $faq = ['@context' => 'https://schema.org', '@type' => 'FAQPage', 'mainEntity' => array_map(fn($q) => ['@type' => 'Question', 'name' => $q['q'],
        'acceptedAnswer' => ['@type' => 'Answer', 'text' => $q['options'][$q['right']] . '. ' . preg_replace('/^(Да|Верно)[!:,.]?\s*/u', '', $q['why'])]], $l['quiz'])];
    $howto = ['@context' => 'https://schema.org', '@type' => 'HowTo', 'name' => $title, 'description' => $l['skill'],
        'step' => array_map(fn($c, $k) => ['@type' => 'HowToStep', 'position' => $k + 1, 'name' => $c['title'], 'text' => $c['text']], $l['cards'], array_keys($l['cards']))];
    $img = school_image($id, 0);
    echo seo_head(['title' => $title . ' — урок Школы готовки | ' . SEO_SITE, 'description' => seo_cut($desc, 200), 'canonical' => seo_abs(school_path($id)), 'ld' => [$howto, $faq]]
        + ($img ? ['image' => seo_abs($img)] : []));
    echo '<nav class="crumbs" aria-label="Навигация"><a href="' . h(school_path()) . '">Школа готовки</a> · ' . h(SCHOOL_SECTION[$l['section']] ?? '') . "</nav>\n";
    echo '<h1>' . h($title) . '</h1><p class="lead">' . h($l['skill']) . "</p>\n";
    echo '<ol class="lesson">';
    foreach ($l['cards'] as $k => $c) {
        $pic = school_image($id, $k);
        echo '<li>' . ($pic ? '<img src="' . h($pic) . '" alt="' . h($c['title']) . '" loading="lazy" width="600" height="400">' : '') . '<h2>' . h($c['title']) . '</h2><p>' . h($c['text']) . "</p></li>\n";
    }
    echo "</ol>\n<h2>Проверь себя</h2>\n";
    foreach ($l['quiz'] as $q) {
        echo '<details class="quiz"><summary>' . h($q['q']) . '</summary><p><b>' . h($q['options'][$q['right']]) . '.</b> ' . h(preg_replace('/^(Да|Верно)[!:,.]?\s*/u', '', $q['why'])) . "</p></details>\n";
    }
    echo '<div class="cta"><p>Пройдите урок в приложении: карточки, вопрос и отметка «пройдено», а рецепт откроется с таймерами по шагам.</p><a class="btn" href="' . h(school_app_path($id)) . "\">Пройти урок</a></div>\n";
    $all = seo_recipes();
    $practice = array_values(array_filter(array_map(fn($r) => $all[$r] ?? null, $l['recipes'])));
    if ($practice) {
        echo "<h2>Попробуйте на практике</h2>\n<ul class=\"grid\">";
        foreach ($practice as $r) echo seo_card($r);
        echo "</ul>\n";
    }
    $more = array_filter($lessons, fn($x) => $x['section'] === $l['section'] && $x['id'] !== $id);
    if ($more) {
        echo '<h2>Ещё уроки: ' . h(SCHOOL_SECTION[$l['section']] ?? '') . "</h2>\n<ul class=\"links\">";
        foreach ($more as $x) echo '<li><a href="' . h(school_path($x['id'])) . '">' . h($x['title']) . '</a></li>';
        echo "</ul>\n";
    }
    echo seo_footer();
}

function school_index(array $lessons): void {
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: public, max-age=3600');
    $title = 'Школа готовки: короткие уроки для начинающих';
    $desc = 'Как держать нож, какой нужен огонь, как жарить, а не тушить, варить крупы и суп, запекать мясо и что делать, если блюдо пошло не так. ' . count($lessons) . ' коротких уроков с рецептами для практики.';
    echo seo_head(['title' => $title . ' | ' . SEO_SITE, 'description' => $desc, 'canonical' => seo_abs(school_path())]);
    echo '<h1>Школа готовки</h1><p class="lead">' . h($desc) . "</p>\n";
    foreach (SCHOOL_SECTION as $s => $label) {
        echo '<h2>' . h($label) . "</h2>\n<ul class=\"links\">";
        foreach ($lessons as $l) if ($l['section'] === $s) echo '<li><a href="' . h(school_path($l['id'])) . '">' . h($l['title']) . '</a><small>' . h($l['skill']) . '</small></li>';
        echo "</ul>\n";
    }
    echo '<h2><a href="' . h(school_path('spasenie')) . "\">Спасение: если блюдо пошло не так</a></h2>\n";
    echo '<p>Пересолили, не доварилось, тесто не поднялось, мясо жёсткое — что делать прямо сейчас, в 2–3 действия.</p>';
    echo '<div class="cta"><p>В приложении уроки — короткие карточки с вопросом в конце и отметкой «пройдено».</p><a class="btn" href="' . h(seo_path() . '#/learn') . "\">Открыть Школу</a></div>\n";
    echo seo_footer();
}

function school_rescue(array $groups): void {
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: public, max-age=3600');
    $title = 'Что делать, если пересолил, подгорело или не поднялось тесто';
    $desc = 'Как спасти блюдо: пересоленный суп, жёсткое мясо, рис не доварился, тесто не поднимается, соус не густеет, сырники расползаются — 2–3 простых действия.';
    $q = [];
    foreach ($groups as $g) foreach ($g['items'] as $t) $q[] = ['@type' => 'Question', 'name' => $g['title'] . ': ' . $t['title'] . ' — что делать?', 'acceptedAnswer' => ['@type' => 'Answer', 'text' => implode(' ', $t['steps'])]];
    echo seo_head(['title' => $title . ' | ' . SEO_SITE, 'description' => $desc, 'canonical' => seo_abs(school_path('spasenie')), 'ld' => [['@context' => 'https://schema.org', '@type' => 'FAQPage', 'mainEntity' => $q]]]);
    echo '<nav class="crumbs" aria-label="Навигация"><a href="' . h(school_path()) . "\">Школа готовки</a></nav>\n";
    echo '<h1>Как спасти блюдо</h1><p class="lead">' . h($desc) . "</p>\n";
    foreach ($groups as $g) {
        echo '<h2>' . h($g['title']) . "</h2>\n";
        foreach ($g['items'] as $t) {
            echo '<details class="quiz"><summary>' . h($t['title']) . '</summary><ol>';
            foreach ($t['steps'] as $s) echo '<li>' . h($s) . '</li>';
            echo "</ol></details>\n";
        }
    }
    echo '<div class="cta"><p>Во время готовки в приложении это же — под кнопкой «Помощь», для того блюда, которое вы готовите.</p><a class="btn" href="' . h(seo_path()) . "\">Открыть приложение</a></div>\n";
    echo seo_footer();
}

function school_sitemap(callable $url): void {
    $f = __DIR__ . '/data/school.json';
    $m = is_file($f) ? (int)filemtime($f) : time();
    $url(seo_abs(school_path()), $m);
    $url(seo_abs(school_path('spasenie')), $m);
    foreach ((school_data()['lessons'] ?? []) as $l) $url(seo_abs(school_path($l['id'])), $m);
}
