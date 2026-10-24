<?php
// «Можно дальше» / «Дождитесь» under a running timer (screens/Cooking): for each timed step, whether the next step can
// be done while it runs. The whole catalog was marked once (data/step-flow.json); new recipes are marked with the
// owner's AI in the admin panel («Рецепты → Доработка → Таймеры», kept in storage/step-flow.json). A mark counts only
// while its step reads as it did (the first six letters of its text's md5): an edited step loses it until marked again.
declare(strict_types=1);

function step_flow_marks(): array {
    $marks = [];
    foreach ([__DIR__ . '/data/step-flow.json', step_flow_store()] as $p) {
        $j = @file_get_contents($p);
        $a = is_string($j) ? json_decode($j, true) : null;
        if (is_array($a)) foreach ($a as $id => $steps) if (is_array($steps)) foreach ($steps as $i => $m) $marks[$id][$i] = $m;
    }
    return $marks;
}
function step_flow_store(): string { return __DIR__ . '/storage/step-flow.json'; }
function step_flow_key(string $text): string { return substr(md5($text), 0, 6); }

/** {recipe: {step: [1 go on | 0 wait, first step to do meanwhile?, last?]}} for the steps whose text is still the marked one. */
function step_flow(): array {
    $marks = step_flow_marks();
    $out = [];
    foreach (catalog_recipes() as $r) {
        $id = (string)$r['id'];
        if (!isset($marks[$id])) continue;
        foreach ($marks[$id] as $i => $m) {
            $text = $r['steps'][(int)$i]['text'] ?? null;
            if (!is_string($text) || !is_array($m) || ($m[1] ?? '') !== step_flow_key($text)) continue;
            $out[$id][(string)$i] = array_merge([(int)$m[0]], array_map('intval', array_slice($m, 2, 2)));
        }
    }
    return $out;
}

/** The panel's marks for new recipes: [{id, i, go}] — the step's text is keyed here, as it is now. */
function admin_step_flow_save(array $in): void {
    $all = [];
    foreach (catalog_recipes() as $r) $all[(string)$r['id']] = $r;
    $j = @file_get_contents(step_flow_store());
    $store = is_string($j) ? (json_decode($j, true) ?: []) : [];
    $saved = 0;
    foreach (array_slice((array)($in['items'] ?? []), 0, 2000) as $x) {
        $id = is_array($x) ? (string)($x['id'] ?? '') : '';
        $i = (int)($x['i'] ?? -1);
        $text = $all[$id]['steps'][$i]['text'] ?? null;
        if (!is_string($text)) continue;
        $store[$id][(string)$i] = [!empty($x['go']) ? 1 : 0, step_flow_key($text)];
        $saved++;
    }
    if ($saved) {
        $dir = dirname(step_flow_store());
        if (!is_dir($dir)) @mkdir($dir, 0775, true);
        if (@file_put_contents(step_flow_store() . '.tmp', json_encode($store, JSON_UNESCAPED_SLASHES)) === false || !@rename(step_flow_store() . '.tmp', step_flow_store()))
            throw new ApiError(500, 'save', 'Не получилось сохранить отметки.');
    }
    send_json(['saved' => $saved]);
}
