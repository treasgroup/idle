<?php
// Reviews: stars 1–5, text, up to 3 photos, likes and replies. Written from the anonymous account of the device
// (accounts.php) under a name the person chooses. One review per account and recipe (a new one replaces it).
// Safety: links are refused, obscene words send the text to moderation, reports hide a text after several
// complaints, photos are re-encoded (no GPS or other metadata), the owner moderates in the admin panel.

const REVIEW_TEXT_MAX = 2000;
const REPLY_TEXT_MAX = 1000;
const REVIEW_PHOTOS_MAX = 3;
const REPORTS_TO_HIDE = 3;

function reviews_schema(): void {
    static $done = false;
    if ($done) return;
    accounts_schema();
    $pdo = db();
    $pdo->exec('CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, recipe_id TEXT NOT NULL, account_id TEXT NOT NULL, author TEXT NOT NULL,
        rating INTEGER NOT NULL, text TEXT NOT NULL, photos TEXT NOT NULL, status TEXT NOT NULL, likes INTEGER NOT NULL DEFAULT 0, reports INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(recipe_id, account_id))');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_reviews_recipe ON reviews(recipe_id, status)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS review_likes (review_id INTEGER NOT NULL, account_id TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(review_id, account_id))');
    $pdo->exec('CREATE TABLE IF NOT EXISTS review_replies (id INTEGER PRIMARY KEY AUTOINCREMENT, review_id INTEGER NOT NULL, account_id TEXT NOT NULL, author TEXT NOT NULL,
        text TEXT NOT NULL, status TEXT NOT NULL, reports INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_replies_review ON review_replies(review_id)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS review_reports (kind TEXT NOT NULL, target_id INTEGER NOT NULL, account_id TEXT NOT NULL, reason TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(kind, target_id, account_id))');
    $pdo->exec('CREATE TABLE IF NOT EXISTS authors (account_id TEXT PRIMARY KEY, name TEXT NOT NULL, banned INTEGER NOT NULL DEFAULT 0)');
    // consent with the rules and the privacy policy: when and which version (added in 0.19.0)
    $cols = array_column($pdo->query('PRAGMA table_info(authors)')->fetchAll(), 'name');
    if (!in_array('consent_at', $cols, true)) { $pdo->exec('ALTER TABLE authors ADD COLUMN consent_at INTEGER'); $pdo->exec('ALTER TABLE authors ADD COLUMN consent_version TEXT'); }
    $done = true;
}
function review_photos_dir(): string { return photos_dir() . '/reviews'; }
function review_photo_url(string $name): string { return 'photos/reviews/' . $name; }

