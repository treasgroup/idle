<?php
// Owner's admin panel: login, anonymous statistics, catalog files, hidden recipes, photos.
// Compatible with PHP 7.4+. All admin routes need the admin cookie; changes also need a same-origin request.

// 'search': a query typed in «Поиск» (value = how many it found); Шеф's questions stay 'query'.
const EVENT_TYPES = ['visit', 'query', 'open', 'cart', 'favorite', 'cook_start', 'cook_done', 'wrong', 'share', 'rate', 'trouble', 'pick', 'search'];
const EVENT_SOURCES = ['chat', 'voice', 'search', 'filters', 'option', 'mobile', 'desktop', 'pwa', 'app', 'home', ''];
// Where a recipe was opened (app/openFrom.ts): a place on Главная or the screen. For «Откуда открывают» in the admin.
const OPEN_SOURCES = ['hero', 'today', 'holiday', 'season', 'collections', 'pick', 'recent', 'home', 'chat', 'recipes', 'favorites', 'menu', 'shopping', 'pantry', 'learn', 'profile', 'cook', 'dinner'];
const ENTRY_KINDS = ['home', 'recipe-link', 'recipe-page', 'poll', 'family', 'login', 'tab', 'app'];
const CATALOG_NAME = '/^[0-9A-Za-z][0-9A-Za-z._-]{0,60}\.json$/';
const RECIPE_ID = '/^[a-z0-9]+(-[a-z0-9]+)*$/';

function setting(string $key, $default = null) {
    $st = db()->prepare('SELECT value FROM settings WHERE key = ?');
    $st->execute([$key]);
    $v = $st->fetchColumn();
    return $v === false ? $default : json_decode((string)$v, true);
}
function set_setting(string $key, $value): void {
    db()->prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')->execute([$key, json_encode($value, JSON_UNESCAPED_UNICODE)]);
}
function bump(string $key, int $max): bool { // portable counter with a limit; false when the limit is reached
    $pdo = db();
    $pdo->prepare('INSERT OR IGNORE INTO usage (key, count) VALUES (?, 0)')->execute([$key]);
    $st = $pdo->prepare('UPDATE usage SET count = count + 1 WHERE key = ? AND count < ?');
    $st->execute([$key, $max]);
    return $st->rowCount() > 0;
}
// After the move a request from an old app comes through treas.su/cook/proxy.php on this same server: the person's
// own address is in X-Forwarded-For then (only trusted from this server itself, so nobody can fake it).
function client_ip(): string {
    $ip = (string)($_SERVER['REMOTE_ADDR'] ?? '?');
    $fwd = trim(explode(',', (string)($_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''))[0]);
    if ($fwd !== '' && $ip !== '' && ($ip === ($_SERVER['SERVER_ADDR'] ?? '') || $ip === '127.0.0.1' || $ip === '::1') && filter_var($fwd, FILTER_VALIDATE_IP)) $ip = $fwd;
    return substr($ip, 0, 64);
}
function today(): string { return date('Y-m-d'); }
function norm_text(string $s): string {
    $s = function_exists('mb_strtolower') ? mb_strtolower($s, 'UTF-8') : strtolower($s);
    $s = str_replace('ё', 'е', $s);
    $s = preg_replace('/[^\p{L}\p{N}\s-]+/u', ' ', $s);
    return trim(preg_replace('/\s+/u', ' ', $s));
}
function cut(string $s, int $len): string {
    $s = trim(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $s) ?? '');
    return function_exists('mb_substr') ? mb_substr($s, 0, $len, 'UTF-8') : substr($s, 0, $len);
}

