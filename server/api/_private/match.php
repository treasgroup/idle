<?php
// A small recipe matcher on the server, for pages, the Telegram bot and the Alice skill.
// It understands products ("курица, картошка"), time ("за 30 минут"), the kind of dish ("суп") and "без X".
// No AI and no paid services: words are compared with the names and aliases of catalog products.
// The app has a far richer parser in the browser; this one only has to be good enough for short requests.

// Broad words that mean a whole family of products.
const MATCH_GROUPS = [
    'chicken' => ['куриц', 'курин', 'курочк'],
    'meat' => ['мясо', 'мясн', 'мяса'],
    'fish' => ['рыба', 'рыбу', 'рыбо', 'рыбн', 'рыбы'],
    'seafood' => ['морепрод', 'кревет'],
    'mushrooms' => ['гриб'],
];
const MATCH_COURSES = [
    'soup' => '/(^|\s)(суп|супчик|борщ|щи|солянк|уха|похлебк|бульон|окрошк|рассольник)/u',
    'salad' => '/(^|\s)салат/u',
    'breakfast' => '/(^|\s)(завтрак|на утро|утром)/u',
    'baking' => '/(^|\s)(выпечк|пирог|пирож|испечь|печень[ея]|кекс|булоч)/u',
    'dessert' => '/(^|\s)(десерт|сладкое|сладенькое)/u',
];
const MATCH_STOP = ['что', 'приготовить', 'сделать', 'хочу', 'есть', 'дома', 'можно', 'из', 'с', 'со', 'и', 'без', 'на', 'за', 'минут', 'минуты', 'час', 'рецепт', 'рецепты', 'какой', 'какое', 'мне', 'нам', 'у', 'меня', 'нас', 'быстро', 'вкусное', 'вкусно', 'привет', 'пожалуйста', 'ужин', 'обед', 'остались', 'осталось', 'остался'];

function match_norm(string $s): string {
    $s = mb_strtolower($s, 'UTF-8');
    $s = str_replace('ё', 'е', $s);
    $s = preg_replace('/[^a-zа-я0-9\s-]+/u', ' ', $s);
    return trim(preg_replace('/\s+/u', ' ', $s));
}
// The beginning of a Russian word that survives its endings: "картошка" → "картош", "курицей" → "куриц".
// Words that are about the request, not about products.
const MATCH_NOT_PRODUCT = '/^(быстр|сладк|вкусн|прост|легк|сытн|горяч|домашн|полезн|ужин|обед|завтрак|перекус|дешев|бюджетн|остал|хоч|приготов|сдела|свар|пожар|испеч|запеч|поесть|покуш|кушат|нибудь|чего|сегодн|завтр|вечер|утр|семь|дет|гост|минут|час|рецеп|блюд|еда|еды|есть|нет|давай|можно|нужно|надо|пожалуйст)/u';
// Words in product names that say nothing about the product.
const MATCH_INDEX_SKIP = ['сырой', 'сырое', 'сырые', 'сырая', 'свежий', 'свежие', 'свежая', 'свежее', 'молотый', 'молотая', 'жира', 'без', 'для', 'или', 'из', 'на', 'по', 'очищенный', 'очищенная', 'вареный', 'вареная', 'вареные', 'готовый', 'готовая', 'жидкости', 'собственном', 'соку', 'кожи', 'кости', 'костей', 'филе'];

/** Two forms of one word: "курица"/"курицы", "лук"/"лука", but not "гречка"/"греческий" or "сыр"/"сырой". */
function match_same(string $a, string $b): bool {
    if ($a === $b) return true;
    $la = mb_strlen($a, 'UTF-8'); $lb = mb_strlen($b, 'UTF-8'); $min = min($la, $lb);
    if ($min < 3 || abs($la - $lb) > 3) return false;
    $need = max(3, $min <= 6 ? $min - 1 : $min - 2);
    $common = 0;
    while ($common < $min && mb_substr($a, $common, 1, 'UTF-8') === mb_substr($b, $common, 1, 'UTF-8')) $common++;
    if ($min === 3 && $common === 3) return $la + $lb <= 7 && !preg_match('/^(сыро|свеж)/u', $la > $lb ? $a : $b);
    return $common >= $need;
}
function match_stem(string $w): string {
    $len = mb_strlen($w, 'UTF-8');
    if ($len <= 4) return $w;
    return mb_substr($w, 0, max(4, $len - 2), 'UTF-8');
}

/** [ingredient id => [list of alias word lists]] for catalog products used in recipes. */
function match_index(): array {
    static $idx = null;
    if ($idx !== null) return $idx;
    $idx = [];
    $used = [];
    foreach (seo_recipes() as $r) foreach ($r['ingredients'] as $i) if (isset($i['id'])) $used[$i['id']] = true;
    foreach (catalog_ingredients() as $id => $ing) {
        if (!isset($used[$id]) || in_array($id, ['water', 'salt', 'black-pepper', 'sugar', 'vegetable-oil', 'sunflower-oil'], true)) continue;
        $names = array_merge([(string)$ing['name']], array_map('strval', (array)($ing['aliases'] ?? [])));
        foreach ($names as $n) {
            $words = array_values(array_filter(explode(' ', match_norm($n)), fn($w) => mb_strlen($w, 'UTF-8') >= 3 && !preg_match('/^\d/', $w) && !in_array($w, MATCH_INDEX_SKIP, true)));
            if ($words && count($words) <= 3) $idx[$id][] = $words;
        }
    }
    return $idx;
}

