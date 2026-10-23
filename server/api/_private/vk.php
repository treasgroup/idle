<?php
// «Рецепт дня» on the owner's VK community wall: once a day, after the hour the owner chose, the same dish as the
// widget's, with a link to the recipe (VK shows the link with its photo and title). Without cron: started after the
// app's first request of the day. The access key is set in the admin panel and never sent back to the browser.
// Only a person's key may post on a wall, and VK no longer gives one to sites: a community key answers «код 27», the
// new VK ID sign-in «код 1051», VK's own apps are blocked for this. So the admin panel's main way is the week's posts
// to put in the community as delayed posts by hand (admin_vk_week); automatic posting stays for a key VK accepts.
declare(strict_types=1);

const VK_API = 'https://api.vk.com/method/';
const VK_VERSION = '5.199';

function vk_settings(): array {
    $v = setting('vk', []);
    return ['token' => (string)($v['token'] ?? ''), 'group' => (int)($v['group'] ?? 0), 'groupName' => (string)($v['groupName'] ?? ''),
        'hour' => max(6, min(22, (int)($v['hour'] ?? 10))), 'on' => !empty($v['on']),
        // Whose key it is (a person's key; a community key has no name here).
        'userName' => (string)($v['userName'] ?? '')];
}

/** What a VK error number means here, in plain words (VK's own text stays next to it). */
function vk_hint(int $code): string {
    return [
        5 => 'Ключ больше не действует (сменили пароль или отозвали доступ).',
        15 => 'У этой страницы нет права публиковать в сообществе: нужен администратор или редактор.',
        27 => 'Это ключ сообщества, а он не может публиковать на стене — так устроен ВКонтакте. Ставьте посты отложенными записями — в админке они готовы на неделю.',
        1051 => 'Этот ключ ВКонтакте разрешает только вход на сайты, публиковать им нельзя. Ставьте посты отложенными записями — в админке они готовы на неделю.',
        214 => 'Публикация на стене запрещена настройками сообщества.',
        220 => 'Слишком много публикаций за сутки.',
    ][$code] ?? '';
}

/** One VK API call; returns the response or throws with VK's own words (they say exactly what is wrong). */
function vk_call(string $method, array $params, string $token): array {
    if (!function_exists('curl_init')) throw new ApiError(503, 'provider', 'На хостинге нет расширения PHP curl.');
    $ch = curl_init(VK_API . $method);
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => http_build_query($params + ['access_token' => $token, 'v' => VK_VERSION]),
        CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_TIMEOUT => 20]);
    $body = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);
    if ($body === false) throw new ApiError(504, 'vk', 'ВКонтакте не ответил: ' . $err);
    $j = json_decode((string)$body, true);
    if (isset($j['error'])) {
        $code = (int)($j['error']['error_code'] ?? 0);
        $hint = vk_hint($code);
        throw new ApiError(400, 'vk', ($hint !== '' ? $hint . ' ' : '') . '(ВКонтакте: ' . (string)($j['error']['error_msg'] ?? 'ошибка') . ', код ' . $code . ')');
    }
    if (!is_array($j) || !array_key_exists('response', $j)) throw new ApiError(502, 'vk', 'ВКонтакте ответил непонятно.');
    return is_array($j['response']) ? $j['response'] : ['value' => $j['response']];
}

/** The key to post with. */
function vk_token(): string { return vk_settings()['token']; }

/** «https://vk.com/club123», «public123», «-123», «123» or a short name → the community's number and name. */
function vk_resolve_group(string $input, string $token): array {
    $s = trim($input);
    $s = preg_replace('~^(https?://)?(m\.)?vk\.(com|ru)/~i', '', $s);
    $s = trim((string)$s, "/ \t");
    if (preg_match('/^-?(\d+)$/', $s, $m) || preg_match('/^(?:club|public|event)(\d+)$/i', $s, $m)) $q = $m[1];
    elseif (preg_match('/^[A-Za-z0-9_.]{2,64}$/', $s)) $q = $s;
    else throw new ApiError(400, 'validation', 'Не понял адрес сообщества. Вставьте ссылку вида https://vk.com/имя_сообщества.');
    $r = vk_call('groups.getById', ['group_ids' => $q], $token);
    $g = $r['groups'][0] ?? $r[0] ?? null;
    if (!$g || empty($g['id'])) throw new ApiError(404, 'vk', 'Сообщество не найдено.');
    return ['id' => (int)$g['id'], 'name' => (string)($g['name'] ?? '')];
}