// ---------- Public: anonymous events from the app ----------
function record_events(array $body): void {
    $visitor = (string)($body['visitor'] ?? '');
    $events = $body['events'] ?? null;
    if (!preg_match('/^[0-9a-f-]{16,40}$/i', $visitor) || !is_array($events) || count($events) < 1 || count($events) > 20) throw new ApiError(400, 'validation', 'Неверные данные.');
    $day = today();
    $salt = setting('visitor_salt');
    if (!$salt) { $salt = bin2hex(random_bytes(16)); set_setting('visitor_salt', $salt); }
    $who = substr(hash('sha256', $salt . $visitor), 0, 16); // the raw browser id is never stored
    if (is_bot_ua()) { send_json(['saved' => false]); return; }
    $pdo = db();
    $insert = $pdo->prepare('INSERT INTO events (ts, day, visitor, type, recipe_id, text, norm, value, source, ref, entry) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $pdo->exec('BEGIN IMMEDIATE');
    try {
        foreach ($events as $e) {
            if (!is_array($e) || !in_array($e['type'] ?? '', EVENT_TYPES, true)) continue;
            if (!bump('ev|' . $who . '|' . $day, 400) || !bump('ev|all|' . $day, 50000)) break;
            $recipe = isset($e['recipeId']) && is_string($e['recipeId']) && strlen($e['recipeId']) <= 60 && preg_match(RECIPE_ID, $e['recipeId']) ? $e['recipeId'] : null;
            $text = isset($e['text']) && is_string($e['text']) ? cut($e['text'], 300) : null;
            if ($e['type'] === 'trouble' && $text !== null) $text = cut($text, 60); // a chosen reason, not a story
            if (($e['type'] === 'query' || $e['type'] === 'search') && ($text === null || $text === '')) continue;
            $value = isset($e['count']) && is_int($e['count']) ? max(-1, min(9999, $e['count'])) : null; // -1 = the request was not understood
            $source = in_array($e['source'] ?? '', $e['type'] === 'open' ? OPEN_SOURCES : EVENT_SOURCES, true) ? (string)($e['source'] ?? '') : '';
            // A visit says where it came from and what it opened first (short keys, checked here).
            $ref = $e['type'] === 'visit' && isset($e['ref']) && is_string($e['ref']) && preg_match('/^[a-z0-9.-]{1,60}$/', $e['ref']) ? $e['ref'] : null;
            $entry = $e['type'] === 'visit' && in_array($e['entry'] ?? '', ENTRY_KINDS, true) ? $e['entry'] : null;
            $insert->execute([now_ms(), $day, $who, $e['type'], $recipe, $text, $text !== null ? norm_text($text) : null, $value, $source, $ref, $entry]);
        }
        $pdo->exec('COMMIT');
    } catch (Throwable $err) { if ($pdo->inTransaction()) $pdo->exec('ROLLBACK'); throw $err; }
    if (mt_rand(1, 200) === 1) cleanup();
    send_json(['saved' => true]);
}

// «Статистика → Что ищут»: what people looked for and did not find — typed in «Поиск» (found nothing) and asked of
// Шеф (no such recipe: value 0; not understood: -1). Buttons of the chat and «где мой план» questions are left out.
function admin_searches(int $days): void {
    $days = max(1, min(365, $days));
    $from = date('Y-m-d', time() - ($days - 1) * 86400);
    $st = db()->prepare("SELECT norm, MAX(text) AS text, COUNT(*) AS n, COUNT(DISTINCT visitor) AS people, MAX(ts) AS last,
        SUM(type = 'search') AS search, SUM(type = 'query') AS chat, MIN(value) AS worst
        FROM events WHERE day >= ? AND norm IS NOT NULL AND norm <> '' AND value <= 0
          AND ((type = 'search') OR (type = 'query' AND source NOT IN ('option', 'nav')))
        GROUP BY norm ORDER BY people DESC, n DESC, last DESC LIMIT 300");
    $st->execute([$from]);
    $rows = array_map(fn($r) => ['text' => (string)$r['text'], 'n' => (int)$r['n'], 'people' => (int)$r['people'], 'last' => (int)$r['last'],
        'search' => (int)$r['search'], 'chat' => (int)$r['chat'], 'unclear' => (int)$r['worst'] === -1 && (int)$r['search'] === 0], $st->fetchAll(PDO::FETCH_ASSOC));
    $all = db()->prepare("SELECT SUM(type = 'search') AS search, SUM(type = 'query') AS chat FROM events WHERE day >= ? AND type IN ('search', 'query')");
    $all->execute([$from]);
    $t = $all->fetch(PDO::FETCH_ASSOC) ?: [];
    send_json(['rows' => $rows, 'total' => ['search' => (int)($t['search'] ?? 0), 'chat' => (int)($t['chat'] ?? 0)]]);
}

// ---------- Admin auth ----------
function admin_configured(): bool { $c = config(); return ($c['admin_password_hash'] ?? '') !== '' || ($c['admin_password'] ?? '') !== ''; }
function admin_password_ok(string $password): bool {
    $c = config();
    if (($c['admin_password_hash'] ?? '') !== '') return password_verify($password, (string)$c['admin_password_hash']);
    if (($c['admin_password'] ?? '') !== '') return hash_equals((string)$c['admin_password'], $password);
    return false;
}
// Sessions are tied to the current password: after a password change in config.php every old login stops working.
function session_key(string $token): string { $c = config(); return hash('sha256', $token . '|' . hash('sha256', (string)($c['admin_password_hash'] ?: $c['admin_password']))); }
function admin_token(): ?string { $t = $_COOKIE['cook_admin'] ?? ''; return preg_match('/^[0-9a-f]{64}$/', $t) ? $t : null; }
function is_admin(): bool {
    $t = admin_token();
    if (!$t || !admin_configured()) return false;
    $st = db()->prepare('SELECT 1 FROM admin_sessions WHERE token_hash = ? AND expires_at > ?');
    $st->execute([session_key($t), now_ms()]);
    return (bool)$st->fetchColumn();
}
function require_admin(bool $change = false): void {
    if ($change) require_same_origin();
    if (!is_admin()) throw new ApiError(401, 'admin_login', 'Войдите в админ-панель.');
}
function login_limit(): void {
    if (!bump('login|' . client_ip() . '|' . date('Y-m-d-H'), 8) || !bump('login|all|' . date('Y-m-d-H'), 60))
        throw new ApiError(429, 'login_limit', 'Слишком много попыток. Подождите час и попробуйте снова.');
}
function admin_login(array $b): void {
    require_same_origin();
    if (!admin_configured()) throw new ApiError(403, 'admin_not_configured', 'Пароль администратора ещё не задан в config.php.');
    login_limit();
    $password = (string)($b['password'] ?? '');
    if ($password === '' || strlen($password) > 200 || !admin_password_ok($password)) { login_log(false); usleep(400000); throw new ApiError(403, 'admin_password', 'Неверный пароль.'); }
    $token = bin2hex(random_bytes(32));
    $now = now_ms();
    db()->prepare('DELETE FROM admin_sessions WHERE expires_at < ?')->execute([$now]);
    db()->prepare('INSERT INTO admin_sessions (token_hash, created_at, expires_at, ip, ua) VALUES (?, ?, ?, ?, ?)')->execute([session_key($token), $now, $now + 7 * 86400000, client_ip(), login_ua()]);
    login_log(true);
    setcookie('cook_admin', $token, ['expires' => time() + 7 * 86400, 'path' => cookie_path(), 'secure' => is_https(), 'httponly' => true, 'samesite' => 'Strict']);
    send_json(['loggedIn' => true]);
}
function admin_logout(): void {
    require_same_origin();
    $t = admin_token();
    if ($t) db()->prepare('DELETE FROM admin_sessions WHERE token_hash = ?')->execute([session_key($t)]);
    setcookie('cook_admin', '', ['expires' => time() - 3600, 'path' => cookie_path(), 'secure' => is_https(), 'httponly' => true, 'samesite' => 'Strict']);
    send_json(['loggedIn' => false]);
}
// ---------- Безопасность: who logged in, from where; closing the other logins ----------
// Every attempt, right or wrong, is kept 90 days; the page shows the address half hidden (95.24.xx.xx).
function login_ua(): string { return substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 300); }
function login_log(bool $ok): void {
    try {
        $now = now_ms();
        db()->prepare('DELETE FROM admin_logins WHERE at < ?')->execute([$now - 90 * 86400000]);
        db()->prepare('INSERT INTO admin_logins (at, ip, ua, ok) VALUES (?, ?, ?, ?)')->execute([$now, client_ip(), login_ua(), $ok ? 1 : 0]);
    } catch (Throwable $e) { /* the login itself matters more than its record */ }
}
function mask_ip(?string $ip): string {
    $ip = (string)$ip;
    if (preg_match('/^(\d+)\.(\d+)\.\d+\.\d+$/', $ip, $m)) return $m[1] . '.' . $m[2] . '.xx.xx';
    if (strpos($ip, ':') !== false) { $p = explode(':', $ip); return $p[0] . ':' . ($p[1] ?? '') . ':…'; }
    return $ip === '' ? '?' : $ip;
}
function admin_security(): void {
    $now = now_ms();
    $mine = session_key((string)admin_token());
    $st = db()->prepare('SELECT token_hash, created_at, expires_at, ip, ua FROM admin_sessions WHERE expires_at > ? ORDER BY created_at DESC');
    $st->execute([$now]);
    $sessions = array_map(fn($r) => ['current' => hash_equals($mine, (string)$r['token_hash']), 'at' => (int)$r['created_at'], 'until' => (int)$r['expires_at'], 'ip' => mask_ip($r['ip']), 'ua' => (string)($r['ua'] ?? '')], $st->fetchAll(PDO::FETCH_ASSOC));
    $st = db()->prepare('SELECT at, ip, ua, ok FROM admin_logins WHERE at > ? ORDER BY at DESC LIMIT 200');
    $st->execute([$now - 90 * 86400000]);
    $logins = array_map(fn($r) => ['at' => (int)$r['at'], 'ip' => mask_ip($r['ip']), 'ua' => (string)$r['ua'], 'ok' => (bool)$r['ok']], $st->fetchAll(PDO::FETCH_ASSOC));
    send_json(['sessions' => $sessions, 'logins' => $logins]);
}
function admin_logout_others(): void {
    $st = db()->prepare('DELETE FROM admin_sessions WHERE token_hash <> ?');
    $st->execute([session_key((string)admin_token())]);
    send_json(['closed' => $st->rowCount()]);
}
// «Рецепты → Фото»: how often each recipe was opened in 30 days (in the app and on its plain page), so the recipes
// people look at most get their photo first.
function admin_photo_queue(): void {
    $since = date('Y-m-d', time() - 30 * 86400);
    $n = [];
    $st = db()->prepare("SELECT recipe_id, COUNT(*) AS c FROM events WHERE day >= ? AND type = 'open' AND recipe_id IS NOT NULL GROUP BY recipe_id");
    $st->execute([$since]);
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) $n[$r['recipe_id']] = (int)$r['c'];
    $st = db()->prepare('SELECT recipe_id, SUM(n) AS c FROM page_views WHERE day >= ? GROUP BY recipe_id');
    $st->execute([$since]);
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) $n[$r['recipe_id']] = ($n[$r['recipe_id']] ?? 0) + (int)$r['c'];
    send_json(['opens' => (object)$n]);
}