/** Ingredient ids that belong to a group (курица → all chicken parts). */
function match_group_ids(string $group): array {
    $out = [];
    foreach (catalog_ingredients() as $id => $ing) if (in_array($group, (array)($ing['groups'] ?? []), true)) $out[] = $id;
    return $out;
}

/** Reads a short request. Wanted and excluded products come as ['label' => word, 'ids' => [ingredient ids]]. */
function match_parse(string $text): array {
    $t = match_norm($text);
    $q = ['want' => [], 'without' => [], 'maxMinutes' => null, 'course' => null, 'text' => $t];
    if (preg_match('/(?:за|до|минут\s*на)\s*(\d{1,3})\s*мин/u', $t, $m)) $q['maxMinutes'] = (int)$m[1];
    elseif (preg_match('/(\d{1,3})\s*минут/u', $t, $m)) $q['maxMinutes'] = (int)$m[1];
    elseif (preg_match('/(полчаса)/u', $t)) $q['maxMinutes'] = 30;
    elseif (preg_match('/(за час|до часа)/u', $t)) $q['maxMinutes'] = 60;
    elseif (preg_match('/(быстр|по-быстрому|на скорую)/u', $t)) $q['maxMinutes'] = 30;
    foreach (MATCH_COURSES as $c => $re) if (preg_match($re, $t)) { $q['course'] = $c; break; }
    $words = explode(' ', $t);
    $neg = [];
    foreach ($words as $k => $w) $neg[$k] = $k > 0 && in_array($words[$k - 1], ['без', 'кроме', 'не'], true);
    $used = [];
    $add = function (int $k, string $label, array $ids) use (&$q, $neg, &$used) {
        $used[$k] = true;
        if ($ids) $q[$neg[$k] ? 'without' : 'want'][] = ['label' => $label, 'ids' => array_values(array_unique($ids))];
    };
    // 1. Exact product names and aliases, several words each ("куриное филе", "говяжий фарш").
    foreach (match_index() as $id => $variants) {
        foreach ($variants as $alias) {
            if (count($alias) < 2) continue;
            $at = [];
            foreach ($alias as $aw) {
                $found = null;
                foreach ($words as $k => $w) if (!isset($used[$k]) && match_same($w, $aw)) { $found = $k; break; }
                if ($found === null) { $at = []; break; }
                $at[] = $found;
            }
            if ($at) { foreach ($at as $k) $used[$k] = true; $add($at[0], implode(' ', array_map(fn($k) => $words[$k], $at)), [$id]); break; }
        }
    }
    // 2. Broad words: "курица", "рыба", "грибы".
    foreach ($words as $k => $w) {
        if (isset($used[$k])) continue;
        foreach (MATCH_GROUPS as $g => $prefixes) foreach ($prefixes as $p) if (strpos($w, $p) === 0) { $add($k, $w, match_group_ids($g)); continue 3; }
    }
    // 3. Any other word: every product whose name has a word with the same beginning ("фарш" → both kinds of mince).
    foreach ($words as $k => $w) {
        if (isset($used[$k]) || mb_strlen($w, 'UTF-8') < 3 || in_array($w, MATCH_STOP, true) || preg_match('/^\d/', $w) || preg_match(MATCH_NOT_PRODUCT, $w)) continue;
        $ids = [];
        foreach (match_index() as $id => $variants)
            foreach ($variants as $alias) foreach ($alias as $aw)
                if (match_same($w, $aw)) { $ids[] = $id; continue 3; }
        if ($ids && count($ids) <= 20) $add($k, $w, $ids);
    }
    return $q;
}

function match_has(array $r, array $want): bool {
    return (bool)array_intersect(array_column($r['ingredients'], 'id'), $want['ids']);
}

/** Recipes for a parsed request, best first: all wanted products, quicker, simpler, fewer products. */
function match_recipes(array $q, int $limit = 5, int $offset = 0): array {
    $out = [];
    foreach (seo_recipes() as $r) {
        if ($q['maxMinutes'] && (int)($r['totalMinutes'] ?? 0) > $q['maxMinutes']) continue;
        if ($q['course'] && $r['_course'] !== $q['course'] && !($q['course'] === 'dessert' && $r['_course'] === 'baking')) continue;
        foreach ($q['want'] as $w) if (!match_has($r, $w)) continue 2;
        foreach ($q['without'] as $w) if (match_has($r, $w)) continue 2;
        $score = -(int)($r['totalMinutes'] ?? 60) / 30 - count($r['ingredients']) / 6 + (($r['difficulty'] ?? '') === 'easy' ? 1 : 0);
        // "курица с картошкой" asked → "Курица с картошкой в духовке" first.
        $title = explode(' ', match_norm((string)$r['title']));
        foreach ($q['want'] as $w) foreach ($title as $tw) if (match_same($tw, $w['label']) || match_same(mb_substr($tw, 0, 5, 'UTF-8'), mb_substr($w['label'], 0, 5, 'UTF-8'))) { $score += 3; break; }
        $out[] = [$score, $r];
    }
    usort($out, fn($a, $b) => $b[0] <=> $a[0] ?: strcmp($a[1]['id'], $b[1]['id']));
    return array_map(fn($x) => $x[1], array_slice($out, $offset, $limit));
}

/** "курица, картошка" for a reply. */
function match_names(array $wants): string {
    return implode(', ', array_map(fn($w) => $w['label'], $wants));
}
