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

// Barcode → name and nutrition per 100 g, for the food diary. The same free Open Food Facts base; answers are kept
// (a product's label does not change often). Nutrition is what the maker printed — the diary says so.
function barcode_food(string $code): void {
    if (!preg_match('/^\d{8,14}$/', $code)) throw new ApiError(400, 'validation', 'Неверный штрихкод.');
    $pdo = db();
    $pdo->exec('CREATE TABLE IF NOT EXISTS barcode_food (code TEXT PRIMARY KEY, data TEXT, created_at INTEGER NOT NULL)');
    $st = $pdo->prepare('SELECT data FROM barcode_food WHERE code = ?'); $st->execute([$code]); $row = $st->fetch();
    if ($row) send_json(json_decode((string)$row['data'], true) ?: ['name' => null]);
    limit_or_fail('barcode', 120, 5000);
    if (!function_exists('curl_init')) throw new ApiError(503, 'provider', 'На хостинге нет расширения PHP curl.');
    $ch = curl_init('https://world.openfoodfacts.org/api/v2/product/' . $code . '.json?fields=product_name_ru,product_name,generic_name_ru,generic_name,brands,nutriments,serving_quantity,product_quantity');
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 8, CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_HTTPHEADER => ['User-Agent: WhatToCook/1.0 (recipes site; food diary)']]);
    $body = curl_exec($ch); $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    if ($body === false || ($status !== 200 && $status !== 404)) throw new ApiError(504, 'timeout', 'База штрихкодов не ответила. Попробуйте ещё раз.');
    $j = json_decode((string)$body, true);
    $p = is_array($j['product'] ?? null) ? $j['product'] : [];
    $name = '';
    foreach (['product_name_ru', 'generic_name_ru', 'product_name', 'generic_name'] as $k) if (is_string($p[$k] ?? null) && trim($p[$k]) !== '') { $name = trim($p[$k]); break; }
    $brand = is_string($p['brands'] ?? null) ? trim(explode(',', $p['brands'])[0]) : '';
    if ($name !== '' && $brand !== '' && mb_stripos($name, $brand) === false) $name .= ' (' . $brand . ')';
    $n = is_array($p['nutriments'] ?? null) ? $p['nutriments'] : [];
    $num = function ($v, float $max): ?float { return is_numeric($v) && (float)$v >= 0 && (float)$v <= $max ? round((float)$v, 1) : null; };
    $kcal = $num($n['energy-kcal_100g'] ?? null, 950);
    if ($kcal === null && is_numeric($n['energy_100g'] ?? null)) $kcal = $num((float)$n['energy_100g'] / 4.184, 950);
    $per100 = $kcal === null ? null : ['kcal' => $kcal, 'protein' => $num($n['proteins_100g'] ?? null, 100) ?? 0, 'fat' => $num($n['fat_100g'] ?? null, 100) ?? 0, 'carbs' => $num($n['carbohydrates_100g'] ?? null, 100) ?? 0];
    $data = ['name' => $name === '' ? null : mb_substr($name, 0, 120), 'per100' => $per100,
        'serving' => $num($p['serving_quantity'] ?? null, 5000), 'pack' => $num($p['product_quantity'] ?? null, 20000)];
    $pdo->prepare('INSERT OR REPLACE INTO barcode_food (code, data, created_at) VALUES (?, ?, ?)')->execute([$code, json_encode($data, JSON_UNESCAPED_UNICODE), time()]);
    send_json($data);
}
