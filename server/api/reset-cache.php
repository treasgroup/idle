<?php
// Opens once after uploading a new version: clears the PHP code cache (OPcache) of the hosting,
// so the server starts using the new files right away. Shows nothing secret.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$enabled = function_exists('opcache_get_status') && is_array(@opcache_get_status(false));
$reset = function_exists('opcache_reset') ? @opcache_reset() : false;
$sizes = [];
foreach (['index.php', '_private/lib.php', '_private/admin.php', '_private/accounts.php', '_private/reviews.php', '_private/push.php', '_private/polls.php', '_private/providers.php', '_private/seo.php', '../recipe.php', '../recipes.php', '../sitemap.php'] as $f) $sizes[$f] = is_file(__DIR__ . '/' . $f) ? filesize(__DIR__ . '/' . $f) : 0;
$src = is_file(__DIR__ . '/index.php') ? (string)file_get_contents(__DIR__ . '/index.php') : '';
preg_match("/const VERSION = '([0-9.]+)'/", $src, $m);
echo json_encode([
    'cacheCleared' => (bool)$reset, 'opcache' => $enabled, 'versionOnDisk' => $m[1] ?? null, 'files' => $sizes,
    'next' => $reset ? 'Готово. Откройте сайт заново.' : ($enabled ? 'Хостинг не разрешил сбросить кеш. Перезапустите PHP в панели хостинга.' : 'Кеша кода нет — файлы уже используются.'),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
