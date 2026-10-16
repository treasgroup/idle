<?php
// Collections of recipes for search engines: to the holiday, by season, for guests and children (see collections.php).
declare(strict_types=1);
require __DIR__ . '/api/_private/lib.php';
require __DIR__ . '/api/_private/admin.php';
require __DIR__ . '/api/_private/accounts.php';
require __DIR__ . '/api/_private/reviews.php';
require __DIR__ . '/api/_private/seo.php';
require __DIR__ . '/api/_private/collections.php';
seo_run(function () { $k = isset($_GET['k']) ? strtolower((string)$_GET['k']) : ''; seo_collection_page(preg_match('/^[a-z-]{1,30}$/', $k) ? $k : ($k === '' ? '' : '-')); });
