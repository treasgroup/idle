<?php
// «Стол в складчину»: the organiser picks the occasion, the dishes and the things to bring, and sends a link.
// Guests open it without registration: «приду / не смогу / +1», what they can't eat, «Я приготовлю» on a dish,
// «Возьму я» on a thing, and — if the organiser turned it on — how much they spent (the split is shown to all).
// One JSON document per table. The link token lets anyone read it and answer for themselves; the organiser's own
// secret (kept on their device) lets them change the table. A guest is a random secret on their device: the server
// keeps only a short hash of it as the guest's key, so one guest cannot answer for another.

const PARTY_FORMATS = ['dinner', 'bbq', 'kids', 'newyear', 'match', 'birthday'];
const PARTY_CANT = ['dairy', 'eggs', 'gluten', 'nuts', 'fish', 'seafood', 'soy', 'mushrooms', 'legumes', 'spicy', 'meat', 'poultry'];

function parties_schema(): void {
    static $done = false;
    if ($done) return;
    db()->exec('CREATE TABLE IF NOT EXISTS parties (id INTEGER PRIMARY KEY AUTOINCREMENT, token_hash TEXT NOT NULL UNIQUE, admin_hash TEXT NOT NULL, doc TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)');
    $done = true;
}
function party_hex32($t): bool { return is_string($t) && (bool)preg_match('/^[0-9a-f]{32}$/', $t); }
function party_guest_key($secret): ?string {
    return is_string($secret) && preg_match('/^[0-9a-f-]{36}$/', $secret) ? substr(hash('sha256', 'party-guest|' . $secret), 0, 12) : null;
}
function party_text($v, int $max): string {
    if (!is_string($v)) return '';
    $v = trim(preg_replace('/\s+/u', ' ', $v) ?? '');
    return mb_substr($v, 0, $max);
}
function party_load(string $token): array {
    $st = db()->prepare('SELECT * FROM parties WHERE token_hash = ?');
    $st->execute([hash('sha256', $token)]);
    $p = $st->fetch(PDO::FETCH_ASSOC);
    if (!$p) throw new ApiError(404, 'party', 'Стол не найден — возможно, организатор его удалил.');
    return $p;
}
function party_save(array $p, array $doc): void {
    db()->prepare('UPDATE parties SET doc = ?, version = version + 1, expires_at = ? WHERE id = ?')
        ->execute([json_encode($doc, JSON_UNESCAPED_UNICODE), party_expires($doc), $p['id']]);
}
// Kept two weeks after the day (the expenses are settled after the party), at most half a year ahead.
function party_expires(array $doc): int {
    $t = strtotime(($doc['date'] ?? '') . ' 23:59') ?: time();
    return min(max($t, time()) + 14 * 86400, time() + 200 * 86400);
}

