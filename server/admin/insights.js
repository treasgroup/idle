// «Как идут дела»: messages from people, the funnel, return of visitors, «Не то» from Шеф's answers, errors from phones, where people get lost, database copies.
(function () {
  var out = document.getElementById("out");
  var days = document.getElementById("days");
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function pct(a, b) { return b ? Math.round((a / b) * 100) + "%" : "—"; }
  function when(ms) { return new Date(ms).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  function size(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + " МБ" : Math.round(b / 1024) + " КБ"; }

  var KINDS = { idea: "Идея", problem: "Что-то не так", like: "Нравится", other: "Другое" };
  function recipeLink(id) { return '<a href="../recipe/' + encodeURIComponent(id) + '" target="_blank" rel="noopener">' + esc(id) + "</a>"; }

  function render(d) {
    var top = d.funnel[0].n || 0, h = "";
    var msgs = d.messages || [], fresh = msgs.filter(function (m) { return !+m.seen; }).length;
    h += '<h2 id="messages">Сообщения от людей' + (fresh ? ' <span style="color:var(--brand)">· новых ' + fresh + "</span>" : "") + '</h2><div class="card">';
    if (!msgs.length) h += '<p class="empty">Пока никто не написал. Кнопка «Написать нам» — в профиле.</p>';
    msgs.forEach(function (m) {
      var answer = m.reply
        ? '<div class="reply"><b>Ваш ответ</b> · ' + when(+m.reply_at) + '<div style="white-space:pre-wrap">' + esc(m.reply) + "</div></div>"
        : "";
      var form = +m.can_reply
        ? '<div class="reply-form" id="rf' + m.id + '" hidden><textarea rows="3" placeholder="Ответ увидят в профиле, в «Написать нам»">' + esc(m.reply || "") + "</textarea>"
          + '<button data-msg="' + m.id + '" data-act="reply">Отправить ответ</button></div>'
        : "";
      h += '<div class="row" style="align-items:flex-start' + (+m.seen && !answer ? ";opacity:.75" : "") + '"><div style="flex:1"><div style="white-space:pre-wrap">' + esc(m.text) + "</div>"
        + '<div class="muted">' + esc(KINDS[m.kind] || "Другое") + " · " + (m.place === "app" ? "приложение" : "сайт") + " · " + when(+m.ts)
        + (m.contact ? " · контакт: <b>" + esc(m.contact) + "</b>" : "") + "</div>" + answer + form + "</div>"
        + '<span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">'
        + (+m.can_reply ? '<button data-msg="' + m.id + '" data-act="open">' + (m.reply ? "Изменить ответ" : "Ответить") + "</button>" : "")
        + (+m.seen ? "" : '<button data-msg="' + m.id + '" data-act="seen">Прочитано</button>')
        + '<button data-msg="' + m.id + '" data-act="delete">Удалить</button></span></div>';
    });
    h += '<p class="muted">Ответ приходит человеку в профиль — в «Написать нам» (на том же телефоне или компьютере, откуда он писал).</p>';
    h += "</div>";
    var PK = d.picks || [], SRC = { chat: "Шеф", home: "Главная", search: "Поиск" };
    h += '<h2>С какой попытки находят блюдо</h2><div class="card">';
    if (!PK.length) h += '<p class="empty">Данных пока нет: они появятся, когда люди начнут открывать рецепты из подборок.</p>';
    PK.forEach(function (p) {
      var n = +p.n || 0;
      h += '<div class="row"><span class="label">' + esc(SRC[p.source] || p.source || "Другое") + '</span><span style="flex:1">открывают первое предложение — <b>' + pct(+p.first, n) + "</b>, одно из первых трёх — " + pct(+p.top3, n)
        + '</span><span class="num muted">' + n + "</span></div>";
    });
    h += '<p class="muted">Чем больше доля «первого предложения», тем точнее подбор. Сравнивайте с прошлыми неделями — так видно, стало ли лучше.</p></div>';

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

    // The newer parts of the service: is anybody using them?
    var FEAT = [["party_create", "Собрали стол в складчину"], ["party_answer", "Гости ответили на стол"], ["party_take", "Взяли блюдо или вещь на стол"],
      ["diary_add", "Записи в дневник еды"], ["fast_on", "Включили «Соблюдаю пост»"], ["freezer_add", "Положили в морозилку"], ["freezer_thaw", "Достали из морозилки на завтра"],
      ["look_change", "Поменяли оформление"], ["photo_set", "Поставили своё фото"]];
    var fmap = {}; (d.features || []).forEach(function (f) { fmap[f.feature] = f; });
    h += '<h2>Новые функции</h2><div class="card">';
    FEAT.forEach(function (f) {
      var x = fmap[f[0]] || { n: 0, people: 0 };
      h += '<div class="row"><span class="label">' + esc(f[1]) + '</span><span style="flex:1"></span><span class="num">' + x.n + '</span><span class="num muted">' + x.people + " чел.</span></div>";
    });
    if (d.parties) h += '<p class="muted">Столов создано за период: ' + d.parties.made + ", сейчас живых: " + d.parties.live + ". Слева — сколько раз, справа — сколько разных людей.</p>";
    h += "</div>";

    h += '<h2>«Не то» — Шеф ответил не так</h2><div class="card">';
    if (!d.wrong.length) h += '<p class="empty">Пока никто не нажимал «Не то».</p>';
    d.wrong.forEach(function (w) { h += '<div class="row"><span style="flex:1">' + esc(w.text) + '</span><span class="num">' + w.n + "</span></div>"; });
    h += '<p class="muted">Эти запросы стоит научить во вкладке «Запросы» → «Научить» или добавить под них рецепты.</p></div>';

    var TR = d.troubles || [];
    h += '<h2>Где не получилось</h2><div class="card">';
    if (!TR.length) h += '<p class="empty">Пока никто не отметил, что блюдо не получилось.</p>';
    TR.forEach(function (t, k) {
      h += '<div class="row" style="align-items:flex-start"><div style="flex:1"><div>' + recipeLink(t.id) + (+t.step ? " · шаг " + (+t.step) : "") + '</div><div class="muted">' + esc(t.reason || "") + "</div>"
        + '<div class="reply-form" id="fx' + k + '" hidden></div></div>'
        + '<span style="display:flex;gap:6px;align-items:center"><button data-fix="' + k + '" data-id="' + esc(t.id) + '" data-step="' + (+t.step) + '">' + (+t.step ? "Исправить шаг" : "Открыть шаги") + '</button><span class="num">×' + t.n + "</span></span></div>";
    });
    h += '<p class="muted">Если один рецепт и шаг повторяются — этот шаг стоит переписать понятнее или поправить время.</p></div>';

    var RT = d.ratings || [];
    h += '<h2>Оценки «Так себе»</h2><div class="card">';
    if (!RT.length) h += '<p class="empty">Пока всем всё понравилось.</p>';
    RT.forEach(function (r) { h += '<div class="row"><span style="flex:1">' + recipeLink(r.id) + '</span><span class="muted">понравилось ' + (+r.liked) + '</span><span class="num">так себе ' + (+r.disliked) + "</span></div>"; });
    h += "</div>";

    h += '<h2>Ошибки на телефонах</h2><div class="card">';
    if (!d.errors.length) h += '<p class="empty">Ошибок нет — всё работает.</p>';
    d.errors.forEach(function (e) {
      h += '<div class="row" style="align-items:flex-start"><div style="flex:1"><div class="err">' + esc(e.message) + "</div>"
        + '<div class="muted">' + esc(e.place || "") + (e.version ? " · версия " + esc(e.version) : "") + " · " + when(e.last) + "</div>"
        + '<div class="muted" style="font-size:12px">' + esc(e.agent || "") + '</div></div><span class="num">×' + e.n + "</span></div>";
    });
    h += "</div>";

    var KIND = { dead: "нажимают, а это не кнопка", rage: "нажимают много раз подряд" };
    var PLACE = { home: "Главная", recipes: "Поиск", chat: "Шеф", favorites: "Избранное", shopping: "Покупки", menu: "План", pantry: "Мои продукты", profile: "Профиль", learn: "Школа", recipe: "Рецепт", cook: "Готовка" };
    h += '<h2>Где путаются</h2><div class="card">';
    if (!d.taps || !d.taps.length) h += '<p class="empty">Пока ничего: люди нажимают туда, куда нужно.</p>';
    (d.taps || []).forEach(function (t) {
      h += '<div class="row"><div style="flex:1"><div>«' + esc(t.label) + '»</div><div class="muted">' + esc(PLACE[t.route] || t.route) + " · " + esc(KIND[t.kind] || t.kind) + '</div></div><span class="num">×' + t.n + "</span></div>";
    });
    h += '<p class="muted">Если в списке часто одно и то же место — значит, люди ждут, что там можно нажать, или кнопка не отзывается. Такое стоит переделать.</p></div>';

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
  // «Исправить шаг»: the step's text from the catalog file, edited here; the file is copied to _backups first.
  function stepEditor(box, id, steps, n) {
    var h = '<label class="muted">Шаг <select>' + steps.map(function (_, i) { return '<option value="' + (i + 1) + '"' + (i + 1 === n ? " selected" : "") + ">" + (i + 1) + "</option>"; }).join("") + "</select></label>"
      + "<textarea rows=\"5\"></textarea><button>Сохранить шаг</button>";
    box.innerHTML = h;
    var sel = box.querySelector("select"), ta = box.querySelector("textarea"), save = box.querySelector("button");
    var fill = function () { ta.value = steps[+sel.value - 1] || ""; };
    sel.addEventListener("change", fill); fill();
    save.addEventListener("click", function () {
      save.disabled = true;
      fetch("../api/index.php?r=admin.recipe.step", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id, step: +sel.value, text: ta.value }) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "Не сохранилось"); steps[+sel.value - 1] = ta.value; save.disabled = false; save.textContent = "Сохранено ✓ — люди увидят при следующем открытии"; }); })
        .catch(function (err) { save.disabled = false; alert(err.message); });
    });
  }
  out.addEventListener("click", function (e) {
    var fx = e.target.closest && e.target.closest("button[data-fix]");
    if (fx) {
      var box = document.getElementById("fx" + fx.getAttribute("data-fix"));
      if (!box.hidden) { box.hidden = true; return; }
      fx.disabled = true;
      fetch("../api/index.php?r=admin.recipe&id=" + encodeURIComponent(fx.getAttribute("data-id")), { credentials: "same-origin" })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "Рецепт не найден"); return j; }); })
        .then(function (j) { fx.disabled = false; box.hidden = false; stepEditor(box, fx.getAttribute("data-id"), j.steps, +fx.getAttribute("data-step") || 1); })
        .catch(function (err) { fx.disabled = false; alert(err.message); });
      return;
    }
    var b = e.target.closest && e.target.closest("button[data-msg]");
    if (!b) return;
    var id = +b.getAttribute("data-msg"), act = b.getAttribute("data-act");
    if (act === "open") { var f = document.getElementById("rf" + id); f.hidden = !f.hidden; if (!f.hidden) f.querySelector("textarea").focus(); return; }
    if (act === "delete" && !confirm("Удалить это сообщение?")) return;
    var body = { id: id, action: act };
    if (act === "reply") { body.reply = document.querySelector("#rf" + id + " textarea").value.trim(); if (!body.reply && !confirm("Убрать ответ?")) return; }
    b.disabled = true;
    fetch("../api/index.php?r=admin.message", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body) })
      .then(function (r) { if (!r.ok) throw new Error(); load(); })
      .catch(function () { b.disabled = false; alert("Не получилось. Обновите страницу и попробуйте ещё раз."); });
  });
  days.addEventListener("change", load);
  load();
})();