function vk_post_text(array $t): string {
    $meta = [];
    if ($t['minutes'] ?? 0) $meta[] = $t['minutes'] < 60 ? $t['minutes'] . ' мин' : intdiv($t['minutes'], 60) . ' ч' . ($t['minutes'] % 60 ? ' ' . ($t['minutes'] % 60) . ' мин' : '');
    if ($t['servings'] ?? 0) $meta[] = 'на ' . $t['servings'] . ' ' . seo_plural_vk((int)$t['servings'], 'порцию', 'порции', 'порций');
    return '🍲 Рецепт дня: «' . $t['title'] . '»' . ($meta ? "\n" . implode(' · ', $meta) : '')
        . ($t['summary'] ? "\n\n" . $t['summary'] : '')
        . "\n\nПошагово, с таймерами и списком покупок — по ссылке:\n" . $t['url']
        . "\n\n#рецептдня #чтоприготовить #рецепты";
}
function seo_plural_vk(int $n, string $one, string $few, string $many): string {
    $n = abs($n) % 100; $d = $n % 10;
    return $n > 10 && $n < 20 ? $many : ($d === 1 ? $one : ($d >= 2 && $d <= 4 ? $few : $many));
}

/** Posts today's dish; returns the post's number. */
function vk_post_today(): int {
    $s = vk_settings();
    if ($s['token'] === '' || !$s['group']) throw new ApiError(400, 'validation', 'Сначала вставьте ключ и укажите сообщество.');
    $t = recipe_of_day();
    if (!$t) throw new ApiError(404, 'recipe', 'Нет рецепта дня: в каталоге нет блюд с фото.');
    $r = vk_call('wall.post', ['owner_id' => -$s['group'], 'from_group' => 1, 'message' => vk_post_text($t), 'attachments' => $t['url']], vk_token());
    $id = (int)($r['post_id'] ?? 0);
    set_setting('vk_last', ['day' => date('Y-m-d'), 'at' => now_ms(), 'ok' => true, 'post' => $id, 'title' => $t['title']]);
    return $id;
}

/** After a request has been answered: once a day, after the chosen hour. Errors are kept for the admin panel. */
function vk_daily(): void {
    $s = vk_settings();
    if (!$s['on'] || $s['token'] === '' || !$s['group'] || (int)date('G') < $s['hour']) return;
    $last = setting('vk_last', []);
    if (($last['day'] ?? '') === date('Y-m-d')) return;
    // One attempt per day at most (a mistake in the key must not make a request on every visit).
    if (!bump('vk|' . date('Y-m-d'), 1)) return;
    try { vk_post_today(); }
    catch (Throwable $e) { set_setting('vk_last', ['day' => date('Y-m-d'), 'at' => now_ms(), 'ok' => false, 'error' => mb_substr($e->getMessage(), 0, 300)]); }
}

