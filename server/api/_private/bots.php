<?php
// Shared by the Telegram bot and the Alice skill: search replies and recipe text, built on match.php.

/** Searches; remembers the request so "ещё" can continue it. Returns [recipes, query]. */
function bot_search(string $text, int $offset = 0, int $limit = 5): array {
    $q = match_parse($text);
    // «борщ», «плов», «сырники», «оливье» are dishes, not products: the matcher skipped them and Alice offered a
    // milkshake. A word that is a dish's name (the title's first word or a word in «…») picks those dishes; the
    // products said with it («борщ с говядиной») and the time put the closest first.
    $dish = bot_dishes($q);
    // «что-нибудь из фарша»: one title starts with «Фарш», many dishes have mince — then by the product.
    if ($dish && (count($dish) >= 3 || !$q['want'] || !match_recipes($q, 3))) {
        $q['dish'] = true;
        return [array_slice($dish, $offset, $limit), $q];
    }
    $list = match_recipes($q, $limit, $offset);
    if (!$list && $offset === 0 && ($q['maxMinutes'] || $q['course'])) {
        // Nothing with every condition: keep the products, drop time and kind of dish.
        $q2 = $q; $q2['maxMinutes'] = null; $q2['course'] = null;
        $list = match_recipes($q2, $limit);
        if ($list) $q['relaxed'] = true;
    }
    if (!$q['want'] && !$q['course'] && !$q['maxMinutes'] && $offset === 0) $q['vague'] = true;
    // «что приготовить на ужин»: nothing to search by gave the quickest of all — a milkshake and cocoa. A meal: the
    // easy mains and soups (porridge and eggs in the morning), a different few each day.
    if (!$q['want'] && !$q['course']) {
        $breakfast = preg_match('/завтрак|утр/u', $q['text']);
        $pool = array_values(array_filter(seo_recipes(), fn($r) => in_array($r['_course'], $breakfast ? ['breakfast'] : ['main', 'soup'], true)
            && (int)($r['totalMinutes'] ?? 999) <= ($q['maxMinutes'] ?: 60)));
        usort($pool, fn($a, $b) => crc32($a['id'] . date('Y-m-d')) <=> crc32($b['id'] . date('Y-m-d')));
        if ($pool) $list = array_slice($pool, $offset, $limit);
    }
    return [$list, $q];
}

/** One dish word in two forms («котлеты»/«котлет», «плов»/«плова»), stricter than products: «сыра» is not «сырники». */
function bot_same_dish(string $a, string $b): bool {
    if ($a === $b) return true;
    $la = mb_strlen($a, 'UTF-8'); $lb = mb_strlen($b, 'UTF-8'); $min = min($la, $lb);
    if ($min < 4 || abs($la - $lb) > 2) return false;
    $common = 0;
    while ($common < $min && mb_substr($a, $common, 1, 'UTF-8') === mb_substr($b, $common, 1, 'UTF-8')) $common++;
    return $common >= max(4, $min - 1);
}

/** The dishes a word of the request names, best first; [] when no word is a dish's name. */
function bot_dishes(array $q, bool $withProducts = false): array {
    // Not the products said first («борщ с говядиной»: the dish is «борщ», «говядиной» only puts beef ones first);
    // then with them — «плов», «пельмени» are products too.
    $products = array_merge(array_column($q['want'], 'label'), array_column($q['without'], 'label'));
    $all = array_values(array_filter(explode(' ', $q['text']), fn($w) => mb_strlen($w, 'UTF-8') >= 3 && !in_array($w, MATCH_STOP, true)
        && !preg_match(MATCH_NOT_PRODUCT, $w) && !preg_match('/^\d/', $w)));
    $words = $withProducts ? $all : array_values(array_filter($all, fn($w) => !in_array($w, $products, true)));
    if (!$words) return $withProducts ? [] : bot_dishes($q, true);
    $scored = [];
    foreach (seo_recipes() as $r) {
        $title = match_norm((string)$r['title']);
        $names = [explode(' ', $title)[0]];
        if (preg_match_all('/«([^»]+)»/u', mb_strtolower((string)$r['title'], 'UTF-8'), $m)) foreach ($m[1] as $x) $names = array_merge($names, explode(' ', match_norm($x)));
        $hit = null;
        foreach ($words as $w) foreach ($names as $n) if (bot_same_dish($w, $n)) { $hit = $w; break 2; }
        if ($hit === null) continue;
        $s = 10;
        // The other products said must be there when the dish word is itself a product («фарш и рис» is not plain rice).
        foreach ($q['want'] as $w) { if ($w['label'] === $hit) continue; if (match_has($r, $w)) $s += 3; elseif ($withProducts) continue 2; }
        foreach ($q['without'] as $w) if (match_has($r, $w)) continue 2;
        // Every word of the request in the title («Борщ с говядиной» for «борщ с говядиной»).
        foreach (explode(' ', $title) as $tw) foreach ($all as $w) if (mb_strlen($tw, 'UTF-8') >= 4 && match_same($tw, $w)) $s += 2;
        if ($q['maxMinutes'] && (int)($r['totalMinutes'] ?? 0) > $q['maxMinutes']) $s -= 4;
        if (($r['difficulty'] ?? '') === 'easy') $s += 0.5;
        $scored[] = [$s - (int)($r['totalMinutes'] ?? 60) / 600, $r];
    }
    if (!$scored) return $withProducts ? [] : bot_dishes($q, true);
    usort($scored, fn($a, $b) => $b[0] <=> $a[0] ?: strcmp($a[1]['id'], $b[1]['id']));
    return array_map(fn($x) => $x[1], $scored);
}

