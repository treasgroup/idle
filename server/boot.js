// Runs before the page is drawn: the chosen theme and text size, so the loading screen already looks right.
(function () {
  try {
    var p = JSON.parse(localStorage.getItem("cook-profile-v1") || "null") || {};
    var root = document.documentElement;
    var dark = p.theme === "dark" || (p.theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    root.setAttribute("data-theme", dark ? "dark" : p.theme === "contrast" ? "contrast" : "light");
    if (p.textSize === "l" || p.simple) root.classList.add("large-text");
    if (p.textSize === "xl") root.classList.add("xl-text");
    if (p.simple) root.classList.add("simple-mode");
    // In the Android app the catalog links meant for search engines are not shown while it starts.
    if (window.CookNative) root.classList.add("in-app");
  } catch (e) { /* private mode: defaults */ }
})();
// First visit: the recipe list (the biggest download; its light part, without steps) starts together with the page
// instead of after the scripts.
// Later visits keep a saved copy and only ask whether it changed, so nothing is fetched here.
(function () {
  try {
    if (window.CookNative || localStorage.getItem("cook-catalog-saved")) return;
    var l = document.createElement("link");
    l.rel = "preload"; l.as = "fetch"; l.crossOrigin = "anonymous"; l.href = "./api/index.php?r=catalog&light=1";
    document.head.appendChild(l);
  } catch (e) { /* private mode: the page fetches it as before */ }
})();
// A first visit to the home page: its first big photo is «Рецепт дня», so the server is asked for the dish together
// with the page and its photo starts at once (Home.tsx takes this same answer instead of asking again).
(function () {
  try {
    if (window.CookNative || localStorage.getItem("cook-catalog-saved") || location.search || (location.hash && location.hash !== "#/")) return;
    var p = fetch("./api/index.php?r=today").then(function (r) { return r.ok ? r.json() : null; });
    window.__cookToday = p.catch(function () { return null; });
    p.then(function (j) {
      var m = j && /^[a-z0-9-]{1,60}$/.test(j.id || "") && /\?v=(\d{1,12})/.exec(j.photoFull || "");
      if (!m) return;
      var l = document.createElement("link");
      l.rel = "preload"; l.as = "image"; l.href = "./photos/" + j.id + ".jpg?v=" + m[1];
      l.setAttribute("fetchpriority", "high");
      document.head.appendChild(l);
    }).catch(function () { /* the page asks as before */ });
  } catch (e) { /* private mode: the page asks as before */ }
})();
// «Готовить по шагам» on a search page (?recipe=borsch&pv=<photo version>): the dish's big photo is what the person
// sees first, so it starts now — the same address the recipe page asks for, taken from the cache then.
(function () {
  try {
    var q = new URLSearchParams(location.search), id = q.get("recipe"), v = q.get("pv");
    if (!id || !v || !/^[a-z0-9-]{1,60}$/.test(id) || !/^\d{1,12}$/.test(v)) return;
    var l = document.createElement("link");
    l.rel = "preload"; l.as = "image"; l.href = "./photos/" + id + ".jpg?v=" + v;
    l.setAttribute("fetchpriority", "high");
    document.head.appendChild(l);
  } catch (e) { /* the page asks for it as before */ }
})();
