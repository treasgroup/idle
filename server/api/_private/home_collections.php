<?php
// Подборки on Главная: the owner's changes over the rules built into the site (setting 'collections'):
// shown or not, the title and the line under it, recipes added or taken out by hand, own new collections
// (only hand-picked recipes), and drawn covers next to the site: collections/<key>.jpg (tall 4:5, phones) and
// collections/<key>-wide.jpg (wide 3:2, computers; without it computers cut the tall one).

const COLLECTION_KEY = '/^[a-z0-9][a-z0-9-]{0,40}$/';
/** Cover shapes: file suffix, aspect (width / height) and the saved size. */
const COVER_SHAPES = ['tall' => ['', 4 / 5, 900, 1125], 'wide' => ['-wide', 3 / 2, 1500, 1000]];

/** A collection's key; «-wide» at the end is kept for the wide cover's file name. */
function collection_key($k): string {
    $k = (string)$k;
    if (!preg_match(COLLECTION_KEY, $k) || substr($k, -5) === '-wide') throw new ApiError(400, 'validation', 'Неверная подборка.');
    return $k;
}
function cover_path(string $key, string $shape): string { return collections_dir() . '/' . $key . COVER_SHAPES[$shape][0] . '.jpg'; }

function collections_dir(): string { return dirname(__DIR__, 2) . '/collections'; }
function collections_custom(): array { $v = setting('collections', []); return is_array($v) ? $v : []; }

function collection_ids($list): array {
    $out = [];
    foreach (is_array($list) ? $list : [] as $id) { $id = (string)$id; if (strlen($id) <= 60 && preg_match(RECIPE_ID, $id) && !in_array($id, $out, true)) $out[] = $id; }
    return array_slice($out, 0, 400);
}

function collection_clean(array $c): array {
    $o = [];
    if (array_key_exists('on', $c)) $o['on'] = (bool)$c['on'];
    foreach (['title' => 60, 'hint' => 120, 'emoji' => 8] as $f => $n) if (isset($c[$f]) && trim((string)$c[$f]) !== '') $o[$f] = cut((string)$c[$f], $n);
    $o['add'] = collection_ids($c['add'] ?? []);
    $o['remove'] = collection_ids($c['remove'] ?? []);
    if (!empty($c['custom'])) $o['custom'] = true;
    return $o;
}

/** Public: the owner's changes and which covers exist (with their version), for Главная. */
function collections_public(): void {
    $out = [];
    foreach (collections_custom() as $k => $c) if (is_string($k) && preg_match(COLLECTION_KEY, $k) && is_array($c)) $out[$k] = collection_clean($c);
    foreach (glob(collections_dir() . '/*.jpg') ?: [] as $p) {
        $k = basename($p, '.jpg');
        $field = substr($k, -5) === '-wide' ? 'coverWide' : 'cover';
        if ($field === 'coverWide') $k = substr($k, 0, -5);
        if (preg_match(COLLECTION_KEY, $k)) { $out[$k] = $out[$k] ?? []; $out[$k][$field] = filemtime($p); }
    }
    send_json(['collections' => (object)$out]);
}

function admin_collection_save(array $b): void {
    $key = collection_key($b['key'] ?? '');
    $all = collections_custom();
    if (!empty($b['delete'])) {
        unset($all[$key]);
        foreach (array_keys(COVER_SHAPES) as $shape) if (is_file(cover_path($key, $shape))) @unlink(cover_path($key, $shape));
    } else {
        $c = collection_clean(is_array($b['collection'] ?? null) ? $b['collection'] : []);
        if (!empty($c['custom']) && empty($c['title'])) throw new ApiError(400, 'validation', 'Дайте подборке название.');
        $all[$key] = $c;
    }
    set_setting('collections', $all);
    collections_public();
}

/** A cover: JPEG, PNG or WebP from any image generator, cut around the centre to its shape (tall 4:5 → 900×1125,
 * wide 3:2 → 1500×1000) and saved as a JPEG. */
function admin_collection_cover(): void {
    $key = collection_key($_POST['key'] ?? '');
    $shape = ($_POST['shape'] ?? 'tall') === 'wide' ? 'wide' : 'tall';
    [, $ratio, $ow, $oh] = COVER_SHAPES[$shape];
    $f = $_FILES['cover'] ?? null;
    if (!$f || ($f['error'] ?? 1) !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) throw new ApiError(400, 'upload', 'Картинка не загрузилась. Попробуйте файл поменьше.');
    if ($f['size'] <= 0 || $f['size'] > 12 * 1024 * 1024) throw new ApiError(413, 'upload', 'Картинка должна быть до 12 МБ.');
    if (!function_exists('imagecreatefromstring')) throw new ApiError(500, 'gd', 'На хостинге не включена библиотека GD для картинок.');
    $info = @getimagesize($f['tmp_name']);
    if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true) || $info[0] > 10000 || $info[1] > 10000)
        throw new ApiError(415, 'upload', 'Нужна картинка JPEG, PNG или WebP.');
    $src = @imagecreatefromstring((string)file_get_contents($f['tmp_name']));
    if (!$src) throw new ApiError(415, 'upload', 'Не получилось прочитать картинку.');
    // Cut to the shape around the centre, then scale.
    [$w, $h] = [imagesx($src), imagesy($src)];
    $cw = $w; $ch = (int)round($w / $ratio);
    if ($ch > $h) { $ch = $h; $cw = (int)round($h * $ratio); }
    $dst = imagecreatetruecolor($ow, $oh);
    imagecopyresampled($dst, $src, 0, 0, (int)(($w - $cw) / 2), (int)(($h - $ch) / 2), $ow, $oh, $cw, $ch);
    imageinterlace($dst, true);
    $dir = collections_dir();
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) throw new ApiError(500, 'write', 'Нет папки collections. Создайте её рядом с папкой photos.');
    $tmp = $dir . '/.upload-' . bin2hex(random_bytes(4));
    $ok = imagejpeg($dst, $tmp, 86);
    imagedestroy($dst); imagedestroy($src);
    $to = cover_path($key, $shape);
    if (!$ok || !@rename($tmp, $to)) { @unlink($tmp); throw new ApiError(500, 'write', 'Не удалось сохранить обложку. Проверьте права на папку collections.'); }
    @chmod($to, 0644);
    clearstatcache();
    collections_public();
}

function admin_collection_cover_delete(array $b): void {
    $key = collection_key($b['key'] ?? '');
    $p = cover_path($key, ($b['shape'] ?? 'tall') === 'wide' ? 'wide' : 'tall');
    if (is_file($p) && !@unlink($p)) throw new ApiError(500, 'write', 'Не удалось удалить обложку.');
    collections_public();
}
