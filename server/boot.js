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
  } catch (e) { /* private mode: defaults */ }
})();
