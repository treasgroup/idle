<?php
// «Шеф в Алисе»: a speaker joins the family's plan and shopping list with a short code from the profile. The plan
// and the list are already on the server (the household document the site keeps in sync), so nothing new is sent
// anywhere: the code links one Alice device to that household; the skill reads the day's plan, reads the list,
// checks off what is bought and adds what is said — the phone picks it up on its next sync (≤ 20 s).
// The code: 4 digits, once, for 15 minutes; a device may try it 10 times an hour. «Отключить» unlinks every speaker.

const ALICE_CODE_MINUTES = 15;

function alice_schema(): void {
    static $done = false;
    if ($done) return;
    accounts_schema();
    $pdo = db();
    $pdo->exec('CREATE TABLE IF NOT EXISTS alice_codes (code_hash TEXT PRIMARY KEY, household_id TEXT NOT NULL, expires_at INTEGER NOT NULL)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS alice_links (device_hash TEXT PRIMARY KEY, household_id TEXT NOT NULL, created_at INTEGER NOT NULL, seen_at INTEGER NOT NULL)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_alice_links_household ON alice_links(household_id)');
    $done = true;
}
function alice_linked(string $household): int {
    $st = db()->prepare('SELECT COUNT(*) FROM alice_links WHERE household_id = ?'); $st->execute([$household]);
    return (int)$st->fetchColumn();
}

// ---------- the site: Profile → «Шеф в Алисе» ----------
function alice_code_route(): void {
    require_same_origin(); $a = require_account(); alice_schema();
    limit_or_fail('alice-code', 20, 5000);
    $now = now_ms();
    db()->prepare('DELETE FROM alice_codes WHERE household_id = ? OR expires_at < ?')->execute([$a['household_id'], $now]);
    // Four digits nobody else holds right now.
    for ($i = 0; $i < 20; $i++) {
        $code = str_pad((string)random_int(0, 9999), 4, '0', STR_PAD_LEFT);
        $st = db()->prepare('SELECT 1 FROM alice_codes WHERE code_hash = ?'); $st->execute([token_hash('alice:' . $code)]);
        if (!$st->fetchColumn()) break;
    }
    db()->prepare('INSERT OR REPLACE INTO alice_codes (code_hash, household_id, expires_at) VALUES (?, ?, ?)')
        ->execute([token_hash('alice:' . $code), $a['household_id'], $now + ALICE_CODE_MINUTES * 60000]);
    send_json(['code' => $code, 'minutes' => ALICE_CODE_MINUTES, 'linked' => alice_linked($a['household_id'])]);
}
function alice_status_route(): void {
    $a = require_account(); alice_schema();
    send_json(['linked' => alice_linked($a['household_id'])]);
}
function alice_unlink_route(): void {
    require_same_origin(); $a = require_account(); alice_schema();
    db()->prepare('DELETE FROM alice_links WHERE household_id = ?')->execute([$a['household_id']]);
    db()->prepare('DELETE FROM alice_codes WHERE household_id = ?')->execute([$a['household_id']]);
    send_json(['linked' => 0]);
}