function mb_len(string $s): int { return function_exists('mb_strlen') ? mb_strlen($s) : strlen($s); }
function clean_text(string $s, int $max): string {
    $s = str_replace("\r", '', $s);
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $s) ?? '';
    $s = preg_replace("/\n{3,}/", "\n\n", trim($s)) ?? '';
    if (mb_len($s) > $max) throw new ApiError(400, 'too_long', 'Текст слишком длинный: до ' . $max . ' символов.');
    return $s;
}
function check_no_links(string $s): void {
    if (preg_match('~(https?://|www\.|\b[a-z0-9-]+\.(ru|com|net|org|рф|su|io|me|info|biz|online|site|shop)\b|t\.me/|@[a-z0-9_]{4,})~iu', $s))
        throw new ApiError(400, 'links', 'Ссылки и контакты в отзывах нельзя — только впечатления о блюде.');
    if (preg_match('/(\+7|8)[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/', $s)) throw new ApiError(400, 'links', 'Телефоны в отзывах писать нельзя.');
}
// Obscene words: such a text is not published at once, the owner checks it in the admin panel.
function is_rude(string $s): bool {
    $t = ' ' . (function_exists('mb_strtolower') ? mb_strtolower($s) : strtolower($s)) . ' ';
    $t = strtr($t, ['ё' => 'е', '0' => 'о', '3' => 'з', '@' => 'а', '*' => '']);
    return (bool)preg_match('/[^а-я](х[уy][йяеиюё]|пизд|п[ие]здец|[её]б[ауеилоё]|бля|сук[аи]|муда|гандон|залуп|шлюх|дроч|пидор|пидр|ху[еи]в)/u', $t);
}
function author_name(string $accountId): ?string {
    $st = db()->prepare('SELECT name, banned FROM authors WHERE account_id = ?'); $st->execute([$accountId]); $r = $st->fetch();
    if ($r && (int)$r['banned']) throw new ApiError(403, 'banned', 'Писать отзывы с этого аккаунта нельзя.');
    return $r ? (string)$r['name'] : null;
}
function save_author(string $accountId, string $name): string {
    $name = trim(preg_replace('/\s+/u', ' ', $name) ?? '');
    $len = mb_len($name);
    if ($len < 2 || $len > 30 || !preg_match('/^[\p{L}\p{N} .\'-]+$/u', $name)) throw new ApiError(400, 'name', 'Имя: от 2 до 30 букв, без ссылок и значков.');
    if (is_rude($name)) throw new ApiError(400, 'name', 'Выберите другое имя.');
    check_no_links($name);
    db()->prepare('INSERT INTO authors (account_id, name) VALUES (?, ?) ON CONFLICT(account_id) DO UPDATE SET name = excluded.name')->execute([$accountId, $name]);
    return $name;
}
const LEGAL_VERSION = '2026-10-03';
function has_consent(string $accountId): bool { $st = db()->prepare('SELECT consent_at FROM authors WHERE account_id = ?'); $st->execute([$accountId]); return (bool)$st->fetchColumn(); }
// The first review or reply needs a tick "согласен с правилами и политикой"; it is remembered with the time.
function require_consent(string $accountId, $given): void {
    if (has_consent($accountId)) return;
    if (!$given || $given === '0' || $given === 'false') throw new ApiError(400, 'consent', 'Нужно согласие с Правилами отзывов и Политикой конфиденциальности.');
}
function store_consent(string $accountId): void {
    db()->prepare('UPDATE authors SET consent_at = COALESCE(consent_at, ?), consent_version = COALESCE(consent_version, ?) WHERE account_id = ?')->execute([now_ms(), LEGAL_VERSION, $accountId]);
}
function premoderation(): bool { return (bool)setting('reviews_premoderation', false); }
function recipe_exists(string $id): bool { return preg_match(RECIPE_ID, $id) && in_array($id, array_column(catalog_recipes(), 'id'), true); }

// Photo from the browser (already a JPEG up to 1600 px): checked, re-encoded when the server can, saved under a random name.
function store_review_photo(array $f): string {
    if (!upload_ok($f)) throw new ApiError(400, 'upload', 'Фото не загрузилось. Попробуйте ещё раз.');
    if ($f['size'] <= 0 || $f['size'] > 4 * 1024 * 1024) throw new ApiError(413, 'upload', 'Фото должно быть до 4 МБ.');
    $info = @getimagesize($f['tmp_name']);
    if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true) || $info[0] < 64 || $info[1] < 64 || $info[0] > 6000 || $info[1] > 6000)
        throw new ApiError(415, 'upload', 'Это не похоже на фото. Подойдут JPG и PNG.');
    $dir = review_photos_dir();
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) throw new ApiError(500, 'write', 'Не удалось сохранить фото.');
    if (!is_file($dir . '/.htaccess')) @file_put_contents($dir . '/.htaccess', "Options -Indexes\n<FilesMatch \"\\.(?i:php\\d?|phtml|phar|cgi|pl|py|sh|html?)$\">\nRequire all denied\n</FilesMatch>\n");
    $name = bin2hex(random_bytes(12)) . '.jpg';
    $target = $dir . '/' . $name;
    // Re-encoding drops EXIF (place of shooting, phone model) and anything hidden in the file.
    if (function_exists('imagecreatefromstring') && function_exists('imagejpeg')) {
        $img = @imagecreatefromstring((string)file_get_contents($f['tmp_name']));
        if (!$img) throw new ApiError(415, 'upload', 'Фото не открылось. Попробуйте другое.');
        $w = imagesx($img); $h = imagesy($img); $scale = min(1, 1600 / max($w, $h));
        if ($scale < 1) { $dst = imagecreatetruecolor((int)round($w * $scale), (int)round($h * $scale)); imagecopyresampled($dst, $img, 0, 0, 0, 0, imagesx($dst), imagesy($dst), $w, $h); imagedestroy($img); $img = $dst; }
        if (!@imagejpeg($img, $target, 85)) { imagedestroy($img); throw new ApiError(500, 'write', 'Не удалось сохранить фото.'); }
        imagedestroy($img);
    } else {
        if ($info[2] !== IMAGETYPE_JPEG) throw new ApiError(415, 'upload', 'Нужен файл JPEG.');
        if (!upload_move($f['tmp_name'], $target)) throw new ApiError(500, 'write', 'Не удалось сохранить фото.');
    }
    @chmod($target, 0644);
    return $name;
}
function delete_review_photos(array $names): void {
    foreach ($names as $n) if (is_string($n) && preg_match('/^[0-9a-f]{24}\.jpg$/', $n)) @unlink(review_photos_dir() . '/' . $n);
}

