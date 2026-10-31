<?php
// «Поддержать автора»: the page /avtor (the owner's story, a big button to CloudTips, links to write in VK and
// Telegram, the people who supported — the biggest first) and its tab in the admin panel, where everything is edited.
// Kept in setting 'support'; the photo next to the site: avtor/photo.jpg. Only for the site: the RuStore app has no
// link here (the store's rules on payments).

const SUPPORT_DEFAULT = [
    'title' => 'Привет, я Андрей',
    'sub' => 'Делаю «Шефли» сам',
    'text' => "Каждый вечер в миллионах семей звучит один и тот же вопрос: «Что приготовить?»\n\n"
        . "Открываешь холодильник — продукты есть, идей нет. Открываешь сайты с рецептами — реклама, длинные статьи и баннеры на пол-экрана. Мне захотелось сделать по-другому: спокойно, честно и по делу. Сказал, что есть дома, — и через минуту уже режешь лук.\n\n"
        . "Я делаю сервис один, без команды и без рекламы. Сейчас в нём больше 1100 рецептов, Шеф, который понимает голос, план на неделю, покупки и готовка по шагам с таймерами. Всё бесплатно и без регистрации — и я хочу, чтобы так и оставалось.\n\n"
        . "А дальше я мечтаю о большем — о кулинарной соцсети, где можно делиться семейными рецептами, бабушкиными тетрадками и фото того, что получилось.\n\n"
        . "Если сервис хоть раз выручил вас вечером — поддержите его. Любая сумма — это сервер, новые рецепты и ещё немного сил, чтобы делать дальше. Спасибо, что вы здесь ❤️",
    'button' => 'Поддержать проект',
    'url' => 'https://pay.cloudtips.ru/p/6267e75d',
    'buttonNote' => 'Картой или по СБП через CloudTips · любая сумма',
    'goals' => "🖥 Сервер и домен — Чтобы сайт и Шеф работали быстро и без рекламы\n📸 Новые рецепты и фото — Каталог растёт каждую неделю\n👨‍👩‍👧 Кулинарная соцсеть — Семейные рецепты, тетрадки и фото готовых блюд",
    'vk' => '',
    'tg' => '',
    'listNote' => 'Хотите в список? Напишите ник в комментарии к переводу.',
    'showAmounts' => true,
    'showGoals' => true,
    'people' => [],
];

function support_dir(): string { return dirname(__DIR__, 2) . '/avtor'; }
/** The photo's address: from the site's root for the page, or relative (avtor/…) for the panel, which runs under api/. */
function support_photo(bool $relative = false): ?string {
    $f = support_dir() . '/photo.jpg';
    return is_file($f) ? ($relative ? '' : seo_path()) . 'avtor/photo.jpg?v=' . filemtime($f) : null;
}
/** Only links that open a page: https (or http) addresses, nothing else. */
function support_url($v): string {
    $v = trim((string)$v);
    return $v !== '' && preg_match('~^https?://[^\s<>"]{3,300}$~i', $v) ? $v : '';
}
/** The people who supported: the biggest sum first, then the newest. */
function support_people($list): array {
    $out = [];
    foreach (is_array($list) ? $list : [] as $p) {
        if (!is_array($p)) continue;
        $nick = cut(trim((string)($p['nick'] ?? '')), 40);
        $amount = max(0, min(10000000, (int)round((float)($p['amount'] ?? 0))));
        $date = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($p['date'] ?? '')) ? (string)$p['date'] : '';
        if ($nick === '') continue;
        $out[] = ['id' => preg_match('/^[a-z0-9]{1,16}$/', (string)($p['id'] ?? '')) ? (string)$p['id'] : bin2hex(random_bytes(4)), 'nick' => $nick, 'amount' => $amount, 'date' => $date];
    }
    usort($out, fn($a, $b) => [$b['amount'], $b['date']] <=> [$a['amount'], $a['date']]);
    return array_slice($out, 0, 1000);
}
function support_clean(array $b): array {
    $d = SUPPORT_DEFAULT;
    foreach (['title' => 80, 'sub' => 140, 'button' => 60, 'buttonNote' => 160, 'listNote' => 200] as $f => $n) if (isset($b[$f])) $d[$f] = cut(trim((string)$b[$f]), $n);
    foreach (['text' => 6000, 'goals' => 1500] as $f => $n) if (isset($b[$f])) $d[$f] = mb_substr(str_replace("\r", '', trim((string)$b[$f])), 0, $n, 'UTF-8');
    foreach (['url', 'vk', 'tg'] as $f) if (isset($b[$f])) $d[$f] = support_url($b[$f]);
    foreach (['showAmounts', 'showGoals'] as $f) if (isset($b[$f])) $d[$f] = (bool)$b[$f];
    $d['people'] = support_people($b['people'] ?? []);
    return $d;
}
function support_data(): array {
    $v = setting('support', null);
    return is_array($v) ? support_clean($v) : SUPPORT_DEFAULT;
}

