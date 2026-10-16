<?php
// Telegram bot «Что приготовить?»: "курица, картошка, 30 минут" → recipes; a tap → the whole recipe in the chat.
// Free: Telegram Bot API + the site's own matcher (no AI). Setup is described in config.example.php.
declare(strict_types=1);
require __DIR__ . '/../api/_private/lib.php';
require __DIR__ . '/../api/_private/admin.php';
require __DIR__ . '/../api/_private/accounts.php';
require __DIR__ . '/../api/_private/reviews.php';
require __DIR__ . '/../api/_private/seo.php';
require __DIR__ . '/../api/_private/match.php';
require __DIR__ . '/../api/_private/bots.php';

@ini_set('display_errors', '0');
$cfg = config()['telegram'];
$token = (string)($cfg['token'] ?? ''); $secret = (string)($cfg['secret'] ?? '');
// The bot pages and links point to the site folder, one level up from /bot/.
$_SERVER['SCRIPT_NAME'] = dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/bot/telegram.php')) . '/index.php';

function tg(string $method, array $body): ?array {
    global $token;
    return bot_post_json('https://api.telegram.org/bot' . $token . '/' . $method, $body);
}

// One-time setup: ваш-сайт/bot/telegram.php?setup=<secret> registers the webhook.
if (isset($_GET['setup'])) {
    header('Content-Type: text/plain; charset=utf-8');
    if ($token === '' || strlen($secret) < 16 || !hash_equals($secret, (string)$_GET['setup'])) { http_response_code(403); exit("Укажите telegram.token и telegram.secret (16+ символов) в config.php и откройте эту страницу с ?setup=секрет.\n"); }
    $url = seo_origin() . dirname($_SERVER['REQUEST_URI'] ? parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) : '/bot/') . '/telegram.php';
    $r = tg('setWebhook', ['url' => $url, 'secret_token' => $secret, 'allowed_updates' => ['message', 'callback_query'], 'drop_pending_updates' => true]);
    tg('setMyCommands', ['commands' => [['command' => 'start', 'description' => 'Как пользоваться'], ['command' => 'idea', 'description' => 'Случайная идея на ужин']]]);
    // The bot's @name, so the site can show «Шеф в Telegram» in the profile.
    $me = tg('getMe', []);
    if (is_string($me['result']['username'] ?? null)) set_setting('telegram_username', $me['result']['username']);
    exit(($r['ok'] ?? false) ? "Готово: вебхук $url\n" : 'Telegram ответил: ' . json_encode($r, JSON_UNESCAPED_UNICODE) . "\n");
}

// Only Telegram knows the secret: without a proper one the bot stays off (an empty secret would let anyone post updates).
if ($token === '' || strlen($secret) < 16 || !hash_equals($secret, (string)($_SERVER['HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN'] ?? ''))) { http_response_code(403); exit; }
$update = json_decode((string)file_get_contents('php://input', false, null, 0, 64000), true);
http_response_code(200);
if (!is_array($update)) exit;

function tg_db(): PDO {
    db()->exec('CREATE TABLE IF NOT EXISTS bot_queries (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL, created_at INTEGER NOT NULL)');
    return db();
}
function tg_remember(string $text): int {
    $pdo = tg_db();
    $pdo->prepare('DELETE FROM bot_queries WHERE created_at < ?')->execute([time() - 7 * 86400]);
    $pdo->prepare('INSERT INTO bot_queries (text, created_at) VALUES (?, ?)')->execute([mb_substr($text, 0, 300), time()]);
    return (int)$pdo->lastInsertId();
}
function tg_count(string $type, string $text = '', ?string $recipe = null): void {
    try { db()->prepare('INSERT INTO events (ts, day, visitor, type, recipe_id, text, norm, value, source, ref) VALUES (?,?,?,?,?,?,?,?,?,?)')
        ->execute([now_ms(), date('Y-m-d'), 'telegram', $type, $recipe, mb_substr($text, 0, 300), mb_substr(match_norm($text), 0, 300), 1, 'telegram', 'telegram']); } catch (Throwable $e) {}
}

/** The results message: list + a button per recipe + "ещё". */
function tg_results(int $chat, string $text, int $offset = 0, ?int $editId = null): void {
    [$list, $q] = bot_search($text, $offset, 5);
    if ($offset === 0) tg_count('query', $text);
    if (!$list) {
        $msg = $offset ? 'Больше вариантов нет. Напишите другие продукты.' : bot_intro($q, 0);
        tg('sendMessage', ['chat_id' => $chat, 'text' => $msg, 'reply_markup' => ['inline_keyboard' => [[['text' => 'Подобрать на сайте', 'url' => seo_abs(seo_path())]]]]]);
        return;
    }
    $kb = array_map(fn($r) => [['text' => mb_substr(bot_line($r), 0, 60), 'callback_data' => 'r:' . $r['id']]], $list);
    if (count($list) === 5) $kb[] = [['text' => 'Ещё варианты →', 'callback_data' => 'm:' . tg_remember($text) . ':' . ($offset + 5)]];
    $body = ['chat_id' => $chat, 'text' => $offset ? 'Ещё варианты:' : bot_intro($q, count($list)), 'reply_markup' => ['inline_keyboard' => $kb]];
    if ($editId) tg('editMessageReplyMarkup', ['chat_id' => $chat, 'message_id' => $editId, 'reply_markup' => ['inline_keyboard' => []]]);
    tg('sendMessage', $body);
}

