// Runs before the page is drawn: the chosen theme and text size, so the loading screen already looks right.
(function () {
  try {
    var p = JSON.parse(localStorage.getItem("cook-profile-v1") || "null") || {};
    var root = document.documentElement;
    var dark = p.theme === "dark" || (p.theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    root.setAttribute("data-theme", dark ? "dark" : p.theme === "contrast" ? "contrast" : "light");
    // «Оформление»: the colour set too (not in the contrast theme), so the first second is not in Шефли's colours.
    if (p.theme !== "contrast" && /^(clean|olive|sea|berry|graphite)$/.test(p.palette || "")) root.setAttribute("data-palette", p.palette);
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
