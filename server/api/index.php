<?php
// "Что приготовить?" API. All routes: api/index.php?r=<route>
declare(strict_types=1);
require __DIR__ . '/_private/lib.php';
require __DIR__ . '/_private/providers.php';
require __DIR__ . '/_private/admin.php';
require __DIR__ . '/_private/accounts.php';
require __DIR__ . '/_private/alice_home.php';
require __DIR__ . '/_private/reviews.php';
require __DIR__ . '/_private/push.php';
require __DIR__ . '/_private/polls.php';
require __DIR__ . '/_private/parties.php';
require __DIR__ . '/_private/partners.php';
require __DIR__ . '/_private/barcode.php';
require __DIR__ . '/_private/ops.php';
require __DIR__ . '/_private/community.php';
require __DIR__ . '/_private/vk.php';
require __DIR__ . '/_private/weather.php';
require __DIR__ . '/_private/catalog_heal.php';
require __DIR__ . '/_private/home_collections.php';
require __DIR__ . '/_private/school_images.php';
require __DIR__ . '/_private/catalog_patch.php';
require __DIR__ . '/_private/step_flow.php';
require __DIR__ . '/_private/support.php';

const VERSION = '0.41.0';
// The site's time zone first: event days, «today» in the statistics and reminders all count in it.
try { config(); } catch (Throwable $e) {}
$route = isset($_GET['r']) ? (string)$_GET['r'] : '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    // A form with files arrives as JSON (the hosting blocks multipart): back into $_POST / $_FILES (lib.php).
    cook_form_unpack();
    if ($route === 'status' && $method === 'GET') {
        // Reminders without cron: after answering, a few due ones are sent (at most once a minute).
        // And once a day, a copy of the database (after the answer has gone, so nobody waits for it).
        register_shutdown_function(function () { if (function_exists('fastcgi_finish_request')) fastcgi_finish_request(); push_opportunistic(); try { backup_daily(); } catch (Throwable $e) {} try { vk_daily(); } catch (Throwable $e) {} });
        $dbOk = true;
        try { db(); } catch (Throwable $e) { $dbOk = false; }
        // The bots people can also talk to (shown in the profile only when they are really set up).
        $tgName = ''; try { $tgName = $dbOk && (config()['telegram']['token'] ?? '') !== '' ? (string)setting('telegram_username', '') : ''; } catch (Throwable $e) {}
        $alice = trim((string)(config()['alice']['name'] ?? ''));
        send_json(['aiReady' => $dbOk && intent_ready(), 'voiceReady' => $dbOk && speech_ready(), 'version' => VERSION,
            'bots' => ['telegram' => preg_match('/^[A-Za-z0-9_]{5,32}$/', $tgName) ? $tgName : null, 'alice' => $alice !== '' ? mb_substr($alice, 0, 60) : null]]);
    }
    elseif ($route === 'health' && $method === 'GET') {
        // Setup check for the site owner. Shows no secrets.
        $storage = rtrim(config()['storage_dir'], '/\\');
        $dbError = null;
        try { db(); } catch (Throwable $e) { $dbError = $e->getMessage(); }
        send_json([
            'php' => PHP_VERSION, 'phpOk' => version_compare(PHP_VERSION, '7.4.0', '>='),
            'sqlite' => class_exists('PDO') && in_array('sqlite', PDO::getAvailableDrivers(), true),
            'curl' => function_exists('curl_init'), 'mbstring' => function_exists('mb_substr'),
            'configFile' => is_file(__DIR__ . '/_private/config.php'),
            'storageWritable' => is_dir($storage) ? is_writable($storage) : is_writable(dirname($storage)),
            'database' => $dbError ?? 'ok',
            'intentProvider' => config()['intent_provider'], 'intentReady' => intent_ready(),
            'speechProvider' => config()['speech_provider'], 'speechReady' => speech_ready(),
            'https' => is_https(),
            // Every server file loaded in full: a file cut short or emptied during an upload shows up here.
            'modules' => ['lib' => function_exists('catalog_files'), 'admin' => function_exists('setting') && function_exists('admin_status') && defined('RECIPE_ID'), 'accounts' => function_exists('legal_info'), 'reviews' => function_exists('reviews_list'), 'push' => function_exists('push_run'), 'polls' => function_exists('poll_vote'), 'providers' => function_exists('intent_ready')],
            'files' => array_map(function ($f) { $p = __DIR__ . '/_private/' . $f; return is_file($p) ? filesize($p) : 0; }, ['lib.php' => 'lib.php', 'admin.php' => 'admin.php', 'accounts.php' => 'accounts.php', 'reviews.php' => 'reviews.php', 'push.php' => 'push.php', 'polls.php' => 'polls.php', 'providers.php' => 'providers.php']),
        ]);
    }
    elseif ($route === 'session' && $method === 'POST') {
        create_session();
    }
    elseif ($route === 'recommendations' && $method === 'POST') {
        require_same_origin();
        $body = read_json_body();
        validate_recommendation_request($body);
        if (!intent_ready()) throw new ApiError(503, 'ai_not_configured', 'ИИ пока не подключён.');
        $result = paid_operation($body['operationId'], 'intent', hash('sha256', json_encode($body, JSON_UNESCAPED_UNICODE)), function () use ($body) {
            $patch = extract_intent($body);
            return ['patch' => $patch, 'reply' => $patch['reply']];
        });
        send_json($result);
    }
    elseif ($route === 'transcriptions' && $method === 'POST') {
        require_same_origin();
        if (!speech_ready()) throw new ApiError(503, 'ai_not_configured', 'Распознавание на сервере не подключено. Напишите запрос текстом.');
        if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 6 * 1024 * 1024) throw new ApiError(413, 'audio_size', 'Запись слишком большая.');
        $file = $_FILES['audio'] ?? null;
        $id = $_POST['operationId'] ?? '';
        $duration = (float)($_POST['duration'] ?? 0);
        if (!upload_ok($file) || $file['size'] <= 0 || $file['size'] > 5 * 1024 * 1024 || !is_uuid($id) || $duration < 0.2 || $duration > 61)
            throw new ApiError(400, 'audio', 'Нужна запись до 60 секунд и 5 МБ.');
        $mime = (string)($file['type'] ?? '');
        if (!preg_match('#^(audio/(webm|mp4|ogg|wav|mpeg|x-m4a)|video/webm)#', $mime)) throw new ApiError(415, 'audio_type', 'Этот формат записи не поддерживается.');
        $ext = strpos($mime, 'mp4') !== false || strpos($mime, 'm4a') !== false ? 'm4a' : (strpos($mime, 'ogg') !== false ? 'ogg' : (strpos($mime, 'wav') !== false ? 'wav' : (strpos($mime, 'mpeg') !== false ? 'mp3' : 'webm')));
        $tmp = $file['tmp_name'];
        $result = paid_operation($id, 'speech', hash('sha256', $id . '|' . hash_file('sha256', $tmp)), function () use ($tmp, $mime, $ext) {
            return transcribe($tmp, preg_replace('/;.*$/', '', $mime), 'voice.' . $ext);
        });
        send_json($result);
    }
    elseif ($route === 'feedback' && $method === 'POST') {
        require_same_origin();
        $v = read_json_body(2000);
        $recipeIds = array_column(catalog_recipes(), 'id');
        if (!in_array($v['value'] ?? '', ['cooked', 'liked', 'not_now', 'too_hard', 'dislike_ingredient', 'like', 'dislike'], true) || !in_array($v['recipeId'] ?? '', $recipeIds, true) || !is_uuid($v['operationId'] ?? ''))
            throw new ApiError(400, 'validation', 'Неверная оценка.');
        $sid = current_session();
        db()->prepare('INSERT OR IGNORE INTO feedback (session_id, id, recipe_id, value, created_at) VALUES (?, ?, ?, ?, ?)')->execute([$sid, $v['operationId'], $v['recipeId'], $v['value'], now_ms()]);
        send_json(['saved' => true]);
    }
    elseif ($route === 'catalog.version' && $method === 'GET') {
        // A few bytes instead of the whole catalog: the app keeps its copy while this stays the same.
        header('Cache-Control: no-cache');
        send_json(['v' => catalog_version()]);
    }
    elseif ($route === 'catalog' && $method === 'GET') {
        // Visitors get each file compact, without what the site never shows (catalog_site_json); the owner's admin
        // gets the files as written. Either way {} stays an object; the app validates every entry.
        $site = !(function_exists('is_admin') && is_admin());
        $light = $site && ($_GET['light'] ?? '') === '1';
        $parts = [];
        foreach (catalog_files() as $f) $parts[] = isset($f['error'])
            ? json_encode(['name' => $f['name'], 'error' => $f['error']], JSON_UNESCAPED_UNICODE)
            : '{"name":' . json_encode($f['name'], JSON_UNESCAPED_UNICODE) . ',"data":' . ($site ? catalog_site_json($f, $light) : $f['raw']) . '}';
        http_response_code(200);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-cache');
        // Recipes hidden by the owner and photo versions (so a replaced photo is not taken from the browser cache).
        $hidden = []; $taught = []; try { $hidden = setting('hidden', []); $taught = setting('taught', []); } catch (Throwable $e) {}
        $photos = photo_versions();
        echo '{"files":[' . implode(',', $parts) . '],"hidden":' . json_encode(array_values((array)$hidden)) . ',"photos":' . json_encode((object)$photos) . ',"thumbs":' . json_encode(thumb_ready($photos)) . ',"taught":' . json_encode(array_values((array)$taught), JSON_UNESCAPED_UNICODE) . ',"realPhotos":' . json_encode(real_photos())
            // Under a running timer: «можно дальше» or «дождитесь» (step_flow.php); a light catalog has no steps.
            . ($light ? ',"light":true' : ',"flow":' . json_encode((object)step_flow())) . '}';
    }
    elseif ($route === 'message.send' && $method === 'POST') message_send(read_json_body(8000));
    elseif ($route === 'weather' && $method === 'GET') weather_now();
    elseif ($route === 'weather.city' && $method === 'GET') weather_city();
    elseif ($route === 'collections' && $method === 'GET') collections_public();
    // Timed steps of new recipes marked «можно дальше / дождитесь» with the owner's AI (step_flow.php).
    elseif ($route === 'admin.flow.save' && $method === 'POST') { require_admin(true); admin_step_flow_save(read_json_body(400000)); }
    // The search pages in the app's words: the panel works the texts out and keeps them here (seo.php).
    elseif ($route === 'admin.seo.texts' && $method === 'GET') { require_admin(); require_once __DIR__ . '/_private/seo.php'; admin_seo_texts_state(); }
    elseif ($route === 'admin.seo.texts' && $method === 'POST') { require_admin(true); require_once __DIR__ . '/_private/seo.php'; admin_seo_texts_save(read_json_body(2000000)); }
    elseif ($route === 'admin.recipes.patch' && $method === 'POST') { require_admin(true); admin_recipes_patch(read_json_body(400000)); }
    elseif ($route === 'admin.collection.save' && $method === 'POST') { require_admin(true); admin_collection_save(read_json_body(40000)); }
    elseif ($route === 'admin.collection.cover' && $method === 'POST') { require_admin(true); admin_collection_cover(); }
    elseif ($route === 'admin.collection.cover.delete' && $method === 'POST') { require_admin(true); admin_collection_cover_delete(read_json_body(2000)); }
    elseif ($route === 'school.images' && $method === 'GET') school_images_public();
    // «Поддержать автора»: the page /avtor and its tab in the panel (support.php).
    elseif ($route === 'admin.support' && $method === 'GET') { require_admin(); require_once __DIR__ . '/_private/seo.php'; admin_support_state(); }
    elseif ($route === 'admin.support.save' && $method === 'POST') { require_admin(true); require_once __DIR__ . '/_private/seo.php'; admin_support_save(read_json_body(200000)); }
    elseif ($route === 'admin.support.photo' && $method === 'POST') { require_admin(true); require_once __DIR__ . '/_private/seo.php'; admin_support_photo(); }
    elseif ($route === 'admin.support.photo.delete' && $method === 'POST') { require_admin(true); require_once __DIR__ . '/_private/seo.php'; admin_support_photo_delete(); }
    elseif ($route === 'admin.school.image' && $method === 'POST') { require_admin(true); admin_school_image(); }
    elseif ($route === 'admin.school.image.delete' && $method === 'POST') { require_admin(true); admin_school_image_delete(read_json_body(2000)); }
    elseif ($route === 'menu.get' && $method === 'GET') menu_get((string)($_GET['code'] ?? ''));
    elseif ($route === 'admin.menu.share' && $method === 'POST') { require_admin(true); admin_menu_share(read_json_body(4000)); }
    elseif ($route === 'today' && $method === 'GET') { $t = recipe_of_day(); send_json($t ?? ['error' => 'Нет рецепта'], $t ? 200 : 404); }
    elseif ($route === 'message.replies' && $method === 'POST') message_replies(read_json_body(8000));
    elseif ($route === 'recipe.stats' && $method === 'GET') send_json(['stats' => (object)recipe_stats()]); // recounted at most hourly
    elseif ($route === 'admin.message' && $method === 'POST') { require_admin(true); admin_message_action(read_json_body(2000)); }
    elseif ($route === 'admin.catalog.heal' && $method === 'POST') { require_admin(true); admin_catalog_heal(read_json_body(2000)); }
    elseif ($route === 'admin.vk' && $method === 'GET') { require_admin(); admin_vk_status(); }
    elseif ($route === 'admin.vk.save' && $method === 'POST') { require_admin(true); admin_vk_save(read_json_body(4000)); }
    elseif ($route === 'admin.vk.week' && $method === 'GET') { require_admin(); admin_vk_week(); }
    elseif ($route === 'admin.vk.post' && $method === 'POST') { require_admin(true); admin_vk_post(); }
    elseif ($route === 'admin.recipe' && $method === 'GET') { require_admin(); admin_recipe_get((string)($_GET['id'] ?? '')); }
    elseif ($route === 'admin.recipe.step' && $method === 'POST') { require_admin(true); admin_recipe_step(read_json_body(8000)); }
    elseif ($route === 'thumb' && $method === 'GET') {
        photo_thumb((string)($_GET['id'] ?? ''));
    }
    elseif ($route === 'event' && $method === 'POST') {
        require_same_origin();
        record_events(read_json_body(12000));
    }
    // ---------- Accounts without registration, households (семья) ----------
    elseif ($route === 'account.init' && $method === 'POST') account_init();
    elseif ($route === 'account.state' && $method === 'GET') account_state_route();
    elseif ($route === 'account.save' && $method === 'POST') account_save(read_json_body(max(PERSONAL_MAX, HOUSEHOLD_MAX) + 20000));
    elseif ($route === 'account.code' && $method === 'POST') account_code();
    elseif ($route === 'account.login' && $method === 'POST') account_login(read_json_body(2000));
    elseif ($route === 'account.delete' && $method === 'POST') account_delete();
    // «Шеф в Алисе»: a code that links a speaker to the family's plan and list (_private/alice_home.php).
    elseif ($route === 'alice.code' && $method === 'POST') alice_code_route();
    elseif ($route === 'alice.status' && $method === 'GET') alice_status_route();
    elseif ($route === 'alice.unlink' && $method === 'POST') alice_unlink_route();
    elseif ($route === 'household.invite' && $method === 'POST') household_invite();
    elseif ($route === 'household.join' && $method === 'POST') household_join(read_json_body(2000));
    elseif ($route === 'household.leave' && $method === 'POST') household_leave();
    elseif ($route === 'legal' && $method === 'GET') { $l = legal_info(); send_json($l); }
    elseif ($route === 'admin.legal' && $method === 'POST') { require_admin(true); admin_legal(read_json_body(2000)); }
    // ---------- Family poll «Что хотите на ужин?» ----------
    elseif ($route === 'poll.create' && $method === 'POST') poll_create(read_json_body(4000));
    elseif ($route === 'poll.get' && $method === 'POST') poll_get(read_json_body(1000));
    elseif ($route === 'poll.vote' && $method === 'POST') poll_vote(read_json_body(1000));
    // ---------- «Стол в складчину» ----------
    elseif ($route === 'party.create' && $method === 'POST') party_create(read_json_body(16000));
    elseif ($route === 'party.get' && $method === 'POST') party_get(read_json_body(1000));
    elseif ($route === 'party.act' && $method === 'POST') party_act(read_json_body(16000));
    // ---------- Delivery partners for the shopping list ----------
    elseif ($route === 'error' && $method === 'POST') client_error(read_json_body(6000));
    elseif ($route === 'taps' && $method === 'POST') client_taps(read_json_body(8000));
    elseif ($route === 'admin.insights' && $method === 'GET') { require_admin(); admin_insights((int)($_GET['days'] ?? 30)); }
    elseif ($route === 'barcode' && $method === 'POST') { require_same_origin(); barcode_lookup((string)(read_json_body(500)['code'] ?? '')); }
    elseif ($route === 'barcode.food' && $method === 'POST') { require_same_origin(); barcode_food((string)(read_json_body(500)['code'] ?? '')); }
    elseif ($route === 'partners' && $method === 'GET') partners_route();
    elseif ($route === 'go' && $method === 'GET') partner_go((string)($_GET['to'] ?? ''));
    // ---------- Reminders (web push) ----------
    elseif ($route === 'push.key' && $method === 'GET') push_key_route();
    elseif ($route === 'push.subscribe' && $method === 'POST') push_subscribe(read_json_body(8000));
    elseif ($route === 'push.unsubscribe' && $method === 'POST') push_unsubscribe(read_json_body(2000));
    elseif ($route === 'push.next' && $method === 'POST') push_next(read_json_body(2000));
    elseif ($route === 'push.test' && $method === 'POST') push_test(read_json_body(2000));
    elseif ($route === 'push.cron' && $method === 'GET') push_cron();
    // ---------- Reviews: stars, text, photos, likes, replies ----------
    elseif ($route === 'reviews.list' && $method === 'GET') reviews_list();
    elseif ($route === 'reviews.ratings' && $method === 'GET') reviews_ratings();
    elseif ($route === 'reviews.save' && $method === 'POST') reviews_save();
    elseif ($route === 'reviews.delete' && $method === 'POST') reviews_delete(read_json_body(2000));
    elseif ($route === 'reviews.like' && $method === 'POST') reviews_like(read_json_body(2000));
    elseif ($route === 'reviews.reply' && $method === 'POST') reviews_reply(read_json_body(8000));
    elseif ($route === 'reviews.reply.delete' && $method === 'POST') reviews_reply_delete(read_json_body(2000));
    elseif ($route === 'reviews.report' && $method === 'POST') reviews_report(read_json_body(2000));
    elseif ($route === 'admin.reviews' && $method === 'GET') { require_admin(); admin_reviews(); }
    elseif ($route === 'admin.review' && $method === 'POST') { require_admin(true); admin_review_action(read_json_body(2000)); }
    elseif ($route === 'admin.reviews.settings' && $method === 'POST') { require_admin(true); admin_reviews_settings(read_json_body(2000)); }
    // ---------- Admin panel (admin/index.html) ----------
    elseif ($route === 'admin.status' && $method === 'GET') admin_status();
    elseif ($route === 'admin.login' && $method === 'POST') admin_login(read_json_body(2000));
    elseif ($route === 'admin.logout' && $method === 'POST') admin_logout();
    elseif ($route === 'admin.security' && $method === 'GET') { require_admin(); admin_security(); }
    elseif ($route === 'admin.logout.others' && $method === 'POST') { require_admin(true); admin_logout_others(); }
    elseif ($route === 'admin.photo.queue' && $method === 'GET') { require_admin(); admin_photo_queue(); }
    elseif ($route === 'admin.searches' && $method === 'GET') { require_admin(); admin_searches((int)($_GET['days'] ?? 30)); }
    elseif ($route === 'admin.hash' && $method === 'POST') admin_hash(read_json_body(2000));
    elseif ($route === 'admin.stats' && $method === 'GET') { require_admin(); admin_stats((int)($_GET['days'] ?? 30)); }
    elseif ($route === 'admin.opens' && $method === 'GET') { require_admin(); admin_opens((int)($_GET['days'] ?? 30)); }
    // Forget one query in the statistics ("абвгд", a test, a query already answered by a new recipe).
    elseif ($route === 'admin.stats.forget' && $method === 'POST') { require_admin(true); $b = read_json_body(2000); $text = $b['text'] ?? null;
        if (!is_string($text) || $text === '' || strlen($text) > 600) throw new ApiError(400, 'validation', 'Нет текста запроса.');
        $st = db()->prepare("DELETE FROM events WHERE type = 'query' AND norm = ?" . (($b['only'] ?? '') === 'failed' ? ' AND value <= 0' : ''));
        $st->execute([$text]); send_json(['deleted' => $st->rowCount()]); }
    elseif ($route === 'admin.stats.clear' && $method === 'POST') { require_admin(true); db()->exec('DELETE FROM events'); db()->exec('DELETE FROM page_views'); send_json(['cleared' => true]); }
    elseif ($route === 'admin.files' && $method === 'GET') { require_admin(); admin_files(); }
    elseif ($route === 'admin.file.save' && $method === 'POST') { require_admin(true); admin_file_save(read_json_body(3500000)); }
    elseif ($route === 'admin.file.delete' && $method === 'POST') { require_admin(true); admin_file_delete(read_json_body(2000)); }
    elseif ($route === 'admin.backups' && $method === 'GET') { require_admin(); admin_backups((string)($_GET['name'] ?? '')); }
    elseif ($route === 'admin.backup.restore' && $method === 'POST') { require_admin(true); admin_backup_restore(read_json_body(2000)); }
    elseif ($route === 'admin.hidden' && $method === 'POST') { require_admin(true); admin_hidden(read_json_body(100000)); }
    elseif ($route === 'admin.photo.upload' && $method === 'POST') { require_admin(true); admin_photo_upload(); }
    elseif ($route === 'admin.photo.real' && $method === 'POST') { require_admin(true); admin_photo_real(read_json_body(2000)); }
    elseif ($route === 'admin.photo.delete' && $method === 'POST') { require_admin(true); admin_photo_delete(read_json_body(2000)); }
    elseif ($route === 'admin.taught' && $method === 'GET') { require_admin(); send_json(['taught' => setting('taught', [])]); }
    elseif ($route === 'admin.teach' && $method === 'POST') { require_admin(true); admin_teach(read_json_body(4000)); }
    else {
        throw new ApiError(404, 'not_found', 'Неизвестный адрес API.');
    }
} catch (Throwable $e) {
    fail($e);
}

