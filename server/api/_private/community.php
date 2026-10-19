<?php
// What people tell the owner: messages from «Написать нам» in the profile (and the owner's answers), how a dish went (liked it, where it went
// wrong), and the honest numbers shown on a recipe («Готовили 120 раз · 9 из 10 понравилось»). No paid services.
declare(strict_types=1);

// ---------- «Написать нам» ----------
function messages_schema(): void {
    static $done = false;
    if ($done) return;
    $pdo = db();
    $pdo->exec('CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, text TEXT NOT NULL, contact TEXT, kind TEXT, place TEXT, agent TEXT, seen INTEGER NOT NULL DEFAULT 0, key TEXT, reply TEXT, reply_at INTEGER)');
    // Tables made by the first version (before answers): add the new columns.
    $cols = array_column($pdo->query('PRAGMA table_info(messages)')->fetchAll(), 'name');
    foreach (['key' => 'TEXT', 'reply' => 'TEXT', 'reply_at' => 'INTEGER'] as $c => $t) if (!in_array($c, $cols, true)) $pdo->exec("ALTER TABLE messages ADD COLUMN $c $t");
    $done = true;
}

function message_send(array $b): void {
    require_same_origin();
    $text = cut((string)($b['text'] ?? ''), 3000);
    $len = function_exists('mb_strlen') ? mb_strlen($text) : strlen($text);
    if ($len < 3) throw new ApiError(400, 'validation', 'Напишите хотя бы пару слов.');
    if (!bump('msg|' . client_ip() . '|' . date('Y-m-d-H'), 5) || !bump('msg|' . client_ip() . '|' . date('Y-m-d'), 20) || !bump('msg|all|' . date('Y-m-d'), 500))
        throw new ApiError(429, 'limit', 'Сообщений сегодня уже много. Попробуйте завтра.');
    if (is_bot_ua()) { send_json(['saved' => false]); return; }
    messages_schema();
    $kind = in_array($b['kind'] ?? '', ['idea', 'problem', 'like', 'other'], true) ? $b['kind'] : 'other';
    $place = in_array($b['place'] ?? '', ['site', 'app'], true) ? $b['place'] : 'site';
    // The key stays on the person's device: with it (and only with it) the device can read the answer later.
    $key = bin2hex(random_bytes(16));
    db()->prepare('INSERT INTO messages (ts, text, contact, kind, place, agent, key) VALUES (?, ?, ?, ?, ?, ?, ?)')
        ->execute([now_ms(), $text, cut((string)($b['contact'] ?? ''), 120), $kind, $place, cut((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 200), $key]);
    send_json(['saved' => true, 'id' => (int)db()->lastInsertId(), 'key' => $key]);
}

/** The owner's answers to the messages this device sent (each asked for with its id and key). */
function message_replies(array $b): void {
    $items = array_slice(is_array($b['items'] ?? null) ? $b['items'] : [], 0, 50);
    if (!bump('msgr|' . client_ip() . '|' . date('Y-m-d-H'), 120)) { send_json(['replies' => []]); return; }
    messages_schema();
    $st = db()->prepare('SELECT reply, reply_at FROM messages WHERE id = ? AND key = ? AND reply IS NOT NULL');
    $out = [];
    foreach ($items as $it) {
        $id = (int)($it['id'] ?? 0); $key = (string)($it['key'] ?? '');
        if ($id < 1 || !preg_match('/^[0-9a-f]{32}$/', $key)) continue;
        $st->execute([$id, $key]);
        $r = $st->fetch();
        if ($r && trim((string)$r['reply']) !== '') $out[] = ['id' => $id, 'reply' => (string)$r['reply'], 'at' => (int)$r['reply_at']];
    }
    send_json(['replies' => $out]);
}

function admin_messages_list(): array {
    messages_schema();
    $st = db()->query('SELECT id, ts, text, contact, kind, place, agent, seen, reply, reply_at, CASE WHEN key IS NULL THEN 0 ELSE 1 END AS can_reply FROM messages ORDER BY id DESC LIMIT 200');
    return $st ? $st->fetchAll() : [];
}
function admin_message_action(array $b): void {
    messages_schema();
    $id = (int)($b['id'] ?? 0);
    if ($id < 1) throw new ApiError(400, 'validation', 'Нет сообщения.');
    $act = (string)($b['action'] ?? '');
    if ($act === 'delete') db()->prepare('DELETE FROM messages WHERE id = ?')->execute([$id]);
    elseif ($act === 'reply') {
        $reply = cut((string)($b['reply'] ?? ''), 3000);
        db()->prepare('UPDATE messages SET reply = ?, reply_at = ?, seen = 1 WHERE id = ?')->execute([$reply !== '' ? $reply : null, $reply !== '' ? now_ms() : null, $id]);
    }
    else db()->prepare('UPDATE messages SET seen = 1 WHERE id = ?')->execute([$id]);
    send_json(['ok' => true]);
}

// ---------- Numbers on a recipe ----------
// Counted once an hour for all recipes at once (one small query), and only recipes that enough people cooked are
// listed: «Готовили 2 раза» says nothing and can look sad.
const STATS_MIN_COOKED = 5;
const STATS_MIN_RATED = 5;

function recipe_stats(): array {
    $saved = setting('recipe_stats');
    if (is_array($saved) && ($saved['at'] ?? 0) > time() - 3600 && is_array($saved['list'] ?? null)) return $saved['list'];
    $list = [];
    try {
        $pdo = db();
        $cooked = $pdo->query("SELECT recipe_id AS id, COUNT(DISTINCT visitor) AS n FROM events WHERE type = 'cook_done' AND recipe_id IS NOT NULL GROUP BY recipe_id")->fetchAll();
        foreach ($cooked as $r) if ((int)$r['n'] >= STATS_MIN_COOKED) $list[$r['id']] = ['cooked' => (int)$r['n']];
        // A person's latest rating of a dish counts once.
        $rated = $pdo->query("SELECT recipe_id AS id, COUNT(*) AS n, SUM(value) AS liked FROM (
            SELECT e.recipe_id, e.visitor, e.value FROM events e WHERE e.type = 'rate' AND e.recipe_id IS NOT NULL
              AND e.id = (SELECT MAX(x.id) FROM events x WHERE x.type = 'rate' AND x.recipe_id = e.recipe_id AND x.visitor = e.visitor)
        ) GROUP BY recipe_id")->fetchAll();
        foreach ($rated as $r) if ((int)$r['n'] >= STATS_MIN_RATED && isset($list[$r['id']])) { $list[$r['id']]['rated'] = (int)$r['n']; $list[$r['id']]['liked'] = (int)$r['liked']; }
    } catch (Throwable $e) { return is_array($saved['list'] ?? null) ? $saved['list'] : []; }
    set_setting('recipe_stats', ['at' => time(), 'list' => $list]);
    return $list;
}

// ---------- Where a dish went wrong (for the owner) ----------
function admin_troubles(string $from): array {
    $st = db()->prepare("SELECT recipe_id AS id, value AS step, text AS reason, COUNT(DISTINCT visitor) AS n, MAX(ts) AS last FROM events
        WHERE type = 'trouble' AND day >= ? AND recipe_id IS NOT NULL GROUP BY recipe_id, value, text ORDER BY n DESC, last DESC LIMIT 60");
    $st->execute([$from]);
    return $st->fetchAll();
}
function admin_ratings(string $from): array {
    $st = db()->prepare("SELECT recipe_id AS id, SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END) AS liked, SUM(CASE WHEN value = 0 THEN 1 ELSE 0 END) AS disliked FROM events
        WHERE type = 'rate' AND day >= ? AND recipe_id IS NOT NULL GROUP BY recipe_id HAVING disliked > 0 ORDER BY disliked DESC, liked ASC LIMIT 30");
    $st->execute([$from]);
    return $st->fetchAll();
}

// ---------- Fixing one step from «Где не получилось» ----------
/** Where a recipe lives: the catalog file and the decoded file (objects kept as objects, so {} stays {}). */
function catalog_find_recipe(string $id): ?array {
    if (!preg_match(RECIPE_ID, $id) || strlen($id) > 60) return null;
    foreach (catalog_files() as $f) {
        if (isset($f['error']) || strpos((string)$f['raw'], '"' . $id . '"') === false) continue;
        $data = json_decode((string)$f['raw']);
        if (!is_object($data) || !isset($data->recipes) || !is_array($data->recipes)) continue;
        foreach ($data->recipes as $k => $r) if (is_object($r) && ($r->id ?? '') === $id) return ['name' => $f['name'], 'data' => $data, 'index' => $k];
    }
    return null;
}
function admin_recipe_get(string $id): void {
    $hit = catalog_find_recipe($id);
    if (!$hit) throw new ApiError(404, 'recipe', 'Рецепт не найден в файлах каталога.');
    $r = $hit['data']->recipes[$hit['index']];
    send_json(['file' => $hit['name'], 'title' => (string)($r->title ?? $id),
        'steps' => array_values(array_map(fn($s) => is_object($s) ? (string)($s->text ?? '') : '', (array)($r->steps ?? [])))]);
}
function admin_recipe_step(array $b): void {
    $id = (string)($b['id'] ?? ''); $n = (int)($b['step'] ?? 0);
    $text = trim(preg_replace('/\s+/u', ' ', (string)($b['text'] ?? '')) ?? '');
    $len = mb_strlen($text, 'UTF-8');
    if ($len < 5 || $len > 700) throw new ApiError(400, 'validation', 'Текст шага — от 5 до 700 знаков.');
    $hit = catalog_find_recipe($id);
    if (!$hit) throw new ApiError(404, 'recipe', 'Рецепт не найден в файлах каталога.');
    $r = $hit['data']->recipes[$hit['index']];
    if (!isset($r->steps[$n - 1]) || !is_object($r->steps[$n - 1])) throw new ApiError(400, 'validation', 'Нет такого шага.');
    $r->steps[$n - 1]->text = $text;
    $json = json_encode($hit['data'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT | JSON_PRESERVE_ZERO_FRACTION);
    if ($json === false) throw new ApiError(500, 'json', 'Не получилось собрать файл.');
    backup_file($hit['name']);
    write_atomic(catalog_path($hit['name']), $json . "\n");
    send_json(['saved' => true, 'file' => $hit['name']]);
}

// ---------- «Рецепт дня» for the Android home-screen widget ----------
// One dish a day, the same for everybody: a main course or a soup with a photo, not longer than an hour and a half.
/** The dish of a day (today by default): the same for everyone that day — the widget, the VK post. */
function recipe_of_day(?int $ts = null): ?array {
    $ts = $ts ?? time();
    $hidden = []; try { $hidden = array_flip(array_map('strval', (array)setting('hidden', []))); } catch (Throwable $e) {}
    $photos = photo_versions();
    $pool = []; $seen = [];
    foreach (catalog_files() as $f) {
        if (isset($f['error'])) continue;
        foreach ((array)($f['data']['recipes'] ?? []) as $r) {
            $id = (string)($r['id'] ?? '');
            if ($id === '' || isset($seen[$id]) || isset($hidden[$id]) || !isset($photos[$id])) continue;
            $seen[$id] = true;
            $course = (string)($r['course'] ?? '');
            if (!in_array($course, ['main', 'soup'], true) || (int)($r['totalMinutes'] ?? 999) > 90 || ($r['difficulty'] ?? '') === 'hard') continue;
            $pool[] = $r;
        }
    }
    if (!$pool) return null;
    usort($pool, fn($a, $b) => strcmp((string)$a['id'], (string)$b['id']));
    $r = $pool[(((int)date('Y', $ts)) * 400 + ((int)date('n', $ts)) * 31 + (int)date('j', $ts)) * 7919 % count($pool)];
    $id = (string)$r['id']; $v = $photos[$id];
    $base = (is_https() ? 'https://' : 'http://') . strtolower(preg_match('/^[a-z0-9.-]+(:\d{1,5})?$/i', (string)($_SERVER['HTTP_HOST'] ?? '')) ? $_SERVER['HTTP_HOST'] : 'treas.su')
        . rtrim(str_replace('\\', '/', dirname(dirname((string)($_SERVER['SCRIPT_NAME'] ?? '/cook/api/index.php')))), '/') . '/';
    return ['id' => $id, 'title' => (string)$r['title'], 'minutes' => (int)($r['totalMinutes'] ?? 0), 'day' => date('Y-m-d', $ts),
        'summary' => (string)($r['summary'] ?? ''), 'servings' => (int)($r['servings'] ?? 0),
        'photo' => $base . (is_file(thumbs_dir() . '/' . $id . '-' . $v . '.jpg') ? 'photos/s/' . $id . '-' . $v . '.jpg' : 'api/index.php?r=thumb&id=' . rawurlencode($id) . '&v=' . $v),
        // The photo itself, full size (for a post put by hand: the card copy is too small).
        'photoFull' => $base . 'photos/' . rawurlencode($id) . '.jpg?v=' . $v,
        'url' => $base . 'recipe/' . $id];
}
