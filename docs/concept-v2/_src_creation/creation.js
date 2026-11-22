(function () {
  var FORK_COPY = {
    char: {
      kicker: "Зал летописей",
      titleNow: "Создать персонажа",
      leadNow: "Сейчас создаём по правилам D&D 5e 2014. Редакция 2024 скрыта, пока не откроем.",
      titleFork: "Какие правила берём?",
      leadFork: "Редакция фиксируется при создании.",
      d2014: "Создание, лист и стол по этой редакции.",
      d2024: "Новая редакция правил. Создание персонажа 2024."
    },
    lobby: {
      kicker: "Стол",
      titleNow: "Создать лобби",
      leadNow: "После создания вы — мастер этого лобби. Код и QR появятся на странице лобби. Редакция стола пока не выбирается: 2024 скрыта.",
      titleFork: "Какие правила у стола?",
      leadFork: "Редакция стола задаётся при создании. «Войти по коду» — если лобби уже есть.",
      d2014: "Стол по правилам 2014. Сеттинг и сессии — как сейчас.",
      d2024: "Стол по правилам 2024. Каталог и правила стола — под эту редакцию.",
      leadName: "После создания вы — мастер этого лобби. Код и QR появятся на странице лобби.",
      leadJoin: "Введите код, который прислал мастер."
    }
  };

  var root = document.documentElement;
  var forkOverlay = document.querySelector("[data-create-fork-overlay]");
  var forkKind = "char";
  var forkPicked = "2014";

  function params() {
    return new URLSearchParams(location.search);
  }
  function is2024Open() {
    return root.getAttribute("data-v2-2024") !== "hidden";
  }
  function setTheme(theme) {
    var dark = theme === "dark" || theme === "leaf-classic";
    root.setAttribute("data-theme", dark ? "leaf-classic" : "light-designer3");
    /* Same canvas underlay as the sheet / UI kit: parchment (L3) and ink (I2). */
    root.setAttribute("data-bg", dark ? "ink" : "parchment");
    var lightHref = "css/light-designer3.css";
    var darkHref = "css/designer.css";
    var link = document.querySelector("link[data-theme-sheet]");
    if (link) link.setAttribute("href", dark ? darkHref : lightHref);
    document.querySelectorAll("[data-set-theme]").forEach(function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-set-theme") === (dark ? "dark" : "light"));
    });
  }
  function setWidth(width) {
    var phone = width === "phone" || width === "390";
    root.setAttribute("data-width", phone ? "phone" : "desktop");
    document.querySelectorAll("[data-set-width]").forEach(function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-set-width") === (phone ? "phone" : "desktop"));
    });
  }
  function setEdition(mode) {
    var next = mode === "hidden" ? "hidden" : "open";
    root.setAttribute("data-v2-2024", next);
    document.querySelectorAll("[data-set-2024]").forEach(function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-set-2024") === next);
    });
  }
  function setPage(page) {
    root.setAttribute("data-page", page);
    document.querySelectorAll("[data-nav], [data-tab]").forEach(function (el) {
      var id = el.getAttribute("data-nav") || el.getAttribute("data-tab");
      var on = id === page || ((page === "chars" || page === "create") && id === "chars") || (page === "lobby" && id === "lobby");
      el.classList.toggle("is-active", on);
      if (on) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
    });
    var fab = document.querySelector(".fab-create");
    if (fab) {
      var label = page === "lobby" ? "Создать лобби" : "Создать персонажа";
      fab.setAttribute("aria-label", label);
      fab.setAttribute("title", label);
    }
    var chars = document.querySelector("[data-panel=chars]");
    var lobby = document.querySelector("[data-panel=lobby]");
    var create = document.querySelector("[data-panel=create]");
    if (chars) chars.hidden = page !== "chars";
    if (lobby) lobby.hidden = page !== "lobby";
    if (create) create.hidden = page !== "create";
  }
  function closeFork() {
    root.removeAttribute("data-create-fork");
    if (forkOverlay) {
      forkOverlay.hidden = true;
      forkOverlay.classList.remove("is-open");
    }
  }
  function setForkView(view) {
    if (!forkOverlay) return;
    forkOverlay.querySelectorAll("[data-fork-view]").forEach(function (el) {
      el.hidden = el.getAttribute("data-fork-view") !== view;
    });
  }
  function syncForkContent() {
    if (!forkOverlay) return;
    var copy = FORK_COPY[forkKind];
    var open = is2024Open();
    var kicker = forkOverlay.querySelector("[data-fork-kicker]");
    var title = forkOverlay.querySelector("[data-fork-title]");
    var lead = forkOverlay.querySelector("[data-fork-lead]");
    if (kicker) kicker.textContent = copy.kicker;
    var joinBtn = forkOverlay.querySelector("[data-fork-join]");
    if (joinBtn) joinBtn.hidden = !(open && forkKind === "lobby");
    var d2014 = forkOverlay.querySelector("[data-fork-desc=\"2014\"]");
    var d2024 = forkOverlay.querySelector("[data-fork-desc=\"2024\"]");
    if (d2014) d2014.textContent = copy.d2014;
    if (d2024) d2024.textContent = copy.d2024;
    if (!open) {
      if (title) title.textContent = copy.titleNow;
      if (lead) lead.textContent = copy.leadNow;
      if (forkKind === "lobby") {
        setForkView("lobby-name");
        var back = forkOverlay.querySelector("[data-fork-view=\"lobby-name\"] [data-fork-back]");
        if (back) back.hidden = true;
      } else {
        setForkView("char-now");
      }
    } else {
      if (title) title.textContent = copy.titleFork;
      if (lead) lead.textContent = copy.leadFork;
      setForkView("fork");
    }
  }
  function openFork(kind) {
    closeAllDialogs();
    if (root.getAttribute("data-auth") === "guest") return;
    forkKind = kind || (root.getAttribute("data-page") === "lobby" ? "lobby" : "char");
    root.setAttribute("data-create-fork", forkKind);
    if (forkOverlay) {
      forkOverlay.hidden = false;
      forkOverlay.classList.add("is-open");
    }
    syncForkContent();
  }
  function goCreate(ed) {
    forkPicked = ed;
    if (forkKind === "lobby") {
      var copy = FORK_COPY.lobby;
      var title = forkOverlay.querySelector("[data-fork-title]");
      var lead = forkOverlay.querySelector("[data-fork-lead]");
      if (title) {
        title.textContent = "";
        title.appendChild(document.createTextNode("Создать лобби ·"));
        title.appendChild(document.createElement("br"));
        title.appendChild(document.createTextNode(ed === "2024" ? "Правила 2024" : "Правила 2014 года"));
      }
      if (lead) lead.textContent = copy.leadName;
      setForkView("lobby-name");
      var back = forkOverlay.querySelector("[data-fork-view=\"lobby-name\"] [data-fork-back]");
      if (back) back.hidden = false;
      return;
    }
    closeFork();
  }
  function closeAppDialogs() {
    root.removeAttribute("data-app-dialog");
    document.querySelectorAll(".app-dialog-overlay").forEach(function (el) {
      el.removeAttribute("data-open");
      el.hidden = true;
    });
  }
  function openAppDialog(name) {
    closeFork();
    closeAppDialogs();
    var el = document.querySelector("[data-dialog=\"" + name + "\"]");
    if (!el) return;
    root.setAttribute("data-app-dialog", name);
    el.hidden = false;
    el.setAttribute("data-open", "");
  }
  function closeAllDialogs() {
    closeFork();
    closeAppDialogs();
  }
  function setCharsMode(mode) {
    /* list | empty | draft */
    var empty = document.querySelector("[data-chars-empty]");
    var grid = document.querySelector("[data-panel=chars] .char-grid");
    var filters = document.querySelector("[data-panel=chars] .character-list-filters");
    var toolbar = document.querySelector("[data-panel=chars] .chars-toolbar");
    var title = document.querySelector("[data-panel=chars] .t-heading");
    var sub = document.querySelector("[data-panel=chars] .t-sub");
    var draft = document.querySelector("[data-draft-card]");
    var isEmpty = mode === "empty";
    var isDraft = mode === "draft";
    if (empty) empty.hidden = !isEmpty;
    if (grid) grid.hidden = isEmpty;
    if (filters) filters.hidden = isEmpty;
    if (toolbar) toolbar.hidden = isEmpty;
    if (draft) draft.hidden = !isDraft;
    if (title) {
      title.textContent = isEmpty ? "Мои персонажи" : isDraft ? "Мои персонажи (5)" : "Мои персонажи (4)";
    }
    if (sub) {
      sub.textContent = isEmpty
        ? "Игорь Погуляев · 0 в списке"
        : isDraft
          ? "Игорь Погуляев · 5 в списке"
          : "Игорь Погуляев · 4 в списке";
    }
  }


  var STEP_LABELS = {
    race: "Раса",
    feat: "Черта",
    background: "Предыстория",
    class: "Класс",
    abilities: "Характеристики",
    leveling: "Прокачка"
  };
  var STEP_HINTS = {
    race: { what: "Кто ты по крови и народу.", why: "Даёт скорость, тёмное зрение, языки и особенности." },
    feat: { what: "Особое умение (черта).", why: "Только если раса даёт черту с 1 уровня." },
    background: { what: "Кем был до приключения.", why: "Навыки и владения «из прошлого»." },
    class: { what: "Чем занимаешься в партии.", why: "Хиты, спасброски, умения и стартовое снаряжение." },
    abilities: { what: "Шесть характеристик.", why: "База почти всех проверок и боя. Можно взять готовый массив." },
    leveling: { what: "Уровни и развилки роста.", why: "Нужно, если стартуешь не с 1 уровня." }
  };
  var CATALOG = {
    race: [
      ["dwarf", "Дварф", "Dwarf", "phb"],
      ["elf", "Эльф", "Elf", "phb"],
      ["halfling", "Полурослик", "Halfling", "phb"],
      ["human", "Человек", "Human", "phb"],
      ["dragonborn", "Драконорождённый", "Dragonborn", "phb"],
      ["gnome", "Гном", "Gnome", "phb"],
      ["half_elf", "Полуэльф", "Half-Elf", "phb"],
      ["half_orc", "Полуорк", "Half-Orc", "phb"],
      ["tiefling", "Тифлинг", "Tiefling", "phb"]
    ],
    feat: [
      ["artificer_initiate", "Посвящённый в изобретатели", "Artificer Initiate", "tce"],
      ["chef", "Шеф-повар", "Chef", "tce"],
      ["crusher", "Дробитель", "Crusher", "tce"],
      ["eldritch_adept", "Адепт тайных искусств", "Eldritch Adept", "tce"],
      ["fey_touched", "Отмеченный феями", "Fey Touched", "tce"],
      ["fighting_initiate", "Посвящённый в боевые стили", "Fighting Initiate", "tce"],
      ["gunner", "Стрелок", "Gunner", "tce"],
      ["metamagic_adept", "Адепт метамагии", "Metamagic Adept", "tce"]
    ],
    background: [
      ["acolyte", "Прислужник", "Acolyte", "phb"],
      ["charlatan", "Шарлатан", "Charlatan", "phb"],
      ["criminal", "Преступник", "Criminal", "phb"],
      ["entertainer", "Артист", "Entertainer", "phb"],
      ["folk_hero", "Народный герой", "Folk hero", "phb"],
      ["guild_artisan", "Гильдейский ремесленник", "Guild artisan", "phb"],
      ["hermit", "Отшельник", "Hermit", "phb"],
      ["noble", "Благородный", "Noble", "phb"],
      ["outlander", "Чужеземец", "Outlander", "phb"]
    ]
  };
  var STEPS5 = ["race", "background", "class", "abilities", "leveling"];
  var STEPS6 = ["race", "feat", "background", "class", "abilities", "leveling"];

  function sourceLabel(code) {
    /* Prod catalog cards print entry.source raw (phb, tce). Show the same book code in uppercase so it reads as a code, not a service slug. */
    return String(code || "").toUpperCase();
  }
  function emptyPickHint() {
    /* Prod empty-detail copy says "слева". On 390 the catalog is the stage, not a left column. */
    return root.getAttribute("data-width") === "phone"
      ? "Выберите карточку в списке."
      : "Выберите карточку слева.";
  }
  function catalogHtml(kind) {

    var rows = CATALOG[kind] || [];
    var items = rows.map(function (row) {
      return '<li><button class="create-pipeline__card" type="button" data-catalog-id="' + row[0] + '">' +
        '<span class="create-pipeline__card-title">' + row[1] + '</span>' +
        '<span class="create-pipeline__card-sub">' + row[2] + '</span>' +
        '<span class="create-pipeline__card-source">' + sourceLabel(row[3]) + '</span>' +
        '</button></li>';
    }).join("");
    return '<div class="create-pipeline__catalog-list">' +
      '<div class="create-pipeline__filters">' +
      '<label class="field-label" for="create-search">Поиск</label>' +
      '<input class="field" id="create-search" type="search" placeholder="Поиск по имени…" autocomplete="off" />' +
      '<button class="create-pipeline__source-toggle" type="button" aria-expanded="false">Источники <span aria-hidden="true">▾</span></button>' +
      '</div>' +
      '<ul class="create-pipeline__card-list">' + items + '</ul></div>';
  }

  function detailHtml(kind) {
    if (kind === "race") {
      return '<h2>Раса</h2>' +
        '<p class="t-muted">' + emptyPickHint() + '</p>' +
        '<p class="t-muted">Имя и пол укажешь в окне настройки расы.</p>' +
        '<button class="btn" type="button" disabled>Выбрать и настроить</button>';
    }
    if (kind === "feat") {
      return '<h2>Черта</h2>' +
        '<p class="t-muted">Раса даёт черту с 1 уровня — настрой её здесь (не в попапе расы).</p>' +
        '<button class="btn" type="button" disabled>Выбрать и настроить</button>';
    }
    if (kind === "background") {
      return '<h2>Предыстория</h2>' +
        '<p class="t-muted">' + emptyPickHint() + '</p>' +
        '<button class="btn" type="button" disabled>Выбрать и настроить</button>';
    }
    if (kind === "leveling") {
      return '<h2>Прокачка</h2>' +
        '<p class="t-muted">Уровни и развилки роста.</p>';
    }
    return '<h2>' + (STEP_LABELS[kind] || kind) + '</h2><p class="t-muted">' + emptyPickHint() + '</p>';
  }

  function footerRightHtml(kind, readyNext) {
    if (kind === "leveling") {
      return '<div class="create-pipeline__footer-actions">' +
        '<button class="btn" type="button">Сохранить черновик</button>' +
        '<button class="btn btn-accent" type="button">Готово</button>' +
        '</div>';
    }
    var labels = {
      race: "Настроить расу",
      feat: "Настроить черту",
      background: "Настроить предысторию",
      class: "Настроить класс",
      abilities: "Далее · Прокачка"
    };
    return '<button class="btn btn-accent" type="button" disabled>' + (labels[kind] || "Далее") + '</button>';
  }

  function isPhone() {
    return root.getAttribute("data-width") === "phone";
  }

  function syncStepRail() {
    var nav = document.querySelector("[data-create-steps]");
    if (!nav) return;
    var fadeR = document.querySelector("[data-steps-fade]");
    var fadeL = document.querySelector("[data-steps-fade-left]");
    var arrowR = document.querySelector("[data-steps-arrow]");
    var arrowL = document.querySelector("[data-steps-arrow-left]");
    if (!isPhone()) {
      if (fadeR) fadeR.hidden = true;
      if (fadeL) fadeL.hidden = true;
      if (arrowR) arrowR.hidden = true;
      if (arrowL) arrowL.hidden = true;
      return;
    }
    var max = Math.max(0, nav.scrollWidth - nav.clientWidth);
    var sl = nav.scrollLeft;
    var canL = sl > 2;
    var canR = sl < max - 2;
    if (fadeL) fadeL.hidden = !canL;
    if (arrowL) arrowL.hidden = !canL;
    if (fadeR) fadeR.hidden = !canR;
    if (arrowR) arrowR.hidden = !canR;
  }

  function hidePartialStepChips(nav) {
    var pad = 40;
    var box = nav.getBoundingClientRect();
    var leftEdge = box.left + pad;
    var rightEdge = box.right - pad;
    var steps = nav.querySelectorAll(".create-pipeline__step");
    var i, r;
    for (i = 0; i < steps.length; i++) {
      r = steps[i].getBoundingClientRect();
      if (r.right <= leftEdge + 1) continue;
      if (r.left < leftEdge - 1) {
        nav.scrollLeft += Math.ceil(r.right - leftEdge + 6);
      }
      break;
    }
    steps = nav.querySelectorAll(".create-pipeline__step");
    for (i = 0; i < steps.length; i++) {
      r = steps[i].getBoundingClientRect();
      var fully = r.left >= leftEdge - 2 && r.right <= rightEdge + 2;
      var off = r.right <= leftEdge + 2 || r.left >= rightEdge - 2;
      steps[i].style.visibility = (!fully && !off) ? "hidden" : "";
    }
  }

  function scrollActiveStep() {
    var nav = document.querySelector("[data-create-steps]");
    if (!nav || !isPhone()) return;
    var active = nav.querySelector(".create-pipeline__step--active");
    if (!active) { syncStepRail(); return; }
    var first = nav.firstElementChild;
    var last = nav.lastElementChild;
    if (active === last) {
      nav.scrollLeft = nav.scrollWidth;
    } else if (active === first) {
      nav.scrollLeft = 0;
    } else {
      var midNav = nav.getBoundingClientRect();
      var midBtn = active.getBoundingClientRect();
      nav.scrollLeft += (midBtn.left + midBtn.right) / 2 - (midNav.left + midNav.right) / 2;
    }
    hidePartialStepChips(nav);
    syncStepRail();
  }

  function bindStepRailOnce() {
    if (root.getAttribute("data-step-rail-bound") === "1") return;
    root.setAttribute("data-step-rail-bound", "1");
    document.addEventListener("click", function (e) {
      var nav = document.querySelector("[data-create-steps]");
      if (!nav) return;
      if (e.target.closest("[data-steps-arrow]")) nav.scrollBy({ left: 140, behavior: "smooth" });
      if (e.target.closest("[data-steps-arrow-left]")) nav.scrollBy({ left: -140, behavior: "smooth" });
    });
    document.addEventListener("scroll", function (e) {
      if (e.target && e.target.getAttribute && e.target.getAttribute("data-create-steps") !== null) syncStepRail();
    }, true);
    document.addEventListener("focusin", function (e) {
      if (!isPhone()) return;
      var el = e.target;
      if (!el || (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA")) return;
      requestAnimationFrame(function () {
        el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      });
    });
  }

  function renderPipeline(opts) {

    closeAllDialogs();
    setEdition("open");
    setPage("create");
    var rulesEd = opts.rulesEdition === "2024" ? "2024" : "2014";
    root.setAttribute("data-rules", rulesEd);
    var labels = opts.labels || STEP_LABELS;
    var hints = opts.hints || STEP_HINTS;
    var steps = opts.steps || STEPS5;
    var current = opts.step || "race";
    var idx = steps.indexOf(current);
    if (idx < 0) idx = 0;
    var total = steps.length;
    var num = idx + 1;
    var pct = Math.round((num / Math.max(1, total)) * 100);
    var shell = document.querySelector("[data-create-shell]");
    if (shell) {
      shell.classList.toggle("create-pipeline--detail-primary", current === "abilities" || current === "leveling");
    }
    var kicker = document.querySelector("[data-create-kicker]");
    if (kicker) {
      if (rulesEd === "2024") {
        kicker.textContent = opts.lobby ? "Создание для лобби · Правила 2024 года" : "Создание · Правила 2024 года";
      } else {
        kicker.textContent = opts.lobby ? "Создание для лобби · Правила 2014 года" : "Создание · Правила 2014 года";
      }
    }
    var subEl = document.querySelector(".create-pipeline__subtitle");
    if (subEl) {
      if (rulesEd === "2024") {
        subEl.hidden = true;
      } else {
        subEl.hidden = false;
        subEl.textContent = opts.subtitle || "Раса → черта* → предыстория → класс → характеристики → прокачка";
      }
    }
    var edHint = document.querySelector(".create-pipeline__topbar .onboarding-edition-hint");
    if (edHint) {
      /* 2024 uses the same short line as 2014; do not inject the long edition paragraph. */
      edHint.textContent = "Редакция фиксируется при создании.";
    }
    var diffBtn = document.querySelector("[data-edition-diff-reopen]");
    if (!diffBtn) {
      var topbar = document.querySelector(".create-pipeline__topbar");
      if (topbar) {
        diffBtn = document.createElement("button");
        diffBtn.type = "button";
        diffBtn.className = "btn tags-ghost";
        diffBtn.setAttribute("data-edition-diff-reopen", "");
        diffBtn.textContent = "Отличия 2024";
        topbar.appendChild(diffBtn);
        diffBtn.addEventListener("click", function () {
          if (typeof window.openEdition2024Diff === "function") window.openEdition2024Diff();
        });
      }
    }
    if (diffBtn) diffBtn.hidden = rulesEd !== "2024";
    var rules = document.querySelector("[data-start-rules]");
    if (rules) rules.hidden = !opts.lobby;
    var err = document.querySelector("[data-create-error]");
    if (err) {
      err.hidden = !opts.error;
      if (opts.error) err.textContent = opts.error;
    }
    var hint = hints[current];
    var what = document.querySelector("[data-hint-what]");
    var why = document.querySelector("[data-hint-why]");
    var hintBox = document.querySelector("[data-step-hint]");
    if (what && hint) what.textContent = hint.what;
    if (why && hint) why.textContent = hint.why;
    if (hintBox) hintBox.hidden = !hint;
    var pl = document.querySelector("[data-progress-label]");
    var pp = document.querySelector("[data-progress-pct]");
    var fill = document.querySelector("[data-progress-fill]");
    var bar = document.querySelector(".create-pipeline__progress-bar");
    var fp = document.querySelector("[data-footer-progress]");
    var label = "Шаг " + num + " из " + total;
    if (pl) pl.textContent = label;
    if (pp) pp.textContent = pct + "%";
    if (fp) fp.textContent = label;
    if (fill) fill.style.width = pct + "%";
    if (bar) {
      bar.setAttribute("aria-valuenow", String(pct));
      bar.setAttribute("aria-valuetext", pct + " процентов");
    }
    var nav = document.querySelector("[data-create-steps]");
    if (nav) {
      nav.innerHTML = steps.map(function (id, i) {
        var cls = "create-pipeline__step";
        if (i === idx) cls += " create-pipeline__step--active";
        else if (i < idx) cls += " create-pipeline__step--done";
        else cls += " create-pipeline__step--locked";
        return '<button type="button" class="' + cls + '"' + (i > idx ? " disabled" : "") + '>' +
          '<span class="create-pipeline__step-index">' + (i + 1) + '</span>' +
          '<span class="create-pipeline__step-label">' + (labels[id] || STEP_LABELS[id] || id) + '</span></button>';
      }).join("");
    }
    if (!opts.skipDefaultCatalog) {
      var cards = document.querySelector("[data-create-cards]");
      if (cards) {
        cards.innerHTML = (current === "leveling" || current === "abilities")
          ? ""
          : catalogHtml(current === "feat" ? "feat" : current === "background" ? "background" : "race");
      }
      var detail = document.querySelector("[data-create-detail]");
      if (detail) detail.innerHTML = detailHtml(current);
      var right = document.querySelector("[data-create-footer-right]");
      if (right) right.innerHTML = footerRightHtml(current);
    }
    bindStepRailOnce();
    requestAnimationFrame(function () {
      scrollActiveStep();
      setTimeout(scrollActiveStep, 60);
    });
    if (opts.summary) openAppDialog("pipeline-summary");
    var sheet = document.querySelector("[data-summary-body]");
    if (sheet) sheet.innerHTML = detailHtml(current);
  }

  var VIEWS = {
    "fork-char-open": function () {
      setEdition("open"); setPage("chars"); setCharsMode("list"); closeAppDialogs(); openFork("char");
    },
    "fork-char-now": function () {
      setEdition("hidden"); setPage("chars"); setCharsMode("list"); closeAppDialogs(); openFork("char");
    },
    "fork-lobby-open": function () {
      setEdition("open"); setPage("lobby"); setCharsMode("list"); closeAppDialogs(); openFork("lobby");
    },
    "fork-lobby-join": function () {
      setEdition("open"); setPage("lobby"); closeAppDialogs(); openFork("lobby");
      var title = forkOverlay.querySelector("[data-fork-title]");
      var lead = forkOverlay.querySelector("[data-fork-lead]");
      if (title) title.textContent = "Войти по коду";
      if (lead) lead.textContent = FORK_COPY.lobby.leadJoin;
      setForkView("lobby-join");
    },
    "fork-lobby-name": function () {
      setEdition("open"); setPage("lobby"); closeAppDialogs(); openFork("lobby");
      goCreate("2014");
    },
    "chars-empty": function () {
      setEdition("open"); setPage("chars"); setCharsMode("empty"); closeAllDialogs();
    },
    "chars-draft": function () {
      setEdition("open"); setPage("chars"); setCharsMode("draft"); closeAllDialogs();
    },
    "join-create-hero": function () {
      setEdition("open"); setPage("chars"); setCharsMode("list"); closeFork();
      syncJoinDialog("hero");
      openAppDialog("join-lobby");
    },
    "join-copy": function () {
      setEdition("open"); setPage("chars"); setCharsMode("list"); closeFork();
      syncJoinDialog("copy");
      openAppDialog("join-lobby");
    },
    "join-mismatch": function () {
      setEdition("open"); setPage("chars"); setCharsMode("list"); closeFork();
      syncJoinDialog("mismatch");
      openAppDialog("join-lobby");
    },
    "welcome": function () {
      setEdition("open"); setPage("chars"); setCharsMode("list"); closeFork();
      openAppDialog("welcome");
    },
    "shell-race-empty": function () {
      renderPipeline({ step: "race", steps: STEPS5 });
    },
    "shell-feat-visible": function () {
      renderPipeline({ step: "feat", steps: STEPS6 });
    },
    "shell-background-no-feat": function () {
      renderPipeline({ step: "background", steps: STEPS5 });
    },
    "shell-lobby": function () {
      renderPipeline({ step: "race", steps: STEPS5, lobby: true });
    },
    "shell-leveling-draft": function () {
      renderPipeline({ step: "leveling", steps: STEPS5 });
    },
    "shell-error": function () {
      renderPipeline({ step: "race", steps: STEPS5, error: "Черновик не найден" });
    },
    "shell-summary": function () {
      renderPipeline({
        step: "background",
        steps: STEPS5,
        summary: root.getAttribute("data-width") === "phone"
      });
    },
    "lobby-hub": function () {
      setEdition("open"); setPage("lobby"); closeAllDialogs();
    }
  };

  function syncJoinDialog(mode) {
    var box = document.querySelector("[data-dialog=join-lobby]");
    if (!box) return;
    box.querySelectorAll("[data-join-mode]").forEach(function (el) {
      el.hidden = el.getAttribute("data-join-mode") !== mode && el.getAttribute("data-join-mode") !== "always";
    });
    /* blocks that appear in several modes */
    var hero = box.querySelector("[data-join-hero]");
    var conflict = box.querySelector("[data-join-conflict]");
    var mismatch = box.querySelector("[data-join-mismatch]");
    var lobbyName = box.querySelector("[data-join-lobby-name]");
    var primary = box.querySelector("[data-join-primary]");
    if (hero) hero.hidden = mode !== "hero";
    if (conflict) conflict.hidden = mode !== "copy";
    if (mismatch) mismatch.hidden = mode !== "mismatch";
    if (lobbyName) lobbyName.hidden = mode === "mismatch" ? false : mode !== "hero";
    if (primary) {
      primary.textContent = mode === "copy" ? "Перевести сюда" : "Добавить этого персонажа";
    }
    var input = box.querySelector("[name=code]");
    if (input) input.value = mode === "mismatch" || mode === "hero" || mode === "copy" ? "ABC123" : "";
  }

  function applyView(name) {
    var fn = VIEWS[name] || VIEWS["fork-char-open"];
    root.setAttribute("data-view", name);
    fn();
    document.querySelectorAll("[data-set-view]").forEach(function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-set-view") === name);
    });
  }

  function registerView(name, fn) {
    VIEWS[name] = fn;
    if (window.CreationStep1) window.CreationStep1.views = Object.keys(VIEWS);
  }

  window.CreationStep1 = {
    applyView: applyView,
    registerView: registerView,
    renderPipeline: renderPipeline,
    emptyPickHint: emptyPickHint,
    sourceLabel: sourceLabel,
    setTheme: setTheme,
    setWidth: setWidth,
    setEdition: setEdition,
    openFork: openFork,
    closeAllDialogs: closeAllDialogs,
    openAppDialog: openAppDialog,
    setPage: setPage,
    setCharsMode: setCharsMode,
    views: Object.keys(VIEWS)
  };

  /* boot from query */
  var q = params();
  if (q.get("shot") === "1") root.setAttribute("data-shot", "1");
  setTheme(q.get("theme") || "light");
  setWidth(q.get("width") || "desktop");
  setEdition(q.get("edition") || "open");
  applyView(q.get("view") || "fork-char-open");

  document.querySelectorAll("[data-set-theme]").forEach(function (b) {
    b.addEventListener("click", function () { setTheme(b.getAttribute("data-set-theme")); });
  });
  document.querySelectorAll("[data-set-width]").forEach(function (b) {
    b.addEventListener("click", function () { setWidth(b.getAttribute("data-set-width")); });
  });
  document.querySelectorAll("[data-set-2024]").forEach(function (b) {
    b.addEventListener("click", function () {
      setEdition(b.getAttribute("data-set-2024"));
      if (root.hasAttribute("data-create-fork")) syncForkContent();
    });
  });
  document.querySelectorAll("[data-set-view]").forEach(function (b) {
    b.addEventListener("click", function () { applyView(b.getAttribute("data-set-view")); });
  });
  document.querySelectorAll("[data-nav], [data-tab]").forEach(function (el) {
    el.addEventListener("click", function () {
      var id = el.getAttribute("data-nav") || el.getAttribute("data-tab");
      if (id === "chars" || id === "lobby") {
        closeAllDialogs();
        setPage(id);
        setCharsMode("list");
      }
    });
  });
  var fab = document.querySelector(".fab-create");
  if (fab) fab.addEventListener("click", function () {
    openFork(root.getAttribute("data-page") === "lobby" ? "lobby" : "char");
  });
  if (forkOverlay) {
    forkOverlay.addEventListener("click", function (e) {
      if (e.target === forkOverlay) closeFork();
    });
    var closeBtn = forkOverlay.querySelector("[data-fork-close]");
    if (closeBtn) closeBtn.addEventListener("click", closeFork);
    var startBtn = forkOverlay.querySelector("[data-fork-start-2014]");
    if (startBtn) startBtn.addEventListener("click", function () { goCreate("2014"); });
    forkOverlay.querySelectorAll("[data-fork-pick]").forEach(function (card) {
      card.addEventListener("click", function () {
        goCreate(card.getAttribute("data-fork-pick"));
      });
    });
    var joinBtn = forkOverlay.querySelector("[data-fork-join]");
    if (joinBtn) joinBtn.addEventListener("click", function () {
      var title = forkOverlay.querySelector("[data-fork-title]");
      var lead = forkOverlay.querySelector("[data-fork-lead]");
      if (title) title.textContent = "Войти по коду";
      if (lead) lead.textContent = FORK_COPY.lobby.leadJoin;
      setForkView("lobby-join");
    });
    forkOverlay.querySelectorAll("[data-fork-back]").forEach(function (btn) {
      btn.addEventListener("click", function () { syncForkContent(); });
    });
    var nameForm = forkOverlay.querySelector("[data-fork-view=\"lobby-name\"]");
    if (nameForm) nameForm.addEventListener("submit", function (e) { e.preventDefault(); closeFork(); });
    var joinForm = forkOverlay.querySelector("[data-fork-view=\"lobby-join\"]");
    if (joinForm) joinForm.addEventListener("submit", function (e) { e.preventDefault(); closeFork(); });
  }
  document.querySelectorAll("[data-dialog-close]").forEach(function (b) {
    b.addEventListener("click", closeAppDialogs);
  });
  document.querySelectorAll(".app-dialog-overlay").forEach(function (el) {
    el.addEventListener("click", function (e) {
      if (e.target === el) closeAppDialogs();
    });
  });
  var backList = document.querySelector("[data-create-back-list]");
  if (backList) backList.addEventListener("click", function () {
    closeAllDialogs();
    setPage("chars");
    setCharsMode("list");
  });
  var backStep = document.querySelector("[data-create-back]");
  if (backStep) backStep.addEventListener("click", function () {
    closeAllDialogs();
    setPage("chars");
    setCharsMode("list");
  });
  var sumBtn = document.querySelector("[data-create-summary]");
  if (sumBtn) sumBtn.addEventListener("click", function () { openAppDialog("pipeline-summary"); });
})();
