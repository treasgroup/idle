<?php
// «Стол в складчину» by a link: /stol/<token> (or stol.php?t=<token>). Messengers and VK read this page for the
// link's preview — «🔥 Шашлыки — сб, 7 ноября, 15:00 · Уже идут 4» instead of the site's own words — and a person
// is sent straight on to the table in the app (#party=…). The page is not for search engines.
declare(strict_types=1);
require __DIR__ . '/api/_private/lib.php';
require __DIR__ . '/api/_private/admin.php';
require __DIR__ . '/api/_private/parties.php';
require __DIR__ . '/api/_private/seo.php';

const STOL_EMOJI = ['dinner' => '🍽️', 'bbq' => '🔥', 'kids' => '🎈', 'newyear' => '🎄', 'match' => '⚽', 'birthday' => '🎂'];
const STOL_DAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const STOL_MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

seo_run(function () {
    $token = strtolower((string)($_GET['t'] ?? ''));
    $app = seo_path() . '#party=' . $token;
    $doc = null;
    if (party_hex32($token)) {
        parties_schema();
        try { $doc = json_decode((string)party_load($token)['doc'], true) ?: null; } catch (ApiError $e) { $doc = null; }
    }
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache');
    header('X-Robots-Tag: noindex');
    if (!$doc) {
        http_response_code(404);
        $title = 'Стол не найден';
        $desc = 'Возможно, организатор его удалил. Соберите свой — каждый принесёт своё.';
        $app = seo_path();
    } else {
        $when = '';
        $ts = strtotime(($doc['date'] ?? '') . ' 12:00');
        if ($ts) $when = STOL_DAYS[(int)date('w', $ts)] . ', ' . (int)date('j', $ts) . ' ' . STOL_MONTHS[(int)date('n', $ts) - 1] . (!empty($doc['time']) ? ', ' . $doc['time'] : '');
        $title = (STOL_EMOJI[$doc['format'] ?? ''] ?? '🍽️') . ' ' . ($doc['title'] ?? 'Стол в складчину') . ($when ? ' — ' . $when : '');
        $going = 0;
        foreach ($doc['guests'] ?? [] as $g) if (($g['status'] ?? '') === 'yes') $going += 1 + (int)($g['plus'] ?? 0);
        $free = count(array_filter($doc['dishes'] ?? [], fn($d) => empty($d['by'])));
        $bits = [];
        if (!empty($doc['place'])) $bits[] = $doc['place'] . '.';
        $bits[] = 'Отметьтесь, придёте ли, и возьмите блюдо' . ($free ? ' — свободно ' . $free . ' ' . seo_plural($free, 'блюдо', 'блюда', 'блюд') : '') . '.';
        if ($going) $bits[] = 'Уже идут: ' . $going . ' ' . seo_plural($going, 'человек', 'человека', 'человек') . '.';
        $desc = implode(' ', $bits);
    }
    $head = seo_head(['title' => $title, 'description' => $desc, 'canonical' => seo_abs(seo_path() . (seo_pretty() ? 'stol/' : 'stol.php?t=') . $token)]);
    // Straight on to the app; the link is there too, for a browser that does not follow the refresh.
    echo str_replace('</head>', '<meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=' . h($app) . "\">\n</head>", $head);
    echo '<h1>' . h($title) . '</h1><p>' . h($desc) . '</p><p><a class="pill" href="' . h($app) . '">Открыть стол</a></p>' . seo_footer();
});