// ---------- «Взять это меню себе»: a week's menu by a short link ----------
// A VK post «Меню на неделю» ends with shefly.ru/?m=<code>: the code keeps the 7 dishes here, and the site
// (app/App.tsx) offers to put them into the person's plan and the products into the shopping list.
const SHARED_MENUS_MAX = 300;
function admin_menu_share(array $b): void {
    $ids = array_values(array_filter((array)($b['ids'] ?? []), fn($x) => is_string($x) && strlen($x) <= 60 && preg_match(RECIPE_ID, $x)));
    if (count($ids) < 1 || count($ids) > 14) throw new ApiError(400, 'validation', 'В меню должно быть от 1 до 14 блюд.');
    $known = array_flip(array_column(catalog_recipes(), 'id'));
    foreach ($ids as $id) if (!isset($known[$id])) throw new ApiError(400, 'validation', 'В каталоге нет блюда ' . $id . '.');
    $code = substr(sha1(implode(',', $ids)), 0, 8);
    $all = setting('shared_menus', []); if (!is_array($all)) $all = [];
    $all[$code] = ['ids' => $ids, 'at' => now_ms()];
    if (count($all) > SHARED_MENUS_MAX) { uasort($all, fn($x, $y) => ($y['at'] ?? 0) <=> ($x['at'] ?? 0)); $all = array_slice($all, 0, SHARED_MENUS_MAX, true); }
    set_setting('shared_menus', $all);
    send_json(['code' => $code]);
}
function menu_get(string $code): void {
    if (!preg_match('/^[0-9a-f]{8}$/', $code)) throw new ApiError(400, 'validation', 'Неверная ссылка на меню.');
    $all = setting('shared_menus', []);
    $m = is_array($all) ? ($all[$code] ?? null) : null;
    if (!$m) throw new ApiError(404, 'not_found', 'Это меню больше не найдено.');
    send_json(['ids' => array_values((array)$m['ids'])]);
}

// ---------- Admin ----------
function admin_vk_status(): void {
    $s = vk_settings();
    send_json(['group' => $s['group'], 'groupName' => $s['groupName'], 'hour' => $s['hour'], 'on' => $s['on'],
        'hasToken' => $s['token'] !== '', 'userName' => $s['userName'], 'last' => setting('vk_last', null)]);
}
function admin_vk_save(array $b): void {
    $s = vk_settings();
    $token = trim((string)($b['token'] ?? ''));
    if ($token !== '') {
        // A whole address from the browser bar (…#access_token=…&expires_in=0…) is fine too.
        if (preg_match('/access_token=([A-Za-z0-9._\-]+)/', $token, $m)) $token = $m[1];
        if (!preg_match('/^[A-Za-z0-9._\-]{20,400}$/', $token)) throw new ApiError(400, 'validation', 'Ключ доступа выглядит неправильно — скопируйте его целиком.');
        // Whose key: a person's key answers users.get with that person (a community key does not).
        $name = '';
        try { $u = vk_call('users.get', [], $token); $name = trim(($u[0]['first_name'] ?? '') . ' ' . ($u[0]['last_name'] ?? '')); } catch (Throwable $e) {}
        $s['token'] = $token; $s['userName'] = $name;
    }
    if (isset($b['group']) && trim((string)$b['group']) !== '') {
        if ($s['token'] === '') throw new ApiError(400, 'validation', 'Сначала вставьте ключ.');
        $g = vk_resolve_group((string)$b['group'], $s['token']);
        $s['group'] = $g['id']; $s['groupName'] = $g['name'];
    }
    if (isset($b['hour'])) $s['hour'] = max(6, min(22, (int)$b['hour']));
    if (isset($b['on'])) $s['on'] = (bool)$b['on'];
    set_setting('vk', $s);
    admin_vk_status();
}
/** The next seven days' posts, to be put in the community as delayed posts by hand (no key needed). */
function admin_vk_week(): void {
    $days = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
    $out = [];
    for ($i = 0; $i < 7; $i++) {
        $ts = strtotime('+' . $i . ' day 12:00');
        $t = recipe_of_day($ts);
        if (!$t) continue;
        $out[] = ['day' => date('Y-m-d', $ts), 'weekday' => $days[(int)date('w', $ts)], 'title' => $t['title'], 'photo' => $t['photo'], 'photoFull' => $t['photoFull'], 'id' => $t['id'], 'url' => $t['url'], 'text' => vk_post_text($t)];
    }
    send_json(['week' => $out]);
}
function admin_vk_post(): void {
    try { $id = vk_post_today(); send_json(['posted' => true, 'post' => $id]); }
    catch (ApiError $e) { set_setting('vk_last', ['day' => date('Y-m-d'), 'at' => now_ms(), 'ok' => false, 'error' => mb_substr($e->getMessage(), 0, 300)]); throw $e; }
}
