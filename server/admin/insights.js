// «Как идут дела»: the funnel, return of visitors, «Не то» from Шеф's answers, errors from phones, database copies.
(function () {
  var out = document.getElementById("out");
  var days = document.getElementById("days");
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function pct(a, b) { return b ? Math.round((a / b) * 100) + "%" : "—"; }
  function when(ms) { return new Date(ms).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  function size(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + " МБ" : Math.round(b / 1024) + " КБ"; }

  function render(d) {
    var top = d.funnel[0].n || 0, h = "";
    h += '<h2>Путь человека</h2><div class="card">';
    d.funnel.forEach(function (f, i) {
      var w = top ? Math.max(2, Math.round((f.n / top) * 100)) : 0;
      h += '<div class="row"><span class="label">' + esc(f.label) + '</span><span class="bar"><span style="width:' + w + '%"></span></span>'
        + '<span class="num">' + f.n + '</span><span class="num muted">' + (i ? pct(f.n, d.funnel[i - 1].n) : "") + "</span></div>";
    });
    h += '<p class="muted">Процент справа — сколько дошли от предыдущего шага.</p></div>';

    h += '<h2>Возвращаются</h2><div class="grid">'
      + '<div class="card"><div class="big">' + pct(d.return1.back, d.return1.base) + '</div><div class="muted">вернулись на следующий день или позже (' + d.return1.back + " из " + d.return1.base + ")</div></div>"
      + '<div class="card"><div class="big">' + pct(d.return7.back, d.return7.base) + '</div><div class="muted">вернулись через неделю или позже (' + d.return7.back + " из " + d.return7.base + ")</div></div>"
      + '<div class="card"><div class="big">' + d.shares + '</div><div class="muted">раз поделились рецептом</div></div></div>';

    h += '<h2>«Не то» — Шеф ответил не так</h2><div class="card">';
    if (!d.wrong.length) h += '<p class="empty">Пока никто не нажимал «Не то».</p>';
    d.wrong.forEach(function (w) { h += '<div class="row"><span style="flex:1">' + esc(w.text) + '</span><span class="num">' + w.n + "</span></div>"; });
    h += '<p class="muted">Эти запросы стоит научить во вкладке «Запросы» → «Научить» или добавить под них рецепты.</p></div>';

    h += '<h2>Ошибки на телефонах</h2><div class="card">';
    if (!d.errors.length) h += '<p class="empty">Ошибок нет — всё работает.</p>';
    d.errors.forEach(function (e) {
      h += '<div class="row" style="align-items:flex-start"><div style="flex:1"><div class="err">' + esc(e.message) + "</div>"
        + '<div class="muted">' + esc(e.place || "") + (e.version ? " · версия " + esc(e.version) : "") + " · " + when(e.last) + "</div>"
        + '<div class="muted" style="font-size:12px">' + esc(e.agent || "") + '</div></div><span class="num">×' + e.n + "</span></div>";
    });
    h += "</div>";

    h += '<h2>Копии базы</h2><div class="card">';
    if (!d.backups.length) h += '<p class="empty">Копий пока нет: первая появится сегодня, после первого посещения сайта.</p>';
    d.backups.forEach(function (b) { h += '<div class="row"><span style="flex:1">' + esc(b.name) + '</span><span class="muted">' + size(b.size) + " · " + when(b.mtime) + "</span></div>"; });
    h += '<p class="muted">Копия делается сама раз в день, хранятся последние 7, в папке api/_private/storage/backups на хостинге (из интернета она закрыта). Чтобы восстановить, замените файл what-to-cook.sqlite копией.</p></div>';
    out.innerHTML = h;
  }

  function load() {
    out.innerHTML = '<p class="muted">Загружаю…</p>';
    fetch("../api/index.php?r=admin.insights&days=" + days.value, { credentials: "same-origin" })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (x) {
        if (x.status === 401) { out.innerHTML = '<div class="card">Сначала <a href="./">войдите в админ-панель</a>, потом вернитесь сюда.</div>'; return; }
        if (!x.ok) { out.innerHTML = '<div class="card">' + esc(x.j.error || "Сервер не ответил") + "</div>"; return; }
        render(x.j);
      })
      .catch(function () { out.innerHTML = '<div class="card">Нет связи с сервером. Обновите страницу.</div>'; });
  }
  days.addEventListener("change", load);
  load();
})();
