<?php
// Reminders through web push, without third-party services.
// The server sends an empty push (no payload, so no encryption is needed), signed with its own VAPID key.
// The service worker then asks push.next what to show. The texts for the next days are prepared by the
// app itself (it knows the menu and the catalog) and kept here per subscription.
// Sending: by cron (push.cron with a secret key, every 5–15 minutes) and, as a fallback, a few at a time
// while people use the site.

const PUSH_HOSTS = ['.googleapis.com', '.mozilla.com', '.push.apple.com', '.notify.windows.com', '.yandex.ru', '.yandex.net'];
const PUSH_WEEKLY_HOUR = 18; // Sunday, local time

function push_schema(): void {
    static $done = false;
    if ($done) return;
    db()->exec('CREATE TABLE IF NOT EXISTS push_subs (id TEXT PRIMARY KEY, endpoint TEXT NOT NULL, daily TEXT, weekly INTEGER NOT NULL DEFAULT 0, tz INTEGER NOT NULL DEFAULT 0, plan TEXT NOT NULL DEFAULT \'[]\', next_daily INTEGER, next_weekly INTEGER, last_kind TEXT, last_at INTEGER, fails INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, seen_at INTEGER NOT NULL)');
    db()->exec('CREATE INDEX IF NOT EXISTS idx_push_daily ON push_subs(next_daily)');
    db()->exec('CREATE INDEX IF NOT EXISTS idx_push_weekly ON push_subs(next_weekly)');
    $done = true;
}