// Before a password exists: turn a chosen password into a hash line for config.php (nothing is stored).
function admin_hash(array $b): void {
    require_same_origin();
    if (admin_configured()) throw new ApiError(403, 'admin_configured', 'Пароль уже задан. Чтобы сменить, отредактируйте config.php.');
    login_limit();
    $p = (string)($b['password'] ?? '');
    if (strlen($p) < 8 || strlen($p) > 200) throw new ApiError(400, 'validation', 'Пароль должен быть не короче 8 символов.');
    send_json(['hash' => password_hash($p, PASSWORD_DEFAULT)]);
}

function photos_dir(): string { return dirname(__DIR__, 2) . '/photos'; }
function backups_dir(): string { return catalog_dir() . '/_backups'; }
function writable_dir(string $d): bool { return is_dir($d) ? is_writable($d) : is_writable(dirname($d)); }

function admin_status(): void {
    $storage = rtrim(config()['storage_dir'], '/\\');
    $dbOk = true; try { db(); } catch (Throwable $e) { $dbOk = false; }
    send_json([
        'configured' => admin_configured(), 'loggedIn' => $dbOk && is_admin(), 'version' => VERSION, 'database' => $dbOk, 'https' => is_https(),
        'server' => is_admin() ? [
            'php' => PHP_VERSION, 'sqlite' => $dbOk, 'curl' => function_exists('curl_init'), 'gd' => function_exists('imagecreatefromjpeg'),
            'configFile' => is_file(__DIR__ . '/config.php'), 'timezone' => date_default_timezone_get(),
            'catalogWritable' => writable_dir(catalog_dir()), 'photosWritable' => writable_dir(photos_dir()), 'storageWritable' => writable_dir($storage),
            'intentProvider' => config()['intent_provider'], 'intentReady' => intent_ready(), 'speechProvider' => config()['speech_provider'],
            'uploadMax' => ini_get('upload_max_filesize'), 'postMax' => ini_get('post_max_size'),
            'push' => (function () { try { return push_admin_info(); } catch (Throwable $e) { return null; } })(),
            'accounts' => (function () { try { accounts_schema(); $pdo = db(); return ['total' => (int)$pdo->query('SELECT COUNT(*) FROM accounts')->fetchColumn(), 'active30' => (int)$pdo->query('SELECT COUNT(*) FROM accounts WHERE seen_at > ' . (now_ms() - 30 * 86400000))->fetchColumn(), 'families' => (int)$pdo->query('SELECT COUNT(*) FROM (SELECT household_id FROM accounts GROUP BY household_id HAVING COUNT(*) > 1)')->fetchColumn()]; } catch (Throwable $e) { return null; } })(),
        ] : null,
    ]);
}