// ---------- reading ----------
function review_summary(string $recipeId): array {
    $st = db()->prepare("SELECT rating, COUNT(*) n FROM reviews WHERE recipe_id = ? AND status = 'visible' GROUP BY rating");
    $st->execute([$recipeId]);
    $dist = [0, 0, 0, 0, 0]; $sum = 0; $count = 0;
    foreach ($st->fetchAll() as $r) { $dist[(int)$r['rating'] - 1] = (int)$r['n']; $sum += (int)$r['rating'] * (int)$r['n']; $count += (int)$r['n']; }
    return ['avg' => $count ? round($sum / $count, 1) : 0, 'count' => $count, 'dist' => $dist];
}
function review_out(array $r, ?string $me, array $liked, array $replies): array {
    return ['id' => (int)$r['id'], 'author' => $r['author'], 'rating' => (int)$r['rating'], 'text' => $r['text'],
        'photos' => array_map('review_photo_url', json_decode($r['photos'], true) ?: []), 'created' => (int)$r['created_at'], 'edited' => (int)$r['updated_at'] > (int)$r['created_at'] + 60000,
        'likes' => (int)$r['likes'], 'liked' => in_array((int)$r['id'], $liked, true), 'mine' => $me !== null && $r['account_id'] === $me,
        'pending' => $r['status'] === 'pending', 'replies' => $replies];
}
function reviews_list(): void {
    reviews_schema();
    $recipe = (string)($_GET['recipe'] ?? '');
    if (!recipe_exists($recipe)) throw new ApiError(404, 'recipe', 'Рецепт не найден.');
    $sort = ($_GET['sort'] ?? '') === 'top' ? 'likes DESC, created_at DESC' : (($_GET['sort'] ?? '') === 'photos' ? "(photos <> '[]') DESC, created_at DESC" : 'created_at DESC');
    $offset = max(0, min(10000, (int)($_GET['offset'] ?? 0)));
    $me = current_account(); $meId = $me['id'] ?? null;
    // Others see published texts; the author also sees his own one waiting for moderation.
    $st = db()->prepare("SELECT * FROM reviews WHERE recipe_id = ? AND (status = 'visible' OR (status = 'pending' AND account_id = ?)) ORDER BY $sort LIMIT 11 OFFSET $offset");
    $st->execute([$recipe, $meId ?? '-']);
    $rows = $st->fetchAll(); $more = count($rows) > 10; $rows = array_slice($rows, 0, 10);
    $ids = array_map(fn($r) => (int)$r['id'], $rows);
    $liked = []; $replies = [];
    if ($ids) {
        $in = implode(',', $ids);
        if ($meId) { $l = db()->prepare("SELECT review_id FROM review_likes WHERE account_id = ? AND review_id IN ($in)"); $l->execute([$meId]); $liked = array_map('intval', $l->fetchAll(PDO::FETCH_COLUMN)); }
        $rp = db()->prepare("SELECT * FROM review_replies WHERE review_id IN ($in) AND (status = 'visible' OR (status = 'pending' AND account_id = ?)) ORDER BY created_at ASC");
        $rp->execute([$meId ?? '-']);
        foreach ($rp->fetchAll() as $x) $replies[(int)$x['review_id']][] = ['id' => (int)$x['id'], 'author' => $x['author'], 'text' => $x['text'], 'created' => (int)$x['created_at'], 'mine' => $meId !== null && $x['account_id'] === $meId, 'pending' => $x['status'] === 'pending'];
    }
    $mine = null;
    if ($meId) { $m = db()->prepare('SELECT * FROM reviews WHERE recipe_id = ? AND account_id = ?'); $m->execute([$recipe, $meId]); $row = $m->fetch(); if ($row && $row['status'] !== 'hidden') $mine = review_out($row, $meId, $liked, $replies[(int)$row['id']] ?? []); }
    send_json(['summary' => review_summary($recipe), 'reviews' => array_map(fn($r) => review_out($r, $meId, $liked, $replies[(int)$r['id']] ?? []), $rows), 'more' => $more, 'mine' => $mine,
        'author' => $meId ? author_name_safe($meId) : null, 'consented' => $meId ? has_consent($meId) : false]);
}
function author_name_safe(string $id): ?string { try { return author_name($id); } catch (Throwable $e) { return null; } }
// Average stars for every recipe (cards and sorting); small and cached by the browser for a minute.
function reviews_ratings(): void {
    reviews_schema();
    $out = [];
    foreach (db()->query("SELECT recipe_id, AVG(rating) a, COUNT(*) n FROM reviews WHERE status = 'visible' GROUP BY recipe_id")->fetchAll() as $r) $out[$r['recipe_id']] = [round((float)$r['a'], 1), (int)$r['n']];
    send_json(['ratings' => (object)$out], 200, ['Cache-Control: max-age=60']);
}