/** Dishes or things from the client: the existing keys keep who took them, new ones get a key. */
function party_items($list, array $before, bool $dishes): array {
    $old = [];
    foreach ($before as $x) $old[$x['key']] = $x;
    $out = [];
    foreach (is_array($list) ? array_slice($list, 0, 30) : [] as $x) {
        if (!is_array($x)) continue;
        $title = party_text($x['title'] ?? '', 80);
        if ($title === '') continue;
        $key = is_string($x['key'] ?? null) && isset($old[$x['key']]) ? $x['key'] : bin2hex(random_bytes(4));
        $item = ['key' => $key, 'title' => $title, 'by' => $old[$key]['by'] ?? null];
        if ($dishes) {
            $id = $x['id'] ?? null;
            $item['id'] = is_string($id) && strlen($id) <= 80 && preg_match(RECIPE_ID, $id) ? $id : null;
            $item['slot'] = party_text($x['slot'] ?? '', 30);
        }
        $out[] = $item;
    }
    return $out;
}
function party_fields(array $b, array $doc): array {
    if (array_key_exists('title', $b)) { $doc['title'] = party_text($b['title'], 80); if ($doc['title'] === '') $doc['title'] = 'Стол в складчину'; }
    if (array_key_exists('format', $b)) $doc['format'] = in_array($b['format'], PARTY_FORMATS, true) ? $b['format'] : 'dinner';
    if (array_key_exists('date', $b)) {
        if (!is_string($b['date']) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $b['date']) || !strtotime($b['date'])) throw new ApiError(400, 'validation', 'Выберите день.');
        $doc['date'] = $b['date'];
    }
    if (array_key_exists('time', $b)) $doc['time'] = is_string($b['time']) && preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $b['time']) ? $b['time'] : '';
    if (array_key_exists('place', $b)) $doc['place'] = party_text($b['place'], 120);
    if (array_key_exists('note', $b)) $doc['note'] = party_text($b['note'], 300);
    if (array_key_exists('dishes', $b)) $doc['dishes'] = party_items($b['dishes'], $doc['dishes'] ?? [], true);
    if (array_key_exists('things', $b)) $doc['things'] = party_items($b['things'], $doc['things'] ?? [], false);
    if (array_key_exists('expenses', $b)) $doc['expenses'] = $b['expenses'] === true;
    if (array_key_exists('split', $b)) $doc['split'] = is_int($b['split']) && $b['split'] >= 1 && $b['split'] <= 100 ? $b['split'] : null;
    return $doc;
}
/** The guest's own answer: name, coming or not, how many with them, what they can't eat, what they spent. */
function party_answer(array $g, array $b): array {
    if (array_key_exists('name', $b)) $g['name'] = party_text($b['name'], 30);
    if (array_key_exists('status', $b)) $g['status'] = in_array($b['status'], ['yes', 'no', 'maybe'], true) ? $b['status'] : 'maybe';
    if (array_key_exists('plus', $b)) $g['plus'] = is_int($b['plus']) ? max(0, min(6, $b['plus'])) : 0;
    if (array_key_exists('cant', $b)) $g['cant'] = array_values(array_unique(array_filter(is_array($b['cant']) ? $b['cant'] : [], fn($x) => in_array($x, PARTY_CANT, true))));
    if (array_key_exists('spent', $b)) $g['spent'] = is_int($b['spent']) && $b['spent'] > 0 && $b['spent'] <= 1000000 ? $b['spent'] : null;
    $g['at'] = time();
    return $g;
}
function party_view(array $p, array $doc, ?string $me, bool $admin): array {
    $guests = [];
    foreach ($doc['guests'] ?? [] as $key => $g) $guests[] = ['key' => (string)$key] + $g;
    return [
        'title' => $doc['title'], 'format' => $doc['format'], 'date' => $doc['date'], 'time' => $doc['time'] ?? '',
        'place' => $doc['place'] ?? '', 'note' => $doc['note'] ?? '', 'host' => $doc['host'] ?? null,
        'dishes' => $doc['dishes'] ?? [], 'things' => $doc['things'] ?? [], 'expenses' => !empty($doc['expenses']),
        'split' => $doc['split'] ?? null, 'guests' => $guests, 'notify' => $admin ? count($doc['notify'] ?? []) : 0, 'me' => $me, 'admin' => $admin, 'version' => (int)$p['version'],
    ];
}

function party_create(array $b): void {
    require_same_origin(); parties_schema();
    limit_or_fail('party', 20, 3000);
    $me = party_guest_key($b['guest'] ?? null);
    if (!$me) throw new ApiError(400, 'validation', 'Обновите страницу и попробуйте снова.');
    $doc = party_fields($b, ['title' => 'Стол в складчину', 'format' => 'dinner', 'date' => date('Y-m-d'), 'time' => '', 'place' => '', 'note' => '', 'dishes' => [], 'things' => [], 'expenses' => false, 'split' => null, 'guests' => []]);
    $doc['host'] = $me;
    $doc['guests'] = [$me => party_answer(['name' => '', 'status' => 'yes', 'plus' => 0, 'cant' => [], 'spent' => null], is_array($b['me'] ?? null) ? $b['me'] : [])];
    $token = bin2hex(random_bytes(16)); $admin = bin2hex(random_bytes(16)); $now = time();
    db()->prepare('INSERT INTO parties (token_hash, admin_hash, doc, created_at, expires_at) VALUES (?,?,?,?,?)')
        ->execute([hash('sha256', $token), hash('sha256', $admin), json_encode($doc, JSON_UNESCAPED_UNICODE), $now, party_expires($doc)]);
    db()->exec('DELETE FROM parties WHERE expires_at < ' . $now);
    $p = party_load($token);
    send_json(['token' => $token, 'admin' => $admin, 'party' => party_view($p, $doc, $me, true)]);
}
function party_get(array $b): void {
    parties_schema();
    if (!party_hex32($b['token'] ?? null)) throw new ApiError(400, 'party', 'Ссылка на стол повреждена.');
    $p = party_load($b['token']);
    $admin = party_hex32($b['admin'] ?? null) && hash_equals($p['admin_hash'], hash('sha256', $b['admin']));
    send_json(party_view($p, json_decode((string)$p['doc'], true) ?: [], party_guest_key($b['guest'] ?? null), $admin));
}
/**
 * One change, read and written in one transaction so two guests taking dishes at once both count.
 * Guests: answer (rsvp, can't eat, spent), take / give back a dish or a thing, add their own dish or thing.
 * The organiser also: edit the table, remove a guest, free a taken dish, delete the table.
 */