// ---------- Statistics ----------
/** «Откуда открывают»: recipe opens by place (app/openFrom.ts) — opens and different people, for the last days. */
function admin_opens(int $days): void {
    $days = max(1, min(400, $days));
    $from = date('Y-m-d', time() - ($days - 1) * 86400);
    $st = db()->prepare("SELECT COALESCE(NULLIF(source, ''), '-') AS source, COUNT(*) AS opens, COUNT(DISTINCT visitor) AS people FROM events WHERE type = 'open' AND day >= ? GROUP BY COALESCE(NULLIF(source, ''), '-') ORDER BY opens DESC");
    $st->execute([$from]);
    $rows = array_map(function ($r) { return ['source' => (string)$r['source'], 'opens' => (int)$r['opens'], 'people' => (int)$r['people']]; }, $st->fetchAll());
    send_json(['days' => $days, 'rows' => $rows]);
}
function admin_stats(int $days): void {
    $days = max(1, min(400, $days));
    $from = date('Y-m-d', time() - ($days - 1) * 86400);
    $pdo = db();
    $q = function (string $sql, array $args = []) use ($pdo) { $st = $pdo->prepare($sql); $st->execute($args); return $st->fetchAll(); };
    $daily = $q("SELECT day, COUNT(DISTINCT visitor) AS visitors, SUM(type = 'query') AS queries, SUM(type = 'query' AND value <= 0) AS failed,
        SUM(type = 'open') AS opens, SUM(type = 'cart') AS carts FROM events WHERE day >= ? GROUP BY day ORDER BY day", [$from]);
    $totals = $q("SELECT COUNT(DISTINCT visitor) AS visitors, SUM(type = 'query') AS queries, SUM(type = 'query' AND value <= 0) AS failed, SUM(type = 'query' AND value = -1) AS unclear,
        SUM(type = 'open') AS opens, SUM(type = 'cart') AS carts, SUM(type = 'favorite') AS favorites, SUM(type = 'cook_start') AS cookStarts,
        SUM(type = 'cook_done') AS cookDone FROM events WHERE day >= ?", [$from])[0];
    $prevFrom = date('Y-m-d', strtotime($from) - $days * 86400);
    $previous = $q("SELECT COUNT(DISTINCT visitor) AS visitors, SUM(type = 'query') AS queries, SUM(type = 'query' AND value <= 0) AS failed, SUM(type = 'open') AS opens,
        SUM(type = 'cart') AS carts, SUM(type = 'cook_start') AS cookStarts, SUM(type = 'cook_done') AS cookDone FROM events WHERE day >= ? AND day < ?", [$prevFrom, $from])[0];
    // The funnel by people: how many of the visitors asked, opened a recipe, put it in the cart, cooked it.
    $funnel = $q("SELECT COUNT(DISTINCT visitor) AS visitors, COUNT(DISTINCT CASE WHEN type = 'query' THEN visitor END) AS asked,
        COUNT(DISTINCT CASE WHEN type = 'open' THEN visitor END) AS opened, COUNT(DISTINCT CASE WHEN type IN ('cart', 'favorite') THEN visitor END) AS planned,
        COUNT(DISTINCT CASE WHEN type = 'cook_start' THEN visitor END) AS cooked, COUNT(DISTINCT CASE WHEN type = 'cook_done' THEN visitor END) AS finished FROM events WHERE day >= ?", [$from])[0];
    // What needs the owner today: reviews to check, phrases the chat did not understand (90 days, like «Обучение»).
    $attention = ['reviews' => 0, 'unclear' => 0];
    try { reviews_schema(); $attention['reviews'] = (int)$pdo->query("SELECT (SELECT COUNT(*) FROM reviews WHERE status = 'pending' OR reports > 0) + (SELECT COUNT(*) FROM review_replies WHERE status = 'pending' OR reports > 0)")->fetchColumn(); } catch (Throwable $e) {}
    $attention['unclear'] = (int)$q("SELECT COUNT(DISTINCT norm) AS n FROM events WHERE type = 'query' AND value = -1 AND day >= ?", [date('Y-m-d', time() - 89 * 86400)])[0]['n'];
    // Return visits. A visitor's first day is the earliest day kept (events live 400 days).
    $first = "SELECT visitor, MIN(day) AS first FROM events GROUP BY visitor";
    $retDaily = $q("WITH f AS ($first), d AS (SELECT DISTINCT day, visitor FROM events WHERE day >= ?)
        SELECT d.day, SUM(f.first = d.day) AS new, SUM(f.first < d.day) AS back FROM d JOIN f USING(visitor) GROUP BY d.day ORDER BY d.day", [$from]);
    $retPeriod = $q("WITH f AS ($first), a AS (SELECT visitor, COUNT(DISTINCT day) AS days FROM events WHERE day >= ? GROUP BY visitor)
        SELECT COUNT(*) AS visitors, COALESCE(SUM(f.first >= ?), 0) AS newcomers, COALESCE(SUM(f.first < ?), 0) AS returned,
        COALESCE(SUM(f.first >= ? AND a.days >= 2), 0) AS newBack, COALESCE(SUM(a.days >= 2), 0) AS multiDay, COALESCE(ROUND(AVG(a.days) * 10), 0) AS avgDays10
        FROM a JOIN f USING(visitor)", [$from, $from, $from, $from])[0];
    $retPrev = $q("WITH f AS ($first), a AS (SELECT DISTINCT visitor FROM events WHERE day >= ? AND day < ?)
        SELECT COALESCE(SUM(f.first >= ?), 0) AS newcomers, COALESCE(SUM(f.first < ?), 0) AS returned FROM a JOIN f USING(visitor)", [$prevFrom, $from, $prevFrom, $prevFrom])[0];
    // Of those who first came 7–90 days ago: came back within a week, and kept coming after a week.
    $cohortFrom = date('Y-m-d', time() - 90 * 86400); $cohortTo = date('Y-m-d', time() - 7 * 86400);
    $retWeek = $q("WITH f AS ($first), c AS (SELECT visitor, first FROM f WHERE first >= ? AND first <= ?),
        v AS (SELECT DISTINCT e.visitor, CAST(julianday(e.day) - julianday(c.first) AS INTEGER) AS gap FROM events e JOIN c USING(visitor) WHERE e.day > c.first)
        SELECT (SELECT COUNT(*) FROM c) AS cohort, COUNT(DISTINCT CASE WHEN gap <= 7 THEN visitor END) AS week, COUNT(DISTINCT CASE WHEN gap >= 7 THEN visitor END) AS later FROM v", [$cohortFrom, $cohortTo])[0];
    // Weekly cohorts for the last 8 weeks (weeks from Monday): how many of each week's newcomers were back in week 1, 2, …
    $monday = strtotime('monday this week', time()); $start = $monday - 7 * 7 * 86400;
    $rows = $q("WITH f AS ($first) SELECT DISTINCT f.first, e.visitor, e.day FROM events e JOIN f USING(visitor) WHERE f.first >= ?", [date('Y-m-d', $start)]);
    $cohorts = [];
    for ($w = 0; $w < 8; $w++) $cohorts[$w] = ['week' => date('Y-m-d', $start + $w * 7 * 86400), 'size' => 0, 'back' => array_fill(0, 8 - $w, 0)];
    $seen = [];
    foreach ($rows as $r) {
        $cw = intdiv((int)floor((strtotime($r['first'] . ' 12:00') - $start) / 86400), 7);
        $dw = intdiv((int)floor((strtotime($r['day'] . ' 12:00') - $start) / 86400), 7);
        if ($cw < 0 || $cw > 7 || $dw < $cw || $dw > 7) continue;
        $k = $r['visitor'] . '|' . ($dw - $cw);
        if (isset($seen[$k])) continue; $seen[$k] = true;
        if ($dw === $cw) $cohorts[$cw]['size']++; else $cohorts[$cw]['back'][$dw - $cw]++;
    }
    foreach ($cohorts as &$c) $c['back'][0] = $c['size']; unset($c);
    $retention = ['daily' => array_map(function ($r) { return ['day' => $r['day'], 'new' => (int)$r['new'], 'back' => (int)$r['back']]; }, $retDaily),
        'period' => array_map('intval', $retPeriod), 'previous' => array_map('intval', $retPrev), 'week' => array_map('intval', $retWeek), 'cohorts' => $cohorts];
    // Where people come from and what they open first (visits since 0.33.3 carry it; older ones are «не записано»).
    $refs = $q("SELECT COALESCE(ref, '?') AS ref, COUNT(DISTINCT visitor) AS n FROM events WHERE type = 'visit' AND day >= ? GROUP BY COALESCE(ref, '?') ORDER BY n DESC LIMIT 20", [$from]);
    $entries = $q("SELECT COALESCE(entry, '?') AS entry, COUNT(DISTINCT visitor) AS n FROM events WHERE type = 'visit' AND day >= ? GROUP BY COALESCE(entry, '?') ORDER BY n DESC", [$from]);
    // Plain recipe pages (recipe.php) opened by people: from search, messengers, other sites.
    $pageRefs = $q('SELECT ref, SUM(n) AS n FROM page_views WHERE day >= ? GROUP BY ref ORDER BY n DESC', [$from]);
    $pageTop = $q('SELECT recipe_id AS id, SUM(n) AS n FROM page_views WHERE day >= ? GROUP BY recipe_id ORDER BY n DESC LIMIT 15', [$from]);
    $pageDaily = $q('SELECT day, SUM(n) AS n FROM page_views WHERE day >= ? GROUP BY day ORDER BY day', [$from]);
    // The latest visits, each as a short story: where from, what was asked, opened, cooked. Visitors are only
    // shown by the first 4 signs of their (already hashed) id, enough to tell two visits apart.
    $visits = $q("SELECT visitor, day, MIN(ts) AS start, MAX(ts) AS end FROM events WHERE day >= ? GROUP BY visitor, day ORDER BY end DESC LIMIT 40", [$from]);
    $journeys = [];
    if ($visits) {
        $who = array_values(array_unique(array_column($visits, 'visitor')));
        $marks = implode(',', array_fill(0, count($who), '?'));
        $firstDay = []; foreach ($q("SELECT visitor, MIN(day) AS first FROM events WHERE visitor IN ($marks) GROUP BY visitor", $who) as $r) $firstDay[$r['visitor']] = $r['first'];
        $byVisit = [];
        foreach ($q("SELECT visitor, day, ts, type, recipe_id, text, value, source, ref, entry FROM events WHERE visitor IN ($marks) AND day >= ? ORDER BY ts", array_merge($who, [$from])) as $e) {
            $k = $e['visitor'] . '|' . $e['day'];
            if (count($byVisit[$k] ?? []) >= 60) continue;
            $byVisit[$k][] = ['ts' => (int)$e['ts'], 'type' => $e['type'], 'recipe' => $e['recipe_id'], 'text' => $e['text'], 'value' => $e['value'] === null ? null : (int)$e['value'], 'source' => (string)$e['source'], 'ref' => $e['ref'], 'entry' => $e['entry']];
        }
        foreach ($visits as $v) {
            $k = $v['visitor'] . '|' . $v['day'];
            $journeys[] = ['who' => substr($v['visitor'], 0, 4), 'day' => $v['day'], 'start' => (int)$v['start'], 'end' => (int)$v['end'], 'returning' => ($firstDay[$v['visitor']] ?? $v['day']) < $v['day'], 'events' => $byVisit[$k] ?? []];
        }
    }
    $failedTop = $q("SELECT norm AS text, COUNT(*) AS n, COUNT(DISTINCT visitor) AS people, SUM(value = -1) AS unclear, MAX(ts) AS last FROM events
        WHERE type = 'query' AND value <= 0 AND day >= ? GROUP BY norm ORDER BY n DESC, last DESC LIMIT 60", [$from]);
    $queriesTop = $q("SELECT norm AS text, COUNT(*) AS n, COUNT(DISTINCT visitor) AS people, SUM(value <= 0) AS failed, MAX(ts) AS last FROM events
        WHERE type = 'query' AND day >= ? GROUP BY norm ORDER BY n DESC, last DESC LIMIT 60", [$from]);
    $recipes = $q("SELECT recipe_id AS id, SUM(type = 'open') AS opens, SUM(type = 'cart') AS carts, SUM(type = 'favorite') AS favorites,
        SUM(type = 'cook_start') AS cookStarts, SUM(type = 'cook_done') AS cookDone FROM events WHERE recipe_id IS NOT NULL AND day >= ? GROUP BY recipe_id", [$from]);
    $fromMs = strtotime($from) * 1000;
    $feedback = $q('SELECT recipe_id AS id, value, COUNT(*) AS n FROM feedback WHERE created_at >= ? GROUP BY recipe_id, value', [$fromMs]);
    $sources = $q("SELECT source, COUNT(*) AS n FROM events WHERE type = 'query' AND day >= ? GROUP BY source", [$from]);
    $devices = $q("SELECT source, COUNT(DISTINCT visitor) AS n FROM events WHERE type = 'visit' AND day >= ? GROUP BY source", [$from]);
    $recent = $q("SELECT ts, text, value, source FROM events WHERE type = 'query' ORDER BY id DESC LIMIT 150");
    $int = function ($rows) { return array_map(function ($r) { foreach ($r as $k => $v) if (!in_array($k, ['text', 'day', 'id', 'source'], true) && $v !== null && is_numeric($v)) $r[$k] = (int)$v; return $r; }, $rows); };
    send_json([
        'from' => $from, 'to' => today(), 'days' => $days,
        'daily' => $int($daily), 'totals' => array_map('intval', $totals), 'previous' => array_map('intval', $previous), 'funnel' => array_map('intval', $funnel), 'attention' => $attention, 'retention' => $retention, 'refs' => $int($refs), 'entries' => $int($entries), 'pages' => ['refs' => $int($pageRefs), 'top' => $int($pageTop), 'daily' => $int($pageDaily)], 'journeys' => $journeys,
        'failedTop' => $int($failedTop), 'queriesTop' => $int($queriesTop), 'recipes' => $int($recipes), 'feedback' => $int($feedback),
        'sources' => $int($sources), 'devices' => $int($devices), 'recent' => $int($recent),
        'totalEvents' => (int)$pdo->query('SELECT COUNT(*) FROM events')->fetchColumn(),
    ]);
}

// ---------- Catalog files ----------
function catalog_path(string $name): string {
    if (!preg_match(CATALOG_NAME, $name)) throw new ApiError(400, 'file_name', 'Имя файла: латиница, цифры, точка, дефис, на конце .json.');
    return catalog_dir() . '/' . $name;
}
function file_hash(string $path): ?string { return is_file($path) ? sha1_file($path) : null; }
function admin_files(): void {
    $out = [];
    $paths = glob(catalog_dir() . '/*.json') ?: [];
    sort($paths, SORT_STRING);
    foreach ($paths as $p) $out[] = ['name' => basename($p), 'size' => filesize($p), 'mtime' => filemtime($p) * 1000, 'hash' => sha1_file($p), 'raw' => (string)file_get_contents($p)];
    send_json(['files' => $out, 'hidden' => setting('hidden', []), 'photos' => photo_versions(), 'realPhotos' => real_photos(), 'writable' => writable_dir(catalog_dir())]);
}
function backup_file(string $name): void {
    $src = catalog_path($name);
    if (!is_file($src)) return;
    $dir = backups_dir();
    if (!is_dir($dir)) { @mkdir($dir, 0755, true); @file_put_contents($dir . '/.htaccess', "Require all denied\n"); }
    if (!@copy($src, $dir . '/' . $name . '.' . date('Ymd-His') . '-' . substr(bin2hex(random_bytes(2)), 0, 4) . '.bak')) throw new ApiError(500, 'backup', 'Не удалось сохранить резервную копию. Проверьте права на папку data/catalog.');
    $old = glob($dir . '/' . $name . '.*.bak') ?: [];
    sort($old, SORT_STRING);
    while (count($old) > 30) @unlink(array_shift($old));
}
function check_base(string $path, $base): void {
    $current = file_hash($path);
    if ($current !== ($base === null || $base === '' ? null : (string)$base)) throw new ApiError(409, 'conflict', $current === null ? 'Этот файл уже удалён.' : 'Файл изменился с момента загрузки (возможно, в другой вкладке). Обновите данные и повторите.');
}
function write_atomic(string $path, string $content): void {
    $tmp = $path . '.tmp' . bin2hex(random_bytes(3));
    if (@file_put_contents($tmp, $content, LOCK_EX) === false) throw new ApiError(500, 'write', 'Не удалось записать файл. Проверьте права на папку.');
    if (!@rename($tmp, $path)) { @unlink($tmp); throw new ApiError(500, 'write', 'Не удалось заменить файл.'); }
}
function admin_file_save(array $b): void {
    $name = (string)($b['name'] ?? ''); $path = catalog_path($name);
    $content = $b['content'] ?? null;
    if (!is_string($content) || strlen($content) > 3 * 1024 * 1024) throw new ApiError(400, 'validation', 'Файл пустой или больше 3 МБ.');
    $data = json_decode($content);
    if (!is_object($data)) throw new ApiError(400, 'json', 'Это не JSON-объект: ' . json_last_error_msg());
    foreach (['recipes', 'ingredients'] as $k) if (isset($data->$k) && !is_array($data->$k)) throw new ApiError(400, 'json', 'Поле ' . $k . ' должно быть списком.');
    if (!isset($data->recipes) && !isset($data->ingredients)) throw new ApiError(400, 'json', 'В файле нет полей recipes и ingredients.');
    check_base($path, $b['baseHash'] ?? null);
    backup_file($name);
    write_atomic($path, $content);
    send_json(['saved' => true, 'hash' => sha1_file($path), 'mtime' => filemtime($path) * 1000]);
}
function admin_file_delete(array $b): void {
    $name = (string)($b['name'] ?? ''); $path = catalog_path($name);
    check_base($path, $b['baseHash'] ?? null);
    backup_file($name);
    if (!@unlink($path)) throw new ApiError(500, 'write', 'Не удалось удалить файл.');
    send_json(['deleted' => true]);
}
function admin_backups(string $name): void {
    catalog_path($name);
    $list = [];
    foreach (glob(backups_dir() . '/' . $name . '.*.bak') ?: [] as $p) $list[] = ['id' => basename($p), 'mtime' => filemtime($p) * 1000, 'size' => filesize($p)];
    usort($list, function ($a, $b) { return strcmp($b['id'], $a['id']); });
    send_json(['backups' => $list]);
}
function admin_backup_restore(array $b): void {
    $name = (string)($b['name'] ?? ''); $path = catalog_path($name);
    $id = (string)($b['backup'] ?? '');
    if (strpos($id, $name . '.') !== 0 || !preg_match('/^[0-9A-Za-z._-]+\.bak$/', $id) || !is_file(backups_dir() . '/' . $id)) throw new ApiError(404, 'backup', 'Резервная копия не найдена.');
    check_base($path, $b['baseHash'] ?? null);
    backup_file($name);
    write_atomic($path, (string)file_get_contents(backups_dir() . '/' . $id));
    send_json(['restored' => true, 'hash' => sha1_file($path)]);
}
function admin_hidden(array $b): void {
    $ids = $b['ids'] ?? null;
    if (!is_array($ids) || count($ids) > 3000) throw new ApiError(400, 'validation', 'Неверный список.');
    $clean = [];
    foreach ($ids as $id) if (is_string($id) && strlen($id) <= 60 && preg_match(RECIPE_ID, $id)) $clean[$id] = true;
    set_setting('hidden', array_keys($clean));
    send_json(['hidden' => array_keys($clean)]);
}

// ---------- Photos: photos/<recipe-id>.jpg ----------
// Recipe photos are illustrations made by a neural network unless the owner marks a photo as a real one.
function real_photos(): array { try { $v = setting('photo_real', []); return array_values(array_filter((array)$v, 'is_string')); } catch (Throwable $e) { return []; } }
function admin_photo_real(array $b): void {
    $id = (string)($b['recipeId'] ?? '');
    if (!preg_match(RECIPE_ID, $id) || strlen($id) > 60) throw new ApiError(400, 'validation', 'Неверный рецепт.');
    $list = array_values(array_diff(real_photos(), [$id]));
    if (!empty($b['real'])) $list[] = $id;
    set_setting('photo_real', array_slice($list, -2000));
    send_json(['realPhotos' => $list]);
}
function photo_versions(): array {
    $out = [];
    foreach (glob(photos_dir() . '/*.jpg') ?: [] as $p) { $id = basename($p, '.jpg'); if (preg_match(RECIPE_ID, $id)) $out[$id] = filemtime($p); }
    return $out;
}
function admin_photo_upload(): void {
    $id = (string)($_POST['recipeId'] ?? '');
    if (!preg_match(RECIPE_ID, $id) || strlen($id) > 60) throw new ApiError(400, 'validation', 'Неверный рецепт.');
    $f = $_FILES['photo'] ?? null;
    if (!upload_ok($f)) throw new ApiError(400, 'upload', 'Фото не загрузилось. Попробуйте файл поменьше.');
    if ($f['size'] <= 0 || $f['size'] > 6 * 1024 * 1024) throw new ApiError(413, 'upload', 'Фото должно быть до 6 МБ.');
    $head = (string)file_get_contents($f['tmp_name'], false, null, 0, 3);
    if ($head !== "\xFF\xD8\xFF") throw new ApiError(415, 'upload', 'Нужен файл JPEG.');
    if (function_exists('getimagesize')) { $info = @getimagesize($f['tmp_name']); if (!$info || $info[2] !== IMAGETYPE_JPEG || $info[0] > 8000 || $info[1] > 8000) throw new ApiError(415, 'upload', 'Файл не похож на фото JPEG.'); }
    $dir = photos_dir();
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) throw new ApiError(500, 'write', 'Нет папки photos.');
    $tmp = $dir . '/.upload-' . bin2hex(random_bytes(4));
    if (!upload_move($f['tmp_name'], $tmp)) throw new ApiError(500, 'write', 'Не удалось сохранить фото. Проверьте права на папку photos.');
    @chmod($tmp, 0644);
    if (!@rename($tmp, $dir . '/' . $id . '.jpg')) { @unlink($tmp); throw new ApiError(500, 'write', 'Не удалось сохранить фото.'); }
    clearstatcache();
    send_json(['saved' => true, 'version' => filemtime($dir . '/' . $id . '.jpg')]);
}
function admin_photo_delete(array $b): void {
    $id = (string)($b['recipeId'] ?? '');
    if (!preg_match(RECIPE_ID, $id)) throw new ApiError(400, 'validation', 'Неверный рецепт.');
    $p = photos_dir() . '/' . $id . '.jpg';
    if (is_file($p) && !@unlink($p)) throw new ApiError(500, 'write', 'Не удалось удалить фото.');
    foreach (glob(photos_dir() . '/s/' . $id . '-*.jpg') ?: [] as $t) @unlink($t);
    send_json(['deleted' => true]);
}

// ---------- Teaching the chat: "this phrase means that need" ----------
const INTENT_IDS = ['comfort','quick','cozy','light','hearty','fresh','spicy','sweet','guests','kids','fasting','sick','romantic','batch','soup','salad','breakfast','baking','meat','fish','no_meat','pantry',
    'greeting','how','who','help','thanks','bye','surprise','more','joke','praise','cooked','rude','offtopic'];
function admin_teach(array $b): void {
    $text = cut((string)($b['text'] ?? ''), 200);
    $label = (string)($b['label'] ?? '');
    $remove = !empty($b['remove']);
    if (norm_text($text) === '') throw new ApiError(400, 'validation', 'Пустая фраза.');
    if (!$remove && !in_array($label, INTENT_IDS, true)) throw new ApiError(400, 'validation', 'Неизвестное значение.');
    $list = array_values(array_filter((array)setting('taught', []), function ($t) use ($text) { return is_array($t) && norm_text((string)($t['text'] ?? '')) !== norm_text($text); }));
    if (!$remove) { array_unshift($list, ['text' => $text, 'label' => $label, 'at' => now_ms()]); $list = array_slice($list, 0, 2000); }
    set_setting('taught', $list);
    send_json(['taught' => $list]);
}
