<?php
// Pictures for the cards of «Школа готовки», uploaded by the owner in the admin («Рецепты → Школа»): any JPEG, PNG
// or WebP from an image generator, cut to 3:2 around the centre and saved as school/<lesson>-<card>.jpg (1200×800)
// next to the site. A card without one shows its drawn scheme or a big icon.

const SCHOOL_IMAGE_KEY = '/^[a-z][a-z-]{0,29}-\d{1,2}$/';

function school_images_dir(): string { return dirname(__DIR__, 2) . '/school'; }

/** Public: which cards have a picture, with its version (for the app's lessons). */
function school_images_public(): void {
    $out = [];
    foreach (glob(school_images_dir() . '/*.jpg') ?: [] as $p) {
        $k = basename($p, '.jpg');
        if (preg_match(SCHOOL_IMAGE_KEY, $k)) $out[$k] = filemtime($p);
    }
    send_json(['images' => (object)$out]);
}

function admin_school_image(): void {
    $key = (string)($_POST['key'] ?? '');
    if (!preg_match(SCHOOL_IMAGE_KEY, $key)) throw new ApiError(400, 'validation', 'Неверная карточка урока.');
    $f = $_FILES['image'] ?? null;
    if (!upload_ok($f)) throw new ApiError(400, 'upload', 'Картинка не загрузилась. Попробуйте файл поменьше.');
    if ($f['size'] <= 0 || $f['size'] > 12 * 1024 * 1024) throw new ApiError(413, 'upload', 'Картинка должна быть до 12 МБ.');
    if (!function_exists('imagecreatefromstring')) throw new ApiError(500, 'gd', 'На хостинге не включена библиотека GD для картинок.');
    $info = @getimagesize($f['tmp_name']);
    if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true) || $info[0] > 10000 || $info[1] > 10000)
        throw new ApiError(415, 'upload', 'Нужна картинка JPEG, PNG или WebP.');
    $src = @imagecreatefromstring((string)file_get_contents($f['tmp_name']));
    if (!$src) throw new ApiError(415, 'upload', 'Не получилось прочитать картинку.');
    [$w, $h] = [imagesx($src), imagesy($src)];
    $cw = $w; $ch = (int)round($w * 2 / 3);
    if ($ch > $h) { $ch = $h; $cw = (int)round($h * 3 / 2); }
    $dst = imagecreatetruecolor(1200, 800);
    imagecopyresampled($dst, $src, 0, 0, (int)(($w - $cw) / 2), (int)(($h - $ch) / 2), 1200, 800, $cw, $ch);
    imageinterlace($dst, true);
    $dir = school_images_dir();
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) throw new ApiError(500, 'write', 'Нет папки school. Создайте её рядом с папкой photos.');
    $tmp = $dir . '/.upload-' . bin2hex(random_bytes(4));
    $ok = imagejpeg($dst, $tmp, 84);
    imagedestroy($dst); imagedestroy($src);
    $to = $dir . '/' . $key . '.jpg';
    if (!$ok || !@rename($tmp, $to)) { @unlink($tmp); throw new ApiError(500, 'write', 'Не удалось сохранить картинку. Проверьте права на папку school.'); }
    @chmod($to, 0644);
    clearstatcache();
    school_images_public();
}

function admin_school_image_delete(array $b): void {
    $key = (string)($b['key'] ?? '');
    if (!preg_match(SCHOOL_IMAGE_KEY, $key)) throw new ApiError(400, 'validation', 'Неверная карточка урока.');
    $p = school_images_dir() . '/' . $key . '.jpg';
    if (is_file($p) && !@unlink($p)) throw new ApiError(500, 'write', 'Не удалось удалить картинку.');
    school_images_public();
}
