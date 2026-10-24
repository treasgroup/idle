<?php
// Alice skill (Яндекс Диалоги): "Алиса, попроси Что приготовить подобрать ужин из курицы и картошки".
// Finds recipes, reads the ingredients and then the steps one by one: "дальше", "назад", "повтори".
// Free: Yandex Dialogs + the site's own matcher (no AI). Webhook: ваш-сайт/bot/alice.php
declare(strict_types=1);
require __DIR__ . '/../api/_private/lib.php';
require __DIR__ . '/../api/_private/admin.php';
require __DIR__ . '/../api/_private/accounts.php';
require __DIR__ . '/../api/_private/reviews.php';
require __DIR__ . '/../api/_private/seo.php';
require __DIR__ . '/../api/_private/match.php';
require __DIR__ . '/../api/_private/bots.php';
require __DIR__ . '/../api/_private/alice_home.php';

@ini_set('display_errors', '0');
$_SERVER['SCRIPT_NAME'] = dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/bot/alice.php')) . '/index.php';
header('Content-Type: application/json; charset=utf-8');
$req = json_decode((string)file_get_contents('php://input', false, null, 0, 64000), true);
if (!is_array($req) || !isset($req['request'], $req['session'])) { http_response_code(400); echo '{}'; exit; }
$skill = (string)(config()['alice']['skill_id'] ?? '');
if ($skill !== '' && ($req['session']['skill_id'] ?? '') !== $skill) { http_response_code(403); echo '{}'; exit; }

$state = is_array($req['state']['session'] ?? null) ? $req['state']['session'] : [];
$cmd = match_norm((string)($req['request']['command'] ?? ''));
$orig = (string)($req['request']['original_utterance'] ?? '');

// The recipe and step being cooked, kept on this speaker or phone between sessions («Хранилище» on in the console):
// inside a skill Alice's own timer does not work, so the person says «хватит», sets Alice's timer, calls the skill again
// and goes on from the same step. null — leave as it is; [] — clear.
$APP = null;

