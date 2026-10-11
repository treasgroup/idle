<?php
// Grocery delivery partners for the shopping list. The owner fills config.php → 'partners' with affiliate links
// (CPA networks such as Admitad give one per shop). The app shows the buttons; a click goes through
// api/index.php?r=go&to=<id>, which counts it and redirects. No partners in config = no buttons.

function partners_all(): array {
    $out = [];
    foreach ((array)(config()['partners'] ?? []) as $p) {
        if (!is_array($p)) continue;
        $id = (string)($p['id'] ?? ''); $label = trim((string)($p['label'] ?? '')); $url = (string)($p['url'] ?? '');
        if (!preg_match('/^[a-z0-9-]{1,30}$/', $id) || $label === '' || strncmp($url, 'https://', 8) !== 0) continue;
        $out[$id] = ['id' => $id, 'label' => mb_substr($label, 0, 30), 'url' => $url];
    }
    return $out;
}
function partners_route(): void {
    send_json(['partners' => array_values(array_map(fn($p) => ['id' => $p['id'], 'label' => $p['label']], partners_all()))], 200, ['Cache-Control: max-age=300']);
}
function partner_go(string $id): void {
    $p = partners_all()[$id] ?? null;
    if (!$p) throw new ApiError(404, 'partner', 'Магазин не найден.');
    if (!is_bot_ua()) {
        try {
            db()->prepare('INSERT INTO events (ts, day, visitor, type, text, norm, value, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                ->execute([now_ms(), date('Y-m-d'), 'server', 'partner', $id, $id, 1, 'shopping']);
        } catch (Throwable $e) { /* counting must not block the visit */ }
    }
    header('Cache-Control: no-store');
    header('Location: ' . $p['url'], true, 302);
}