// ---------- Admin ----------
function admin_support_state(): void { send_json(['support' => support_data(), 'photo' => support_photo(true), 'page' => seo_pretty() ? 'avtor' : 'avtor.php']); }
function admin_support_save(array $b): void {
    $d = support_clean(is_array($b['support'] ?? null) ? $b['support'] : []);
    if ($d['url'] === '') throw new ApiError(400, 'validation', 'Ссылка кнопки должна начинаться с https://');
    set_setting('support', $d);
    admin_support_state();
}
/** The photo: JPEG, PNG or WebP, cut to a square around the centre, 600×600. */
function admin_support_photo(): void {
    $f = $_FILES['photo'] ?? null;
    if (!upload_ok($f)) throw new ApiError(400, 'upload', 'Фото не загрузилось. Попробуйте файл поменьше.');
    if ($f['size'] <= 0 || $f['size'] > 12 * 1024 * 1024) throw new ApiError(413, 'upload', 'Фото должно быть до 12 МБ.');
    if (!function_exists('imagecreatefromstring')) throw new ApiError(500, 'gd', 'На хостинге не включена библиотека GD для картинок.');
    $info = @getimagesize($f['tmp_name']);
    if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true) || $info[0] > 10000 || $info[1] > 10000)
        throw new ApiError(415, 'upload', 'Нужна картинка JPEG, PNG или WebP.');
    $src = @imagecreatefromstring((string)file_get_contents($f['tmp_name']));
    if (!$src) throw new ApiError(415, 'upload', 'Не получилось прочитать фото.');
    [$w, $h] = [imagesx($src), imagesy($src)];
    $side = min($w, $h);
    $dst = imagecreatetruecolor(600, 600);
    imagecopyresampled($dst, $src, 0, 0, (int)(($w - $side) / 2), (int)(($h - $side) / 2), 600, 600, $side, $side);
    imageinterlace($dst, true);
    $dir = support_dir();
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) throw new ApiError(500, 'write', 'Нет папки avtor. Создайте её рядом с папкой photos.');
    $tmp = $dir . '/.upload-' . bin2hex(random_bytes(4));
    $ok = imagejpeg($dst, $tmp, 86);
    imagedestroy($dst); imagedestroy($src);
    $to = $dir . '/photo.jpg';
    if (!$ok || !@rename($tmp, $to)) { @unlink($tmp); throw new ApiError(500, 'write', 'Не удалось сохранить фото. Проверьте права на папку avtor.'); }
    @chmod($to, 0644);
    clearstatcache();
    admin_support_state();
}
function admin_support_photo_delete(): void {
    $p = support_dir() . '/photo.jpg';
    if (is_file($p) && !@unlink($p)) throw new ApiError(500, 'write', 'Не удалось удалить фото.');
    clearstatcache();
    admin_support_state();
}

