<?php
// One recipe as a plain page: for search engines, link previews in VK and Telegram, and printing.
declare(strict_types=1);
require __DIR__ . '/api/_private/lib.php';
require __DIR__ . '/api/_private/admin.php';
require __DIR__ . '/api/_private/accounts.php';
require __DIR__ . '/api/_private/reviews.php';
require __DIR__ . '/api/_private/seo.php';
seo_run(function () { seo_recipe_page(strtolower((string)($_GET['id'] ?? ''))); });
