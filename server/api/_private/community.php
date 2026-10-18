<?php
// What people tell the owner: messages from «Написать нам» in the profile, how a dish went (liked it, where it went
// wrong), and the honest numbers shown on a recipe («Готовили 120 раз · 9 из 10 понравилось»). No paid services.
declare(strict_types=1);

// ---------- «Написать нам» ----------
function messages_schema(): void {
    db()->exec('CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, text TEXT NOT NULL, contact TEXT, kind TEXT, place TEXT, agent TEXT, seen INTEGER NOT NULL DEFAULT 0)');
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
    db()->prepare('INSERT INTO messages (ts, text, contact, kind, place, agent) VALUES (?, ?, ?, ?, ?, ?)')
        ->execute([now_ms(), $text, cut((string)($b['contact'] ?? ''), 120), $kind, $place, cut((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 200)]);
    send_json(['saved' => true]);
}

function admin_messages_list(): array {
    messages_schema();
    $st = db()->query('SELECT id, ts, text, contact, kind, place, agent, seen FROM messages ORDER BY id DESC LIMIT 200');
    return $st ? $st->fetchAll() : [];
}
function admin_message_action(array $b): void {
    messages_schema();
    $id = (int)($b['id'] ?? 0);
    if ($id < 1) throw new ApiError(400, 'validation', 'Нет сообщения.');
    if (($b['action'] ?? '') === 'delete') db()->prepare('DELETE FROM messages WHERE id = ?')->execute([$id]);
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
