<?php
// sitemap.xml for Yandex and Google: the home page, the lists and every recipe page (with its photo).
declare(strict_types=1);
require __DIR__ . '/api/_private/lib.php';
require __DIR__ . '/api/_private/admin.php';
require __DIR__ . '/api/_private/accounts.php';
require __DIR__ . '/api/_private/reviews.php';
require __DIR__ . '/api/_private/seo.php';
seo_run(function () { seo_sitemap(); });
