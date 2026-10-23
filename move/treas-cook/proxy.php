<?php
// treas.su/cook/api/… and /bot/… after the move: the same request to shefly.ru, the answer back as it came.
// For the Android apps installed before the move (they call treas.su/cook) and the bots' webhooks.
declare(strict_types=1);

$path = preg_replace('#^/cook#', '', (string)parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));
$query = (string)($_SERVER['QUERY_STRING'] ?? '');
$url = 'https://shefly.ru' . $path . ($query !== '' ? '?' . $query : '');

$send = [];
foreach (['CONTENT_TYPE' => 'Content-Type', 'HTTP_ACCEPT' => 'Accept', 'HTTP_COOKIE' => 'Cookie', 'HTTP_USER_AGENT' => 'User-Agent',
    'HTTP_X_COOK_APP' => 'X-Cook-App', 'HTTP_X_COOK_FORM' => 'X-Cook-Form', 'HTTP_AUTHORIZATION' => 'Authorization', 'HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN' => 'X-Telegram-Bot-Api-Secret-Token',
    'HTTP_ORIGIN' => 'Origin', 'HTTP_REFERER' => 'Referer'] as $k => $name) {
    if (isset($_SERVER[$k]) && $_SERVER[$k] !== '') $send[] = $name . ': ' . $_SERVER[$k];
}
// The person's own address, so the limits per address on shefly.ru do not count every old app as one.
$send[] = 'X-Forwarded-For: ' . ($_SERVER['REMOTE_ADDR'] ?? '');

$ch = curl_init($url);
$headers = [];
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => $_SERVER['REQUEST_METHOD'] ?? 'GET',
    CURLOPT_HTTPHEADER => $send,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 60,
    CURLOPT_ENCODING => '',
    CURLOPT_HEADERFUNCTION => function ($c, $line) use (&$headers) { $headers[] = rtrim($line, "\r\n"); return strlen($line); },
]);
if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['GET', 'HEAD'], true)) curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
$body = curl_exec($ch);
if ($body === false) { http_response_code(502); header('Content-Type: application/json; charset=utf-8'); echo '{"error":"Сервер не ответил, попробуйте ещё раз.","code":"proxy"}'; exit; }
http_response_code((int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE));
foreach ($headers as $h) if (preg_match('/^(Content-Type|Set-Cookie|Cache-Control|Retry-After):/i', $h)) header($h, false);
echo $body;
