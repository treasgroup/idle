// «ВКонтакте: рецепт дня» in the admin panel: «Подключить через ВКонтакте» (VK ID) or a key pasted by hand (never
// shown back), the community, the hour, on/off,
// «Опубликовать сейчас» to check, and what happened last time.
(function () {
  var box = document.getElementById("vk");
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function when(ms) { return new Date(ms).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  function api(route, body) {
    return fetch("../api/index.php?r=" + route, body ? { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { credentials: "same-origin" })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "Сервер не ответил"); return j; }); });
  }
  function render(s) {
    var last = s.last
      ? (s.last.ok ? '<p class="vk-ok">Последняя публикация: ' + when(s.last.at) + " — «" + esc(s.last.title) + "»</p>"
        : '<p class="vk-err">Не получилось ' + when(s.last.at) + ": " + esc(s.last.error) + "</p>")
      : '<p class="muted">Публикаций ещё не было.</p>';
    var hours = ""; for (var h = 6; h <= 22; h++) hours += '<option value="' + h + '"' + (h === s.hour ? " selected" : "") + ">" + h + ":00</option>";
    var connected = s.viaVkId
      ? '<p class="vk-ok">Подключено через ВКонтакте' + (s.userName ? " (вход: " + esc(s.userName) + ")" : "") + ". Ключ продлевается сам.</p>"
      : s.hasToken ? '<p class="muted">Сохранён ключ, вставленный вручную.</p>' : '<p class="muted">ВКонтакте ещё не подключён.</p>';
    box.innerHTML = '<p class="muted">Раз в день сайт сам публикует в вашем сообществе «Рецепт дня» — то же блюдо, что в виджете, со ссылкой на рецепт. ВКонтакте сам покажет фото и название из ссылки.</p>'
      + '<div class="vk-form">'
      + "<h3 style=\"margin:8px 0 0;font-size:17px\">1. Подключение</h3>"
      + '<p class="muted" style="margin:0">Ключ сообщества публиковать на стене не может (отсюда ошибка «код 27»). Нужен вход администратора сообщества — через ВКонтакте, один раз.</p>'
      + '<details' + (s.clientId ? "" : " open") + '><summary class="muted">Как создать приложение VK ID (5 минут, один раз)</summary><ol class="muted" style="font-size:14px">'
      + '<li>Откройте <a href="https://id.vk.com/about/business/go" target="_blank" rel="noopener">id.vk.com/about/business/go</a> → «Перейти в кабинет» → «Добавить приложение».</li>'
      + "<li>Платформа — «Web», название — «Что приготовить?», базовый домен — <b>" + esc(location.hostname) + "</b>.</li>"
      + '<li>«Доверенный Redirect URL» — вставьте этот адрес целиком: <input type="text" readonly value="' + esc(s.redirect) + '" onclick="this.select()" style="margin-top:4px"></li>'
      + "<li>В разделе «Доступы» включите «Стена» (и «Сообщества», если есть). Сохраните.</li>"
      + "<li>Скопируйте «ID приложения» (число) сюда и нажмите «Подключить через ВКонтакте». Войдите той страницей, которая управляет сообществом.</li>"
      + "</ol></details>"
      + '<label>ID приложения VK ID<input type="text" id="vk-client" inputmode="numeric" placeholder="например, 51234567" value="' + esc(s.clientId) + '"></label>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="primary" id="vk-connect">' + (s.viaVkId ? "Подключить заново" : "Подключить через ВКонтакте") + "</button></div>"
      + connected
      + "<h3 style=\"margin:8px 0 0;font-size:17px\">2. Сообщество и время</h3>"
      + '<label>Сообщество<input type="text" id="vk-group" placeholder="https://vk.com/ваше_сообщество" value=""></label>'
      + (s.group ? '<p class="muted" style="margin:-4px 0 0">Сейчас: <b>' + esc(s.groupName || ("club" + s.group)) + "</b> (vk.com/club" + s.group + ")</p>" : "")
      + '<label>Публиковать после <select id="vk-hour">' + hours + "</select></label>"
      + '<label><input type="checkbox" id="vk-on"' + (s.on ? " checked" : "") + "> Публиковать каждый день</label>"
      + '<details><summary class="muted">Запасной способ: вставить ключ вручную</summary><div class="muted" style="font-size:14px;display:grid;gap:8px">'
      + "<p style=\"margin:0\">Если кнопка выше не сработала: впишите ID приложения, откройте эту ссылку, разрешите доступ и скопируйте сюда <b>весь адрес</b> из строки браузера (в нём будет access_token). Ключ сообщества не подойдёт.</p>"
      + '<a id="vk-legacy" href="#" target="_blank" rel="noopener">Получить ключ (откроется ВКонтакте)</a>'
      + '<label>Ключ или адрес со страницы ВКонтакте<input type="password" id="vk-token" placeholder="' + (s.hasToken ? "сохранён — вставьте новый, чтобы заменить" : "вставьте ключ или адрес") + '" autocomplete="off"></label>'
      + "</div></details>"
      + '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="primary" id="vk-save">Сохранить</button><button id="vk-now"' + (s.hasToken && s.group ? "" : " disabled") + ">Опубликовать сейчас (проверка)</button></div>"
      + last
      + "</div>";
    var client = document.getElementById("vk-client");
    function legacy() {
      var id = client.value.trim(), a = document.getElementById("vk-legacy");
      a.href = /^\d{4,12}$/.test(id) ? "https://oauth.vk.com/authorize?client_id=" + id + "&display=page&redirect_uri=https://oauth.vk.com/blank.html&scope=wall,groups,offline&response_type=token&v=5.199" : "#";
      a.style.opacity = a.href.slice(-1) === "#" ? ".5" : "1";
    }
    client.oninput = legacy; legacy();
    document.getElementById("vk-legacy").onclick = function (e) { if (this.href.slice(-1) === "#") { e.preventDefault(); alert("Сначала впишите ID приложения."); } };
    document.getElementById("vk-connect").onclick = function () {
      var b = this; b.disabled = true;
      api("admin.vk.connect", { clientId: client.value.trim() }).then(function (j) { location.href = j.url; })
        .catch(function (e) { b.disabled = false; alert(e.message); });
    };
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
  api("admin.vk").then(render).catch(function (e) { box.innerHTML = '<p class="muted">' + esc(e.message === "Сервер не ответил" ? e.message : "Войдите в админ-панель, чтобы настроить.") + "</p>"; });
})();
