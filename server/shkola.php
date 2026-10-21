<?php
// Школа готовки for search engines: /shkola/, /shkola/<lesson>, /shkola/spasenie (see api/_private/school_seo.php).
declare(strict_types=1);
require __DIR__ . '/api/_private/lib.php';
require __DIR__ . '/api/_private/admin.php';
require __DIR__ . '/api/_private/accounts.php';
require __DIR__ . '/api/_private/reviews.php';
require __DIR__ . '/api/_private/seo.php';
require __DIR__ . '/api/_private/school_seo.php';
seo_run(function () { $id = isset($_GET['id']) ? strtolower((string)$_GET['id']) : ''; school_page(preg_match('/^[a-z-]{1,30}$/', $id) ? $id : ($id === '' ? '' : '-')); });