function party_act(array $b): void {
    require_same_origin(); parties_schema();
    if (!party_hex32($b['token'] ?? null)) throw new ApiError(400, 'party', 'Ссылка на стол повреждена.');
    $me = party_guest_key($b['guest'] ?? null);
    if (!$me) throw new ApiError(400, 'validation', 'Обновите страницу и попробуйте снова.');
    limit_or_fail('party_act', 300, 100000);
    $db = db();
    $db->exec('BEGIN IMMEDIATE');
    try {
        $p = party_load($b['token']);
        $admin = party_hex32($b['admin'] ?? null) && hash_equals($p['admin_hash'], hash('sha256', $b['admin']));
        $doc = json_decode((string)$p['doc'], true) ?: [];
        $act = $b['act'] ?? '';
        $kind = ($b['kind'] ?? '') === 'thing' ? 'things' : 'dishes';
        $find = function (string $list) use (&$doc, $b): int {
            foreach ($doc[$list] ?? [] as $i => $x) if ($x['key'] === ($b['key'] ?? null)) return $i;
            throw new ApiError(404, 'gone', 'Этого уже нет в списке — обновите страницу.');
        };
        if ($act === 'delete') {
            if (!$admin) throw new ApiError(403, 'forbidden', 'Удалить стол может только организатор.');
            $db->prepare('DELETE FROM parties WHERE id = ?')->execute([$p['id']]);
            $db->exec('COMMIT');
            send_json(['deleted' => true]);
            return;
        }
        if ($act === 'answer') {
            if (!isset($doc['guests'][$me]) && count($doc['guests'] ?? []) >= 60) throw new ApiError(409, 'full', 'В этом столе уже 60 гостей.');
            $doc['guests'][$me] = party_answer($doc['guests'][$me] ?? ['name' => '', 'status' => 'maybe', 'plus' => 0, 'cant' => [], 'spent' => null], $b);
            if ($doc['guests'][$me]['name'] === '' && $me !== ($doc['host'] ?? null)) throw new ApiError(400, 'validation', 'Напишите, как вас зовут.');
        } elseif ($act === 'take' || $act === 'give') {
            if (!isset($doc['guests'][$me])) throw new ApiError(400, 'validation', 'Сначала ответьте, придёте ли вы.');
            $i = $find($kind);
            $by = $doc[$kind][$i]['by'] ?? null;
            if ($act === 'take') {
                if ($by && $by !== $me && isset($doc['guests'][$by])) throw new ApiError(409, 'taken', 'Это уже взял(а) ' . ($doc['guests'][$by]['name'] ?: 'другой гость') . '.');
                $doc[$kind][$i]['by'] = $me;
            } else {
                if ($by !== $me && !$admin) throw new ApiError(403, 'forbidden', 'Отказаться может только тот, кто взял.');
                $doc[$kind][$i]['by'] = null;
            }
        } elseif ($act === 'add') {
            if (!isset($doc['guests'][$me])) throw new ApiError(400, 'validation', 'Сначала ответьте, придёте ли вы.');
            if (count($doc[$kind] ?? []) >= 30) throw new ApiError(409, 'full', 'Список уже длинный — договоритесь в мессенджере.');
            $item = party_items([['title' => $b['title'] ?? '', 'id' => $b['id'] ?? null, 'slot' => '']], [], $kind === 'dishes');
            if (!$item) throw new ApiError(400, 'validation', 'Напишите, что принесёте.');
            // The organiser may add a dish for anybody to take; a guest adds what they bring.
            $item[0]['by'] = ($b['take'] ?? true) === false && $admin ? null : $me;
            $item[0]['added'] = $me;
            $doc[$kind][] = $item[0];
        } elseif ($act === 'remove') {
            $i = $find($kind);
            // The organiser removes anything; a guest only what they added themselves.
            if (!$admin && ($doc[$kind][$i]['added'] ?? null) !== $me) throw new ApiError(403, 'forbidden', 'Убрать может организатор или тот, кто добавил.');
            array_splice($doc[$kind], $i, 1);
        } elseif ($act === 'edit') {
            if (!$admin) throw new ApiError(403, 'forbidden', 'Менять стол может только организатор.');
            $doc = party_fields(is_array($b['patch'] ?? null) ? $b['patch'] : [], $doc);
        } elseif ($act === 'notify' || $act === 'unnotify') {
            // «Сообщать мне об ответах»: the organiser's browser (its web push subscription) hears of guests' answers.
            if (!$admin) throw new ApiError(403, 'forbidden', 'Это настройка организатора.');
            if (!function_exists('push_endpoint_ok') || !push_endpoint_ok($b['endpoint'] ?? null)) throw new ApiError(400, 'endpoint', 'Этот браузер не умеет показывать уведомления.');
            $id = push_id($b['endpoint']);
            $list = array_values(array_filter($doc['notify'] ?? [], fn($x) => $x !== $id));
            if ($act === 'notify') {
                push_schema();
                $st = db()->prepare('SELECT 1 FROM push_subs WHERE id = ?'); $st->execute([$id]);
                if (!$st->fetchColumn()) throw new ApiError(400, 'endpoint', 'Сначала разрешите уведомления.');
                $list = array_slice(array_merge([$id], $list), 0, 3);
            }
            $doc['notify'] = $list;
        } elseif ($act === 'kick') {
            if (!$admin) throw new ApiError(403, 'forbidden', 'Убрать гостя может только организатор.');
            $who = (string)($b['who'] ?? '');
            if ($who === ($doc['host'] ?? null)) throw new ApiError(400, 'validation', 'Организатора убрать нельзя.');
            unset($doc['guests'][$who]);
            foreach (['dishes', 'things'] as $l) foreach ($doc[$l] as &$x) if (($x['by'] ?? null) === $who) $x['by'] = null;
            unset($x);
        } else throw new ApiError(400, 'validation', 'Неизвестное действие.');
        party_save($p, $doc);
        $db->exec('COMMIT');
        // A guest's answer or a taken dish: the organiser hears of it (not of their own doings, not of the expenses).
        if (!$admin && $me !== ($doc['host'] ?? null) && in_array($act, ['answer', 'take', 'add'], true) && !array_key_exists('spent', $b)) {
            $g = $doc['guests'][$me] ?? [];
            $who = ($g['name'] ?? '') !== '' ? $g['name'] : 'Гость';
            $what = $act === 'answer' ? ($g['status'] === 'yes' ? ' придёт' . (!empty($g['plus']) ? ' +' . (int)$g['plus'] : '') : ($g['status'] === 'no' ? ' не сможет' : ' пока не знает'))
                : ($act === 'take' ? ' возьмёт: ' : ' принесёт: ') . (function () use ($doc, $b, $kind, $act) {
                    if ($act === 'add') { $l = $doc[$kind] ?? []; return (string)(end($l)['title'] ?? ''); }
                    foreach ($doc[$kind] ?? [] as $x) if ($x['key'] === ($b['key'] ?? null)) return (string)$x['title'];
                    return '';
                })();
            try { party_notice($doc, $b['token'], $who . $what); } catch (Throwable $e) { error_log('[what-to-cook] party notice: ' . $e->getMessage()); }
        }
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->exec('ROLLBACK');
        throw $e;
    }
    send_json(party_view(party_load($b['token']), $doc, $me, $admin));
}

