<?php
// «Рецепт дня» on the owner's VK community wall: once a day, after the hour the owner chose, the same dish as the
// widget's, with a link to the recipe (VK shows the link with its photo and title). Without cron: started after the
// app's first request of the day. The access key is set in the admin panel and never sent back to the browser.
// A community key cannot post on the wall (VK answers «код 27»): posting needs the key of a person who runs the
// community. It is got by «Подключить через ВКонтакте» (VK ID, OAuth 2.1 with PKCE): a short key and a long one that
// renews it, so the connection keeps working without the owner doing anything.
declare(strict_types=1);

const VK_API = 'https://api.vk.com/method/';
const VK_VERSION = '5.199';

const VK_ID = 'https://id.vk.com/';

function vk_settings(): array {
    $v = setting('vk', []);
    return ['token' => (string)($v['token'] ?? ''), 'group' => (int)($v['group'] ?? 0), 'groupName' => (string)($v['groupName'] ?? ''),
        'hour' => max(6, min(22, (int)($v['hour'] ?? 10))), 'on' => !empty($v['on']),
        // Set when the key came from «Подключить через ВКонтакте»: how to renew it and whose it is.
        'refresh' => (string)($v['refresh'] ?? ''), 'deviceId' => (string)($v['deviceId'] ?? ''), 'clientId' => (string)($v['clientId'] ?? ''),
        'expiresAt' => (int)($v['expiresAt'] ?? 0), 'userName' => (string)($v['userName'] ?? '')];
}

