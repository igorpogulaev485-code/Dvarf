(function () {
  var C = window.CreationStep1;
  if (!C || !C.registerView) return;

  var READY_DESKTOP = "Ядро собрано. Дальше — цифровой лист: сверху бой, слева характеристики, по центру — атаки и заклинания. За стол сядете в лобби.";
  var READY_PHONE = "Ядро собрано. Дальше — цифровой лист: сверху бой и хиты, ниже — атаки и заклинания; характеристики открываются из шапки. За стол сядете в лобби.";

  function phone() {
    return document.documentElement.getAttribute("data-width") === "phone";
  }

  function showToast(text) {
    var phone = document.documentElement.getAttribute("data-width") === "phone";
    var onLobby = document.documentElement.getAttribute("data-page") === "lobby";
    var notice = document.querySelector("[data-lobby-notice]");
    var head = notice && notice.closest(".chars-head");
    var floating = document.querySelector("[data-create-toast]");
    var useNotice = phone && onLobby && notice;
    if (useNotice) {
      notice.hidden = !text;
      notice.textContent = text || "";
      if (head) head.classList.toggle("has-notice", !!text);
      if (floating) {
        floating.hidden = true;
        floating.textContent = "";
      }
      return;
    }
    if (notice) {
      notice.hidden = true;
      notice.textContent = "";
    }
    if (head) head.classList.remove("has-notice");
    if (!floating) return;
    floating.hidden = !text;
    floating.textContent = text || "";
  }

  function hideToast() { showToast(""); }

  function openReady(opts) {
    var body = document.querySelector("[data-ready-body]");
    if (body) body.textContent = phone() ? READY_PHONE : READY_DESKTOP;
    if (C.openAppDialog) C.openAppDialog("character-ready");
    if (opts && opts.toast) showToast(opts.toast);
  }

  var VIEWS = {
    "fin-leveling-ready": function () {
      hideToast();
      C.applyView("lvl-cleric-ready");
    },
    "fin-hard": function () {
      hideToast();
      C.applyView("lvl-fighter");
    },
    "fin-ready-bridge": function () {
      hideToast();
      if (C.setPage) C.setPage("chars");
      if (C.setCharsMode) C.setCharsMode("list");
      C.closeAllDialogs();
      openReady();
    },
    "fin-lobby-ok": function () {
      C.applyView("lobby-hub");
      showToast("Герой создан и добавлен в лобби");
    },
    "fin-lobby-noseat": function () {
      if (C.setPage) C.setPage("chars");
      if (C.setCharsMode) C.setCharsMode("list");
      C.closeAllDialogs();
      openReady({ toast: "Герой создан по правилам лобби (без посадки в состав)" });
    },
    "fin-conflict": function () {
      hideToast();
      C.applyView("lvl-cleric-ready");
      var err = document.querySelector("[data-create-error]");
      if (err) {
        err.hidden = false;
        err.innerHTML = "Персонаж был изменён в другой вкладке. Обновите страницу. " +
          '<button class="btn" type="button" data-fin-reload>Обновить страницу</button>';
        err.classList.add("create-pipeline__banner-error-row");
      }
    },
    "fin-draft-list": function () {
      hideToast();
      C.applyView("chars-draft");
    }
  };

  function applyFinish(name) {
    var fn = VIEWS[name];
    if (fn) fn();
  }

  Object.keys(VIEWS).forEach(function (name) {
    C.registerView(name, function () { applyFinish(name); });
  });

  var origSetWidth = C.setWidth;
  C.setWidth = function (width) {
    origSetWidth(width);
    var v = document.documentElement.getAttribute("data-view") || "";
    if (VIEWS[v]) applyFinish(v);
  };

  var q = new URLSearchParams(location.search);
  var bootView = q.get("view") || document.documentElement.getAttribute("data-view");
  if (bootView && VIEWS[bootView]) applyFinish(bootView);
})();