/** One line per recipe for a list. */
function bot_line(array $r): string {
    return $r['title'] . ' — ' . seo_minutes((int)($r['totalMinutes'] ?? 0));
}

/** "Нашёл с курицей и картошкой:" */
function bot_intro(array $q, int $count): string {
    if ($count && !empty($q['dish'])) return 'Вот что нашёл:';
    if (!$count) return $q['want'] ? 'По запросу «' . match_names($q['want']) . '» пока ничего не нашёл. Попробуйте назвать продукты по-другому или убрать один.' : 'Не понял, что приготовить. Назовите продукты, которые есть дома: например, «курица, картошка».';
    $parts = [];
    if ($q['want']) $parts[] = match_names($q['want']);
    if ($q['without']) $parts[] = 'без: ' . match_names($q['without']);
    if ($q['maxMinutes'] && empty($q['relaxed'])) $parts[] = 'до ' . $q['maxMinutes'] . ' минут';
    $intro = $parts ? 'Вот что подходит (' . implode('; ', $parts) . '):' : 'Вот идеи:';
    if (!empty($q['relaxed'])) $intro .= ' С учётом времени и вида блюда ничего нет — показываю без этих условий.';
    return $intro;
}

/** «Говядина», «Сметана», not «Сырая говядина без кости для варки» — the site's short names (core.js `We`). */
function bot_short(string $id, string $fallback): string {
    $ing = catalog_ingredients()[$id] ?? null;
    $cap = fn(string $s) => mb_strtoupper(mb_substr($s, 0, 1, 'UTF-8'), 'UTF-8') . mb_substr($s, 1, null, 'UTF-8');
    if ($ing) foreach ((array)($ing['aliases'] ?? []) as $al) if (count(explode(' ', (string)$al)) <= 2 && mb_strlen((string)$al, 'UTF-8') <= 18) return $cap((string)$al);
    $n = (string)($ing['name'] ?? $fallback);
    $n = preg_replace('/^((сыр|свеж|очищенн|охлажденн|охлаждённ|нечищенн)(ой|ый|ая|ое|ые|ого)\s+)+/iu', '', trim(explode(',', $n)[0]));
    $n = preg_replace('/\s*\d+([,.]\d+)?(\s*[–—-]\s*\d+([,.]\d+)?)?\s*%/u', '', $n);
    $n = trim(preg_split('/ \(| с | без | для /u', $n)[0]);
    return $n !== '' ? $cap($n) : $fallback;
}

/** Ingredients for the recipe's own number of servings. */
function bot_ingredients(array $r): array {
    $out = [];
    foreach ($r['ingredients'] as $i) {
        if (($i['id'] ?? '') === 'water') continue;
        $out[] = bot_short((string)($i['id'] ?? ''), trim((string)$i['name'])) . ' — ' . seo_amount($i['amount'] ?? 0) . ' ' . trim((string)($i['unit'] ?? '')) . (!empty($i['optional']) ? ' (по желанию)' : '');
    }
    return $out;
}

// «Отложите одну двадцатую воды», «смешайте 11/13 муки»: the recipes say shares because amounts change with the
// portions. Said aloud, the share becomes the amount (as the site does, app/stepAmounts.ts): «55 мл воды».
const BOT_NUM = ['одну' => 1, 'одна' => 1, 'одной' => 1, 'две' => 2, 'двух' => 2, 'двумя' => 2, 'три' => 3, 'трех' => 3, 'тремя' => 3, 'четыре' => 4, 'четырех' => 4, 'четырьмя' => 4, 'пять' => 5, 'пяти' => 5, 'пятью' => 5, 'шесть' => 6, 'шести' => 6, 'семь' => 7, 'семи' => 7, 'восемь' => 8, 'восьми' => 8, 'девять' => 9, 'девяти' => 9, 'десять' => 10, 'десяти' => 10];
const BOT_DEN = ['одиннадцат' => 11, 'двенадцат' => 12, 'тринадцат' => 13, 'четырнадцат' => 14, 'пятнадцат' => 15, 'шестнадцат' => 16, 'семнадцат' => 17, 'восемнадцат' => 18, 'девятнадцат' => 19, 'двадцат' => 20, 'тридцат' => 30, 'сороков' => 40, 'пятидесят' => 50, 'десят' => 10, 'девят' => 9, 'восьм' => 8, 'седьм' => 7, 'шест' => 6, 'пят' => 5, 'четверт' => 4, 'трет' => 3];

