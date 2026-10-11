<?php
// Shared helpers: config, JSON responses, same-origin check, sessions and daily limits (SQLite).
// Compatible with PHP 7.4+.

class ApiError extends Exception {
    public $status; public $codeName;
    public function __construct(int $status, string $code, string $message) { parent::__construct($message); $this->status = $status; $this->codeName = $code; }
}

function config(): array {
    static $config = null;
    if ($config !== null) return $config;
    $defaults = [
        'intent_provider' => 'none', 'speech_provider' => 'none',
        'cloudflare' => ['account_id' => '', 'api_token' => '', 'intent_model' => '@cf/meta/llama-3.1-8b-instruct'],
        'daily_limit' => 100, 'per_visitor_daily_limit' => 30, 'per_visitor_speech_limit' => 10,
        'storage_dir' => __DIR__ . '/storage',
        'admin_password_hash' => '', 'admin_password' => '',
        'timezone' => 'Asia/Yekaterinburg',
        'partners' => [],
        'telegram' => ['token' => '', 'secret' => ''],
        'alice' => ['skill_id' => ''],
    ];
    $file = __DIR__ . '/config.php';
    $user = is_file($file) ? require $file : [];
    if (!is_array($user)) $user = [];
    $config = array_replace_recursive($defaults, $user);
    @date_default_timezone_set((string)$config['timezone']) || date_default_timezone_set('UTC');
    return $config;
}

function send_json($data, int $status = 200, array $headers = []): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    foreach ($headers as $h) header($h, false);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function fail(Throwable $e): void {
    if ($e instanceof ApiError) { send_json(['error' => $e->getMessage(), 'code' => $e->codeName], $e->status); return; }
    error_log('[what-to-cook] ' . $e->getMessage());
    // A short technical reason (without file paths) helps to find a broken file after an upload.
    $detail = get_class($e) . ': ' . preg_replace('~(/[^\s:]+)+/~', '', mb_substr($e->getMessage(), 0, 160));
    send_json(['error' => 'Сервис временно недоступен. Попробуйте позже или выберите условия вручную.', 'code' => 'service_unavailable', 'detail' => $detail], 503);
}

function is_https(): bool {
    if (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off') return true;
    if (($_SERVER['SERVER_PORT'] ?? '') == 443) return true;
    return strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
}

function require_same_origin(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $host = $_SERVER['HTTP_HOST'] ?? '';
    // The Android app (RuStore) sends its requests from the phone itself: no Origin, but the X-Cook-App
    // header. A page of another site cannot add that header without our permission (CORS), so it is safe.
    if (($_SERVER['HTTP_X_COOK_APP'] ?? '') !== '' && in_array($origin, ['', 'https://localhost', 'http://localhost'], true)) return;
    if ($origin === '' || $host === '') throw new ApiError(403, 'origin', 'Запрос разрешён только с этого сайта.');
    $parts = parse_url($origin);
    $originHost = ($parts['host'] ?? '') . (isset($parts['port']) ? ':' . $parts['port'] : '');
    if (strcasecmp($originHost, $host) !== 0) throw new ApiError(403, 'origin', 'Запрос разрешён только с этого сайта.');
}

function read_json_body(int $maxBytes = 18000): array {
    $type = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($type, 'application/json') === false) throw new ApiError(415, 'format', 'Нужен JSON.');
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > $maxBytes) throw new ApiError(413, 'too_large', 'Запрос слишком большой.');
    $raw = file_get_contents('php://input', false, null, 0, $maxBytes + 1);
    if ($raw === false || strlen($raw) > $maxBytes) throw new ApiError(413, 'too_large', 'Запрос слишком большой.');
    $data = json_decode($raw, true);
    if (!is_array($data)) throw new ApiError(400, 'json', 'Некорректный запрос.');
    return $data;
}

