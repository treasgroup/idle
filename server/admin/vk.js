// «ВКонтакте: рецепт дня» in the admin panel: the community admin's key (from VK's own page, pasted as the whole address;
// never shown back), the community, the hour, on/off,
// «Опубликовать сейчас» to check, and what happened last time.
(function () {
  var box = document.getElementById("vk");
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function when(ms) { return new Date(ms).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  function api(route, body) {
    return fetch("../api/index.php?r=" + route, body ? { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { credentials: "same-origin" })
      .then(function (r) { return r.json().catch(function () { return { error: "Сервер ответил ошибкой " + r.status + "." }; }).then(function (j) { if (!r.ok) throw new Error(j.error || "Сервер не ответил"); return j; }); });
  }
  function render(s) {
    var last = s.last
      ? (s.last.ok ? '<p class="vk-ok">Последняя публикация: ' + when(s.last.at) + " — «" + esc(s.last.title) + "»</p>"
        : '<p class="vk-err">Не получилось ' + when(s.last.at) + ": " + esc(s.last.error) + "</p>")
      : '<p class="muted">Публикаций ещё не было.</p>';
    var hours = ""; for (var h = 6; h <= 22; h++) hours += '<option value="' + h + '"' + (h === s.hour ? " selected" : "") + ">" + h + ":00</option>";
    var link = "https://oauth.vk.com/authorize?client_id=6121396&scope=wall,groups,offline&redirect_uri=https://oauth.vk.com/blank.html&display=page&response_type=token&revoke=1&v=5.199";
    var keyState = !s.hasToken ? '<p class="muted" style="margin:0">Ключ ещё не вставлен.</p>'
      : s.userName ? '<p class="vk-ok" style="margin:0">Ключ сохранён: ' + esc(s.userName) + ".</p>"
      : '<p class="vk-err" style="margin:0">Сохранённый ключ, похоже, не подходит для публикации (ключ сообщества или вход VK ID). Получите ключ по шагам выше.</p>';
    box.innerHTML = '<p class="muted">Раз в день сайт сам публикует в вашем сообществе «Рецепт дня» — то же блюдо, что в виджете, со ссылкой на рецепт. ВКонтакте сам покажет фото и название из ссылки.</p>'
      + '<div class="vk-form">'
      + "<h3 style=\"margin:8px 0 0;font-size:17px\">1. Ключ администратора</h3>"
      + '<p class="muted" style="margin:0">Публиковать на стене может только ключ того, кто управляет сообществом. Ключ сообщества (код 27) и вход через VK ID (код 1051) ВКонтакте для этого не пускает. Ключ выдаёт сам ВКонтакте на своей странице — через своё официальное приложение «VK Admin».</p>'
      + '<ol class="muted" style="font-size:14px;margin:0;padding-left:20px">'
      + "<li>Войдите во ВКонтакте той страницей, которая управляет сообществом.</li>"
      + '<li>Откройте <a href="' + link + '" target="_blank" rel="noopener">страницу ВКонтакте «Получить ключ»</a> и нажмите «Разрешить».</li>'
      + "<li>Откроется пустая страница с предупреждением не копировать адрес для сторонних сайтов. Ключ уйдёт только на ваш сервер, поэтому здесь можно: скопируйте <b>весь адрес</b> из строки браузера (в нём есть access_token) и вставьте в поле ниже.</li>"
      + "<li>Нажмите «Сохранить», затем «Опубликовать сейчас».</li>"
      + "</ol>"
      + '<label>Адрес со страницы ВКонтакте или ключ<input type="password" id="vk-token" placeholder="' + (s.hasToken ? "сохранён — вставьте новый, чтобы заменить" : "https://oauth.vk.com/blank.html#access_token=…") + '" autocomplete="off"></label>'
      + keyState
      + '<p class="muted" style="margin:0;font-size:13px">Ключ хранится только на сервере и сюда не возвращается. Отозвать его можно во ВКонтакте: Настройки → Приватность → Приложения и сайты → VK Admin.</p>'
      + "<h3 style=\"margin:8px 0 0;font-size:17px\">2. Сообщество и время</h3>"
      + '<label>Сообщество<input type="text" id="vk-group" placeholder="https://vk.com/ваше_сообщество" value=""></label>'
      + (s.group ? '<p class="muted" style="margin:-4px 0 0">Сейчас: <b>' + esc(s.groupName || ("club" + s.group)) + "</b> (vk.com/club" + s.group + ")</p>" : "")
      + '<label>Публиковать после <select id="vk-hour">' + hours + "</select></label>"
      + '<label><input type="checkbox" id="vk-on"' + (s.on ? " checked" : "") + "> Публиковать каждый день</label>"
      + '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="primary" id="vk-save">Сохранить</button><button id="vk-now"' + (s.hasToken && s.group ? "" : " disabled") + ">Опубликовать сейчас (проверка)</button></div>"
      + last
      + "</div>";
    document.getElementById("vk-save").onclick = function () {
      var b = this; b.disabled = true;
      api("admin.vk.save", { group: document.getElementById("vk-group").value, token: document.getElementById("vk-token").value,
        hour: +document.getElementById("vk-hour").value, on: document.getElementById("vk-on").checked })
        .then(render).catch(function (e) { b.disabled = false; alert(e.message); });
    };
    document.getElementById("vk-now").onclick = function () {
      var b = this; if (!confirm("Опубликовать рецепт дня в сообществе сейчас?")) return; b.disabled = true;
      api("admin.vk.post", {}).then(function () { return api("admin.vk"); }).then(render)
        .catch(function (e) { alert(e.message); api("admin.vk").then(render); });
    };
  }
  // The server's own words: «Войдите в админ-панель» only when that is really the reason.
  api("admin.vk").then(render).catch(function (e) { box.innerHTML = '<p class="muted">' + esc(e.message || "Сервер не ответил") + "</p>"; });
})();
