<?php
// «Рецепт дня» on the owner's VK community wall: once a day, after the hour the owner chose, the same dish as the
// widget's, with a link to the recipe (VK shows the link with its photo and title). Without cron: started after the
// app's first request of the day. The access key is set in the admin panel and never sent back to the browser.
declare(strict_types=1);

const VK_API = 'https://api.vk.com/method/';
const VK_VERSION = '5.199';

function vk_settings(): array {
    $v = setting('vk', []);
    return ['token' => (string)($v['token'] ?? ''), 'group' => (int)($v['group'] ?? 0), 'groupName' => (string)($v['groupName'] ?? ''),
        'hour' => max(6, min(22, (int)($v['hour'] ?? 10))), 'on' => !empty($v['on'])];
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
    if (isset($j['error'])) throw new ApiError(400, 'vk', 'ВКонтакте: ' . (string)($j['error']['error_msg'] ?? 'ошибка') . ' (код ' . (int)($j['error']['error_code'] ?? 0) . ')');
    if (!is_array($j) || !array_key_exists('response', $j)) throw new ApiError(502, 'vk', 'ВКонтакте ответил непонятно.');
    return is_array($j['response']) ? $j['response'] : ['value' => $j['response']];
}

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
    if ($s['token'] === '' || !$s['group']) throw new ApiError(400, 'validation', 'Сначала укажите сообщество и ключ доступа.');
    $t = recipe_of_day();
    if (!$t) throw new ApiError(404, 'recipe', 'Нет рецепта дня: в каталоге нет блюд с фото.');
    $r = vk_call('wall.post', ['owner_id' => -$s['group'], 'from_group' => 1, 'message' => vk_post_text($t), 'attachments' => $t['url']], $s['token']);
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

// ---------- Admin ----------
function admin_vk_status(): void {
    $s = vk_settings();
    send_json(['group' => $s['group'], 'groupName' => $s['groupName'], 'hour' => $s['hour'], 'on' => $s['on'],
        'hasToken' => $s['token'] !== '', 'last' => setting('vk_last', null)]);
}
function admin_vk_save(array $b): void {
    $s = vk_settings();
    $token = trim((string)($b['token'] ?? ''));
    if ($token !== '') {
        if (!preg_match('/^[A-Za-z0-9._\-]{20,400}$/', $token)) throw new ApiError(400, 'validation', 'Ключ доступа выглядит неправильно — скопируйте его целиком.');
        $s['token'] = $token;
    }
    if (isset($b['group']) && trim((string)$b['group']) !== '') {
        if ($s['token'] === '') throw new ApiError(400, 'validation', 'Сначала вставьте ключ доступа.');
        $g = vk_resolve_group((string)$b['group'], $s['token']);
        $s['group'] = $g['id']; $s['groupName'] = $g['name'];
    }
    if (isset($b['hour'])) $s['hour'] = max(6, min(22, (int)$b['hour']));
    if (isset($b['on'])) $s['on'] = (bool)$b['on'];
    set_setting('vk', $s);
    admin_vk_status();
}
function admin_vk_post(): void {
    try { $id = vk_post_today(); send_json(['posted' => true, 'post' => $id]); }
    catch (ApiError $e) { set_setting('vk_last', ['day' => date('Y-m-d'), 'at' => now_ms(), 'ok' => false, 'error' => mb_substr($e->getMessage(), 0, 300)]); throw $e; }
}
