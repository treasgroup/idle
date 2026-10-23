<?php
// «Поддержать автора» for the site: /avtor (see api/_private/support.php).
declare(strict_types=1);
require __DIR__ . '/api/_private/lib.php';
require __DIR__ . '/api/_private/admin.php';
require __DIR__ . '/api/_private/accounts.php';
require __DIR__ . '/api/_private/reviews.php';
require __DIR__ . '/api/_private/seo.php';
require __DIR__ . '/api/_private/support.php';
seo_run(function () { support_page(); });
