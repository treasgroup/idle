<?php
// Справочник «Сколько…» for search engines: /skolko/, /skolko/<page> (see api/_private/skolko_seo.php).
declare(strict_types=1);
require __DIR__ . '/api/_private/lib.php';
require __DIR__ . '/api/_private/admin.php';
require __DIR__ . '/api/_private/accounts.php';
require __DIR__ . '/api/_private/reviews.php';
require __DIR__ . '/api/_private/seo.php';
require __DIR__ . '/api/_private/skolko_seo.php';
seo_run(function () { $k = isset($_GET['k']) ? strtolower((string)$_GET['k']) : ''; skolko_page(preg_match('/^[a-z]+(-[a-z]+){0,6}$/', $k) ? $k : ($k === '' ? '' : '-')); });
