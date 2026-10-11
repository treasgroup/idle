<?php
// "Что приготовить из X и Y": recipe lists by products, for search engines (see seo.php).
declare(strict_types=1);
require __DIR__ . '/api/_private/lib.php';
require __DIR__ . '/api/_private/admin.php';
require __DIR__ . '/api/_private/accounts.php';
require __DIR__ . '/api/_private/reviews.php';
require __DIR__ . '/api/_private/seo.php';
seo_run(function () {
    $id = fn($v) => preg_match('/^[a-z0-9]+(-[a-z0-9]+)*$/', (string)$v) ? (string)$v : '';
    $a = $id($_GET['a'] ?? ''); $b = isset($_GET['b']) ? $id($_GET['b']) : null;
    if ($b === '') $b = null;
    seo_combo_page($a, $b);
});