// ---------- Database ----------
function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    if (!class_exists('PDO') || !in_array('sqlite', PDO::getAvailableDrivers(), true)) throw new ApiError(503, 'database', 'На хостинге нет SQLite (pdo_sqlite). ИИ-функции отключены, подбор по условиям работает.');
    $dir = rtrim(config()['storage_dir'], '/\\');
    if (!is_dir($dir) && !@mkdir($dir, 0700, true)) throw new ApiError(503, 'database', 'Не удалось создать папку для базы.');
    $pdo = new PDO('sqlite:' . $dir . '/what-to-cook.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_TIMEOUT => 5]);
    $pdo->exec('PRAGMA busy_timeout = 5000');
    $pdo->exec('CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS operations (session_id TEXT NOT NULL, id TEXT NOT NULL, kind TEXT NOT NULL, hash TEXT NOT NULL, status TEXT NOT NULL, result TEXT, created_at INTEGER NOT NULL, PRIMARY KEY (session_id, id))');
    $pdo->exec('CREATE TABLE IF NOT EXISTS usage (key TEXT PRIMARY KEY, count INTEGER NOT NULL)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS feedback (session_id TEXT NOT NULL, id TEXT NOT NULL, recipe_id TEXT NOT NULL, value TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (session_id, id))');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_operations_created ON operations(created_at)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, day TEXT NOT NULL, visitor TEXT NOT NULL, type TEXT NOT NULL, recipe_id TEXT, text TEXT, norm TEXT, value INTEGER, source TEXT)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_events_day ON events(day, type)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_events_visitor ON events(visitor, day)');
    // Where a visit came from (ref: Яндекс, ВК…) and what it opened first (entry); added in 0.33.3.
    $cols = $pdo->query('PRAGMA table_info(events)')->fetchAll(PDO::FETCH_COLUMN, 1);
    if (!in_array('ref', $cols, true)) $pdo->exec('ALTER TABLE events ADD COLUMN ref TEXT');
    if (!in_array('entry', $cols, true)) $pdo->exec('ALTER TABLE events ADD COLUMN entry TEXT');
    // Views of the plain recipe pages (recipe.php) by people, counted per day and source; no visitor ids.
    $pdo->exec('CREATE TABLE IF NOT EXISTS page_views (day TEXT NOT NULL, recipe_id TEXT NOT NULL, ref TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, recipe_id, ref))');
    $pdo->exec('CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    return $pdo;
}
// Search robots, link previews and test browsers are not people: their visits are not counted.
// Google and Yandex run the site like a phone browser, so without this they look like a crowd of new visitors.
const BOT_UA = '/bot\\b|bot\\/|crawl|spider|slurp|yandex(bot|images|metrika|accessibility|renderresources|direct|mobilebot|webmaster|turbo|video|news|blogs|market|favicons)|googlebot|google-(inspectiontool|read-aloud|site-verification|structured|extended)|adsbot|mediapartners|apis-google|feedfetcher|lighthouse|pagespeed|chrome-lighthouse|headlesschrome|phantomjs|puppeteer|playwright|selenium|bingpreview|facebookexternalhit|vkshare|vk\\.com\\/dev|telegrambot|whatsapp|discordbot|skypeuripreview|petalbot|ahrefs|semrush|mj12|dotbot|bytespider|amazonbot|applebot|duckduckbot|baiduspider|sogou|exabot|ia_archiver|archive\\.org|python-requests|curl\\/|wget\\/|go-http-client|okhttp|java\\//i';
function is_bot_ua(?string $ua = null): bool { $ua = $ua ?? (string)($_SERVER['HTTP_USER_AGENT'] ?? ''); return $ua === '' || (bool)preg_match(BOT_UA, $ua); }
// A referring site as a short key for the statistics: yandex, google, vk, telegram… or the bare host for others.
function ref_key(string $url): string {
    $host = strtolower((string)parse_url($url, PHP_URL_HOST));
    if ($host === '') return 'direct';
    $host = preg_replace('/^(www|m|l)\./', '', $host);
    $map = ['yandex' => '/(^|\.)(yandex\.[a-z.]+|ya\.ru)$/', 'google' => '/(^|\.)google\.[a-z.]+$/', 'bing' => '/(^|\.)bing\.com$/', 'mail' => '/(^|\.)(mail\.ru|go\.mail\.ru)$/',
        'vk' => '/(^|\.)(vk\.com|vk\.ru|vkontakte\.ru)$/', 'telegram' => '/(^|\.)(t\.me|telegram\.org|telegram\.me)$/', 'ok' => '/(^|\.)ok\.ru$/', 'max' => '/(^|\.)max\.ru$/',
        'whatsapp' => '/(^|\.)(whatsapp\.com|wa\.me)$/', 'dzen' => '/(^|\.)dzen\.ru$/', 'rustore' => '/(^|\.)rustore\.ru$/'];
    foreach ($map as $k => $re) if (preg_match($re, $host)) return $k;
    $own = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
    if ($own !== '' && $host === preg_replace('/:\d+$/', '', $own)) return 'treas';
    return substr(preg_replace('/[^a-z0-9.-]/', '', $host), 0, 60);
}