// ---------- The organiser hears of answers (web push, push.php) ----------
// One note per subscription, gathered until it is shown: «Оля придёт +1 · Петя возьмёт: мангал». A push at most every
// two minutes per subscription; the service worker asks push.next and gets the note (url: the table).
function party_notes_schema(): void {
    static $done = false;
    if ($done) return;
    db()->exec('CREATE TABLE IF NOT EXISTS push_notes (sub_id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, url TEXT NOT NULL, at INTEGER NOT NULL, sent_at INTEGER NOT NULL DEFAULT 0)');
    $done = true;
}
function party_notice(array $doc, string $token, string $text): void {
    if (empty($doc['notify']) || !function_exists('push_send')) return;
    push_schema(); party_notes_schema();
    $title = mb_substr((string)($doc['title'] ?? 'Стол в складчину'), 0, 60);
    $url = './#party=' . $token;
    foreach ($doc['notify'] as $id) {
        $st = db()->prepare('SELECT * FROM push_subs WHERE id = ?'); $st->execute([$id]); $sub = $st->fetch(PDO::FETCH_ASSOC);
        if (!$sub) continue;
        $st = db()->prepare('SELECT body, url, sent_at FROM push_notes WHERE sub_id = ?'); $st->execute([$id]); $old = $st->fetch(PDO::FETCH_ASSOC);
        $body = $old && $old['url'] === $url ? mb_substr($old['body'] . ' · ' . $text, -200) : $text;
        $sent = $old ? (int)$old['sent_at'] : 0;
        db()->prepare('INSERT OR REPLACE INTO push_notes (sub_id, title, body, url, at, sent_at) VALUES (?, ?, ?, ?, ?, ?)')->execute([$id, $title, $body, $url, time(), $sent]);
        if (time() - $sent >= 120) {
            push_send($sub, 'party');
            db()->prepare('UPDATE push_notes SET sent_at = ? WHERE sub_id = ?')->execute([time(), $id]);
        }
    }
}
/** For push_next: the gathered note, once (then it is gone). */
function party_note_take(string $subId): ?array {
    party_notes_schema();
    $st = db()->prepare('SELECT title, body, url FROM push_notes WHERE sub_id = ?'); $st->execute([$subId]); $n = $st->fetch(PDO::FETCH_ASSOC);
    if (!$n) return null;
    db()->prepare('DELETE FROM push_notes WHERE sub_id = ?')->execute([$subId]);
    return ['title' => '🍽️ ' . $n['title'], 'body' => $n['body'], 'url' => $n['url']];
}