// ---------- Keys ----------
function b64url(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function vapid_keys(): array {
    $pem = setting('vapid_private');
    $pub = setting('vapid_public');
    if (!$pem || !$pub) {
        if (!function_exists('openssl_pkey_new')) throw new ApiError(503, 'push_off', 'На хостинге нет OpenSSL — напоминания недоступны.');
        $key = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
        if (!$key) throw new ApiError(503, 'push_off', 'Не удалось создать ключ для напоминаний.');
        openssl_pkey_export($key, $pem);
        $d = openssl_pkey_get_details($key);
        $pub = b64url("\x04" . str_pad($d['ec']['x'], 32, "\0", STR_PAD_LEFT) . str_pad($d['ec']['y'], 32, "\0", STR_PAD_LEFT));
        set_setting('vapid_private', $pem);
        set_setting('vapid_public', $pub);
    }
    return ['private' => (string)$pem, 'public' => (string)$pub];
}
// ECDSA signature from OpenSSL (DER) → the raw r||s form JWT needs.
function der_to_raw(string $der): string {
    $pos = 2; if (ord($der[1]) & 0x80) $pos += ord($der[1]) & 0x7f;
    $out = '';
    for ($i = 0; $i < 2; $i++) {
        $pos++; $len = ord($der[$pos++]); $int = substr($der, $pos, $len); $pos += $len;
        $int = ltrim($int, "\0");
        $out .= str_pad($int, 32, "\0", STR_PAD_LEFT);
    }
    return $out;
}
function vapid_header(string $endpoint): string {
    $k = vapid_keys();
    $u = parse_url($endpoint);
    $aud = $u['scheme'] . '://' . $u['host'] . (isset($u['port']) ? ':' . $u['port'] : '');
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $claims = ['aud' => $aud, 'exp' => time() + 12 * 3600, 'sub' => setting('push_contact') ?: 'https://' . preg_replace('/[^a-z0-9.:-]/i', '', $host)];
    $data = b64url(json_encode(['typ' => 'JWT', 'alg' => 'ES256'])) . '.' . b64url(json_encode($claims, JSON_UNESCAPED_SLASHES));
    if (!openssl_sign($data, $der, $k['private'], OPENSSL_ALGO_SHA256)) throw new RuntimeException('sign');
    return 'vapid t=' . $data . '.' . b64url(der_to_raw($der)) . ', k=' . $k['public'];
}

// ---------- Checks ----------
function push_endpoint_ok($e): bool {
    if (!is_string($e) || strlen($e) > 800 || strncmp($e, 'https://', 8) !== 0) return false;
    $host = strtolower((string)parse_url($e, PHP_URL_HOST));
    if ($host === '' || parse_url($e, PHP_URL_PORT)) return false;
    foreach (PUSH_HOSTS as $suffix) if (substr($host, -strlen($suffix)) === $suffix) return true;
    return false;
}
function push_body(array $b): array {
    $e = $b['endpoint'] ?? null;
    if (!push_endpoint_ok($e)) throw new ApiError(400, 'endpoint', 'Этот браузер пока не поддерживается для напоминаний.');
    return $b;
}
function push_id(string $endpoint): string { return hash('sha256', $endpoint); }

// ---------- Time ----------
// tz: minutes east of UTC (Екатеринбург: 300). Next "HH:MM" local time after now, as a UTC timestamp.
function push_next_daily(string $hhmm, int $tz, int $now): int {
    [$h, $m] = array_map('intval', explode(':', $hhmm));
    $local = $now + $tz * 60;
    $t = intdiv($local, 86400) * 86400 + $h * 3600 + $m * 60;
    if ($t <= $local + 30) $t += 86400;
    return $t - $tz * 60;
}
function push_next_weekly(int $tz, int $now): int {
    $local = $now + $tz * 60;
    $dayStart = intdiv($local, 86400) * 86400;
    $dow = (int)gmdate('w', $local); // 0 = Sunday
    $t = $dayStart + (7 - $dow) % 7 * 86400 + PUSH_WEEKLY_HOUR * 3600;
    if ($t <= $local + 30) $t += 7 * 86400;
    return $t - $tz * 60;
}

// ---------- Routes ----------
function push_key_route(): void { push_schema(); send_json(['key' => vapid_keys()['public']]); }

function push_subscribe(array $b): void {
    require_same_origin(); push_schema(); push_body($b);
    limit_or_fail('push', 60, 200000);
    $daily = $b['daily'] ?? null;
    if ($daily !== null && (!is_string($daily) || !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $daily))) throw new ApiError(400, 'validation', 'Неверное время.');
    $weekly = !empty($b['weekly']) ? 1 : 0;
    $tz = (int)($b['tz'] ?? 0); if ($tz < -720 || $tz > 840) $tz = 0;
    $plan = [];
    foreach (array_slice(is_array($b['plan'] ?? null) ? $b['plan'] : [], 0, 10) as $p) {
        if (!is_array($p) || !is_string($p['date'] ?? null) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $p['date']) || !is_string($p['body'] ?? null)) continue;
        $plan[] = ['date' => $p['date'], 'body' => mb_substr(trim($p['body']), 0, 200)];
    }
    $now = time(); $id = push_id($b['endpoint']);
    $st = db()->prepare('SELECT daily, weekly, tz, next_daily, next_weekly FROM push_subs WHERE id = ?'); $st->execute([$id]); $old = $st->fetch(PDO::FETCH_ASSOC);
    // Keep the planned time when nothing about the schedule changed (the plan is resent on every visit).
    $same = $old && $old['daily'] === $daily && (int)$old['tz'] === $tz;
    $nextDaily = $daily ? ($same && $old['next_daily'] ? (int)$old['next_daily'] : push_next_daily($daily, $tz, $now)) : null;
    $nextWeekly = $weekly ? ($old && (int)$old['weekly'] && (int)$old['tz'] === $tz && $old['next_weekly'] ? (int)$old['next_weekly'] : push_next_weekly($tz, $now)) : null;
    $planJson = json_encode($plan, JSON_UNESCAPED_UNICODE);
    if ($old) db()->prepare('UPDATE push_subs SET endpoint = ?, daily = ?, weekly = ?, tz = ?, plan = ?, next_daily = ?, next_weekly = ?, fails = 0, seen_at = ? WHERE id = ?')
        ->execute([$b['endpoint'], $daily, $weekly, $tz, $planJson, $nextDaily, $nextWeekly, $now, $id]);
    else db()->prepare('INSERT INTO push_subs (id, endpoint, daily, weekly, tz, plan, next_daily, next_weekly, fails, created_at, seen_at) VALUES (?,?,?,?,?,?,?,?,0,?,?)')
        ->execute([$id, $b['endpoint'], $daily, $weekly, $tz, $planJson, $nextDaily, $nextWeekly, $now, $now]);
    send_json(['ok' => true, 'nextDaily' => $nextDaily, 'nextWeekly' => $nextWeekly]);
}
function push_unsubscribe(array $b): void {
    require_same_origin(); push_schema(); push_body($b);
    db()->prepare('DELETE FROM push_subs WHERE id = ?')->execute([push_id($b['endpoint'])]);
    send_json(['ok' => true]);
}
// The service worker asks what to show for the push it has just received.
function push_next(array $b): void {
    push_schema(); push_body($b);
    $st = db()->prepare('SELECT * FROM push_subs WHERE id = ?'); $st->execute([push_id($b['endpoint'])]); $s = $st->fetch(PDO::FETCH_ASSOC);
    $title = 'Что приготовить?';
    if (!$s) send_json(['title' => $title, 'body' => 'Загляните — идея дня уже ждёт.', 'url' => './']);
    if ($s['last_kind'] === 'weekly') send_json(['title' => 'Меню на неделю', 'body' => 'Составим меню на следующую неделю? Это займёт минуту, а список покупок соберётся сам.', 'url' => './?tab=menu']);
    if ($s['last_kind'] === 'test') send_json(['title' => $title, 'body' => 'Готово! Так будут выглядеть напоминания.', 'url' => './']);
    $today = gmdate('Y-m-d', time() + (int)$s['tz'] * 60);
    $body = 'Не знаете, что приготовить? Идея дня уже ждёт.';
    foreach (json_decode((string)$s['plan'], true) ?: [] as $p) if (($p['date'] ?? '') === $today) { $body = (string)$p['body']; break; }
    send_json(['title' => $title, 'body' => $body, 'url' => './']);
}
function push_test(array $b): void {
    require_same_origin(); push_schema(); push_body($b);
    limit_or_fail('push_test', 10, 5000);
    $id = push_id($b['endpoint']);
    $st = db()->prepare('SELECT * FROM push_subs WHERE id = ?'); $st->execute([$id]); $s = $st->fetch(PDO::FETCH_ASSOC);
    if (!$s) throw new ApiError(404, 'not_found', 'Сначала включите напоминание.');
    $code = push_send($s, 'test');
    if ($code < 200 || $code >= 300) throw new ApiError(502, 'push_failed', 'Служба уведомлений браузера не приняла сообщение (код ' . $code . '). Попробуйте выключить и снова включить напоминания.');
    send_json(['ok' => true]);
}