function validate_recommendation_request(array $b): void {
    $bad = new ApiError(400, 'validation', 'Проверьте запрос: до 2000 символов, от 1 до 12 порций.');
    if (!is_uuid($b['operationId'] ?? null) || !is_string($b['message'] ?? null)) throw $bad;
    $len = function_exists('mb_strlen') ? mb_strlen(trim($b['message'])) : strlen(trim($b['message']));
    if ($len < 1 || $len > 2000) throw $bad;
    $ids = function ($v) { if (!is_array($v) || count($v) > 80) return false; foreach ($v as $x) if (!is_string($x) || strlen($x) > 64) return false; return true; };
    $c = $b['conditions'] ?? null; $p = $b['preferences'] ?? null; $h = $b['history'] ?? null;
    if (!is_array($c) || !is_array($p) || !is_array($h) || count($h) > 10) throw $bad;
    foreach (['desired', 'available', 'absent', 'excluded', 'appliances'] as $k) if (!$ids($c[$k] ?? null)) throw $bad;
    if (!is_int($c['servings'] ?? null) || $c['servings'] < 1 || $c['servings'] > 12) throw $bad;
    if (!$ids($p['excluded'] ?? null) || !$ids($p['appliances'] ?? null)) throw $bad;
    foreach ($h as $m) if (!is_array($m) || !in_array($m['role'] ?? '', ['user', 'assistant'], true) || !is_string($m['text'] ?? null) || strlen($m['text']) > 8000) throw $bad;
}