/** What a VK error number means here, in plain words (VK's own text stays next to it). */
function vk_hint(int $code): string {
    return [
        5 => 'Ключ больше не действует. Подключите ВКонтакте заново.',
        15 => 'У этой страницы нет права публиковать в сообществе: нужен администратор или редактор.',
        27 => 'Ключ сообщества не может публиковать на стене — так устроен ВКонтакте. Нажмите «Подключить через ВКонтакте» и войдите как администратор сообщества.',
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

// ---------- VK ID: «Подключить через ВКонтакте» ----------
function vk_b64url(string $bin): string { return rtrim(strtr(base64_encode($bin), '+/', '-_'), '='); }
function vk_redirect_uri(): string {
    return seo_origin() . rtrim(str_replace('\\', '/', dirname((string)($_SERVER['SCRIPT_NAME'] ?? '/cook/api/index.php'))), '/') . '/index.php?r=vk.callback';
}
/** POST to VK ID (the key exchange); the answer or a clear error. */
function vk_id_post(array $params): array {
    if (!function_exists('curl_init')) throw new ApiError(503, 'provider', 'На хостинге нет расширения PHP curl.');
    $ch = curl_init(VK_ID . 'oauth2/auth');
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => http_build_query($params), CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_TIMEOUT => 20, CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded']]);
    $body = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);
    if ($body === false) throw new ApiError(504, 'vk', 'VK ID не ответил: ' . $err);
    $j = json_decode((string)$body, true);
    if (!is_array($j)) throw new ApiError(502, 'vk', 'VK ID ответил непонятно.');
    if (isset($j['error']) || empty($j['access_token'])) throw new ApiError(400, 'vk', 'VK ID: ' . (string)($j['error_description'] ?? $j['error'] ?? 'нет ключа в ответе'));
    return $j;
}
/** Keeps the keys VK ID gave (the short one, the one that renews it, the device they belong to). */
function vk_store_tokens(array $s, array $j, string $deviceId): void {
    $s['token'] = (string)$j['access_token'];
    if (!empty($j['refresh_token'])) $s['refresh'] = (string)$j['refresh_token'];
    if ($deviceId !== '') $s['deviceId'] = $deviceId;
    $s['expiresAt'] = now_ms() + max(60, (int)($j['expires_in'] ?? 3600)) * 1000;
    set_setting('vk', $s);
}
/** The key to post with: renewed first when it came from VK ID and is about to run out. */
function vk_token(): string {
    $s = vk_settings();
    if ($s['refresh'] === '' || $s['expiresAt'] - 300000 > now_ms()) return $s['token'];
    try {
        $j = vk_id_post(['grant_type' => 'refresh_token', 'refresh_token' => $s['refresh'], 'client_id' => $s['clientId'],
            'device_id' => $s['deviceId'], 'state' => bin2hex(random_bytes(16))]);
    } catch (ApiError $e) {
        throw new ApiError(400, 'vk', 'Подключение к ВКонтакте устарело — нажмите «Подключить через ВКонтакте» ещё раз. (' . $e->getMessage() . ')');
    }
    vk_store_tokens($s, $j, $s['deviceId']);
    return (string)$j['access_token'];
}
/** Admin: the address of VK's sign-in page (the check words for the way back are kept here for 15 minutes). */
function admin_vk_connect(array $b): void {
    $client = trim((string)($b['clientId'] ?? ''));
    if (!preg_match('/^\d{4,12}$/', $client)) throw new ApiError(400, 'validation', 'ID приложения — это число из настроек приложения VK ID.');
    $verifier = vk_b64url(random_bytes(48));
    $state = bin2hex(random_bytes(16));
    set_setting('vk_pending', ['state' => $state, 'verifier' => $verifier, 'clientId' => $client, 'at' => now_ms()]);
    $s = vk_settings(); $s['clientId'] = $client; set_setting('vk', $s);
    send_json(['url' => VK_ID . 'authorize?' . http_build_query([
        'response_type' => 'code', 'client_id' => $client, 'redirect_uri' => vk_redirect_uri(), 'state' => $state,
        'code_challenge' => vk_b64url(hash('sha256', $verifier, true)), 'code_challenge_method' => 'S256', 'scope' => 'wall groups',
    ], '', '&', PHP_QUERY_RFC3986), 'redirect' => vk_redirect_uri()]);
}
/** VK sends the owner back here after the sign-in. The admin cookie does not come along (it is SameSite=Strict), so
 *  the check word is what proves the way back belongs to the sign-in started from the admin panel. */
function vk_callback(): void {
    $page = function (bool $ok, string $text): void {
        http_response_code($ok ? 200 : 400);
        header('Content-Type: text/html; charset=utf-8');
        header('Cache-Control: no-store');
        header('Referrer-Policy: no-referrer');
        echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ВКонтакте</title>'
            . '<body style="font:18px/1.5 system-ui,sans-serif;max-width:520px;margin:48px auto;padding:0 16px;color:#2b211a;background:#fbf7f1">'
            . '<h1 style="font-size:24px">' . ($ok ? 'ВКонтакте подключён' : 'Не получилось подключить') . '</h1><p>' . htmlspecialchars($text) . '</p>'
            . '<p><a href="../admin/insights.html#vk-title" style="color:#c2562a">Вернуться в админ-панель</a></p></body>';
    };
    $p = setting('vk_pending', []);
    $state = (string)($_GET['state'] ?? '');
    if (!$p || $state === '' || !hash_equals((string)$p['state'], $state) || now_ms() - (int)$p['at'] > 15 * 60000) { $page(false, 'Ссылка устарела. Нажмите «Подключить через ВКонтакте» в админ-панели ещё раз.'); return; }
    set_setting('vk_pending', null);
    if (isset($_GET['error'])) { $page(false, 'ВКонтакте ответил: ' . mb_substr((string)($_GET['error_description'] ?? $_GET['error']), 0, 200)); return; }
    $code = (string)($_GET['code'] ?? '');
    $device = (string)($_GET['device_id'] ?? '');
    if ($code === '' || strlen($code) > 2000 || strlen($device) > 400) { $page(false, 'ВКонтакте не прислал код.'); return; }
    try {
        $j = vk_id_post(['grant_type' => 'authorization_code', 'code' => $code, 'code_verifier' => (string)$p['verifier'], 'client_id' => (string)$p['clientId'],
            'device_id' => $device, 'redirect_uri' => vk_redirect_uri(), 'state' => bin2hex(random_bytes(16))]);
        $s = vk_settings();
        $s['clientId'] = (string)$p['clientId'];
        $name = '';
        try { $u = vk_call('users.get', [], (string)$j['access_token']); $name = trim(($u[0]['first_name'] ?? '') . ' ' . ($u[0]['last_name'] ?? '')); } catch (Throwable $e) {}
        $s['userName'] = $name;
        vk_store_tokens($s, $j, $device);
    } catch (Throwable $e) { $page(false, $e->getMessage()); return; }
    $page(true, 'Публикации пойдут от имени сообщества' . ($name !== '' ? ' (вход: ' . $name . ')' : '') . '. Вернитесь в админ-панель и нажмите «Опубликовать сейчас», чтобы проверить.');
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
    if ($s['token'] === '' || !$s['group']) throw new ApiError(400, 'validation', 'Сначала подключите ВКонтакте и укажите сообщество.');
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

// ---------- Admin ----------
function admin_vk_status(): void {
    $s = vk_settings();
    send_json(['group' => $s['group'], 'groupName' => $s['groupName'], 'hour' => $s['hour'], 'on' => $s['on'],
        'hasToken' => $s['token'] !== '', 'viaVkId' => $s['refresh'] !== '', 'userName' => $s['userName'], 'clientId' => $s['clientId'],
        'redirect' => vk_redirect_uri(), 'last' => setting('vk_last', null)]);
}
function admin_vk_save(array $b): void {
    $s = vk_settings();
    $token = trim((string)($b['token'] ?? ''));
    if ($token !== '') {
        // A whole address from the browser bar (…#access_token=…&expires_in=0…) is fine too.
        if (preg_match('/access_token=([A-Za-z0-9._\-]+)/', $token, $m)) $token = $m[1];
        if (!preg_match('/^[A-Za-z0-9._\-]{20,400}$/', $token)) throw new ApiError(400, 'validation', 'Ключ доступа выглядит неправильно — скопируйте его целиком.');
        // A key pasted by hand is not renewed: the VK ID one is dropped.
        $s['token'] = $token; $s['refresh'] = ''; $s['expiresAt'] = 0; $s['userName'] = '';
    }
    if (isset($b['group']) && trim((string)$b['group']) !== '') {
        if ($s['token'] === '') throw new ApiError(400, 'validation', 'Сначала подключите ВКонтакте.');
        set_setting('vk', $s);
        $g = vk_resolve_group((string)$b['group'], vk_token());
        $s = vk_settings(); // the key may have just been renewed
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
