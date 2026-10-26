<?php
// «Статьи» (/stati/, /stati/<slug>) and their feed for Дзен (/dzen.xml): see api/_private/articles.php.
declare(strict_types=1);
require __DIR__ . '/api/_private/lib.php';
require __DIR__ . '/api/_private/admin.php';
require __DIR__ . '/api/_private/accounts.php';
require __DIR__ . '/api/_private/reviews.php';
require __DIR__ . '/api/_private/seo.php';
require __DIR__ . '/api/_private/collections.php';
require __DIR__ . '/api/_private/articles.php';
seo_run(function () {
    if (!empty($_GET['rss'])) { art_feed(); return; }
    $s = (string)($_GET['s'] ?? '');
    art_page(preg_match('/^[a-z0-9-]{1,80}$/', $s) ? $s : '');
});
