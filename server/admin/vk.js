// «ВКонтакте: рецепт дня» in the admin panel: the community, the access key (never shown back), the hour, on/off,
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
    box.innerHTML = '<p class="muted">Раз в день сайт сам публикует в вашем сообществе «Рецепт дня» — то же блюдо, что в виджете, со ссылкой на рецепт. ВКонтакте сам покажет фото и название из ссылки.</p>'
      + '<div class="vk-form">'
      + '<label>Сообщество<input type="text" id="vk-group" placeholder="https://vk.com/ваше_сообщество" value=""></label>'
      + (s.group ? '<p class="muted" style="margin:-4px 0 0">Сейчас: <b>' + esc(s.groupName || ("club" + s.group)) + "</b> (vk.com/club" + s.group + ")</p>" : "")
      + '<label>Ключ доступа<input type="password" id="vk-token" placeholder="' + (s.hasToken ? "сохранён — вставьте новый, чтобы заменить" : "вставьте ключ") + '" autocomplete="off"></label>'
      + '<label>Публиковать после <select id="vk-hour">' + hours + "</select></label>"
      + '<label><input type="checkbox" id="vk-on"' + (s.on ? " checked" : "") + "> Публиковать каждый день</label>"
      + '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="primary" id="vk-save">Сохранить</button><button id="vk-now"' + (s.hasToken && s.group ? "" : " disabled") + ">Опубликовать сейчас (проверка)</button></div>"
      + last
      + '<details><summary class="muted">Где взять ключ доступа</summary><ol class="muted" style="font-size:14px">'
      + "<li>Откройте своё сообщество → «Управление» → «Дополнительно» → «Работа с API» → «Ключи доступа» → «Создать ключ».</li>"
      + "<li>Отметьте права «Стена» и «Фотографии», нажмите «Создать», подтвердите кодом.</li>"
      + "<li>Скопируйте ключ целиком и вставьте сюда, укажите ссылку на сообщество и нажмите «Сохранить».</li>"
      + "<li>Нажмите «Опубликовать сейчас»: если ВКонтакте не разрешит публикацию с этим ключом, здесь появится его ответ — пришлите его мне.</li>"
      + "</ol></details></div>";
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