// ---------- writing ----------
function reviews_save(): void {
    require_same_origin(); reviews_schema();
    $a = require_account();
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 14 * 1024 * 1024) throw new ApiError(413, 'too_large', 'Слишком большие фото.');
    limit_or_fail('review', 20, 3000);
    $recipe = (string)($_POST['recipeId'] ?? '');
    if (!recipe_exists($recipe)) throw new ApiError(404, 'recipe', 'Рецепт не найден.');
    $rating = (int)($_POST['rating'] ?? 0);
    if ($rating < 1 || $rating > 5) throw new ApiError(400, 'rating', 'Поставьте от 1 до 5 звёзд.');
    $text = clean_text((string)($_POST['text'] ?? ''), REVIEW_TEXT_MAX);
    check_no_links($text);
    require_consent($a['id'], $_POST['consent'] ?? null);
    $name = isset($_POST['author']) && trim((string)$_POST['author']) !== '' ? save_author($a['id'], (string)$_POST['author']) : author_name($a['id']);
    if (!$name) throw new ApiError(400, 'name', 'Как подписать отзыв? Напишите имя.');
    store_consent($a['id']);
    author_name($a['id']); // banned check
    $st = db()->prepare('SELECT * FROM reviews WHERE recipe_id = ? AND account_id = ?'); $st->execute([$recipe, $a['id']]); $old = $st->fetch();
    $oldPhotos = $old ? (json_decode($old['photos'], true) ?: []) : [];
    $keep = array_values(array_intersect($oldPhotos, json_decode((string)($_POST['keepPhotos'] ?? '[]'), true) ?: []));
    $files = $_FILES['photos'] ?? null; $new = [];
    if ($files && is_array($files['name'] ?? null)) {
        $n = count($files['name']);
        if ($n + count($keep) > REVIEW_PHOTOS_MAX) throw new ApiError(400, 'photos', 'Можно приложить до ' . REVIEW_PHOTOS_MAX . ' фото.');
        for ($i = 0; $i < $n; $i++) $new[] = store_review_photo(['error' => $files['error'][$i], 'tmp_name' => $files['tmp_name'][$i], 'size' => $files['size'][$i]]);
    }
    $photos = array_merge($keep, $new);
    $status = (premoderation() || is_rude($text)) ? 'pending' : 'visible';
    // A changed text needs moderation again if it was hidden by the owner.
    if ($old && $old['status'] === 'hidden') $status = 'pending';
    $now = now_ms();
    if ($old) db()->prepare('UPDATE reviews SET author = ?, rating = ?, text = ?, photos = ?, status = ?, updated_at = ? WHERE id = ?')->execute([$name, $rating, $text, json_encode($photos), $status, $now, $old['id']]);
    else db()->prepare('INSERT INTO reviews (recipe_id, account_id, author, rating, text, photos, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')->execute([$recipe, $a['id'], $name, $rating, $text, json_encode($photos), $status, $now, $now]);
    delete_review_photos(array_diff($oldPhotos, $keep));
    send_json(['saved' => true, 'status' => $status, 'author' => $name]);
}
function own_review(int $id, string $accountId): array {
    $st = db()->prepare('SELECT * FROM reviews WHERE id = ?'); $st->execute([$id]); $r = $st->fetch();
    if (!$r || $r['account_id'] !== $accountId) throw new ApiError(404, 'review', 'Отзыв не найден.');
    return $r;
}
function delete_review_row(array $r): void {
    db()->prepare('DELETE FROM reviews WHERE id = ?')->execute([$r['id']]);
    db()->prepare('DELETE FROM review_likes WHERE review_id = ?')->execute([$r['id']]);
    db()->prepare('DELETE FROM review_replies WHERE review_id = ?')->execute([$r['id']]);
    db()->prepare("DELETE FROM review_reports WHERE kind = 'review' AND target_id = ?")->execute([$r['id']]);
    delete_review_photos(json_decode($r['photos'], true) ?: []);
}
function reviews_delete(array $b): void { require_same_origin(); reviews_schema(); $a = require_account(); delete_review_row(own_review((int)($b['id'] ?? 0), $a['id'])); send_json(['deleted' => true]); }
function reviews_like(array $b): void {
    require_same_origin(); reviews_schema(); $a = require_account(); limit_or_fail('like', 300, 50000);
    $id = (int)($b['id'] ?? 0); $on = !empty($b['on']);
    $st = db()->prepare("SELECT account_id FROM reviews WHERE id = ? AND status = 'visible'"); $st->execute([$id]); $owner = $st->fetchColumn();
    if ($owner === false) throw new ApiError(404, 'review', 'Отзыв не найден.');
    if ($owner === $a['id']) throw new ApiError(400, 'own', 'Свой отзыв лайкать нельзя.');
    if ($on) db()->prepare('INSERT OR IGNORE INTO review_likes (review_id, account_id, created_at) VALUES (?, ?, ?)')->execute([$id, $a['id'], now_ms()]);
    else db()->prepare('DELETE FROM review_likes WHERE review_id = ? AND account_id = ?')->execute([$id, $a['id']]);
    db()->prepare('UPDATE reviews SET likes = (SELECT COUNT(*) FROM review_likes WHERE review_id = ?) WHERE id = ?')->execute([$id, $id]);
    $n = db()->prepare('SELECT likes FROM reviews WHERE id = ?'); $n->execute([$id]);
    send_json(['likes' => (int)$n->fetchColumn(), 'liked' => $on]);
}
function reviews_reply(array $b): void {
    require_same_origin(); reviews_schema(); $a = require_account(); limit_or_fail('reply', 30, 5000);
    $id = (int)($b['reviewId'] ?? 0);
    $st = db()->prepare("SELECT id FROM reviews WHERE id = ? AND status = 'visible'"); $st->execute([$id]);
    if (!$st->fetch()) throw new ApiError(404, 'review', 'Отзыв не найден.');
    $text = clean_text((string)($b['text'] ?? ''), REPLY_TEXT_MAX);
    if (mb_len($text) < 2) throw new ApiError(400, 'text', 'Напишите ответ.');
    check_no_links($text);
    require_consent($a['id'], $b['consent'] ?? null);
    $name = isset($b['author']) && trim((string)$b['author']) !== '' ? save_author($a['id'], (string)$b['author']) : author_name($a['id']);
    if (!$name) throw new ApiError(400, 'name', 'Как подписать ответ? Напишите имя.');
    store_consent($a['id']);
    $status = (premoderation() || is_rude($text)) ? 'pending' : 'visible';
    db()->prepare('INSERT INTO review_replies (review_id, account_id, author, text, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')->execute([$id, $a['id'], $name, $text, $status, now_ms()]);
    send_json(['saved' => true, 'status' => $status, 'author' => $name]);
}
function reviews_reply_delete(array $b): void {
    require_same_origin(); reviews_schema(); $a = require_account();
    $st = db()->prepare('DELETE FROM review_replies WHERE id = ? AND account_id = ?'); $st->execute([(int)($b['id'] ?? 0), $a['id']]);
    send_json(['deleted' => $st->rowCount() > 0]);
}
// A complaint; after several from different accounts the text is hidden until the owner looks at it.
function reviews_report(array $b): void {
    require_same_origin(); reviews_schema(); $a = require_account(); limit_or_fail('report', 30, 3000);
    $kind = ($b['kind'] ?? '') === 'reply' ? 'reply' : 'review'; $id = (int)($b['id'] ?? 0);
    $reason = in_array($b['reason'] ?? '', ['rude', 'spam', 'wrong', 'other'], true) ? $b['reason'] : 'other';
    $table = $kind === 'reply' ? 'review_replies' : 'reviews';
    $st = db()->prepare("SELECT account_id FROM $table WHERE id = ?"); $st->execute([$id]); $owner = $st->fetchColumn();
    if ($owner === false) throw new ApiError(404, 'review', 'Не найдено.');
    if ($owner === $a['id']) throw new ApiError(400, 'own', 'Это ваш текст.');
    $ins = db()->prepare('INSERT OR IGNORE INTO review_reports (kind, target_id, account_id, reason, created_at) VALUES (?, ?, ?, ?, ?)');
    $ins->execute([$kind, $id, $a['id'], $reason, now_ms()]);
    if ($ins->rowCount()) {
        db()->prepare("UPDATE $table SET reports = reports + 1 WHERE id = ?")->execute([$id]);
        db()->prepare("UPDATE $table SET status = 'pending' WHERE id = ? AND status = 'visible' AND reports >= ?")->execute([$id, REPORTS_TO_HIDE]);
    }
    send_json(['reported' => true]);
}

