<?php
// The weather for «погода за окном» (only for those who turned it on in the profile): today's temperature for a place
// rounded to ~25 km, and the search for a city by name. Free and without a key: the forecast from MET Norway (the
// Norwegian weather service, open data — Open-Meteo when it does not answer), the city search from Open-Meteo. Every
// answer is kept (a place is asked once an hour, whoever asks), so the free limits are never near.
declare(strict_types=1);

function weather_schema(): void {
    static $done = false;
    if ($done) return;
    db()->exec('CREATE TABLE IF NOT EXISTS weather_cache (key TEXT PRIMARY KEY, at INTEGER NOT NULL, value TEXT NOT NULL)');
    $done = true;
}
function weather_get_json(string $url): array {
    if (!function_exists('curl_init')) throw new ApiError(503, 'provider', 'На хостинге нет расширения PHP curl.');
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 10, CURLOPT_USERAGENT => 'what-to-cook (treas.su/cook)']);
    $body = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $j = is_string($body) ? json_decode($body, true) : null;
    if ($code !== 200 || !is_array($j)) throw new ApiError(502, 'weather', 'Сервис погоды сейчас не отвечает.');
    return $j;
}
/** The cached answer for a key, or a fresh one (kept for $ttl seconds); old entries are cleared now and then. */
function weather_cached(string $key, int $ttl, callable $fetch): array {
    weather_schema();
    $pdo = db();
    $st = $pdo->prepare('SELECT at, value FROM weather_cache WHERE key = ?');
    $st->execute([$key]);
    $row = $st->fetch();
    if ($row && now_ms() - (int)$row['at'] < $ttl * 1000) return json_decode((string)$row['value'], true) ?: [];
    if (!bump('weather|all|' . date('Y-m-d'), 5000)) { if ($row) return json_decode((string)$row['value'], true) ?: []; throw new ApiError(429, 'limit', 'Погода сегодня больше не обновится.'); }
    $v = $fetch();
    $pdo->prepare('INSERT OR REPLACE INTO weather_cache (key, at, value) VALUES (?, ?, ?)')->execute([$key, now_ms(), json_encode($v, JSON_UNESCAPED_UNICODE)]);
    if (random_int(1, 50) === 1) $pdo->prepare('DELETE FROM weather_cache WHERE at < ?')->execute([now_ms() - 3 * 86400000]);
    return $v;
}

function weather_met(float $lat, float $lon): array {
    $j = weather_get_json('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=' . $lat . '&lon=' . $lon);
    $series = array_slice($j['properties']['timeseries'] ?? [], 0, 24);
    if (!$series) throw new ApiError(502, 'weather', 'Нет прогноза.');
    $temps = []; $wet = false; $snow = false; $mm = 0.0;
    foreach ($series as $i => $p) {
        $temps[] = (float)($p['data']['instant']['details']['air_temperature'] ?? 0);
        if ($i >= 12) continue;
        $sym = (string)($p['data']['next_1_hours']['summary']['symbol_code'] ?? '');
        $mm += (float)($p['data']['next_1_hours']['details']['precipitation_amount'] ?? 0);
        if (preg_match('/rain|sleet|snow|shower/', $sym)) $wet = true;
        if (strpos($sym, 'snow') !== false) $snow = true;
    }
    return ['t' => round($temps[0]), 'max' => round(max($temps)), 'min' => round(min($temps)), 'rain' => $wet && $mm >= 0.5, 'snow' => $snow];
}
function weather_open_meteo(float $lat, float $lon): array {
    $j = weather_get_json('https://api.open-meteo.com/v1/forecast?' . http_build_query(['latitude' => $lat, 'longitude' => $lon,
        'current' => 'temperature_2m,weather_code', 'daily' => 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
        'timezone' => 'auto', 'forecast_days' => 1]));
    $code = (int)($j['current']['weather_code'] ?? 0);
    return ['t' => round((float)($j['current']['temperature_2m'] ?? 0)), 'max' => round((float)($j['daily']['temperature_2m_max'][0] ?? 0)),
        'min' => round((float)($j['daily']['temperature_2m_min'][0] ?? 0)),
        // WMO codes: 51–67 drizzle and rain, 71–77 snow, 80–86 showers, 95+ thunder.
        'rain' => $code >= 51 || (int)($j['daily']['precipitation_probability_max'][0] ?? 0) >= 70, 'snow' => ($code >= 71 && $code <= 77) || $code === 85 || $code === 86];
}

/** GET weather&lat=55.75&lon=37.62 → {t: now °C, max, min, rain: true when it rains or snows today}. */
function weather_now(): void {
    $lat = (float)($_GET['lat'] ?? 0); $lon = (float)($_GET['lon'] ?? 0);
    if (!is_numeric($_GET['lat'] ?? null) || !is_numeric($_GET['lon'] ?? null) || abs($lat) > 90 || abs($lon) > 180) throw new ApiError(400, 'validation', 'Нет места.');
    // Rounded to a quarter of a degree: the weather is the same, and the exact place is not kept anywhere.
    $lat = round($lat * 4) / 4; $lon = round($lon * 4) / 4;
    if (!bump('wx|' . client_ip() . '|' . date('Y-m-d-H'), 30)) throw new ApiError(429, 'limit', 'Слишком часто.');
    $v = weather_cached('now|' . $lat . '|' . $lon, 3600, function () use ($lat, $lon) {
        try { return weather_met($lat, $lon); } catch (Throwable $e) { return weather_open_meteo($lat, $lon); }
    });
    send_json($v, 200, ['Cache-Control: private, max-age=1800']);
}

/** GET weather.city&q=Тула → up to 6 places {name, area, lat, lon}. */
function weather_city(): void {
    $q = trim((string)($_GET['q'] ?? ''));
    $len = function_exists('mb_strlen') ? mb_strlen($q) : strlen($q);
    if ($len < 2 || $len > 60) { send_json(['list' => []]); return; }
    if (!bump('wxc|' . client_ip() . '|' . date('Y-m-d-H'), 40)) throw new ApiError(429, 'limit', 'Слишком часто.');
    $key = 'city|' . (function_exists('mb_strtolower') ? mb_strtolower($q) : strtolower($q));
    $v = weather_cached($key, 30 * 86400, function () use ($q) {
        $j = weather_get_json('https://geocoding-api.open-meteo.com/v1/search?' . http_build_query(['name' => $q, 'count' => 6, 'language' => 'ru', 'format' => 'json']));
        $out = [];
        foreach ($j['results'] ?? [] as $r) {
            $area = implode(', ', array_values(array_filter([(string)($r['admin1'] ?? ''), (string)($r['country'] ?? '')], fn($x) => $x !== '')));
            $out[] = ['name' => (string)($r['name'] ?? ''), 'area' => $area, 'lat' => round((float)($r['latitude'] ?? 0), 2), 'lon' => round((float)($r['longitude'] ?? 0), 2)];
        }
        return ['list' => $out];
    });
    send_json($v);
}
