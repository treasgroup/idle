<?php
// Accounts without registration: a device gets an anonymous account on first visit (a random token in an
// httpOnly cookie). No phone, no e-mail, no names. Another device joins the same account with a 16-digit
// code or a QR link. A "household" (семья) shares the week menu and the shopping list between accounts.
// Each data document has a version: a save with an old version is refused (409) and the client merges.

const DEVICE_COOKIE = 'cook_account';
// 600 KB: the personal document also keeps the profile (with its small photo), the food diary and the tables (app/kept).
const PERSONAL_MAX = 600000;
const HOUSEHOLD_MAX = 300000;

function accounts_schema(): void {
    static $done = false;
    if ($done) return;
    $pdo = db();
    $pdo->exec('CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, household_id TEXT NOT NULL, created_at INTEGER NOT NULL, seen_at INTEGER NOT NULL)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS devices (token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL, created_at INTEGER NOT NULL, seen_at INTEGER NOT NULL)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_devices_account ON devices(account_id)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS login_codes (code_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS households (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS invites (token_hash TEXT PRIMARY KEY, household_id TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS docs (owner TEXT PRIMARY KEY, data TEXT NOT NULL, version INTEGER NOT NULL, updated_at INTEGER NOT NULL)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_accounts_household ON accounts(household_id)');
    $done = true;
}
function rand_id(int $bytes = 12): string { return bin2hex(random_bytes($bytes)); }
function pepper(): string { $p = setting('pepper'); if (!$p) { $p = rand_id(16); set_setting('pepper', $p); } return (string)$p; }
function token_hash(string $t): string { return hash('sha256', pepper() . '|' . $t); }
function set_device_cookie(string $token): void {
    setcookie(DEVICE_COOKIE, $token, ['expires' => time() + 400 * 86400, 'path' => cookie_path(), 'secure' => is_https(), 'httponly' => true, 'samesite' => 'Lax']);
}
function limit_or_fail(string $what, int $perHour, int $perDay): void {
    if (!bump('acc|' . $what . '|' . client_ip() . '|' . date('Y-m-d-H'), $perHour) || !bump('acc|' . $what . '|all|' . date('Y-m-d'), $perDay))
        throw new ApiError(429, 'too_many', 'Слишком много попыток. Попробуйте позже.');
}
// The account of this device, or null.
function current_account(): ?array {
    accounts_schema();
    $t = $_COOKIE[DEVICE_COOKIE] ?? '';
    if (!preg_match('/^[0-9a-f]{64}$/', $t)) return null;
    $st = db()->prepare('SELECT a.id, a.household_id FROM devices d JOIN accounts a ON a.id = d.account_id WHERE d.token_hash = ?');
    $st->execute([token_hash($t)]);
    $row = $st->fetch();
    if (!$row) return null;
    $now = now_ms();
    if (mt_rand(1, 10) === 1) { db()->prepare('UPDATE devices SET seen_at = ? WHERE token_hash = ?')->execute([$now, token_hash($t)]); db()->prepare('UPDATE accounts SET seen_at = ? WHERE id = ?')->execute([$now, $row['id']]); }
    return $row;
}
function require_account(): array { $a = current_account(); if (!$a) throw new ApiError(401, 'no_account', 'Обновите страницу.'); return $a; }
function new_device(string $accountId): void {
    $token = rand_id(32); $now = now_ms();
    db()->prepare('INSERT INTO devices (token_hash, account_id, created_at, seen_at) VALUES (?, ?, ?, ?)')->execute([token_hash($token), $accountId, $now, $now]);
    set_device_cookie($token);
}
function doc_get(string $owner): array {
    $st = db()->prepare('SELECT data, version FROM docs WHERE owner = ?'); $st->execute([$owner]); $r = $st->fetch();
    return $r ? ['version' => (int)$r['version'], 'data' => json_decode($r['data'], true)] : ['version' => 0, 'data' => null];
}
function members(string $household): int { $st = db()->prepare('SELECT COUNT(*) FROM accounts WHERE household_id = ?'); $st->execute([$household]); return (int)$st->fetchColumn(); }
function account_state(array $a): array {
    $p = doc_get('p:' . $a['id']); $h = doc_get('h:' . $a['household_id']);
    return ['account' => ['members' => members($a['household_id'])], 'personal' => $p, 'household' => $h];
}

