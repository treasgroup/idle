<?php
// Where VK ID sends the owner back after «Подключить через ВКонтакте». VK does not accept a «Доверенный Redirect URL»
// with a query (…index.php?r=vk.callback), so this address has none and passes the visit on to the API's own route.
declare(strict_types=1);
$_GET['r'] = 'vk.callback';
require __DIR__ . '/index.php';
