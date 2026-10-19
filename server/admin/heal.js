// «Каталог: вернуть дополнения» in the admin panel: what «Дополнить рецепты» wrote and an upload of older catalog files
// took away, back from the copies kept on every save. First a check (nothing changes), then «Вернуть» on request.
(function () {
  var box = document.getElementById("heal");
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function heal(body) {
    return fetch("../api/index.php?r=admin.catalog.heal", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return { error: "Сервер ответил ошибкой " + r.status + "." }; }).then(function (j) { if (!r.ok) throw new Error(j.error || "Сервер не ответил"); return j; }); });
  }
  function render(h, done) {
    if (!h.fields && !h.lost.length) {
      box.innerHTML = '<p class="vk-ok" style="margin:0">' + (done ? "Готово — всё вернул." : "Всё на месте: возвращать нечего.") + "</p>";
      return;
    }
    var lost = h.lost.length
      ? '<details style="margin-top:8px"><summary class="muted">Рецепты, которых нет в файлах, но есть в копиях: ' + h.lost.length + "</summary><ul class=\"muted\" style=\"font-size:14px\">"
        + h.lost.slice(0, 200).map(function (r) { return "<li>" + esc(r.title) + " <span style=\"opacity:.7\">(" + esc(r.file) + ")</span></li>"; }).join("") + "</ul></details>"
        + '<label style="display:block;margin-top:8px"><input type="checkbox" id="heal-lost" checked> Вернуть и эти рецепты (если вы их не удаляли сами)</label>'
      : "";
    box.innerHTML = "<p style=\"margin:0\">" + (h.fields ? "В резервных копиях нашлись дописанные поля, которых сейчас нет: рецептов — <b>" + h.recipes + "</b>, полей — <b>" + h.fields + "</b>." : "Дописанные поля на месте.") + "</p>"
      + '<p class="muted" style="margin:4px 0 0">Добавляются только поля, которых сейчас нет. Ничего из того, что есть, не меняется; перед записью делается копия каждого файла.</p>'
      + lost
      + '<p style="margin:12px 0 0"><button class="primary" id="heal-go" style="background:var(--brand);color:#fff;border-color:var(--brand)">Вернуть</button></p>';
    document.getElementById("heal-go").onclick = function () {
      var b = this, withLost = !!(document.getElementById("heal-lost") || {}).checked; b.disabled = true; b.textContent = "Возвращаю…";
      heal({ apply: true, withLost: withLost }).then(function () { return heal({}); }).then(function (n) { render(n, true); })
        .catch(function (e) { b.disabled = false; b.textContent = "Вернуть"; alert(e.message); });
    };
  }
  heal({}).then(function (h) { render(h, false); }).catch(function (e) { box.innerHTML = '<p class="muted" style="margin:0">' + esc(e.message) + "</p>"; });
})();
