// «ВКонтакте: рецепт дня» in the admin panel.
// First: the next seven days' posts, ready to be put in the community as delayed posts by hand — VK has closed every way
// to get a key that may post on a wall (a community key: код 27; VK ID: код 1051; VK's own apps: «application is
// blocked»), so this is the way that always works. Below, folded: automatic posting for when a key that VK accepts is at
// hand (never shown back), the community, the hour, on/off, «Опубликовать сейчас» and what happened last time.
(function () {
  var box = document.getElementById("vk");
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function when(ms) { return new Date(ms).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  function dayLabel(d) { return new Date(d + "T12:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long" }); }
  function api(route, body) {
    return fetch("../api/index.php?r=" + route, body ? { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { credentials: "same-origin" })
      .then(function (r) { return r.json().catch(function () { return { error: "Сервер ответил ошибкой " + r.status + "." }; }).then(function (j) { if (!r.ok) throw new Error(j.error || "Сервер не ответил"); return j; }); });
  }
  function copy(text, btn) {
    var done = function () { var t = btn.textContent; btn.textContent = "Скопировано ✓"; setTimeout(function () { btn.textContent = t; }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { prompt("Скопируйте текст:", text); });
    else prompt("Скопируйте текст:", text);
  }

  function weekHtml(week) {
    if (!week.length) return '<p class="muted">Нет рецепта дня: в каталоге нет подходящих блюд с фото.</p>';
    return '<ol class="muted" style="font-size:14px;margin:0 0 12px;padding-left:20px">'
      + "<li>Откройте своё сообщество во ВКонтакте → «Что у вас нового?».</li>"
      + "<li>Нажмите «Скопировать» у нужного дня и вставьте текст. ВКонтакте сам добавит фото и название из ссылки.</li>"
      + "<li>Нажмите на часы («Отложенная запись»), выберите этот день и время — например, 12:00 — и «Поставить в очередь».</li>"
      + "<li>Так все 7 дней — минут пять раз в неделю. Блюда те же, что в виджете приложения в этот день.</li>"
      + "</ol>"
      + week.map(function (d, i) {
        return '<div class="row" style="align-items:flex-start">'
          + '<img src="' + esc(d.photo) + '" alt="" width="64" height="64" style="border-radius:12px;object-fit:cover;flex:none">'
          + '<div style="flex:1;min-width:0"><b>' + (i === 0 ? "Сегодня" : esc(d.weekday[0].toUpperCase() + d.weekday.slice(1))) + ", " + esc(dayLabel(d.day)) + "</b>"
          + '<div class="muted" style="margin-top:2px">' + esc(d.title) + "</div></div>"
          + '<button data-copy="' + i + '" style="flex:none">Скопировать</button></div>';
      }).join("");
  }

  function render(s, week) {
    var last = s.last
      ? (s.last.ok ? '<p class="vk-ok">Последняя публикация: ' + when(s.last.at) + " — «" + esc(s.last.title) + "»</p>"
        : '<p class="vk-err">Не получилось ' + when(s.last.at) + ": " + esc(s.last.error) + "</p>")
      : '<p class="muted">Публикаций ещё не было.</p>';
    var hours = ""; for (var h = 6; h <= 22; h++) hours += '<option value="' + h + '"' + (h === s.hour ? " selected" : "") + ">" + h + ":00</option>";
    var keyState = !s.hasToken ? '<p class="muted" style="margin:0">Ключ не вставлен.</p>'
      : s.userName ? '<p class="vk-ok" style="margin:0">Ключ сохранён: ' + esc(s.userName) + ".</p>"
      : '<p class="vk-err" style="margin:0">Сохранённый ключ, похоже, не подходит для публикации (ключ сообщества или вход VK ID).</p>';
    box.innerHTML = '<p class="muted" style="margin-top:0">«Рецепт дня» для вашего сообщества: то же блюдо, что в виджете, со ссылкой на рецепт.</p>'
      + "<h3 style=\"margin:8px 0 6px;font-size:17px\">Посты на неделю</h3>"
      + weekHtml(week)
      + '<details style="margin-top:16px"' + (s.on && s.hasToken && s.userName ? " open" : "") + '><summary class="muted">Автоматическая публикация (нужен ключ администратора)</summary>'
      + '<div class="vk-form" style="margin-top:10px">'
      + '<p class="muted" style="margin:0">ВКонтакте сейчас не выдаёт сайтам ключ, которым можно публиковать на стене: ключ сообщества не подходит (код 27), вход VK ID — тоже (код 1051), а приложения ВКонтакте для этого заблокированы. Если такой ключ у вас всё же есть — вставьте его сюда, и публикации пойдут сами.</p>'
      + '<label>Ключ или адрес со страницы ВКонтакте<input type="password" id="vk-token" placeholder="' + (s.hasToken ? "сохранён — вставьте новый, чтобы заменить" : "ключ администратора сообщества") + '" autocomplete="off"></label>'
      + keyState
      + '<label>Сообщество<input type="text" id="vk-group" placeholder="https://vk.com/ваше_сообщество" value=""></label>'
      + (s.group ? '<p class="muted" style="margin:-4px 0 0">Сейчас: <b>' + esc(s.groupName || ("club" + s.group)) + "</b> (vk.com/club" + s.group + ")</p>" : "")
      + '<label>Публиковать после <select id="vk-hour">' + hours + "</select></label>"
      + '<label><input type="checkbox" id="vk-on"' + (s.on ? " checked" : "") + "> Публиковать каждый день</label>"
      + '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="primary" id="vk-save">Сохранить</button><button id="vk-now"' + (s.hasToken && s.group ? "" : " disabled") + ">Опубликовать сейчас (проверка)</button></div>"
      + last
      + "</div></details>";
    Array.prototype.forEach.call(box.querySelectorAll("[data-copy]"), function (b) { b.onclick = function () { copy(week[+b.getAttribute("data-copy")].text, b); }; });
    document.getElementById("vk-save").onclick = function () {
      var b = this; b.disabled = true;
      api("admin.vk.save", { group: document.getElementById("vk-group").value, token: document.getElementById("vk-token").value,
        hour: +document.getElementById("vk-hour").value, on: document.getElementById("vk-on").checked })
        .then(function (n) { render(n, week); }).catch(function (e) { b.disabled = false; alert(e.message); });
    };
    document.getElementById("vk-now").onclick = function () {
      var b = this; if (!confirm("Опубликовать рецепт дня в сообществе сейчас?")) return; b.disabled = true;
      var again = function () { return api("admin.vk").then(function (n) { render(n, week); }); };
      api("admin.vk.post", {}).then(again).catch(function (e) { alert(e.message); again(); });
    };
  }
  // The server's own words when something fails: «Войдите в админ-панель» only when that is really the reason.
  Promise.all([api("admin.vk"), api("admin.vk.week").then(function (j) { return j.week || []; }).catch(function () { return []; })])
    .then(function (r) { render(r[0], r[1]); })
    .catch(function (e) { box.innerHTML = '<p class="muted">' + esc(e.message || "Сервер не ответил") + "</p>"; });
})();