/** Sends the answer: text on screen, the same text for speech (Alice limit: 1024 characters each). */
function say(string $text, array $state = [], array $buttons = [], bool $end = false, ?string $tts = null): void {
    global $APP;
    $cut = fn($s) => mb_strlen($s, 'UTF-8') > 1000 ? mb_substr($s, 0, 997, 'UTF-8') . '…' : $s;
    // An empty state is an object for Yandex («{}»): PHP's empty array went out as «[]» — «Недопустимый тип поля: session_state».
    $out = ['version' => '1.0', 'session_state' => $state ?: new stdClass(), 'response' => [
        'text' => $cut($text), 'tts' => $cut(str_replace(['«', '»', '•'], '', $tts ?? $text)), 'end_session' => $end,
        'buttons' => array_map(fn($b) => is_array($b) ? $b : ['title' => $b, 'hide' => true], array_slice($buttons, 0, 6)),
    ]];
    if ($APP !== null) $out['application_state'] = $APP ?: new stdClass();
    echo json_encode($out, JSON_UNESCAPED_UNICODE);
    exit;
}
function alice_count(string $type, string $text = '', ?string $recipe = null): void {
    try { db()->prepare('INSERT INTO events (ts, day, visitor, type, recipe_id, text, norm, value, source, ref) VALUES (?,?,?,?,?,?,?,?,?,?)')
        ->execute([now_ms(), date('Y-m-d'), 'alice', $type, $recipe, mb_substr($text, 0, 300), mb_substr(match_norm($text), 0, 300), 1, 'voice', 'alice']); } catch (Throwable $e) {}
}
function step_text(array $r, int $n): string {
    $steps = array_values($r['steps']);
    $s = $steps[$n] ?? null;
    if (!$s) return '';
    // «одну двадцатую воды» said as «55 мл воды» (bots.php).
    $t = 'Шаг ' . ($n + 1) . ' из ' . count($steps) . '. ' . bot_step_amounts(trim((string)$s['text']), $r);
    // Alice's timer does not work while the skill is open: say how to set it and come back to this step.
    if (!empty($s['timerSeconds'])) {
        $m = max(1, (int)round($s['timerSeconds'] / 60));
        $t .= ' Это займёт около ' . $m . ' ' . seo_plural($m, 'минуты', 'минут', 'минут') . '. Для таймера скажите «хватит» и попросите Алису поставить таймер на ' . $m . ' ' . seo_plural($m, 'минуту', 'минуты', 'минут') . ', а потом позовите меня снова — продолжу с этого шага.';
    }
    return $t;
}
function offer(array $list, array $q): void {
    if (!$list) say(bot_intro($q, 0), [], ['Удиви меня', 'Курица и картошка', 'Что-нибудь быстрое']);
    $titles = array_map(fn($r) => $r['title'], $list);
    $spoken = [];
    foreach ($titles as $k => $t) $spoken[] = ['первое', 'второе', 'третье'][$k] . ' — ' . $t;
    say(bot_intro($q, count($list)) . "\n" . implode("\n", array_map(fn($k, $t) => ($k + 1) . '. ' . $t, array_keys($titles), $titles)) . "\nКакое выберете?",
        ['list' => array_map(fn($r) => $r['id'], $list), 'q' => $q['text']],
        array_merge(array_map(fn($t) => mb_substr($t, 0, 64, 'UTF-8'), $titles), ['Другие варианты']),
        false, bot_intro($q, count($list)) . ' ' . implode('. ', $spoken) . '. Какое выберете?');
}
function choose(array $r): void {
    alice_count('open', '', $r['id']);
    $ing = bot_ingredients($r);
    say('«' . $r['title'] . '» — ' . seo_minutes((int)$r['totalMinutes']) . ', ' . (int)$r['servings'] . ' ' . seo_plural((int)$r['servings'], 'порция', 'порции', 'порций') . ".\nПонадобится: " . implode('; ', $ing) . ".\nСкажите «начать», и я поведу по шагам.",
        ['rid' => $r['id'], 'step' => -1], ['Начать', 'Повтори продукты', ['title' => 'Открыть рецепт', 'url' => seo_abs(seo_app_path($r['id'])), 'hide' => false]],
        false, '«' . $r['title'] . '». ' . seo_minutes((int)$r['totalMinutes']) . '. Понадобится: ' . implode(', ', array_map(fn($l) => preg_replace('/ — .*$/u', '', $l), $ing)) . '. Скажите «начать», и я поведу по шагам. Или «повтори продукты» — назову с количеством.');
}