// ---------- admin ----------
function admin_reviews(): void {
    reviews_schema();
    $filter = (string)($_GET['filter'] ?? 'attention');
    $where = $filter === 'all' ? '1' : ($filter === 'hidden' ? "status = 'hidden'" : "(status = 'pending' OR reports > 0)");
    $reviews = db()->query("SELECT r.*, (SELECT COUNT(*) FROM review_replies x WHERE x.review_id = r.id) reply_count FROM reviews r WHERE $where ORDER BY updated_at DESC LIMIT 200")->fetchAll();
    $replies = db()->query('SELECT x.*, r.recipe_id FROM review_replies x JOIN reviews r ON r.id = x.review_id WHERE ' . ($filter === 'all' ? '1' : ($filter === 'hidden' ? "x.status = 'hidden'" : "(x.status = 'pending' OR x.reports > 0)")) . ' ORDER BY x.created_at DESC LIMIT 200')->fetchAll();
    $count = fn($sql) => (int)db()->query($sql)->fetchColumn();
    send_json([
        'reviews' => array_map(fn($r) => ['id' => (int)$r['id'], 'recipeId' => $r['recipe_id'], 'author' => $r['author'], 'account' => substr($r['account_id'], 0, 8), 'rating' => (int)$r['rating'], 'text' => $r['text'],
            'photos' => array_map('review_photo_url', json_decode($r['photos'], true) ?: []), 'status' => $r['status'], 'likes' => (int)$r['likes'], 'reports' => (int)$r['reports'], 'replies' => (int)$r['reply_count'], 'created' => (int)$r['created_at'], 'updated' => (int)$r['updated_at']], $reviews),
        'replies' => array_map(fn($x) => ['id' => (int)$x['id'], 'reviewId' => (int)$x['review_id'], 'recipeId' => $x['recipe_id'], 'author' => $x['author'], 'account' => substr($x['account_id'], 0, 8), 'text' => $x['text'], 'status' => $x['status'], 'reports' => (int)$x['reports'], 'created' => (int)$x['created_at']], $replies),
        'counts' => ['attention' => $count("SELECT COUNT(*) FROM reviews WHERE status = 'pending' OR reports > 0") + $count("SELECT COUNT(*) FROM review_replies WHERE status = 'pending' OR reports > 0"),
            'visible' => $count("SELECT COUNT(*) FROM reviews WHERE status = 'visible'"), 'hidden' => $count("SELECT COUNT(*) FROM reviews WHERE status = 'hidden'"), 'replies' => $count('SELECT COUNT(*) FROM review_replies')],
        'premoderation' => premoderation(),
    ]);
}
function admin_review_action(array $b): void {
    reviews_schema();
    $kind = ($b['kind'] ?? '') === 'reply' ? 'reply' : 'review'; $id = (int)($b['id'] ?? 0); $action = (string)($b['action'] ?? '');
    $table = $kind === 'reply' ? 'review_replies' : 'reviews';
    $st = db()->prepare("SELECT * FROM $table WHERE id = ?"); $st->execute([$id]); $row = $st->fetch();
    if (!$row) throw new ApiError(404, 'review', 'Не найдено.');
    if ($action === 'show' || $action === 'hide') {
        db()->prepare("UPDATE $table SET status = ?, reports = 0 WHERE id = ?")->execute([$action === 'show' ? 'visible' : 'hidden', $id]);
        db()->prepare('DELETE FROM review_reports WHERE kind = ? AND target_id = ?')->execute([$kind, $id]);
    } elseif ($action === 'delete') {
        if ($kind === 'review') delete_review_row($row); else db()->prepare('DELETE FROM review_replies WHERE id = ?')->execute([$id]);
    } elseif ($action === 'ban') {
        db()->prepare('INSERT INTO authors (account_id, name, banned) VALUES (?, ?, 1) ON CONFLICT(account_id) DO UPDATE SET banned = 1')->execute([$row['account_id'], $row['author']]);
        db()->prepare("UPDATE reviews SET status = 'hidden' WHERE account_id = ?")->execute([$row['account_id']]);
        db()->prepare("UPDATE review_replies SET status = 'hidden' WHERE account_id = ?")->execute([$row['account_id']]);
    } else throw new ApiError(400, 'action', 'Неизвестное действие.');
    send_json(['done' => true]);
}
function admin_reviews_settings(array $b): void { set_setting('reviews_premoderation', !empty($b['premoderation'])); send_json(['premoderation' => premoderation()]); }