// ---------- the skill ----------
/** The speaker or phone Alice runs on (its application id), as a key that says nothing about it. */
function alice_device(array $req): string {
    $id = (string)($req['session']['application']['application_id'] ?? $req['session']['user_id'] ?? '');
    return $id === '' ? '' : token_hash('alice-dev:' . $id);
}
/** The household this device is linked to, or null. */
function alice_household(string $device): ?string {
    if ($device === '') return null;
    alice_schema();
    $st = db()->prepare('SELECT household_id FROM alice_links WHERE device_hash = ?'); $st->execute([$device]);
    $hh = $st->fetchColumn();
    if (!$hh) return null;
    if (mt_rand(1, 5) === 1) db()->prepare('UPDATE alice_links SET seen_at = ? WHERE device_hash = ?')->execute([now_ms(), $device]);
    return (string)$hh;
}
/** «4821» → links this device; the reply to say. */
function alice_link(string $device, string $code): string {
    alice_schema();
    if ($device === '') return 'На этом устройстве не получается запомнить код.';
    if (!bump('alice-link|' . $device . '|' . date('Y-m-d-H'), 10)) return 'Слишком много попыток. Попробуйте через час.';
    $st = db()->prepare('SELECT household_id FROM alice_codes WHERE code_hash = ? AND expires_at > ?');
    $st->execute([token_hash('alice:' . $code), now_ms()]);
    $hh = $st->fetchColumn();
    if (!$hh) return 'Код не подошёл. Откройте на сайте «Профиль» → «Шеф в Алисе» и назовите новый код — он действует ' . ALICE_CODE_MINUTES . ' минут.';
    $now = now_ms();
    db()->prepare('INSERT OR REPLACE INTO alice_links (device_hash, household_id, created_at, seen_at) VALUES (?, ?, ?, ?)')->execute([$device, $hh, $now, $now]);
    db()->prepare('DELETE FROM alice_codes WHERE code_hash = ?')->execute([token_hash('alice:' . $code)]);
    return 'Готово! Теперь я знаю ваш план, список покупок и морозилку. Спрашивайте: «что на ужин», «что купить», «что в морозилке». А ещё можно «вычеркни молоко», «добавь хлеб» и «достань котлеты на завтра».';
}
function alice_unlink(string $device): void {
    alice_schema();
    if ($device !== '') db()->prepare('DELETE FROM alice_links WHERE device_hash = ?')->execute([$device]);
}

/** The household's plan and list: [version, data]. */
function alice_doc(string $hh): array { $d = doc_get('h:' . $hh); return [$d['version'], is_array($d['data']) ? $d['data'] : []]; }
/** Saves the list back as a new version, so the site and the app take it on their next sync. */
function alice_doc_save(string $hh, int $version, array $data): bool {
    $pdo = db(); $pdo->exec('BEGIN IMMEDIATE');
    try {
        $cur = doc_get('h:' . $hh);
        if ($cur['version'] !== $version) { $pdo->exec('ROLLBACK'); return false; }
        $pdo->prepare('INSERT OR REPLACE INTO docs (owner, data, version, updated_at) VALUES (?, ?, ?, ?)')
            ->execute(['h:' . $hh, json_encode($data, JSON_UNESCAPED_UNICODE), $version + 1, now_ms()]);
        $pdo->exec('COMMIT');
        return true;
    } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->exec('ROLLBACK'); throw $e; }
}

/** «Сметана», «Говядина», not «Сырая говядина без кости для варки» — like the site's short names (bots.php). */
function alice_short(string $id, string $fallback): string { return bot_short($id, $fallback); }

/** The day's plan («сегодня», «завтра»): [recipe, meal][], dinner last as on the plan screen. */
function alice_plan(array $doc, int $plusDays = 0): array {
    $day = date('Y-m-d', time() + $plusDays * 86400);
    foreach ((array)($doc['menu'] ?? []) as $d) {
        if (($d['date'] ?? '') !== $day) continue;
        $out = [];
        foreach ((array)($d['items'] ?? []) as $it) {
            $r = bot_recipe_by_id((string)($it['recipeId'] ?? ''));
            if ($r) $out[] = [$r, (string)($it['meal'] ?? 'dinner'), !empty($it['leftover'])];
        }
        return $out;
    }
    return [];
}
/** What is still to buy: [index, short name]. */
function alice_to_buy(array $doc): array {
    $out = [];
    foreach ((array)($doc['shopping'] ?? []) as $k => $i) if (empty($i['checked'])) $out[] = [$k, alice_short((string)($i['ingredientId'] ?? ''), (string)($i['name'] ?? ''))];
    return $out;
}
/** The rows of the list the words name («молоко», «яйца и хлеб»). */
function alice_find_rows(array $doc, string $words): array {
    $want = array_values(array_filter(preg_split('/\s+(?:и|а также)\s+|,\s*/u', match_norm($words))));
    $hit = [];
    foreach (alice_to_buy($doc) as [$k, $name]) {
        $nw = explode(' ', match_norm($name));
        foreach ($want as $w) foreach (explode(' ', $w) as $x) foreach ($nw as $y) if (mb_strlen($x, 'UTF-8') >= 3 && match_same($x, $y)) { $hit[$k] = $name; continue 3; }
    }
    return $hit;
}
/** A new row for «добавь сметану»: the catalog product when the words clearly name one. */
function alice_new_row(string $words): array {
    $q = match_parse($words);
    // «сметану» is sour cream even when the catalog has two kinds of it: the first, named as the site names it.
    $ids = $q['want'][0]['ids'] ?? [];
    $id = $ids && count($ids) <= 4 ? $ids[0] : null;
    $name = $id ? alice_short($id, $words) : mb_strtoupper(mb_substr($words, 0, 1, 'UTF-8'), 'UTF-8') . mb_substr($words, 1, null, 'UTF-8');
    return ['key' => bin2hex(random_bytes(8)), 'ingredientId' => $id ?? 'custom-' . bin2hex(random_bytes(4)), 'name' => mb_substr($name, 0, 120, 'UTF-8'), 'amount' => 1, 'unit' => 'шт.', 'checked' => false];
}
/** «молоко, яйца и хлеб» as said aloud. */
function alice_list_words(array $names): string {
    $names = array_values($names);
    if (count($names) <= 1) return implode('', $names);
    return implode(', ', array_slice($names, 0, -1)) . ' и ' . end($names);
}