try {
    if ($orig === 'ping') say('pong');
    $hello = fn() => say('Привет! Скажите, что есть дома, — подберу рецепт и проведу по шагам. Например: «курица и картошка» или «суп за 30 минут».', [], ['Курица и картошка', 'Удиви меня', 'Суп за 30 минут']);
    if (!empty($req['session']['new']) && $cmd === '') {
        alice_count('visit', 'alice');
        // Back after setting Alice's timer (within 12 hours): go on from the same step.
        $was = is_array($req['state']['application'] ?? null) ? $req['state']['application'] : [];
        $back = isset($was['rid'], $was['step']) && (time() - (int)($was['at'] ?? 0)) < 12 * 3600 ? bot_recipe_by_id((string)$was['rid']) : null;
        if ($back) say('С возвращением! Продолжим «' . $back['title'] . '» — шаг ' . ((int)$was['step'] + 1) . '?', ['rid' => $back['id'], 'step' => (int)$was['step'], 'resume' => true], ['Продолжить', 'Другое блюдо']);
        $hello();
    }
    if (!empty($state['resume'])) {
        $back = isset($state['rid']) ? bot_recipe_by_id((string)$state['rid']) : null;
        if ($back && preg_match('/(продолж|^да\b|давай|поехали|дальше)/u', $cmd)) { $state['resume'] = false; $APP = ['rid' => $back['id'], 'step' => (int)$state['step'], 'at' => time()]; say(step_text($back, (int)$state['step']), ['rid' => $back['id'], 'step' => (int)$state['step']], ['Дальше', 'Повтори', 'Назад']); }
        if (preg_match('/(друг|нов|не надо|^нет\b)/u', $cmd)) { $APP = []; $hello(); }
        $state = [];
    }
    if (preg_match('/^(хватит|стоп|выход|закончить|спасибо все|все спасибо|пока)/u', $cmd)) {
        // In the middle of a recipe: the step is kept for the timer and the way back.
        $mid = isset($state['rid'], $state['step']) && (int)$state['step'] >= 0 ? bot_recipe_by_id((string)$state['rid']) : null;
        $name = trim((string)(config()['alice']['name'] ?? ''));
        if ($mid) say('Хорошо. Когда будете готовы, ' . ($name !== '' ? 'скажите «Алиса, запусти навык ' . $name . '»' : 'позовите меня снова') . ' — продолжу с шага ' . ((int)$state['step'] + 1) . '.', [], [], true);
        say('Приятного аппетита! Возвращайтесь, когда снова встанет вопрос «что приготовить».', [], [], true);
    }
    if (preg_match('/(помощь|что ты умеешь|что умеешь)/u', $cmd))
        say('Назовите продукты — например, «фарш и рис без лука» или «быстрый ужин с рыбой». Я предложу три блюда. Выберите одно, и я назову продукты, а потом поведу по шагам: говорите «дальше», «назад» или «повтори». А если назвать код из профиля на сайте, буду знать ваш план и список покупок.', $state, ['Удиви меня']);

    // ---------- «Шеф в Алисе»: the family's plan and shopping list (api/_private/alice_home.php) ----------
    $device = alice_device($req);
    $home = alice_household($device);
    // «Запомни код 4821», «мой код четыре восемь два один».
    if (preg_match('/(?:^|\s)код(?:\s|$)|запомни/u', $cmd)) {
        $spoken = ['ноль' => 0, 'нуль' => 0, 'один' => 1, 'одна' => 1, 'два' => 2, 'две' => 2, 'три' => 3, 'четыре' => 4, 'пять' => 5, 'шесть' => 6, 'семь' => 7, 'восемь' => 8, 'девять' => 9];
        $digits = preg_replace_callback('/(?<![а-я])(' . implode('|', array_keys($spoken)) . ')(?![а-я])/u', fn($m) => (string)$spoken[$m[1]], $cmd);
        $digits = preg_replace('/\D+/', '', $digits);
        if (strlen($digits) === 4) say(alice_link($device, $digits), [], ['Что на ужин?', 'Что купить?']);
        if (preg_match('/запомни|мой код|код семьи/u', $cmd)) say('Назовите четыре цифры кода из профиля на сайте: «Профиль» → «Шеф в Алисе». Например: «запомни код 4821».', $state);
    }
    if (preg_match('/(забудь|отключи|отвяжи)\S*\s+(код|меня|семью|список|план)/u', $cmd)) {
        alice_unlink($device);
        say('Хорошо, на этом устройстве ваш план и список покупок больше не видны.', [], ['Удиви меня']);
    }
    $need = fn() => say('Чтобы я видел ваш план и список покупок, откройте на сайте «Профиль» → «Шеф в Алисе» и скажите: «запомни код» и четыре цифры оттуда.', $state, ['Удиви меня']);
    // «Что на ужин?», «что сегодня готовим», «что по плану на завтра» — not «что приготовить на ужин» (a search).
    $askPlan = !preg_match('/приготов|сготов/u', $cmd) && preg_match('/^(а\s+)?что\s+(у нас\s+|сегодня\s+|завтра\s+|по плану\s+)*(на\s+(ужин|обед|завтрак)|по плану|сегодня|завтра|готовим|едим)/u', $cmd);
    if ($askPlan) {
        if (!$home) $need();
        [, $doc] = alice_doc($home);
        $tomorrow = preg_match('/завтра/u', $cmd) ? 1 : 0;
        $meal = preg_match('/завтрак/u', $cmd) ? 'breakfast' : (preg_match('/обед/u', $cmd) ? 'lunch' : (preg_match('/ужин/u', $cmd) ? 'dinner' : null));
        $items = array_values(array_filter(alice_plan($doc, $tomorrow), fn($x) => !$meal || $x[1] === $meal));
        $when = $tomorrow ? 'завтра' : 'сегодня';
        if (!$items) say('На ' . $when . ($meal ? ' на ' . ['breakfast' => 'завтрак', 'lunch' => 'обед', 'dinner' => 'ужин'][$meal] : '') . ' в плане пусто. Подобрать что-нибудь? Назовите продукты или скажите «удиви меня».', [], ['Удиви меня', 'Что купить?']);
        $words = array_map(fn($x) => $x[0]['title'] . ($x[2] ? ' (вчерашнее, разогреть)' : ''), $items);
        $cook = array_values(array_filter($items, fn($x) => !$x[2]));
        $first = $cook[0][0] ?? null;
        // One dish: «По плану сегодня — Борщ с говядиной. Начнём готовить?»; several: which one is asked.
        $start = $first ? (count($items) === 1 ? ' Начнём готовить?' : ' Начнём с «' . $first['title'] . '»?') : '';
        say('По плану ' . $when . ' — ' . alice_list_words($words) . '.' . $start,
            $first ? ['plan' => $first['id']] : [], $first ? ['Начнём', 'Что купить?'] : ['Что купить?']);
    }
    if (!empty($state['plan']) && preg_match('/^(да|давай|начн|начина|готов|поехали|хочу)/u', $cmd)) { $p = bot_recipe_by_id((string)$state['plan']); if ($p) choose($p); }
    // «Что купить?», «что в списке», «вычеркни молоко», «добавь хлеб», «купил яйца и добавь сметану».
    $readList = preg_match('/(что|чего)\s+(нужно\s+|надо\s+)?(купить|докупить)|список покупок|что в списке|прочитай список|какие покупки/u', $cmd);
    $edits = preg_split('/\s+и\s+(?=(?:добавь|допиши|запиши|внеси|вычеркни|отметь|удали|убери|купил))/u', $cmd);
    $isEdit = (bool)preg_match('/^(добавь|допиши|запиши|внеси|вычеркни|отметь|удали из списка|убери из списка|купил|купила|купили)\s/u', $cmd);
    if ($readList || $isEdit) {
        if (!$home) $need();
        if ($isEdit) {
            $done = []; $added = []; $missed = [];
            for ($try = 0; $try < 3; $try++) {
                [$version, $doc] = alice_doc($home);
                $list = (array)($doc['shopping'] ?? []); $done = []; $added = []; $missed = [];
                foreach ($edits as $e) {
                    if (preg_match('/^(?:вычеркни|отметь|удали из списка|убери из списка|купил|купила|купили)\s+(.+)$/u', $e, $m)) {
                        $rows = alice_find_rows(['shopping' => $list], preg_replace('/\s+(из списка|в списке|как купленн\S*)$/u', '', $m[1]));
                        if (!$rows) $missed[] = $m[1];
                        foreach ($rows as $k => $name) { $list[$k]['checked'] = true; $done[] = mb_strtolower($name, 'UTF-8'); }
                    } elseif (preg_match('/^(?:добавь|допиши|запиши|внеси)\s+(.+?)(?:\s+в\s+(?:список|покупки).*)?$/u', $e, $m)) {
                        foreach (array_filter(preg_split('/\s+и\s+|,\s*/u', $m[1])) as $w) { $row = alice_new_row(trim($w)); $list[] = $row; $added[] = mb_strtolower($row['name'], 'UTF-8'); }
                    }
                }
                if (!$done && !$added) break;
                $doc['shopping'] = array_values($list);
                if (alice_doc_save($home, $version, $doc)) break;
            }
            $parts = [];
            if ($done) $parts[] = 'Отметил как купленное: ' . alice_list_words($done) . '.';
            if ($added) $parts[] = 'Добавил в список: ' . alice_list_words($added) . '.';
            if ($missed) $parts[] = 'В списке нет: ' . alice_list_words($missed) . '.';
            [, $doc] = alice_doc($home);
            $left = count(alice_to_buy($doc));
            say(implode(' ', $parts) . ' ' . ($left ? 'Осталось купить: ' . $left . ' ' . seo_plural($left, 'продукт', 'продукта', 'продуктов') . '.' : 'Всё куплено!'), [], ['Что купить?']);
        }
        [, $doc] = alice_doc($home);
        $names = array_map(fn($x) => $x[1], alice_to_buy($doc));
        if (!$names) say('Список покупок пуст. Можно сказать: «добавь молоко и хлеб».', [], ['Что на ужин?']);
        $n = count($names);
        say('В списке ' . $n . ' ' . seo_plural($n, 'продукт', 'продукта', 'продуктов') . ': ' . alice_list_words(array_map(fn($s) => mb_strtolower($s, 'UTF-8'), array_slice($names, 0, 25))) . ($n > 25 ? ' и другие' : '') . '.', [], ['Что на ужин?']);
    }

    // Cooking a chosen recipe step by step.
    $r = isset($state['rid']) ? bot_recipe_by_id((string)$state['rid']) : null;
    if ($r) {
        $n = (int)($state['step'] ?? -1); $count = count($r['steps']);
        $go = function (int $to) use ($r, $count) {
            global $APP;
            if ($to >= $count) { $APP = []; say('Готово! Приятного аппетита. Хотите подобрать что-нибудь ещё?', [], ['Удиви меня'], false); }
            $to = max(0, $to);
            $APP = ['rid' => $r['id'], 'step' => $to, 'at' => time()];
            say(step_text($r, $to), ['rid' => $r['id'], 'step' => $to], $to + 1 < $count ? ['Дальше', 'Повтори', 'Назад'] : ['Готово', 'Повтори']);
        };
        if (preg_match('/^(начать|начнем|начинай|давай|поехали|готовить|да)\b/u', $cmd) && $n < 0) $go(0);
        if (preg_match('/(дальше|следующ|далее|готово|сделал|сделала|продолж)/u', $cmd)) $go($n + 1);
        if (preg_match('/(назад|предыдущ|вернись)/u', $cmd)) $go($n - 1);
        if (preg_match('/(повтор|еще раз|не расслышал|что\?)/u', $cmd)) { if (preg_match('/продукт|ингредиент/u', $cmd) || $n < 0) choose($r); $go($n); }
        if (preg_match('/(продукт|ингредиент|что нужно|сколько)/u', $cmd))
            say('Для «' . $r['title'] . '»: ' . implode('; ', bot_ingredients($r)) . '.', $state, $n < 0 ? ['Начать'] : ['Дальше', 'Повтори']);
    }

    // Picking one of the offered recipes: "второе", "номер три", or words of the title.
    $offered = array_values(array_filter(array_map('bot_recipe_by_id', (array)($state['list'] ?? []))));
    if ($offered) {
        $pick = null;
        foreach ([['перв', 'один', '1'], ['втор', 'два', '2'], ['трет', 'три', '3'], ['четв', 'четыре', '4'], ['пят', 'пять', '5']] as $k => $forms)
            foreach ($forms as $f) if (preg_match('/(^|\s)' . $f . '/u', $cmd)) { $pick = $offered[$k] ?? null; break 2; }
        if (!$pick) foreach ($offered as $o) { $tw = explode(' ', match_norm($o['title'])); $hits = 0; foreach (explode(' ', $cmd) as $w) foreach ($tw as $x) if (mb_strlen($w, 'UTF-8') >= 4 && match_same($w, $x)) $hits++; if ($hits >= 1 && $hits >= count(array_filter(explode(' ', $cmd), fn($w) => mb_strlen($w, 'UTF-8') >= 4)) / 2) { $pick = $o; break; } }
        if ($pick) choose($pick);
        if (preg_match('/(другие|ещ[её]|не то|не хочу)/u', $cmd) && isset($state['q'])) { [$list, $q] = bot_search((string)$state['q'], 3, 3); offer($list, $q); }
    }

    if (bot_is_surprise($cmd) || $cmd === '') { $r = bot_random(); if ($r) choose($r); }
    alice_count('query', $orig);
    [$list, $q] = bot_search($cmd, 0, 3);
    offer($list, $q);
} catch (Throwable $e) {
    error_log('[what-to-cook] alice: ' . $e->getMessage());
    say('Что-то пошло не так. Попробуйте ещё раз чуть позже.');
}
