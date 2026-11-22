/* Утверждённый кубик C и дефолтные подложки L3/I2.
   Источники знака: DICE-ICON.md, sheet-desktop.html .ui-dice-fab__icon,
   sheet-mobile.html #ico-dice-prod, creation.html .fab-dice / .tab-fab.
   Подложки: CONCEPT.md §24, css/backgrounds.css — parchment / ink. */
(function (global) {
  const DICE_PATH = "M16 2.2 28.5 9v14L16 29.8 3.5 23V9L16 2.2zm0 2.5L6.2 10.1v11.8L16 27.3l9.8-5.4V10.1L16 4.7z";
  const DICE_SVG =
    '<svg class="ui-dice-fab__icon" viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">' +
    '<path fill="currentColor" d="' + DICE_PATH + '"/>' +
    '<circle cx="16" cy="16" r="2.2" fill="currentColor"/>' +
    '<circle cx="11.2" cy="12.2" r="1.4" fill="currentColor"/>' +
    '<circle cx="20.8" cy="12.2" r="1.4" fill="currentColor"/>' +
    '<circle cx="11.2" cy="19.8" r="1.4" fill="currentColor"/>' +
    '<circle cx="20.8" cy="19.8" r="1.4" fill="currentColor"/>' +
    "</svg>";

  function isDarkTheme(theme) {
    const t = theme || document.documentElement.getAttribute("data-theme") || "";
    return t === "leaf-classic" || t === "i2" || t === "dark";
  }

  function bgForTheme(theme) {
    return isDarkTheme(theme) ? "ink" : "parchment";
  }

  function applyBackground(theme) {
    const html = document.documentElement;
    const bg = bgForTheme(theme);
    html.setAttribute("data-bg", bg);
    return bg;
  }

  global.ApprovedShell = {
    DICE_PATH,
    DICE_SVG,
    bgForTheme,
    applyBackground,
  };
})(window);