// ---------- Sending ----------
// Returns the HTTP status of the push service (0 — no connection).
function push_send(array $s, string $kind): int {
    db()->prepare('UPDATE push_subs SET last_kind = ?, last_at = ? WHERE id = ?')->execute([$kind, time(), $s['id']]);
    if (!function_exists('curl_init')) return 0;
    $ch = curl_init($s['endpoint']);
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_POSTFIELDS => '', CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_FOLLOWLOCATION => false, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
        CURLOPT_HTTPHEADER => ['Authorization: ' . vapid_header($s['endpoint']), 'TTL: ' . ($kind === 'weekly' ? 43200 : 14400), 'Urgency: normal', 'Content-Length: 0'],
    ]);
    curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code === 404 || $code === 410) db()->prepare('DELETE FROM push_subs WHERE id = ?')->execute([$s['id']]); // the browser dropped the subscription
    elseif ($code < 200 || $code >= 300) db()->prepare('UPDATE push_subs SET fails = fails + 1 WHERE id = ?')->execute([$s['id']]);
    else db()->prepare('UPDATE push_subs SET fails = 0 WHERE id = ?')->execute([$s['id']]);
    return $code;
}
// Sends what is due. A reminder more than 3 hours late is skipped (nobody needs "dinner" at midnight).
function push_run(int $limit): array {
    push_schema();
    $now = time(); $sent = 0; $skipped = 0;
    $st = db()->prepare('SELECT * FROM push_subs WHERE (next_daily IS NOT NULL AND next_daily <= ?) OR (next_weekly IS NOT NULL AND next_weekly <= ?) ORDER BY MIN(IFNULL(next_daily, 9e18), IFNULL(next_weekly, 9e18)) LIMIT ' . (int)$limit);
    $st->execute([$now, $now]);
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $s) {
        $tz = (int)$s['tz'];
        foreach (['weekly', 'daily'] as $kind) {
            $at = $s['next_' . $kind];
            if ($at === null || (int)$at > $now) continue;
            $next = $kind === 'daily' ? push_next_daily((string)$s['daily'], $tz, $now) : push_next_weekly($tz, $now);
            db()->prepare('UPDATE push_subs SET next_' . $kind . ' = ? WHERE id = ?')->execute([$next, $s['id']]);
            if ($now - (int)$at > 3 * 3600) { $skipped++; continue; }
            push_send($s, $kind); $sent++;
            break; // one notification at a time; the other one goes on the next run
        }
    }
    db()->exec('DELETE FROM push_subs WHERE fails > 30 OR seen_at < ' . ($now - 120 * 86400));
    set_setting('push_last_run', $now);
    return ['sent' => $sent, 'skipped' => $skipped];
}
function push_cron_key(): string { $k = setting('push_cron_key'); if (!$k) { $k = bin2hex(random_bytes(16)); set_setting('push_cron_key', $k); } return (string)$k; }
function push_cron(): void {
    push_schema();
    if (!hash_equals(push_cron_key(), (string)($_GET['key'] ?? ''))) throw new ApiError(403, 'key', 'Неверный ключ.');
    send_json(push_run(200));
}
// Without cron: while people use the site, at most once a minute, a few reminders are sent.
function push_opportunistic(): void {
    try {
        if (time() - (int)setting('push_last_run', 0) < 60) return;
        push_schema();
        $due = (int)db()->query('SELECT COUNT(*) FROM push_subs WHERE next_daily <= ' . time() . ' OR next_weekly <= ' . time())->fetchColumn();
        if ($due) push_run(5); else set_setting('push_last_run', time());
    } catch (Throwable $e) { /* reminders must never break the site */ }
}
function push_admin_info(): array {
    push_schema();
    $pdo = db();
    return ['subscribers' => (int)$pdo->query('SELECT COUNT(*) FROM push_subs')->fetchColumn(), 'daily' => (int)$pdo->query('SELECT COUNT(*) FROM push_subs WHERE daily IS NOT NULL')->fetchColumn(),
        'weekly' => (int)$pdo->query('SELECT COUNT(*) FROM push_subs WHERE weekly = 1')->fetchColumn(), 'lastRun' => (int)setting('push_last_run', 0), 'cronKey' => push_cron_key(),
        'openssl' => function_exists('openssl_pkey_new'), 'curl' => function_exists('curl_init')];
}
