<?php
// Shared by the Telegram bot and the Alice skill: search replies and recipe text, built on match.php.

/** Searches; remembers the request so "ещё" can continue it. Returns [recipes, query]. */
function bot_search(string $text, int $offset = 0, int $limit = 5): array {
    $q = match_parse($text);
    $list = match_recipes($q, $limit, $offset);
    if (!$list && $offset === 0 && ($q['maxMinutes'] || $q['course'])) {
        // Nothing with every condition: keep the products, drop time and kind of dish.
        $q2 = $q; $q2['maxMinutes'] = null; $q2['course'] = null;
        $list = match_recipes($q2, $limit);
        if ($list) $q['relaxed'] = true;
    }
    if (!$q['want'] && !$q['course'] && !$q['maxMinutes'] && $offset === 0) $q['vague'] = true;
    return [$list, $q];
}

/** One line per recipe for a list. */
function bot_line(array $r): string {
    return $r['title'] . ' — ' . seo_minutes((int)($r['totalMinutes'] ?? 0));
}

/** "Нашёл с курицей и картошкой:" */
function bot_intro(array $q, int $count): string {
    if (!$count) return $q['want'] ? 'По запросу «' . match_names($q['want']) . '» пока ничего не нашёл. Попробуйте назвать продукты по-другому или убрать один.' : 'Не понял, что приготовить. Назовите продукты, которые есть дома: например, «курица, картошка».';
    $parts = [];
    if ($q['want']) $parts[] = match_names($q['want']);
    if ($q['without']) $parts[] = 'без: ' . match_names($q['without']);
    if ($q['maxMinutes'] && empty($q['relaxed'])) $parts[] = 'до ' . $q['maxMinutes'] . ' минут';
    $intro = $parts ? 'Вот что подходит (' . implode('; ', $parts) . '):' : 'Вот идеи:';
    if (!empty($q['relaxed'])) $intro .= ' С учётом времени и вида блюда ничего нет — показываю без этих условий.';
    return $intro;
}

/** Ingredients for the recipe's own number of servings. */
function bot_ingredients(array $r): array {
    $out = [];
    foreach ($r['ingredients'] as $i) {
        if (($i['id'] ?? '') === 'water') continue;
        $out[] = trim((string)$i['name']) . ' — ' . seo_amount($i['amount'] ?? 0) . ' ' . trim((string)($i['unit'] ?? '')) . (!empty($i['optional']) ? ' (по желанию)' : '');
    }
    return $out;
}

function bot_recipe_by_id(string $id): ?array { return seo_recipes()[$id] ?? null; }

/** A random easy, not too long recipe for "удиви меня". */
function bot_random(): ?array {
    $pool = array_values(array_filter(seo_recipes(), fn($r) => (int)($r['totalMinutes'] ?? 999) <= 60 && in_array($r['_course'], ['main', 'soup', 'salad', 'breakfast'], true)));
    return $pool ? $pool[random_int(0, count($pool) - 1)] : null;
}

function bot_is_surprise(string $t): bool { return (bool)preg_match('/(удиви|что-нибудь|что нибудь|чтонибудь|любое|случайн|рандом|не знаю что|наугад)/u', match_norm($t)); }

function bot_post_json(string $url, array $body, int $timeout = 8): ?array {
    if (!function_exists('curl_init')) return null;
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => $timeout, CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE)]);
    $res = curl_exec($ch);
    curl_close($ch);
    $j = is_string($res) ? json_decode($res, true) : null;
    return is_array($j) ? $j : null;
}
