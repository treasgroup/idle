<?php
// Barcode → product name, for «Мои продукты». Asks the free Open Food Facts database (no key, no payment)
// from the site's server — the browser may only talk to this site — and keeps every answer, found or not.
declare(strict_types=1);

function barcode_lookup(string $code): void {
    if (!preg_match('/^\d{8,14}$/', $code)) throw new ApiError(400, 'validation', 'Неверный штрихкод.');
    $pdo = db();
    $pdo->exec('CREATE TABLE IF NOT EXISTS barcodes (code TEXT PRIMARY KEY, name TEXT, created_at INTEGER NOT NULL)');
    $st = $pdo->prepare('SELECT name FROM barcodes WHERE code = ?'); $st->execute([$code]); $row = $st->fetch();
    if ($row) send_json(['name' => $row['name']]);
    limit_or_fail('barcode', 120, 5000);
    if (!function_exists('curl_init')) throw new ApiError(503, 'provider', 'На хостинге нет расширения PHP curl.');
    $ch = curl_init('https://world.openfoodfacts.org/api/v2/product/' . $code . '.json?fields=product_name_ru,product_name,generic_name_ru,generic_name');
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 8, CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_HTTPHEADER => ['User-Agent: WhatToCook/1.0 (recipes site; barcode lookup)']]);
    $body = curl_exec($ch); $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    if ($body === false || ($status !== 200 && $status !== 404)) throw new ApiError(504, 'timeout', 'База штрихкодов не ответила. Попробуйте ещё раз.');
    $j = json_decode((string)$body, true);
    $p = is_array($j['product'] ?? null) ? $j['product'] : [];
    $name = '';
    foreach (['product_name_ru', 'generic_name_ru', 'product_name', 'generic_name'] as $k) if (is_string($p[$k] ?? null) && trim($p[$k]) !== '') { $name = trim($p[$k]); break; }
    $name = mb_substr($name, 0, 120);
    $pdo->prepare('INSERT OR REPLACE INTO barcodes (code, name, created_at) VALUES (?, ?, ?)')->execute([$code, $name === '' ? null : $name, time()]);
    send_json(['name' => $name === '' ? null : $name]);
}
