<?php
// «Вернуть дополнения»: when the catalog files on the hosting were replaced by older ones (an upload of the whole site),
// the fields written by «Дополнить рецепты» are taken back from the copies the admin panel keeps on every save
// (data/catalog/_backups). Only fields the recipe does not have now are filled in — nothing that is there is changed.
// Recipes that are in a copy but not in the file are listed, and put back only when asked.
declare(strict_types=1);

const HEAL_FIELDS = ['course', 'meals', 'mainIngredient', 'needsSide', 'season', 'occasions', 'budget', 'kids', 'freezerDays',
    'yields', 'cookware', 'look', 'swaps', 'stepUses', 'sources'];

/** The copies of a file, newest first, decoded (objects stay objects: «{}» must not turn into «[]»). */
function heal_copies(string $name): array {
    $paths = glob(backups_dir() . '/' . $name . '.*.bak') ?: [];
    rsort($paths, SORT_STRING); // names end with the date and time: newest first
    $out = [];
    foreach ($paths as $p) {
        $raw = (string)@file_get_contents($p);
        if (substr($raw, 0, 3) === "\xEF\xBB\xBF") $raw = substr($raw, 3);
        $d = json_decode($raw);
        if (is_object($d) && isset($d->recipes) && is_array($d->recipes)) $out[] = $d;
    }
    return $out;
}

/** What can be taken back ($apply: and takes it back). $withLost: also the recipes missing from the file. */
function catalog_heal(bool $apply, bool $withLost): array {
    $files = [];
    $totalFields = 0; $totalRecipes = 0; $lostAll = [];
    foreach (glob(catalog_dir() . '/*.json') ?: [] as $path) {
        $name = basename($path);
        $copies = heal_copies($name);
        if (!$copies) continue;
        $raw = (string)file_get_contents($path);
        if (substr($raw, 0, 3) === "\xEF\xBB\xBF") $raw = substr($raw, 3);
        $cur = json_decode($raw);
        if (!is_object($cur) || !isset($cur->recipes) || !is_array($cur->recipes)) continue;
        $have = [];
        foreach ($cur->recipes as $r) if (is_object($r) && isset($r->id)) $have[(string)$r->id] = $r;
        $fields = 0; $recipes = 0;
        foreach ($have as $id => $r) {
            $took = 0;
            foreach (HEAL_FIELDS as $f) {
                if (property_exists($r, $f)) continue;
                foreach ($copies as $c) {
                    foreach ($c->recipes as $old) {
                        if (is_object($old) && (string)($old->id ?? '') === $id && property_exists($old, $f)) { $r->$f = $old->$f; $took++; break 2; }
                    }
                }
            }
            // «Продукты по шагам» belong to the steps: a copy with a different number of steps does not fit.
            if ($took && property_exists($r, 'stepUses') && is_array($r->stepUses) && isset($r->steps) && is_array($r->steps) && count($r->stepUses) !== count($r->steps)) { unset($r->stepUses); $took--; }
            if ($took) { $fields += $took; $recipes++; }
        }
        // Recipes that a copy has and the file does not (added on the hosting, then lost with the upload).
        $lost = [];
        foreach ($copies as $c) foreach ($c->recipes as $old) {
            $id = is_object($old) ? (string)($old->id ?? '') : '';
            if ($id !== '' && !isset($have[$id]) && !isset($lost[$id])) $lost[$id] = $old;
        }
        if ($withLost) foreach ($lost as $old) { $cur->recipes[] = $old; }
        foreach ($lost as $id => $old) $lostAll[] = ['id' => $id, 'title' => (string)($old->title ?? $id), 'file' => $name];
        if ($apply && ($fields || ($withLost && $lost))) {
            backup_file($name);
            write_atomic($path, json_encode($cur, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n");
        }
        if ($fields || $lost) $files[] = ['name' => $name, 'fields' => $fields, 'recipes' => $recipes, 'lost' => count($lost)];
        $totalFields += $fields; $totalRecipes += $recipes;
    }
    return ['files' => $files, 'fields' => $totalFields, 'recipes' => $totalRecipes, 'lost' => $lostAll, 'applied' => $apply];
}

function admin_catalog_heal(array $b): void {
    send_json(catalog_heal(!empty($b['apply']), !empty($b['withLost'])));
}