// ---------- The page ----------
function support_css(): string {
    return '.au{max-width:640px;margin:0 auto;padding-bottom:24px}'
        . '.au .ava{width:128px;height:128px;border-radius:50%;margin:28px auto 0;border:4px solid #fff;box-shadow:0 10px 28px rgba(60,30,10,.16);overflow:hidden;background:radial-gradient(circle at 35% 30%,#fff 0,#f6e2d6 70%);display:grid;place-items:center}'
        . '.au .ava img{width:100%;height:100%;object-fit:cover}.au .ava span{font-size:60px}'
        . '.au h1{text-align:center;margin:16px 0 2px}.au .sub{text-align:center;color:var(--muted);margin:0 0 22px}'
        . '.au .story p{margin:0 0 14px;font-size:18px;line-height:1.65}.au .story p:first-child{font-size:21px;font-weight:600;line-height:1.45}'
        . '.au .give{display:flex;width:100%;min-height:60px;font-size:19px;margin-top:8px;box-shadow:0 10px 24px rgba(183,67,47,.25)}.au .give svg{width:22px;height:22px}'
        . '.au .gnote{text-align:center;font-size:14px;color:var(--faint);margin:10px 0 0}'
        . '.au h2{font-size:22px;margin:34px 0 12px}'
        . '.goals{list-style:none;margin:0;padding:4px 18px;background:var(--card);border:1px solid var(--line);border-radius:20px}.goals li{display:flex;gap:14px;align-items:flex-start;padding:14px 0;border-top:1px solid var(--line)}.goals li:first-child{border-top:0}'
        . '.goals .e{font-size:24px;width:34px;text-align:center;flex:none;line-height:1.2}.goals b{display:block}.goals span{color:var(--muted);font-size:15px}'
        . '.au .two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.au .two a{display:flex;align-items:center;justify-content:center;gap:8px;min-height:54px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--ink);text-decoration:none;font-weight:600}.au .two a:hover{border-color:var(--accent);color:var(--accent)}'
        . '.au .two a:only-child{grid-column:1/-1}'
        . '.total{display:flex;justify-content:space-between;align-items:baseline;margin:0 0 8px}.total b{font-size:19px}.total span{color:var(--muted);font-size:14px}'
        . '.ppl{list-style:none;margin:0;padding:0;background:var(--card);border:1px solid var(--line);border-radius:20px;overflow:hidden}.ppl li{display:flex;align-items:center;gap:12px;padding:11px 16px;border-top:1px solid var(--line)}.ppl li:first-child{border-top:0}'
        . '.ppl .a{width:36px;height:36px;border-radius:50%;background:var(--soft);color:#8a2e1c;font-weight:700;display:grid;place-items:center;flex:none}.ppl .n{min-width:0;flex:1}.ppl .n b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}.ppl .n small{color:var(--faint);font-size:13px}.ppl .m{font-weight:700;white-space:nowrap}'
        . '.ppl li:first-child .a{background:#fde7b0;color:#7a5200}'
        . '.au .lnote{font-size:14px;color:var(--faint);margin:10px 0 0}';
}
function support_money(int $n): string { return number_format($n, 0, ',', ' ') . ' ₽'; }
function support_date(string $d): string {
    if ($d === '') return '';
    [$y, $m, $day] = array_map('intval', explode('-', $d));
    $months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    return $day . ' ' . ($months[$m - 1] ?? '') . ($y !== (int)date('Y') ? ' ' . $y : '');
}
/** «🖥 Сервер и домен — пояснение»: one goal per line. */
function support_goals(string $text): array {
    $out = [];
    foreach (preg_split('/\n+/', $text) as $line) {
        $line = trim($line);
        if ($line === '') continue;
        $emoji = '';
        if (preg_match('/^(\X)\s+(.*)$/u', $line, $m) && !preg_match('/[\p{L}\p{N}]/u', $m[1])) { $emoji = $m[1]; $line = $m[2]; }
        [$title, $hint] = array_pad(preg_split('/\s+[—–-]\s+/u', $line, 2), 2, '');
        $out[] = [$emoji, $title, $hint];
    }
    return array_slice($out, 0, 8);
}

