<?php
// «Что хотите на ужин?»: a poll with 2–4 dishes sent to the family by a link. Relatives vote without
// installing anything; each device votes once (it can change its vote). Only counts are kept, no names.

function polls_schema(): void {
    static $done = false;
    if ($done) return;
    db()->exec('CREATE TABLE IF NOT EXISTS polls (id INTEGER PRIMARY KEY AUTOINCREMENT, token_hash TEXT NOT NULL UNIQUE, day TEXT NOT NULL, options TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)');
    db()->exec('CREATE TABLE IF NOT EXISTS poll_votes (poll_id INTEGER NOT NULL, voter_hash TEXT NOT NULL, option INTEGER NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (poll_id, voter_hash))');
    $done = true;
}
function poll_token_ok($t): bool { return is_string($t) && (bool)preg_match('/^[0-9a-f]{32}$/', $t); }
function poll_by_token(string $token): array {
    $st = db()->prepare('SELECT * FROM polls WHERE token_hash = ?');
    $st->execute([hash('sha256', $token)]);
    $p = $st->fetch(PDO::FETCH_ASSOC);
    if (!$p) throw new ApiError(404, 'poll', 'Опрос не найден — возможно, ссылка устарела.');
    return $p;
}
function poll_view(array $p, ?string $voter): array {
    $options = json_decode((string)$p['options'], true) ?: [];
    $counts = array_fill(0, count($options), 0);
    $st = db()->prepare('SELECT option, COUNT(*) n FROM poll_votes WHERE poll_id = ? GROUP BY option');
    $st->execute([$p['id']]);
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) if (isset($counts[(int)$r['option']])) $counts[(int)$r['option']] = (int)$r['n'];
    $mine = null;
    if ($voter) { $st = db()->prepare('SELECT option FROM poll_votes WHERE poll_id = ? AND voter_hash = ?'); $st->execute([$p['id'], hash('sha256', 'voter|' . $voter)]); $v = $st->fetchColumn(); $mine = $v === false ? null : (int)$v; }
    return ['day' => $p['day'], 'options' => $options, 'counts' => $counts, 'mine' => $mine, 'closed' => time() > (int)$p['expires_at']];
}
function poll_voter($v): ?string { return is_string($v) && preg_match('/^[0-9a-f-]{36}$/', $v) ? $v : null; }

function poll_create(array $b): void {
    require_same_origin(); polls_schema();
    limit_or_fail('poll', 20, 5000);
    $day = $b['day'] ?? '';
    if (!is_string($day) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $day)) throw new ApiError(400, 'validation', 'Неверный день.');
    $options = [];
    foreach (is_array($b['options'] ?? null) ? $b['options'] : [] as $o) {
        if (!is_array($o) || !is_string($o['id'] ?? null) || !preg_match(RECIPE_ID, $o['id']) || strlen($o['id']) > 80 || !is_string($o['title'] ?? null)) continue;
        $options[] = ['id' => $o['id'], 'title' => mb_substr(trim($o['title']), 0, 120)];
    }
    if (count($options) < 2 || count($options) > 4) throw new ApiError(400, 'validation', 'Нужно от 2 до 4 блюд.');
    $token = bin2hex(random_bytes(16)); $now = time();
    db()->prepare('INSERT INTO polls (token_hash, day, options, created_at, expires_at) VALUES (?,?,?,?,?)')
        ->execute([hash('sha256', $token), $day, json_encode($options, JSON_UNESCAPED_UNICODE), $now, $now + 3 * 86400]);
    db()->exec('DELETE FROM poll_votes WHERE poll_id IN (SELECT id FROM polls WHERE expires_at < ' . ($now - 14 * 86400) . ')');
    db()->exec('DELETE FROM polls WHERE expires_at < ' . ($now - 14 * 86400));
    send_json(['token' => $token]);
}
function poll_get(array $b): void {
    polls_schema();
    if (!poll_token_ok($b['token'] ?? null)) throw new ApiError(400, 'poll', 'Ссылка на опрос повреждена.');
    send_json(poll_view(poll_by_token($b['token']), poll_voter($b['voter'] ?? null)));
}
function poll_vote(array $b): void {
    require_same_origin(); polls_schema();
    if (!poll_token_ok($b['token'] ?? null)) throw new ApiError(400, 'poll', 'Ссылка на опрос повреждена.');
    $voter = poll_voter($b['voter'] ?? null);
    if (!$voter) throw new ApiError(400, 'validation', 'Обновите страницу и проголосуйте снова.');
    limit_or_fail('poll_vote', 60, 50000);
    $p = poll_by_token($b['token']);
    if (time() > (int)$p['expires_at']) throw new ApiError(410, 'closed', 'Голосование уже закончилось.');
    $count = count(json_decode((string)$p['options'], true) ?: []);
    $option = $b['option'] ?? null;
    if (!is_int($option) || $option < 0 || $option >= $count) throw new ApiError(400, 'validation', 'Выберите блюдо.');
    db()->prepare('INSERT OR REPLACE INTO poll_votes (poll_id, voter_hash, option, at) VALUES (?,?,?,?)')->execute([$p['id'], hash('sha256', 'voter|' . $voter), $option, time()]);
    send_json(poll_view($p, $voter));
}