function now_ms(): int { return (int) floor(microtime(true) * 1000); }

// ---------- Sessions ----------
function cookie_path(): string {
    // The site may live in a subfolder: /cook/api/index.php -> cookie path /cook/
    $dir = dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/api/index.php'));
    $dir = str_replace('\\', '/', $dir);
    return rtrim($dir, '/') . '/';
}
function session_id_from_cookie(): ?string {
    $id = $_COOKIE['cook_session'] ?? '';
    return preg_match('/^[0-9a-f]{64}$/', $id) ? $id : null;
}
function current_session(): string {
    $id = session_id_from_cookie();
    if (!$id) throw new ApiError(401, 'session', 'Обновите страницу, чтобы начать сессию.');
    $st = db()->prepare('SELECT id FROM sessions WHERE id = ? AND expires_at > ?');
    $st->execute([$id, now_ms()]);
    if (!$st->fetch()) throw new ApiError(401, 'session', 'Сессия истекла. Обновите страницу.');
    return $id;
}
function create_session(): void {
    require_same_origin();
    try { current_session(); send_json(['ready' => true]); return; } catch (ApiError $e) { if ($e->status !== 401) throw $e; }
    $id = bin2hex(random_bytes(32));
    $now = now_ms();
    db()->prepare('INSERT INTO sessions (id, created_at, expires_at) VALUES (?, ?, ?)')->execute([$id, $now, $now + 86400000]);
    setcookie('cook_session', $id, ['expires' => time() + 86400, 'path' => cookie_path(), 'secure' => is_https(), 'httponly' => true, 'samesite' => 'Strict']);
    if (mt_rand(1, 20) === 1) cleanup();
    send_json(['ready' => true]);
}
function cleanup(): void {
    $pdo = db(); $now = now_ms();
    $pdo->prepare('DELETE FROM operations WHERE created_at < ?')->execute([$now - 86400000]);
    $pdo->prepare('DELETE FROM sessions WHERE expires_at < ?')->execute([$now]);
    $pdo->prepare('DELETE FROM usage WHERE key NOT LIKE ? AND key NOT LIKE ?')->execute(['%|' . gmdate('Y-m-d'), '%|' . date('Y-m-d') . '%']);
    $pdo->prepare('DELETE FROM feedback WHERE created_at < ?')->execute([$now - 400 * 86400000]);
    $pdo->prepare('DELETE FROM events WHERE ts < ?')->execute([$now - 400 * 86400000]);
    $pdo->prepare('DELETE FROM page_views WHERE day < ?')->execute([date('Y-m-d', time() - 400 * 86400)]);
    if (function_exists('accounts_cleanup')) { try { accounts_cleanup(); } catch (Throwable $e) {} }
}