// ---------- routes ----------
function account_init(): void {
    require_same_origin(); accounts_schema();
    $a = current_account();
    if (!$a) {
        limit_or_fail('init', 30, 20000);
        $now = now_ms(); $id = rand_id(); $hh = rand_id();
        $pdo = db(); $pdo->exec('BEGIN IMMEDIATE');
        try {
            $pdo->prepare('INSERT INTO households (id, created_at) VALUES (?, ?)')->execute([$hh, $now]);
            $pdo->prepare('INSERT INTO accounts (id, household_id, created_at, seen_at) VALUES (?, ?, ?, ?)')->execute([$id, $hh, $now, $now]);
            $pdo->exec('COMMIT');
        } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->exec('ROLLBACK'); throw $e; }
        new_device($id);
        $a = ['id' => $id, 'household_id' => $hh];
    }
    send_json(account_state($a) + ['created' => true]);
}
function account_state_route(): void {
    $a = require_account();
    // Cheap polling: the client says which versions it has; unchanged documents are not sent again.
    $p = (int)($_GET['p'] ?? -1); $h = (int)($_GET['h'] ?? -1);
    $s = account_state($a);
    if ($s['personal']['version'] === $p) $s['personal'] = ['version' => $p, 'unchanged' => true];
    if ($s['household']['version'] === $h) $s['household'] = ['version' => $h, 'unchanged' => true];
    send_json($s);
}
function account_save(array $b): void {
    require_same_origin(); $a = require_account();
    $kind = $b['kind'] ?? ''; $base = $b['baseVersion'] ?? null; $data = $b['data'] ?? null;
    if (!in_array($kind, ['personal', 'household'], true) || !is_int($base) || !is_array($data)) throw new ApiError(400, 'validation', 'Неверные данные.');
    $json = json_encode($data, JSON_UNESCAPED_UNICODE);
    if ($json === false || strlen($json) > ($kind === 'personal' ? PERSONAL_MAX : HOUSEHOLD_MAX)) throw new ApiError(413, 'too_large', 'Слишком много данных.');
    $owner = ($kind === 'personal' ? 'p:' . $a['id'] : 'h:' . $a['household_id']);
    $pdo = db(); $pdo->exec('BEGIN IMMEDIATE');
    try {
        $cur = doc_get($owner);
        if ($cur['version'] !== $base) { $pdo->exec('COMMIT'); send_json(['conflict' => true, 'current' => $cur], 409); return; }
        // An older app (an APK on someone's phone) does not know the newer parts of the document — «Морозилка» —
        // and sends it without them: what it did not send is kept, not wiped for the whole family.
        if (is_array($cur['data'])) {
            $kept = false;
            foreach ($cur['data'] as $k => $val) if (!array_key_exists($k, $data)) { $data[$k] = $val; $kept = true; }
            if ($kept) $json = json_encode($data, JSON_UNESCAPED_UNICODE);
        }
        $v = $cur['version'] + 1;
        $pdo->prepare('INSERT OR REPLACE INTO docs (owner, data, version, updated_at) VALUES (?, ?, ?, ?)')->execute([$owner, $json, $v, now_ms()]);
        $pdo->exec('COMMIT');
    } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->exec('ROLLBACK'); throw $e; }
    send_json(['version' => $v]);
}
// A new 16-digit code for signing in on another device; the previous code stops working.
function account_code(): void {
    require_same_origin(); $a = require_account();
    limit_or_fail('code', 20, 5000);
    $code = ''; for ($i = 0; $i < 16; $i++) $code .= (string)random_int(0, 9);
    db()->prepare('DELETE FROM login_codes WHERE account_id = ?')->execute([$a['id']]);
    db()->prepare('INSERT INTO login_codes (code_hash, account_id, created_at) VALUES (?, ?, ?)')->execute([token_hash('code:' . $code), $a['id'], now_ms()]);
    send_json(['code' => $code]);
}
function account_login(array $b): void {
    require_same_origin(); accounts_schema();
    limit_or_fail('login', 10, 3000);
    $code = preg_replace('/\D+/', '', (string)($b['code'] ?? ''));
    if (strlen($code) !== 16) { usleep(300000); throw new ApiError(400, 'code', 'Код — это 16 цифр.'); }
    $st = db()->prepare('SELECT a.id, a.household_id FROM login_codes c JOIN accounts a ON a.id = c.account_id WHERE c.code_hash = ?');
    $st->execute([token_hash('code:' . $code)]); $a = $st->fetch();
    if (!$a) { usleep(500000); throw new ApiError(403, 'code', 'Код не подошёл. Проверьте цифры или откройте новый код на первом устройстве.'); }
    // this device's previous anonymous account is left; its device token is removed
    $old = $_COOKIE[DEVICE_COOKIE] ?? '';
    if (preg_match('/^[0-9a-f]{64}$/', $old)) {
        $prev = db()->prepare('SELECT account_id FROM devices WHERE token_hash = ?'); $prev->execute([token_hash($old)]); $prevId = $prev->fetchColumn();
        db()->prepare('DELETE FROM devices WHERE token_hash = ?')->execute([token_hash($old)]);
        // reviews written from this device stay editable: they move to the account it joins
        if ($prevId && $prevId !== $a['id'] && function_exists('reviews_move')) reviews_move((string)$prevId, $a['id']);
    }
    new_device($a['id']);
    send_json(account_state($a));
}
// Invite link for the household: valid for 7 days, can be used by several people.
function household_invite(): void {
    require_same_origin(); $a = require_account();
    limit_or_fail('invite', 20, 5000);
    $token = rand_id(16); $now = now_ms();
    db()->prepare('DELETE FROM invites WHERE expires_at < ?')->execute([$now]);
    db()->prepare('INSERT INTO invites (token_hash, household_id, created_at, expires_at) VALUES (?, ?, ?, ?)')->execute([token_hash('inv:' . $token), $a['household_id'], $now, $now + 7 * 86400000]);
    send_json(['token' => $token]);
}
function household_join(array $b): void {
    require_same_origin(); $a = require_account();
    limit_or_fail('join', 20, 3000);
    $token = (string)($b['token'] ?? '');
    if (!preg_match('/^[0-9a-f]{32}$/', $token)) throw new ApiError(400, 'invite', 'Ссылка-приглашение повреждена.');
    $st = db()->prepare('SELECT household_id FROM invites WHERE token_hash = ? AND expires_at > ?');
    $st->execute([token_hash('inv:' . $token), now_ms()]); $hh = $st->fetchColumn();
    if (!$hh) throw new ApiError(404, 'invite', 'Приглашение устарело. Попросите прислать новое.');
    if ($hh !== $a['household_id']) {
        if (members((string)$hh) >= 12) throw new ApiError(409, 'full', 'В этой семье уже 12 человек.');
        db()->prepare('UPDATE accounts SET household_id = ? WHERE id = ?')->execute([$hh, $a['id']]);
        $a['household_id'] = (string)$hh;
    }
    send_json(account_state($a));
}
// Leave the household: this account gets its own again, with a copy of the current menu and list.
function household_leave(): void {
    require_same_origin(); $a = require_account();
    if (members($a['household_id']) < 2) throw new ApiError(400, 'alone', 'В семье только вы.');
    $copy = doc_get('h:' . $a['household_id']); $hh = rand_id(); $now = now_ms();
    db()->prepare('INSERT INTO households (id, created_at) VALUES (?, ?)')->execute([$hh, $now]);
    if ($copy['data'] !== null) db()->prepare('INSERT INTO docs (owner, data, version, updated_at) VALUES (?, ?, 1, ?)')->execute(['h:' . $hh, json_encode($copy['data'], JSON_UNESCAPED_UNICODE), $now]);
    db()->prepare('UPDATE accounts SET household_id = ? WHERE id = ?')->execute([$hh, $a['id']]);
    $a['household_id'] = $hh;
    send_json(account_state($a));
}
// Everything about this account is deleted; the household data stays for the other members.
function account_delete(): void {
    require_same_origin(); $a = current_account();
    if ($a) {
        $pdo = db(); $alone = members($a['household_id']) < 2;
        $pdo->prepare('DELETE FROM devices WHERE account_id = ?')->execute([$a['id']]);
        $pdo->prepare('DELETE FROM login_codes WHERE account_id = ?')->execute([$a['id']]);
        $pdo->prepare('DELETE FROM docs WHERE owner = ?')->execute(['p:' . $a['id']]);
        $pdo->prepare('DELETE FROM accounts WHERE id = ?')->execute([$a['id']]);
        // "Очистить данные" removes the person's reviews, replies and likes too
        if (function_exists('reviews_forget')) reviews_forget($a['id']);
        if ($alone) { $pdo->prepare('DELETE FROM docs WHERE owner = ?')->execute(['h:' . $a['household_id']]); $pdo->prepare('DELETE FROM households WHERE id = ?')->execute([$a['household_id']]); $pdo->prepare('DELETE FROM invites WHERE household_id = ?')->execute([$a['household_id']]); }
    }
    setcookie(DEVICE_COOKIE, '', ['expires' => time() - 3600, 'path' => cookie_path(), 'secure' => is_https(), 'httponly' => true, 'samesite' => 'Lax']);
    send_json(['deleted' => true]);
}