function bot_amount_words(float $a, string $unit): string {
    if ($unit === 'г' || $unit === 'мл') {
        if ($a >= 1000) return str_replace('.', ',', (string)(round($a / 100) / 10)) . ($unit === 'г' ? ' кг' : ' л');
        $n = $a >= 30 ? round($a / 5) * 5 : ($a >= 3 ? round($a) : round($a * 2) / 2);
        return str_replace('.', ',', (string)$n) . ' ' . $unit;
    }
    return seo_amount(round($a * 2) / 2) . ' ' . $unit;
}
/** The recipe line the words after a share name («муки», «растительного масла»), or null. */
function bot_line_for(array $r, string $words): ?array {
    foreach (explode(' ', match_norm($words)) as $w) {
        if (mb_strlen($w, 'UTF-8') < 3 || preg_match('/^(всей|всего|всех|всю|весь|оставш|остальн)/u', $w)) continue;
        $stem = mb_substr($w, 0, max(3, min(4, mb_strlen($w, 'UTF-8') - 1)), 'UTF-8');
        $hits = array_values(array_filter($r['ingredients'], fn($i) => (float)($i['amount'] ?? 0) > 0 && mb_strpos(match_norm(bot_short((string)($i['id'] ?? ''), (string)$i['name']) . ' ' . $i['name']), $stem) !== false));
        if (count($hits) === 1) return $hits[0];
        if (count($hits) > 1) return null; // «масла» with both butter and oil: left as written
    }
    return null;
}
function bot_step_amounts(string $text, array $r): string {
    $last = null;
    // In figures: «11/13 муки», «остальные 13/113 сохраните».
    $text = preg_replace_callback('/(?<![\d,×\/\p{L}])((?:(?:остальн|оставш)\p{L}*\s+)?)(\d{1,3})\/(\d{1,3})(?![\d\/×])((?:\s+[\p{L}-]+){1,3})/u', function ($m) use ($r, &$last) {
        [$all, $rest, $a, $b, $tail] = $m;
        if (!((int)$a > 0 && (int)$b > (int)$a)) return $all;
        $line = bot_line_for($r, $tail) ?? ($rest !== '' ? $last : null);
        if (!$line) return $all;
        $last = $line;
        return $rest . bot_amount_words((float)$line['amount'] * (int)$a / (int)$b, (string)$line['unit']) . $tail;
    }, $text);
    // In words: «одну двадцатую воды», «двумя третями масла», «четверть сахара».
    $nums = implode('|', array_keys(BOT_NUM));
    $dens = implode('|', array_keys(BOT_DEN));
    return preg_replace_callback('/(?<!\p{L})((?:(?:остальн|оставш)\p{L}*\s+)?)(?:(' . $nums . ')\s+)?((?:двадцат\p{L}*\s+)?)(' . $dens . ')(\p{L}*)((?:\s+част\p{L}*)?)((?:\s+[\p{L}-]+){1,3})/iu', function ($m) use ($r) {
        [$all, $rest, $num, $twenty, $den, $end, $part, $tail] = $m;
        $d = BOT_DEN[mb_strtolower($den, 'UTF-8')] ?? 0;
        if ($twenty !== '') { $d = 20 + ($d < 10 ? $d : 0); if ($d === 20) return $all; }
        // «треть», «четверть» without a number are one part; an ordinal needs a number («одну пятую»).
        $n = $num !== '' ? (BOT_NUM[mb_strtolower($num, 'UTF-8')] ?? 0) : (preg_match('/^(ь|ью|и)$/u', $end) && ($d === 3 || $d === 4) ? 1 : ($part !== '' ? 1 : 0));
        if (!$n || !$d || $n >= $d) return $all;
        $line = bot_line_for($r, $tail);
        if (!$line) return $all;
        return $rest . bot_amount_words((float)$line['amount'] * $n / $d, (string)$line['unit']) . $tail;
    }, $text);
}

function bot_recipe_by_id(string $id): ?array { return seo_recipes()[$id] ?? null; }

/** A random easy, not too long recipe for "удиви меня". */
function bot_random(): ?array {
    $pool = array_values(array_filter(seo_recipes(), fn($r) => (int)($r['totalMinutes'] ?? 999) <= 60 && in_array($r['_course'], ['main', 'soup', 'salad', 'breakfast'], true)));
    return $pool ? $pool[random_int(0, count($pool) - 1)] : null;
}

// «Что-нибудь из фарша», «что-нибудь быстрое» say what: only a request with nothing else is «удиви меня».
function bot_is_surprise(string $t): bool {
    if (!preg_match('/(удиви|что-нибудь|что нибудь|чтонибудь|любое|случайн|рандом|не знаю что|наугад)/u', match_norm($t))) return false;
    $q = match_parse($t);
    return !$q['want'] && !$q['without'] && !$q['maxMinutes'] && !$q['course'] && !bot_dishes($q);
}

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