// ---------- Paid operation: idempotent, rate-limited call to an AI provider ----------
// The same operationId never triggers a second provider call; the stored result is returned instead.
function paid_operation(string $opId, string $kind, string $hash, callable $run) {
    $sid = current_session();
    $pdo = db(); $now = now_ms(); $cfg = config();
    $pdo->exec('BEGIN IMMEDIATE');
    try {
        $st = $pdo->prepare('SELECT hash, kind, status, result, created_at FROM operations WHERE session_id = ? AND id = ?');
        $st->execute([$sid, $opId]);
        $row = $st->fetch();
        if ($row) {
            $pdo->exec('COMMIT');
            if ($row['hash'] !== $hash || $row['kind'] !== $kind) throw new ApiError(409, 'operation_conflict', 'Этот запрос уже использован для другого действия.');
            if ($row['status'] === 'done' && $row['result']) return json_decode($row['result'], true);
            if ($row['status'] === 'failed' && $row['result']) { $r = json_decode($row['result'], true); throw new ApiError((int)$r['status'], (string)$r['code'], (string)$r['error']); }
            throw new ApiError(409, 'operation_pending', ($now - (int)$row['created_at'] > 60000) ? 'Результат предыдущего запроса неизвестен. Отправьте новый запрос.' : 'Этот запрос ещё обрабатывается.');
        }
        $running = $pdo->prepare("SELECT COUNT(*) FROM operations WHERE status = 'running' AND created_at > ?");
        $running->execute([$now - 60000]);
        if ((int)$running->fetchColumn() >= 5) throw new ApiError(429, 'concurrency', 'Сервис занят. Попробуйте через минуту.');
        $day = gmdate('Y-m-d');
        $limits = [
            ['global|' . $day, max(1, min(100000, (int)$cfg['daily_limit']))],
            [$sid . '|' . $day, max(1, (int)$cfg['per_visitor_daily_limit'])],
            [$sid . '|' . $kind . '|' . $day, $kind === 'speech' ? max(1, (int)$cfg['per_visitor_speech_limit']) : max(1, (int)$cfg['per_visitor_daily_limit'])],
        ];
        foreach ($limits as [$key, $max]) {
            $c = $pdo->prepare('SELECT count FROM usage WHERE key = ?'); $c->execute([$key]);
            $count = (int)($c->fetchColumn() ?: 0);
            if ($count >= $max) throw new ApiError(429, 'daily_limit', 'Дневной лимит ИИ исчерпан. Подбор по условиям остаётся доступным.');
        }
        foreach ($limits as [$key, $max]) { // portable upsert (old SQLite versions on shared hosting lack ON CONFLICT)
            $pdo->prepare('INSERT OR IGNORE INTO usage (key, count) VALUES (?, 0)')->execute([$key]);
            $pdo->prepare('UPDATE usage SET count = count + 1 WHERE key = ?')->execute([$key]);
        }
        $pdo->prepare("INSERT INTO operations (session_id, id, kind, hash, status, created_at) VALUES (?, ?, ?, ?, 'running', ?)")->execute([$sid, $opId, $kind, $hash, $now]);
        $pdo->exec('COMMIT');
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->exec('ROLLBACK');
        throw $e;
    }
    try {
        $result = $run();
        $encoded = json_encode($result, JSON_UNESCAPED_UNICODE);
        if (strlen($encoded) > 80000) throw new ApiError(502, 'provider', 'Получен слишком большой ответ.');
        $pdo->prepare("UPDATE operations SET status = 'done', result = ? WHERE session_id = ? AND id = ?")->execute([$encoded, $sid, $opId]);
        return $result;
    } catch (Throwable $e) {
        $err = $e instanceof ApiError ? $e : new ApiError(503, 'provider', 'Не удалось связаться с ИИ. Попробуйте снова или выберите условия.');
        if (!($e instanceof ApiError)) error_log('[what-to-cook] provider: ' . $e->getMessage());
        $pdo->prepare("UPDATE operations SET status = 'failed', result = ? WHERE session_id = ? AND id = ?")->execute([json_encode(['status' => $err->status, 'code' => $err->codeName, 'error' => $err->getMessage()], JSON_UNESCAPED_UNICODE), $sid, $opId]);
        throw $err;
    }
}

// ---------- Data: recipe catalog = all data/catalog/*.json files at the site root ----------
function catalog_dir(): string { return dirname(__DIR__, 2) . '/data/catalog'; }
// Raw files, in name order. Broken JSON is reported, not hidden.
function catalog_files(): array {
    static $files = null;
    if ($files !== null) return $files;
    $files = [];
    $paths = glob(catalog_dir() . '/*.json') ?: [];
    sort($paths, SORT_STRING);
    foreach ($paths as $path) {
        $raw = (string)file_get_contents($path);
        if (substr($raw, 0, 3) === "\xEF\xBB\xBF") $raw = substr($raw, 3); // BOM from Windows editors
        $data = json_decode($raw, true);
        $files[] = is_array($data) ? ['name' => basename($path), 'raw' => $raw, 'data' => $data] : ['name' => basename($path), 'error' => 'JSON не читается: ' . json_last_error_msg()];
    }
    return $files;
}
function catalog_recipes(): array { $out = []; foreach (catalog_files() as $f) foreach (($f['data']['recipes'] ?? []) as $r) if (is_array($r) && isset($r['id'])) $out[(string)$r['id']] = $r; return array_values($out); }
function catalog_ingredients(): array { $out = []; foreach (catalog_files() as $f) foreach (($f['data']['ingredients'] ?? []) as $i) if (is_array($i) && isset($i['id'], $i['name'])) $out[(string)$i['id']] = $i; return $out; }
// Ingredients that are used in recipes, for the AI prompt.
function ingredient_list(): array {
    $all = catalog_ingredients(); $used = [];
    foreach (catalog_recipes() as $r) foreach (($r['ingredients'] ?? []) as $i) if (isset($all[$i['id'] ?? ''])) $used[$i['id']] = $all[$i['id']];
    return array_values(array_map(function ($i) { return ['id' => $i['id'], 'name' => $i['name'], 'aliases' => (array)($i['aliases'] ?? [])]; }, $used));
}
function is_uuid($v): bool { return is_string($v) && (bool)preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $v); }