// Accounts nobody has opened for 400 days are removed with their data (the privacy policy promises it).
function accounts_cleanup(): void {
    accounts_schema();
    $old = now_ms() - 400 * 86400000;
    $st = db()->prepare('SELECT id, household_id FROM accounts WHERE seen_at < ? LIMIT 200'); $st->execute([$old]);
    foreach ($st->fetchAll() as $a) {
        $pdo = db();
        $pdo->prepare('DELETE FROM devices WHERE account_id = ?')->execute([$a['id']]);
        $pdo->prepare('DELETE FROM login_codes WHERE account_id = ?')->execute([$a['id']]);
        $pdo->prepare('DELETE FROM docs WHERE owner = ?')->execute(['p:' . $a['id']]);
        $pdo->prepare('DELETE FROM accounts WHERE id = ?')->execute([$a['id']]);
        if (members($a['household_id']) < 1) { $pdo->prepare('DELETE FROM docs WHERE owner = ?')->execute(['h:' . $a['household_id']]); $pdo->prepare('DELETE FROM households WHERE id = ?')->execute([$a['household_id']]); $pdo->prepare('DELETE FROM invites WHERE household_id = ?')->execute([$a['household_id']]); }
    }
    db()->prepare('DELETE FROM invites WHERE expires_at < ?')->execute([now_ms()]);
}
// What the legal pages show about the owner; filled in the admin panel.
function legal_info(): array {
    $l = (array)setting('legal', []);
    return ['operator' => (string)($l['operator'] ?? ''), 'email' => (string)($l['email'] ?? ''),
        'serverAi' => config()['intent_provider'] !== 'none', 'serverSpeech' => config()['speech_provider'] !== 'none'];
}
function admin_legal(array $b): void {
    $op = trim((string)($b['operator'] ?? '')); $mail = trim((string)($b['email'] ?? ''));
    if (mb_strlen_safe($op) > 200) throw new ApiError(400, 'validation', 'Слишком длинное название.');
    if ($mail !== '' && !filter_var($mail, FILTER_VALIDATE_EMAIL)) throw new ApiError(400, 'validation', 'Проверьте адрес почты.');
    set_setting('legal', ['operator' => $op, 'email' => $mail]);
    send_json(legal_info());
}
function mb_strlen_safe(string $s): int { return function_exists('mb_strlen') ? mb_strlen($s) : strlen($s); }