// ---------- account changes ----------
function reviews_move(string $from, string $to): void {
    reviews_schema();
    db()->prepare('UPDATE OR IGNORE reviews SET account_id = ? WHERE account_id = ?')->execute([$to, $from]);
    db()->prepare('UPDATE review_replies SET account_id = ? WHERE account_id = ?')->execute([$to, $from]);
    db()->prepare('UPDATE OR IGNORE review_likes SET account_id = ? WHERE account_id = ?')->execute([$to, $from]);
    db()->prepare('INSERT OR IGNORE INTO authors (account_id, name, banned) SELECT ?, name, banned FROM authors WHERE account_id = ?')->execute([$to, $from]);
}
function reviews_forget(string $account): void {
    reviews_schema();
    $st = db()->prepare('SELECT * FROM reviews WHERE account_id = ?'); $st->execute([$account]);
    foreach ($st->fetchAll() as $r) delete_review_row($r);
    db()->prepare('DELETE FROM review_replies WHERE account_id = ?')->execute([$account]);
    $liked = db()->prepare('SELECT review_id FROM review_likes WHERE account_id = ?'); $liked->execute([$account]); $ids = $liked->fetchAll(PDO::FETCH_COLUMN);
    db()->prepare('DELETE FROM review_likes WHERE account_id = ?')->execute([$account]);
    foreach ($ids as $id) db()->prepare('UPDATE reviews SET likes = (SELECT COUNT(*) FROM review_likes WHERE review_id = ?) WHERE id = ?')->execute([$id, $id]);
    db()->prepare('DELETE FROM authors WHERE account_id = ? AND banned = 0')->execute([$account]);
}
