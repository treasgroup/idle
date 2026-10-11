<?php
// All recipes by kind (супы, вторые блюда…) as plain pages with links to every recipe page.
declare(strict_types=1);
require __DIR__ . '/api/_private/lib.php';
require __DIR__ . '/api/_private/admin.php';
require __DIR__ . '/api/_private/accounts.php';
require __DIR__ . '/api/_private/reviews.php';
require __DIR__ . '/api/_private/seo.php';
seo_run(function () { $c = isset($_GET['c']) ? strtolower((string)$_GET['c']) : ''; seo_list_page($c === '' ? null : $c); });
