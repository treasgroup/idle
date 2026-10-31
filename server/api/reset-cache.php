<?php
// Opens once after uploading a new version: clears the PHP code cache (OPcache) of the hosting,
// so the server starts using the new files right away. Shows nothing secret.
// Anyone can open it, so the cache is cleared at most once a minute: a busy reset loop would only slow the site down.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');
$enabled = function_exists('opcache_get_status') && is_array(@opcache_get_status(false));
$stamp = __DIR__ . '/_private/storage/opcache-reset.txt';
$last = is_file($stamp) ? (int)@file_get_contents($stamp) : 0;
$wait = 60 - (time() - $last);
$reset = false;
if ($wait <= 0 && function_exists('opcache_reset')) { $reset = @opcache_reset(); @file_put_contents($stamp, (string)time(), LOCK_EX); }
$sizes = [];
foreach (['index.php', '_private/lib.php', '_private/admin.php', '_private/accounts.php', '_private/reviews.php', '_private/push.php', '_private/polls.php', '_private/providers.php', '_private/seo.php', '../recipe.php', '../recipes.php', '../sitemap.php'] as $f) $sizes[$f] = is_file(__DIR__ . '/' . $f) ? filesize(__DIR__ . '/' . $f) : 0;
$src = is_file(__DIR__ . '/index.php') ? (string)file_get_contents(__DIR__ . '/index.php') : '';
preg_match("/const VERSION = '([0-9.]+)'/", $src, $m);
echo json_encode([
    'cacheCleared' => (bool)$reset, 'opcache' => $enabled, 'versionOnDisk' => $m[1] ?? null, 'files' => $sizes,
    'next' => $reset ? 'Готово. Откройте сайт заново.'
        : ($wait > 0 && $enabled ? 'Кеш уже сбрасывали меньше минуты назад — подождите ' . $wait . ' с и откройте страницу снова.'
        : ($enabled ? 'Хостинг не разрешил сбросить кеш. Перезапустите PHP в панели хостинга.' : 'Кеша кода нет — файлы уже используются.')),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