// ---------- «Морозилка» (the family's, kept in the same document as the plan) ----------
/** «котлеты (4 порции), пельмени» — what is frozen, the oldest first. */
function alice_freezer(array $doc): array {
    $list = array_values(array_filter((array)($doc['freezer'] ?? []), fn($f) => is_array($f) && is_string($f['title'] ?? null)));
    usort($list, fn($a, $b) => ((int)($a['at'] ?? 0)) <=> ((int)($b['at'] ?? 0)));
    return $list;
}
function alice_freezer_words(array $list): string {
    return alice_list_words(array_map(fn($f) => mb_strtolower((string)$f['title'], 'UTF-8') . (!empty($f['portions']) ? ' (' . (int)$f['portions'] . ' ' . seo_plural((int)$f['portions'], 'порция', 'порции', 'порций') . ')' : ''), array_slice($list, 0, 6)));
}
/** The frozen thing the words name («котлеты», «фарш»), or null. */
function alice_freezer_find(array $list, string $words): ?int {
    $want = array_filter(explode(' ', match_norm($words)), fn($x) => mb_strlen($x, 'UTF-8') >= 3);
    foreach ($list as $i => $f) foreach (explode(' ', match_norm((string)$f['title'])) as $y) foreach ($want as $x) if (match_same($x, $y)) return $i;
    return null;
}
/** «Достань котлеты на завтра»: out of the freezer; a dish goes to tomorrow's dinner as «Из морозилки · разогреть». */
function alice_thaw(string $hh, string $words): string {
    for ($try = 0; $try < 3; $try++) {
        [$version, $doc] = alice_doc($hh);
        $list = alice_freezer($doc);
        $i = alice_freezer_find($list, $words);
        if ($i === null) return $list ? 'В морозилке такого нет. Там: ' . alice_freezer_words($list) . '.' : 'Морозилка пустая — на сайте её можно заполнить в «Мои продукты».';
        $f = $list[$i];
        $n = !empty($f['portions']) ? (int)$f['portions'] : 2;
        $doc['freezer'] = array_values(array_filter((array)$doc['freezer'], fn($x) => ($x['id'] ?? null) !== $f['id']));
        $title = mb_strtolower((string)$f['title'], 'UTF-8');
        $planned = false;
        if (!empty($f['recipeId']) && bot_recipe_by_id((string)$f['recipeId'])) {
            $day = date('Y-m-d', time() + 86400);
            $item = ['recipeId' => $f['recipeId'], 'servings' => max(1, min(12, $n)), 'meal' => 'dinner', 'leftover' => true, 'prepped' => 'freezer'];
            $menu = (array)($doc['menu'] ?? []); $found = false;
            foreach ($menu as &$d) if (($d['date'] ?? '') === $day) { $d['items'][] = $item; $found = true; } unset($d);
            if (!$found) $menu[] = ['date' => $day, 'items' => [$item]];
            $doc['menu'] = $menu; $planned = true;
        }
        if (alice_doc_save($hh, $version, $doc)) return 'Переложите ' . $title . ' из морозилки в холодильник — к завтра разморозится.' . ($planned ? ' Поставил на завтрашний ужин в план.' : '');
    }
    return 'Не получилось записать — попробуйте ещё раз.';
}