function support_page(): void {
    $d = support_data();
    $photo = support_photo();
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache');
    $paras = array_values(array_filter(array_map('trim', preg_split('/\n\s*\n/', $d['text'])), fn($p) => $p !== ''));
    echo seo_head(['title' => 'Поддержать автора — ' . SEO_SITE, 'description' => seo_cut($d['title'] . '. ' . ($paras[0] ?? ''), 200), 'canonical' => seo_abs(seo_path() . (seo_pretty() ? 'avtor' : 'avtor.php')),
        'css' => support_css(), 'back' => true] + ($photo ? ['image' => seo_abs($photo)] : []));
    echo '<div class="au"><div class="ava">' . ($photo ? '<img src="' . h($photo) . '" alt="' . h($d['title']) . '" width="128" height="128">' : '<span aria-hidden="true">🧑‍🍳</span>') . "</div>\n";
    echo '<h1>' . h($d['title']) . '</h1>' . ($d['sub'] !== '' ? '<p class="sub">' . h($d['sub']) . '</p>' : '') . "\n<div class=\"story\">";
    foreach ($paras as $p) echo '<p>' . nl2br(h($p)) . '</p>';
    echo "</div>\n";
    $heart = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.1 5.2 3 1.6-1.9 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z"/></svg>';
    echo '<a class="btn give" href="' . h($d['url']) . '" target="_blank" rel="noopener">' . $heart . h($d['button']) . '</a>';
    if ($d['buttonNote'] !== '') echo '<p class="gnote">' . h($d['buttonNote']) . '</p>';
    $goals = $d['showGoals'] ? support_goals($d['goals']) : [];
    if ($goals) {
        echo "\n<h2>На что пойдёт поддержка</h2>\n<ul class=\"goals\">";
        foreach ($goals as [$e, $t, $hint]) echo '<li><span class="e" aria-hidden="true">' . h($e) . '</span><div><b>' . h($t) . '</b>' . ($hint !== '' ? '<span>' . h($hint) . '</span>' : '') . '</div></li>';
        echo "</ul>\n";
    }
    if ($d['vk'] !== '' || $d['tg'] !== '') {
        echo "<h2>Написать мне</h2>\n<div class=\"two\">";
        if ($d['vk'] !== '') echo '<a href="' . h($d['vk']) . '" target="_blank" rel="noopener">ВКонтакте</a>';
        if ($d['tg'] !== '') echo '<a href="' . h($d['tg']) . '" target="_blank" rel="noopener">Telegram</a>';
        echo "</div>\n";
    }
    $people = $d['people'];
    if ($people) {
        $n = count($people);
        echo "<h2>Спасибо, что поддержали</h2>\n<div class=\"total\"><b>" . $n . ' ' . seo_plural($n, 'человек', 'человека', 'человек') . "</b></div>\n<ul class=\"ppl\">";
        foreach ($people as $p) {
            $first = mb_strtoupper(mb_substr(preg_replace('/^[^\p{L}\p{N}]+/u', '', $p['nick']) ?: '♥', 0, 1, 'UTF-8'), 'UTF-8');
            echo '<li><span class="a" aria-hidden="true">' . h($first) . '</span><span class="n"><b>' . h($p['nick']) . '</b>' . ($p['date'] !== '' ? '<small>' . h(support_date($p['date'])) . '</small>' : '') . '</span>'
                . ($d['showAmounts'] && $p['amount'] > 0 ? '<span class="m">' . h(support_money($p['amount'])) . '</span>' : '') . '</li>';
        }
        echo "</ul>\n";
    }
    if ($d['listNote'] !== '') echo '<p class="lnote">' . h($d['listNote']) . "</p>\n";
    echo "</div>\n" . seo_footer();
}