/** A whole recipe as one message (Telegram allows 4096 characters). */
function tg_recipe(int $chat, string $id): void {
    $r = bot_recipe_by_id($id);
    if (!$r) { tg('sendMessage', ['chat_id' => $chat, 'text' => 'Этот рецепт убрали с сайта.']); return; }
    tg_count('open', '', $id);
    $kcal = seo_nutrition($r);
    $head = '<b>' . h($r['title']) . "</b>\n" . h(seo_minutes((int)$r['totalMinutes'])) . ' · ' . (int)$r['servings'] . ' ' . seo_plural((int)$r['servings'], 'порция', 'порции', 'порций') . ($kcal ? ' · ' . $kcal['kcal'] . ' ккал на порцию' : '') . "\n\n";
    $ing = "<b>Продукты</b>\n" . implode("\n", array_map(fn($l) => '• ' . h($l), bot_ingredients($r))) . "\n\n";
    $steps = "<b>Как готовить</b>\n";
    foreach (array_values($r['steps']) as $k => $s) $steps .= ($k + 1) . '. ' . h((string)($s['text'] ?? '')) . "\n";
    $text = $head . $ing . $steps;
    if (mb_strlen($text, 'UTF-8') > 3900) $text = mb_substr($head . $ing, 0, 3500, 'UTF-8') . "\n<i>Шаги — по ссылке ниже.</i>";
    tg('sendMessage', ['chat_id' => $chat, 'text' => $text, 'parse_mode' => 'HTML', 'link_preview_options' => ['is_disabled' => true],
        'reply_markup' => ['inline_keyboard' => [[['text' => 'Готовить по шагам с таймером', 'url' => seo_abs(seo_app_path($id))]], [['text' => 'Страница рецепта', 'url' => seo_abs(seo_recipe_path($id))]]]]]);
}

try {
    if (isset($update['callback_query'])) {
        $cb = $update['callback_query']; $data = (string)($cb['data'] ?? ''); $chat = (int)($cb['message']['chat']['id'] ?? 0);
        tg('answerCallbackQuery', ['callback_query_id' => $cb['id']]);
        if ($chat && preg_match('/^r:([a-z0-9-]{1,62})$/', $data, $m)) tg_recipe($chat, $m[1]);
        elseif ($chat && preg_match('/^m:(\d+):(\d+)$/', $data, $m)) {
            $st = tg_db()->prepare('SELECT text FROM bot_queries WHERE id = ?'); $st->execute([(int)$m[1]]); $t = $st->fetchColumn();
            if ($t !== false) tg_results($chat, (string)$t, min(50, (int)$m[2]), (int)($cb['message']['message_id'] ?? 0));
        }
        exit;
    }
    $msg = $update['message'] ?? null;
    if (!is_array($msg) || !isset($msg['chat']['id'])) exit;
    $chat = (int)$msg['chat']['id']; $text = trim((string)($msg['text'] ?? ''));
    if ($text === '' ) { tg('sendMessage', ['chat_id' => $chat, 'text' => 'Напишите, что есть дома: например, «курица, картошка, 30 минут».']); exit; }
    if (preg_match('#^/start#', $text)) {
        tg('sendMessage', ['chat_id' => $chat, 'parse_mode' => 'HTML', 'text' => "Привет! Я подскажу, что приготовить.\n\nНапишите, что есть дома и сколько времени:\n• <i>курица, картошка</i>\n• <i>суп с грибами за 40 минут</i>\n• <i>фарш, рис, без лука</i>\n\nИли нажмите /idea — предложу случайное блюдо.",
            'reply_markup' => ['inline_keyboard' => [[['text' => 'Открыть «Что приготовить?»', 'url' => seo_abs(seo_path())]]]]]);
        tg_count('visit', '/start');
    } elseif (preg_match('#^/idea#', $text) || bot_is_surprise($text)) {
        $r = bot_random();
        if ($r) tg_recipe($chat, $r['id']);
    } else tg_results($chat, $text);
} catch (Throwable $e) {
    error_log('[what-to-cook] telegram: ' . $e->getMessage());
}
