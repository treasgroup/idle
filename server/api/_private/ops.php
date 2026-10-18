<?php
// Looking after the site without cron: a daily copy of the database, errors from people's phones,
// and the numbers the owner needs (how many cook to the end, how many come back). No paid services.
declare(strict_types=1);

const BACKUPS_KEEP = 7;

function db_backups_dir(): string { return rtrim(config()['storage_dir'], '/\\') . '/backups'; }

/** Once a day, after some request has been answered: a consistent copy of the database; the last 7 are kept. */
function backup_daily(): void {
    $today = date('Y-m-d');
    if (setting('backup_day') === $today) return;
    $dir = db_backups_dir();
    if (!is_dir($dir) && !@mkdir($dir, 0700, true)) return;
    $lock = @fopen($dir . '/.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) return;
    try {
        if (setting('backup_day') === $today) return;
        $file = $dir . '/what-to-cook-' . $today . '.sqlite';
        if (!is_file($file)) {
            try { db()->exec('VACUUM INTO ' . db()->quote($file)); }
            catch (Throwable $e) {
                // Older SQLite without VACUUM INTO: a plain copy (the database is small and writes are short).
                @copy(rtrim(config()['storage_dir'], '/\\') . '/what-to-cook.sqlite', $file);
            }
            @chmod($file, 0600);
        }
        if (is_file($file)) set_setting('backup_day', $today);
        $all = glob($dir . '/what-to-cook-*.sqlite') ?: [];
        rsort($all);
        foreach (array_slice($all, BACKUPS_KEEP) as $old) @unlink($old);
    } finally { flock($lock, LOCK_UN); fclose($lock); }
}

function backups_list(): array {
    $out = [];
    foreach (glob(db_backups_dir() . '/what-to-cook-*.sqlite') ?: [] as $p) $out[] = ['name' => basename($p), 'size' => filesize($p), 'mtime' => filemtime($p) * 1000];
    usort($out, fn($a, $b) => $b['mtime'] <=> $a['mtime']);
    return $out;
}

// ---------- Errors from people's browsers ----------
function errors_schema(): void {
    db()->exec('CREATE TABLE IF NOT EXISTS client_errors (key TEXT PRIMARY KEY, day TEXT NOT NULL, message TEXT NOT NULL, place TEXT, version TEXT, agent TEXT, n INTEGER NOT NULL, last INTEGER NOT NULL)');
}

/** One row per error per day (repeats only add to the count), so a loop on one phone cannot fill the base. */
function client_error(array $b): void {
    require_same_origin();
    $msg = trim((string)($b['message'] ?? ''));
    if ($msg === '' || strlen($msg) > 2000) throw new ApiError(400, 'validation', 'Нет текста ошибки.');
    if (!bump('err|' . client_ip() . '|' . date('Y-m-d-H'), 30) || !bump('err|all|' . date('Y-m-d'), 3000)) { send_json(['saved' => false]); return; }
    errors_schema();
    $cut = fn($v, $n) => mb_substr(trim((string)$v), 0, $n);
    $place = $cut($b['place'] ?? '', 300);
    $day = date('Y-m-d');
    $key = substr(hash('sha256', $day . '|' . $msg . '|' . $place), 0, 32);
    // Works on old SQLite too (no UPSERT): add the row if new, then count it.
    db()->prepare('INSERT OR IGNORE INTO client_errors (key, day, message, place, version, agent, n, last) VALUES (?, ?, ?, ?, ?, ?, 0, ?)')
        ->execute([$key, $day, $cut($msg, 500), $place, $cut($b['version'] ?? '', 20), $cut($_SERVER['HTTP_USER_AGENT'] ?? '', 200), now_ms()]);
    db()->prepare('UPDATE client_errors SET n = n + 1, last = ? WHERE key = ?')->execute([now_ms(), $key]);
    if (mt_rand(1, 50) === 1) db()->prepare('DELETE FROM client_errors WHERE day < ?')->execute([date('Y-m-d', time() - 30 * 86400)]);
    send_json(['saved' => true]);
}

// ---------- Where people get lost: taps on things that are not buttons, and rapid repeated taps ----------
// The page sends a short label of what was tapped (a heading, a picture) and the section — no texts people typed.
function taps_schema(): void {
    db()->exec('CREATE TABLE IF NOT EXISTS ux_taps (key TEXT PRIMARY KEY, day TEXT NOT NULL, route TEXT NOT NULL, kind TEXT NOT NULL, label TEXT NOT NULL, n INTEGER NOT NULL, last INTEGER NOT NULL)');
}
function client_taps(array $b): void {
    require_same_origin();
    $list = array_slice(is_array($b['taps'] ?? null) ? $b['taps'] : [], 0, 20);
    if (!$list) { send_json(['saved' => 0]); return; }
    if (!bump('taps|' . client_ip() . '|' . date('Y-m-d-H'), 60) || !bump('taps|all|' . date('Y-m-d'), 20000)) { send_json(['saved' => 0]); return; }
    taps_schema();
    $day = date('Y-m-d'); $n = 0;
    foreach ($list as $t) {
        if (!is_array($t)) continue;
        $kind = in_array($t['kind'] ?? '', ['dead', 'rage'], true) ? $t['kind'] : null;
        $route = mb_substr(preg_replace('/[^a-z0-9:_-]/', '', strtolower((string)($t['route'] ?? ''))), 0, 40);
        $label = mb_substr(trim(preg_replace('/\s+/u', ' ', (string)($t['label'] ?? ''))), 0, 60);
        if (!$kind || $route === '' || $label === '') continue;
        $key = substr(hash('sha256', $day . '|' . $route . '|' . $kind . '|' . $label), 0, 32);
        db()->prepare('INSERT OR IGNORE INTO ux_taps (key, day, route, kind, label, n, last) VALUES (?, ?, ?, ?, ?, 0, ?)')->execute([$key, $day, $route, $kind, $label, now_ms()]);
        db()->prepare('UPDATE ux_taps SET n = n + 1, last = ? WHERE key = ?')->execute([now_ms(), $key]);
        $n++;
    }
    if (mt_rand(1, 50) === 1) db()->prepare('DELETE FROM ux_taps WHERE day < ?')->execute([date('Y-m-d', time() - 60 * 86400)]);
    send_json(['saved' => $n]);
}

// ---------- The owner's view: funnel, return, errors, «Не то», copies ----------
function admin_insights(int $days): void {
    $days = max(1, min(90, $days));
    $from = date('Y-m-d', time() - ($days - 1) * 86400);
    $pdo = db();
    $one = function (string $sql, array $args = []) use ($pdo) { $st = $pdo->prepare($sql); $st->execute($args); return $st->fetchColumn(); };
    $all = function (string $sql, array $args = []) use ($pdo) { $st = $pdo->prepare($sql); $st->execute($args); return $st->fetchAll(); };
    $people = fn(string $types) => (int)$one("SELECT COUNT(DISTINCT visitor) FROM events WHERE day >= ? AND type IN ($types)", [$from]);
    $funnel = [
        ['label' => 'Зашли на сайт', 'n' => $people("'visit','query','open'")],
        ['label' => 'Открыли рецепт', 'n' => $people("'open'")],
        ['label' => 'Начали готовить', 'n' => $people("'cook_start'")],
        ['label' => 'Дошли до «Готово!»', 'n' => $people("'cook_done'")],
    ];
    // Came back: people whose first day was at least N days ago, and how many of them were seen N days later or more.
    $returned = function (int $n) use ($one, $from) {
        $cut = date('Y-m-d', time() - $n * 86400);
        $base = (int)$one('SELECT COUNT(*) FROM (SELECT visitor, MIN(day) AS first FROM events GROUP BY visitor) f WHERE f.first >= ? AND f.first <= ?', [$from, $cut]);
        $back = (int)$one("SELECT COUNT(*) FROM (SELECT visitor, MIN(day) AS first FROM events GROUP BY visitor) f
            WHERE f.first >= ? AND f.first <= ? AND EXISTS (SELECT 1 FROM events e WHERE e.visitor = f.visitor AND e.day >= date(f.first, '+$n day'))", [$from, $cut]);
        return ['base' => $base, 'back' => $back];
    };
    errors_schema();
    send_json([
        'days' => $days,
        'funnel' => $funnel,
        'return1' => $returned(1),
        'return7' => $returned(7),
        'wrong' => $all("SELECT norm AS text, COUNT(*) AS n, MAX(ts) AS last FROM events WHERE type = 'wrong' AND day >= ? GROUP BY norm ORDER BY n DESC, last DESC LIMIT 50", [$from]),
        'shares' => (int)$one("SELECT COUNT(*) FROM events WHERE type = 'share' AND day >= ?", [$from]),
        'errors' => $all('SELECT day, message, place, version, agent, n, last FROM client_errors WHERE day >= ? ORDER BY last DESC LIMIT 60', [$from]),
        'taps' => (function () use ($all, $from) { taps_schema(); return $all('SELECT route, kind, label, SUM(n) AS n, MAX(last) AS last FROM ux_taps WHERE day >= ? GROUP BY route, kind, label ORDER BY n DESC, last DESC LIMIT 40', [$from]); })(),
        'backups' => backups_list(),
        'messages' => admin_messages_list(),
        'troubles' => admin_troubles($from),
        'ratings' => admin_ratings($from),
    ]);
}

// ---------- Photos for cards: a smaller copy made once ----------
// Cards are 50–360 px wide; shrinking a 1400 px photo that much in the browser costs bandwidth on a slow line and
// looks grainy in some browsers. photos/s/<id>-<version>.jpg is made from the owner's photo on first request
// (a new photo has a new version, so its copy is made again); the photo page itself keeps the full photo.
const THUMB_W = 640;
function thumbs_dir(): string { return photos_dir() . '/s'; }
/** Ids whose copy for the current photo already exists (the app then asks for the plain file). */
function thumb_ready(array $versions): array {
    $out = [];
    foreach ($versions as $id => $v) if (is_file(thumbs_dir() . '/' . $id . '-' . $v . '.jpg')) $out[] = (string)$id;
    return $out;
}
function thumb_make(string $src, string $dst): bool {
    if (!function_exists('imagecreatefromjpeg') || !function_exists('imagecopyresampled')) return false;
    $dir = dirname($dst);
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) return false;
    $img = @imagecreatefromjpeg($src);
    if (!$img) return false;
    $w = imagesx($img); $h = imagesy($img);
    if ($w > THUMB_W) {
        $nh = (int)round($h * THUMB_W / $w);
        $out = imagecreatetruecolor(THUMB_W, $nh);
        imagecopyresampled($out, $img, 0, 0, 0, 0, THUMB_W, $nh, $w, $h);
        imagedestroy($img); $img = $out;
    }
    imageinterlace($img, true);
    $tmp = $dst . '.' . bin2hex(random_bytes(4)) . '.tmp';
    $ok = @imagejpeg($img, $tmp, 84) && @rename($tmp, $dst);
    imagedestroy($img);
    if (!$ok) @unlink($tmp);
    return $ok;
}
function photo_thumb(string $id): void {
    $src = photos_dir() . '/' . $id . '.jpg';
    if (!preg_match(RECIPE_ID, $id) || strlen($id) > 60 || !is_file($src)) { http_response_code(404); header('Content-Type: text/plain; charset=utf-8'); echo 'Нет фото.'; return; }
    $v = (string)filemtime($src);
    $dst = thumbs_dir() . '/' . $id . '-' . $v . '.jpg';
    if (!is_file($dst) && thumb_make($src, $dst)) {
        foreach (glob(thumbs_dir() . '/' . $id . '-*.jpg') ?: [] as $old) if ($old !== $dst) @unlink($old);
    }
    $file = is_file($dst) ? $dst : $src; // no image library on the hosting: the full photo, as before
    header('Content-Type: image/jpeg');
    header('Cache-Control: public, max-age=31536000, immutable');
    header('Content-Length: ' . filesize($file));
    readfile($file);
}

// ---------- What the catalog looks like now, in 16 letters ----------
// Changes when a recipe file, a hidden or taught item, or a photo changes (card copies of photos do not count:
// the app asks the server for any copy it does not know yet).
function catalog_version(): string {
    $parts = [];
    foreach (glob(catalog_dir() . '/*.json') ?: [] as $p) $parts[] = basename($p) . ':' . filemtime($p) . ':' . filesize($p);
    try { $parts[] = json_encode(setting('hidden', [])); $parts[] = json_encode(setting('taught', [])); } catch (Throwable $e) {}
    $parts[] = json_encode(photo_versions());
    $parts[] = json_encode(real_photos());
    return substr(sha1(implode('|', $parts)), 0, 16);
}
