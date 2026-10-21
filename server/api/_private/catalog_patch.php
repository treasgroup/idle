<?php
// «Доработка» in the admin panel: answers from the owner's image/text AI applied to the catalog files on the hosting —
// long steps split into short ones, and product swaps («чем заменить»). Many recipes in one request; every touched
// file is backed up first (data/catalog/_backups, the same as «Дополнить рецепты»).

function catalog_patch_step(object $s, int $n, array $ids): object {
    $text = trim(preg_replace('/\s+/u', ' ', (string)($s->text ?? '')) ?? '');
    $len = mb_strlen($text, 'UTF-8');
    if ($len < 5 || $len > 700) throw new ApiError(400, 'validation', 'Шаг ' . $n . ': текст от 5 до 700 знаков.');
    $o = (object)['text' => $text];
    $uses = [];
    foreach ((array)($s->uses ?? []) as $u) { $u = (string)$u; if (isset($ids[$u]) && !in_array($u, $uses, true)) $uses[] = $u; }
    if ($uses) $o->uses = $uses;
    if (isset($s->timerSeconds) && $s->timerSeconds !== null) {
        $t = (int)$s->timerSeconds;
        if ($t < 10 || $t > 86400) throw new ApiError(400, 'validation', 'Шаг ' . $n . ': таймер от 10 секунд до суток.');
        $o->timerSeconds = $t;
    }
    return $o;
}

/** {recipes: {"<id>": {steps?: [{text, timerSeconds?, uses?}], swaps?: {"<product id>": ["<swap id>", …]}}}} */
function admin_recipes_patch(array $b): void {
    $patch = json_decode(json_encode($b['recipes'] ?? null));
    if (!is_object($patch) || !count((array)$patch) || count((array)$patch) > 60) throw new ApiError(400, 'validation', 'Нужно от 1 до 60 рецептов за раз.');
    // Where each recipe is, and every product id the catalog knows (swaps may only name those).
    $files = []; $where = []; $known = [];
    foreach (catalog_files() as $f) {
        if (isset($f['error'])) continue;
        $data = json_decode((string)$f['raw']);
        if (!is_object($data)) continue;
        foreach ((array)($data->ingredients ?? []) as $i) if (is_object($i) && isset($i->id)) $known[(string)$i->id] = true;
        foreach ((array)($data->recipes ?? []) as $k => $r) {
            $id = is_object($r) ? (string)($r->id ?? '') : '';
            if ($id === '' || !isset($patch->$id)) continue;
            $files[$f['name']] = $files[$f['name']] ?? $data;
            $where[$id] = [$f['name'], $k];
        }
    }
    $saved = []; $problems = [];
    foreach ($patch as $id => $p) {
        if (!isset($where[$id])) { $problems[] = $id . ': нет в каталоге'; continue; }
        [$name, $k] = $where[$id];
        $r = $files[$name]->recipes[$k];
        $ids = [];
        foreach ((array)($r->ingredients ?? []) as $i) if (is_object($i)) $ids[(string)($i->id ?? '')] = true;
        try {
            if (isset($p->steps)) {
                $steps = (array)$p->steps;
                if (count($steps) < 2 || count($steps) > 25) throw new ApiError(400, 'validation', 'шагов должно быть от 2 до 25');
                $out = [];
                foreach (array_values($steps) as $n => $s) $out[] = catalog_patch_step(is_object($s) ? $s : (object)['text' => (string)$s], $n + 1, $ids);
                $r->steps = $out;
            }
            if (isset($p->swaps) && is_object($p->swaps)) {
                $main = (string)($r->mainIngredient ?? '');
                $count = 0;
                foreach ((array)($r->ingredients ?? []) as $i) {
                    $iid = (string)($i->id ?? '');
                    if ($iid === '' || $iid === $main || !isset($p->swaps->$iid) || $count >= 4) continue;
                    $to = [];
                    foreach ((array)$p->swaps->$iid as $s) { $s = (string)$s; if ($s !== $iid && isset($known[$s]) && !in_array($s, $to, true)) $to[] = $s; }
                    if (!$to) continue;
                    $i->swap = array_slice($to, 0, 3);
                    $count++;
                }
            }
            $saved[] = $id;
        } catch (ApiError $e) { $problems[] = $id . ': ' . $e->getMessage(); }
    }
    foreach (array_unique(array_map(fn($w) => $w[0], array_intersect_key($where, array_flip($saved)))) as $name) {
        $json = json_encode($files[$name], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT | JSON_PRESERVE_ZERO_FRACTION);
        if ($json === false) throw new ApiError(500, 'json', 'Не получилось собрать файл ' . $name . '.');
        backup_file($name);
        write_atomic(catalog_path($name), $json . "\n");
    }
    send_json(['saved' => count($saved), 'problems' => $problems]);
}
