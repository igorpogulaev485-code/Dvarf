(function () {
  var C = window.CreationStep1;
  var DATA = window.CATALOG_2024;
  if (!C || !C.registerView || !DATA) return;

  var LABELS = {
    species: "Вид", feat: "Черта", background: "Предыстория",
    class: "Класс", abilities: "Характеристики", leveling: "Прокачка"
  };
  var HINTS = {
    species: { what: "Кто ты по крови и народу.", why: "В 2024 это вид: размер, особенности, иногда родословная или наследие." },
    feat: { what: "Черта происхождения.", why: "Человек «Гибкий» даёт дополнительную черту происхождения на 1 уровне." },
    background: { what: "Кем был до приключения.", why: "Навыки, снаряжение, черта происхождения и увеличение характеристик." },
    class: { what: "Чем занимаешься в партии.", why: "Хиты, спасброски, умения, снаряжение и, если класс даёт, оружейное мастерство." },
    abilities: { what: "Шесть характеристик.", why: "База почти всех проверок и боя. Можно взять готовый массив." },
    leveling: { what: "Уровни и развилки роста.", why: "Нужно, если стартуешь не с 1 уровня." }
  };
  var DIFF = {
    title: "Что меняется в D&D 2024",
    lead: "Коротко про отличия от классики 2014. Редакция персонажа и лобби фиксируется при создании.",
    items: [
      { title: "Вид вместо расы", body: "В 2024 говорим «вид», а не «раса». Предыстория даёт черту происхождения вместе с навыками и снаряжением." },
      { title: "Героическое вдохновение", body: "Это не бардовское вдохновение и не преимущество 2014: один переброс (или передача союзнику), лимит один." },
      { title: "Истощение 2024", body: "За уровень: −2 к броскам к20 и −5 фт скорости (вместо таблицы штрафов 2014)." },
      { title: "Отдых", body: "Длинный отдых восстанавливает все кости хитов; нужно ≥1 текущий хит; пауза между длинными — 16 часов." },
      { title: "Мастерство оружия", body: "Если класс даёт мастерство — выбираете свойства оружия и применяете их в бою (Попадание / Промах и др.)." },
      { title: "Неожиданность", body: "В 2024 это помеха к инициативе, а не отдельный «раунд внезапности» как в правилах 2014." }
    ]
  };
  var SKILL = DATA.skill_labels || {};
  var AB = DATA.ability_labels || {};
  var SIZE = DATA.size_labels || {};
  var MASTERY = DATA.mastery_labels || {};
  var GENDERS = [
    { id: "male", label: "Мужской" },
    { id: "female", label: "Женский" },
    { id: "none", label: "Не указан" }
  ];
  var SCHOOL_FALLBACK = {
    evocation: "воплощение", conjuration: "вызов", abjuration: "ограждение",
    transmutation: "преобразование", divination: "прорицание", enchantment: "очарование",
    illusion: "иллюзия", necromancy: "некромантия"
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function bySlug(list, slug) {
    if (!list) return null;
    for (var i = 0; i < list.length; i++) if (list[i].slug === slug) return list[i];
    return null;
  }
  function bookLabel(src) {
    if (!src) return "";
    var s = String(src).toLowerCase();
    if (s === "srd-5.2" || s === "ph24" || s === "srd") return "PH24";
    return String(src).toUpperCase();
  }
  function schoolName(sp) {
    if (!sp) return "";
    if (sp.school_ru) return String(sp.school_ru).toLowerCase();
    return SCHOOL_FALLBACK[sp.school] || sp.school || "";
  }
  function circleMeta(sp) {
    var sch = schoolName(sp);
    if (Number(sp.level) === 0) return sch ? "Заговор · " + sch : "Заговор";
    return (sp.level || 1) + " круг" + (sch ? " · " + sch : "");
  }
  function stepsFor(speciesSlug) {
    var sp = bySlug(DATA.species, speciesSlug);
    return (sp && sp.origin_feat_choice)
      ? ["species", "feat", "background", "class", "abilities", "leveling"]
      : ["species", "background", "class", "abilities", "leveling"];
  }
  function nextLabel(step, steps) {
    var i = steps.indexOf(step);
    if (i < 0 || i >= steps.length - 1) return "Готово";
    return "Далее · " + LABELS[steps[i + 1]];
  }
  function chip(label, on, attrs, extraClass) {
    return '<button class="seg' + (on ? " is-on" : "") + (extraClass ? " " + extraClass : "") +
      '" type="button"' + (attrs || "") + ">" + esc(label) + "</button>";
  }
  function issuesHtml(lines) {
    if (!lines || !lines.length) return "";
    return '<p class="t-muted" role="status"><strong>Осталось выбрать:</strong> ' +
      lines.map(esc).join("; ") + ".</p>";
  }
  function catalogCards(items, selected, metaFn) {
    var sources = [];
    var seen = {};
    items.forEach(function (it) {
      var lab = bookLabel(it.source);
      if (lab && !seen[lab]) { seen[lab] = 1; sources.push(lab); }
    });
    var sourceChips = chip("Все", true) + sources.map(function (s) { return chip(s, false); }).join("");
    var cards = items.map(function (it) {
      var on = it.slug === selected;
      var meta = metaFn ? metaFn(it) : "";
      return '<li><button class="create-pipeline__card' + (on ? " is-selected" : "") +
        '" type="button"' + (on ? ' aria-pressed="true"' : "") + ">" +
        '<span class="create-pipeline__card-title">' + esc(it.name_ru) + "</span>" +
        (it.name_en ? '<span class="create-pipeline__card-sub">' + esc(it.name_en) + "</span>" : "") +
        (meta ? '<span class="create-pipeline__card-meta">' + esc(meta) + "</span>" : "") +
        (it.source ? '<span class="create-pipeline__card-source">' + esc(bookLabel(it.source)) + "</span>" : "") +
        "</button></li>";
    }).join("");
    return '<div class="create-pipeline__catalog-list">' +
      '<div class="create-pipeline__filters">' +
      '<label class="field-label" for="create-search">Поиск</label>' +
      '<input class="field" id="create-search" type="search" placeholder="Поиск по имени…" autocomplete="off" />' +
      '<p class="field-label">Источники</p>' +
      '<div class="race-chip-row">' + sourceChips + "</div></div>" +
      '<ul class="create-pipeline__card-list">' + cards + "</ul></div>";
  }
  function footer(step, steps, canNext, last) {
    var right = document.querySelector("[data-create-footer-right]");
    if (!right) return;
    if (last) {
      right.innerHTML = '<div class="lv-footer-actions">' +
        '<button class="btn" type="button">Сохранить черновик</button>' +
        '<button class="btn btn-accent" type="button"' + (canNext ? "" : " disabled") + ">Готово</button></div>";
    } else {
      right.innerHTML = '<button class="btn' + (canNext ? " btn-accent" : "") + '" type="button"' +
        (canNext ? "" : " disabled") + ">" + esc(nextLabel(step, steps)) + "</button>";
    }
  }
  function scrollSelectedCard() {
    var selected = document.querySelector(".create-pipeline__card.is-selected");
    var pane = document.querySelector("[data-create-cards]");
    if (!selected || !pane) return;
    requestAnimationFrame(function () {
      var pad = 8;
      var pr = pane.getBoundingClientRect();
      var cr = selected.getBoundingClientRect();
      if (cr.bottom > pr.bottom - pad) pane.scrollTop += cr.bottom - (pr.bottom - pad);
      pr = pane.getBoundingClientRect();
      cr = selected.getBoundingClientRect();
      if (cr.top < pr.top + pad) pane.scrollTop += cr.top - (pr.top + pad);
      var filters = pane.querySelector(".create-pipeline__filters");
      if (!filters) return;
      var fr = filters.getBoundingClientRect();
      pr = pane.getBoundingClientRect();
      if (fr.top < pr.top - 2 && fr.bottom > pr.top + 2) {
        pane.scrollTop += fr.bottom - pr.top + 6;
      }
    });
  }

  function isPhone() {
    return document.documentElement.getAttribute("data-width") === "phone";
  }
  function setPhonePrimary(on) {
    var shellEl = document.querySelector("[data-create-shell]");
    if (!shellEl) return;
    var phone = isPhone();
    if (phone) shellEl.classList.toggle("create-pipeline--detail-primary", !!on);
  }
  function backLink(label) {
    if (!isPhone() || !label) return "";
    return '<button class="race-back" type="button">← ' + esc(label) + "</button>";
  }
  function afterDetail(selected, backLabel) {
    setPhonePrimary(!!selected);
    var detail = document.querySelector("[data-create-detail]");
    if (detail && selected && backLabel && isPhone() && !detail.querySelector(".race-back")) {
      detail.insertAdjacentHTML("afterbegin", backLink(backLabel));
    }
    var sheet = document.querySelector("[data-summary-body]");
    if (sheet && detail) sheet.innerHTML = detail.innerHTML;
  }
  function stripHtml(name, hp, remain) {
    return '<div class="lv-strip"><span class="lv-strip__who">' + esc(name) +
      "</span><span>хиты " + esc(hp) + "</span><span>мастерство +2</span><span" +
      (remain ? ' class="is-need"' : "") + ">Осталось: " + remain + "</span></div>";
  }

  function identityHtml(st) {
    var genderBtns = GENDERS.map(function (g) {
      return chip(g.label, st.gender === g.id);
    }).join("");
    var genLabel = st.gender ? "Сгенерировать имя" : "Сначала укажите пол";
    return '<div class="race-setup__section"><h3>Имя персонажа</h3>' +
      '<div class="race-ident__name"><input class="field" id="c24-name" type="text" placeholder="Как зовут героя?" value="' +
      esc(st.name || "") + '" />' +
      '<button class="seg" type="button"' + (st.gender ? "" : " disabled") + ">" + esc(genLabel) + "</button></div></div>" +
      '<div class="race-setup__section"><h3>Пол персонажа</h3><div class="race-chip-row" role="group" aria-label="Пол персонажа">' +
      genderBtns + "</div></div>";
  }
  function fillDiffDialog() {
    var lead = document.querySelector("[data-edition-diff-lead]");
    var list = document.querySelector("[data-edition-diff-items]");
    var title = document.getElementById("edition-2024-diff-title");
    if (title) title.textContent = DIFF.title;
    if (lead) lead.textContent = DIFF.lead;
    if (list) {
      list.innerHTML = DIFF.items.map(function (it) {
        return "<li><strong>" + esc(it.title) + "</strong> " + esc(it.body) + "</li>";
      }).join("");
    }
  }
  function openDiff() {
    fillDiffDialog();
    if (C.openAppDialog) C.openAppDialog("edition-2024-diff");
  }
  window.openEdition2024Diff = openDiff;

  function shell(opts) {
    var steps = opts.steps || stepsFor(opts.species);
    C.renderPipeline({
      rulesEdition: "2024",
      step: opts.step,
      steps: steps,
      labels: LABELS,
      hints: HINTS,
      lobby: !!opts.lobby,
      skipDefaultCatalog: true
    });
    if (opts.lobby) {
      var rules = document.querySelector("[data-start-rules]");
      if (rules) {
        rules.hidden = false;
        rules.innerHTML =
          "<li>Стартовый уровень: 3</li>" +
          "<li>Характеристики: покупка очков</li>" +
          "<li>Книги: Книга игрока</li>" +
          "<li>Стартовый набор: снаряжение класса</li>";
      }
    }
  }

  function renderSpecies(view) {
    var human = view.indexOf("human") >= 0;
    var st = {
      name: human ? "Каэлен" : "",
      gender: human ? "male" : null,
      size: human ? "medium" : null,
      skill: human ? "persuasion" : null
    };
    var steps = stepsFor(human ? "human" : null);
    shell({ step: "species", steps: steps, species: human ? "human" : null });
    var issues = [];
    if (!human) issues.push("Выберите вид");
    if (!st.name) issues.push("Введите имя персонажа");
    if (!st.gender) issues.push("Выберите пол персонажа");
    var cards = document.querySelector("[data-create-cards]");
    if (cards) {
      cards.innerHTML = catalogCards(DATA.species, human ? "human" : null, function (it) {
        return (it.size_options || []).map(function (id) { return SIZE[id] || id; }).join(" / ");
      });
    }
    var sp = human ? bySlug(DATA.species, "human") : null;
    var detail = document.querySelector("[data-create-detail]");
    var body = '<div class="race-setup">';
    body += identityHtml(st);
    if (!sp) {
      body += "<h2>Вид</h2><p class=\"t-muted\">" + esc(C.emptyPickHint()) + "</p>";
    } else {
      body += '<div class="race-setup__head"><h2>' + esc(sp.name_ru) + "</h2>" +
        (sp.name_en ? '<p class="race-setup__en">' + esc(sp.name_en) + "</p>" : "") +
        '<p class="race-setup__source">Источник: ' + esc(bookLabel(sp.source)) + "</p></div>";
      var traitsP = '<p class="t-muted">' + esc(sp.traits_text) + "</p>";
      var sizeBlock = '<div class="race-setup__section"><h3>Размер</h3><div class="race-chip-row">' +
        (sp.size_options || []).map(function (id) { return chip(SIZE[id] || id, st.size === id); }).join("") +
        "</div></div>";
      var skillBlock = "";
      if (human) {
        skillBlock = '<div class="race-setup__section"><h3>Умелый: владение одним навыком</h3><div class="race-chip-row">' +
          ["athletics", "insight", "persuasion", "stealth", "survival"].map(function (id) {
            return chip(SKILL[id] || id, st.skill === id);
          }).join("") + "</div>" +
          '<p class="t-muted">Гибкий: на следующем шаге выберите черту происхождения.</p></div>';
      }
      if (isPhone()) body += sizeBlock + skillBlock + traitsP;
      else body += traitsP + sizeBlock + skillBlock;
    }
    body += issuesHtml(issues) + "</div>";
    if (detail) detail.innerHTML = body;
    footer("species", steps, issues.length === 0, false);
    afterDetail(human, "К списку видов");
    scrollSelectedCard();
  }

  function renderFeat() {
    var steps = stepsFor("human");
    shell({ step: "feat", steps: steps, species: "human" });
    var feats = DATA.feats || [];
    var selected = "skilled";
    var cur = bySlug(feats, selected);
    var cards = document.querySelector("[data-create-cards]");
    if (cards) cards.innerHTML = catalogCards(feats, selected, function () { return "черта происхождения"; });
    var detail = document.querySelector("[data-create-detail]");
    var body = '<div class="race-setup">';
    body += '<div class="race-setup__head"><h2>' + esc(cur ? cur.name_ru : "Черта происхождения") + "</h2>" +
      (cur && cur.source ? '<p class="race-setup__source">Источник: ' + esc(bookLabel(cur.source)) + "</p>" : "") + "</div>";
    body += '<p class="t-muted">Человек «Гибкий»: выберите дополнительную черту происхождения. Она не должна совпадать с чертой предыстории.</p>';
    if (cur && cur.text) body += "<p>" + esc(cur.text) + "</p>";
    body += "</div>";
    if (detail) detail.innerHTML = body;
    footer("feat", steps, !!cur, false);
    afterDetail(!!cur, "К списку черт");
    scrollSelectedCard();
  }

  function renderBg() {
    var steps = stepsFor("human");
    shell({ step: "background", steps: steps, species: "human" });
    var bg = bySlug(DATA.backgrounds, "soldier");
    var cards = document.querySelector("[data-create-cards]");
    if (cards) {
      cards.innerHTML = catalogCards(DATA.backgrounds, "soldier", function (it) {
        return (it.skill_labels || []).join(", ");
      });
    }
    var trio = (bg.asi && bg.asi.abilities) || ["str", "dex", "con"];
    var mode = "+2/+1";
    var plus2 = "str", plus1 = "con";
    var feat = bg.origin_feat || {};
    var eq = bg.equipment_or_gold || {};
    var body = '<div class="race-setup bg-setup">';
    body += '<div class="race-setup__head"><h2>' + esc(bg.name_ru) + "</h2>" +
      (bg.name_en ? '<p class="race-setup__en">' + esc(bg.name_en) + "</p>" : "") +
      '<p class="race-setup__source">Источник: ' + esc(bookLabel(bg.source)) + "</p></div>";
    body += '<p class="t-muted">Черта происхождения, увеличение характеристик и снаряжение — из этой предыстории. Смена предыстории отзовёт пакет.</p>';
    var skillLine = (bg.skill_labels || []).join(", ");
    if (skillLine) {
      body += '<p class="bg-fixed"><strong>Навыки:</strong> ' + esc(skillLine) + "</p>";
    }
    body += '<div class="race-setup__section"><h3>Увеличение характеристик</h3>' +
      '<div class="race-chip-row">' + chip("+2 / +1", mode === "+2/+1") + chip("+1 / +1 / +1", false) + "</div>" +
      '<p class="t-muted">Тройка предыстории: ' + trio.map(function (k) { return AB[k] || k; }).join(", ") + ".</p>" +
      '<div class="race-chip-row">' +
      trio.map(function (k) {
        var tag = k === plus2 ? " +2" : (k === plus1 ? " +1" : "");
        return chip((AB[k] || k) + tag, k === plus2 || k === plus1);
      }).join("") + "</div></div>";
    body += '<div class="race-setup__section"><h3>Черта происхождения</h3>' +
      "<p><strong>" + esc(feat.name_ru || "—") + "</strong></p></div>";
    if (bg.tool_choices) {
      body += '<div class="race-setup__section"><h3>' + esc(bg.tool_choices.label_ru || "Инструменты на выбор") + " (1/1)</h3>" +
        '<div class="race-chip-row">' +
        chip("Кости", true) + chip("Карты", false) + chip("Драконьи шахматы", false) +
        "</div></div>";
    }
    body += '<div class="race-setup__section"><h3>Снаряжение предыстории</h3><div class="race-chip-row">' +
      chip("Снаряжение предыстории", true) +
      chip("Золото (" + (eq.gold_alternative_gp || 50) + " зм)", false) +
      "</div>";
    if (eq.pack_summary_ru) body += '<p class="bg-pack-note">' + esc(eq.pack_summary_ru) + "</p>";
    body += "</div></div>";
    var detail = document.querySelector("[data-create-detail]");
    if (detail) detail.innerHTML = body;
    footer("background", steps, true, false);
    afterDetail(true, "К списку предысторий");
    scrollSelectedCard();
  }

  function renderClassFighter() {
    var steps = stepsFor("human");
    shell({ step: "class", steps: steps, species: "human" });
    var cls = bySlug(DATA.classes, "fighter");
    var cards = document.querySelector("[data-create-cards]");
    if (cards) {
      cards.innerHTML = catalogCards(DATA.classes, "fighter", function (it) {
        return it.hit_die ? ("кость к" + it.hit_die) : "";
      });
    }
    var skills = (cls.skill_choices && cls.skill_choices.from) || [];
    var pickedSkills = ["athletics", "perception"];
    var need = (cls.skill_choices && cls.skill_choices.count) || 2;
    var wmNeed = (cls.weapon_mastery && cls.weapon_mastery.by_level && cls.weapon_mastery.by_level["1"]) || 3;
    var allW = DATA.weapons || [];
    var prefer = ["longsword", "javelin", "light-crossbow", "crossbow-light", "battleaxe", "greatsword"];
    var pickedWm = prefer.filter(function (id) { return bySlug(allW, id); }).slice(0, wmNeed);
    if (pickedWm.length < wmNeed) {
      allW.forEach(function (w) {
        if (pickedWm.length < wmNeed && pickedWm.indexOf(w.slug) < 0) pickedWm.push(w.slug);
      });
    }
    var weapons = pickedWm.map(function (id) { return bySlug(allW, id); }).filter(Boolean)
      .concat(allW.filter(function (w) { return pickedWm.indexOf(w.slug) < 0; })).slice(0, 10);
    var packs = cls.starting_equipment || [];
    var styles = DATA.fighting_styles || [];
    var body = '<div class="race-setup">';
    body += '<div class="race-setup__head"><h2>' + esc(cls.name_ru) + "</h2>" +
      '<p class="race-setup__en">Fighter</p>' +
      '<p class="race-setup__source">Источник: PH24</p></div>';
    if (cls.summary_ru) body += '<p class="t-muted">' + esc(cls.summary_ru) + "</p>";
    body += '<div class="race-setup__section"><h3>Навыки (' + pickedSkills.length + "/" + need + ")</h3>" +
      '<div class="race-chip-row">' + skills.map(function (id) {
        return chip(SKILL[id] || id, pickedSkills.indexOf(id) >= 0);
      }).join("") + "</div></div>";
    body += '<div class="race-setup__section"><h3>Боевой стиль</h3><div class="race-chip-row">' +
      styles.map(function (st) { return chip(st.name_ru, st.slug === "defense"); }).join("") + "</div></div>";
    body += '<div class="race-setup__section"><h3>Стартовое снаряжение</h3><div class="race-chip-row">';
    packs.forEach(function (p, i) {
      body += chip(p.label_ru || p.id, i === 0);
    });
    body += "</div>";
    if (packs[0] && packs[0].summary_ru) body += '<p class="bg-pack-note">' + esc(packs[0].summary_ru) + "</p>";
    body += "</div>";
    body += '<div class="race-setup__section"><h3>Оружейное мастерство (' + pickedWm.length + "/" + wmNeed + ")</h3>" +
      '<div class="race-chip-row">' + weapons.map(function (w) {
        var on = pickedWm.indexOf(w.slug) >= 0;
        var m = MASTERY[w.mastery] || w.mastery;
        return chip(w.name_ru + (m ? " · " + m : ""), on);
      }).join("") + "</div></div>";
    body += "</div>";
    var detail = document.querySelector("[data-create-detail]");
    if (detail) detail.innerHTML = body;
    footer("class", steps, true, false);
    afterDetail(true, "К списку классов");
    scrollSelectedCard();
  }

  function renderAbilities() {
    var steps = stepsFor("human");
    shell({ step: "abilities", steps: steps, species: "human" });
    var scores = [
      { id: "str", base: 15, bonus: 2 },
      { id: "dex", base: 13, bonus: 0 },
      { id: "con", base: 14, bonus: 1 },
      { id: "int", base: 10, bonus: 0 },
      { id: "wis", base: 12, bonus: 0 },
      { id: "cha", base: 8, bonus: 0 }
    ];
    var cards = document.querySelector("[data-create-cards]");
    if (cards) {
      var rows = scores.map(function (s) {
        var total = s.base + s.bonus;
        var mark = s.bonus ? (total + " (+" + s.bonus + " предыстория)") : String(total);
        return '<li><span class="abil-sum-k">' + esc(AB[s.id]) + '</span><span class="abil-sum-v">' + esc(mark) + "</span></li>";
      }).join("");
      cards.innerHTML = '<div class="abil-summary"><h2>Итог с бонусами предыстории</h2><ul class="abil-sum-list">' + rows + "</ul></div>";
    }
    var methods = [
      ["standard", "Массив", "15, 14, 13, 12, 10, 8", false],
      ["buy", "Покупка очков", "27 очков, 8–15", true],
      ["roll", "Бросок", "4к6, отбросить младший", false],
      ["manual", "Вручную", "1–30", false]
    ];
    var body = '<div class="abil-setup"><div class="abil-setup__head"><h2>Характеристики</h2></div>' +
      '<p class="t-muted abil-intro">База без бонусов (предыстория). Итог уже с бонусом. Покупка очков — 27 очков, до бонуса максимум 15.</p>' +
      '<div class="abil-toolbar"><div class="abil-methods" role="list">';
    methods.forEach(function (m) {
      body += '<button class="abil-method' + (m[3] ? " is-on" : "") + '" type="button">' +
        '<span class="abil-method__title">' + esc(m[1]) + "</span>" +
        '<span class="abil-method__sub">' + esc(m[2]) + "</span></button>";
    });
    body += '</div><p class="t-muted abil-hint">Осталось очков: 0.</p>' +
      '<div class="race-chip-row abil-actions">' + chip("Разложить по приоритету класса", false) + "</div></div>";
    body += '<div class="abil-rows">';
    scores.forEach(function (s) {
      var total = s.base + s.bonus;
      var stepper = '<div class="abil-stepper"><button class="seg" type="button">−</button>' +
        '<span class="abil-stepper__val">' + s.base + "</span>" +
        '<button class="seg" type="button">+</button></div>';
      if (isPhone()) {
        body += '<div class="abil-row"><div class="abil-row__name">' + esc(AB[s.id]) + "</div>" +
          '<div class="abil-row__controls">' + stepper + "</div>" +
          (s.bonus ? '<span class="abil-bonus">+' + s.bonus + " предыстория</span>" : '<span class="abil-bonus abil-bonus--empty"></span>') +
          '<span class="abil-total">= ' + total + "</span></div>";
      } else {
        var bonus = s.bonus ? ("+" + s.bonus + " предыстория = " + total) : ("= " + total);
        body += '<div class="abil-row"><span class="abil-row__name">' + esc(AB[s.id]) + "</span>" +
          stepper + '<span class="t-muted">' + esc(bonus) + "</span></div>";
      }
    });
    body += "</div></div>";
    var detail = document.querySelector("[data-create-detail]");
    if (detail) detail.innerHTML = body;
    footer("abilities", steps, true, false);
    afterDetail(true, null);
  }

  function previewHtml(clsName, level, hitDie, extras) {
    var html = '<div class="lv-preview"><h2 class="lv-preview__title">Итог</h2>';
    html += '<p class="lv-preview__classes">' + esc(clsName + " " + level) + " · всего " + level + "</p>";
    html += '<ul class="lv-pv-list">';
    html += '<li><span class="lv-pv-k">Мастерство</span><span class="lv-pv-v">+2</span></li>';
    html += '<li><span class="lv-pv-k">Хиты</span><span class="lv-pv-v">' + (hitDie === 6 ? "6 (к6)" : "10 (к10)") + "</span></li>";
    (extras || []).forEach(function (row) {
      html += '<li><span class="lv-pv-k">' + esc(row[0]) + '</span><span class="lv-pv-v">' + esc(row[1]) + "</span></li>";
    });
    html += "</ul></div>";
    return html;
  }

  function toolbarHtml(name, hitDie, remain) {
    var html = '<div class="lv-toolbar">';
    html += '<span class="lv-toolbar__who">' + esc(name) + "</span>";
    html += '<span class="lv-toolbar__meta">основной · кость к' + hitDie + "</span>";
    html += '<div class="lv-level"><span class="lv-level__lab">Уровень</span><div class="abil-stepper">';
    html += '<button class="seg" type="button" disabled>−</button>';
    html += '<span class="abil-stepper__val">1</span>';
    html += '<button class="seg" type="button">+</button>';
    html += "</div></div>";
    html += '<div class="lv-remain' + (remain ? " is-need" : "") + '"><span class="lv-remain__n">Осталось выборов: ' + remain + "</span>";
    if (remain) html += chip("К следующему", false);
    html += "</div></div>";
    return html;
  }

  function renderLvlFighter() {
    var steps = stepsFor("human");
    shell({ step: "leveling", steps: steps, species: "human" });
    var styles = DATA.fighting_styles || [];
    var cards = document.querySelector("[data-create-cards]");
    if (cards) {
      cards.innerHTML = previewHtml("Воин", 1, 10, [
        ["Ячейки", "нет ячеек"],
        ["Умения", "Второе дыхание"],
        ["Осталось", "1 · боевой стиль"]
      ]);
    }
    var body = '<div class="lv-setup">';
    body += stripHtml("Воин 1", "10 (к10)", 1);
    body += toolbarHtml("Воин", 10, 1);
    body += '<div class="lv-ribbon"><article class="lv-lvl is-pending is-open">';
    body += '<button class="lv-lvl__head" type="button"><span class="lv-lvl__n">Ур. 1</span><span class="lv-need">Нужно выбрать</span></button>';
    body += '<div class="lv-lvl__body">';
    body += '<ul class="lv-grants"><li><span class="lv-grant__name">Второе дыхание</span><span class="lv-grant__sum">Бонусным действием: хиты = 1к10 + уровень воина. 1× / короткий или продолжительный отдых.</span></li></ul>';
    body += "<h3>Боевой стиль</h3><div class=\"race-chip-row\">";
    styles.forEach(function (st) { body += chip(st.name_ru, false); });
    body += "</div>";
    body += "<h3>Оружейное мастерство</h3><p class=\"t-muted\">Уже выбрано на шаге класса (3 из 3).</p>";
    body += "</div></article></div>";
    body += '<div class="lv-mc"><div class="race-chip-row">' + chip("Добавить класс", false) + "</div></div>";
    body += "</div>";
    var detail = document.querySelector("[data-create-detail]");
    if (detail) detail.innerHTML = body;
    footer("leveling", steps, false, true);
    afterDetail(true, null);
  }

  function renderWizardBook() {
    var steps = stepsFor("human");
    shell({ step: "leveling", steps: steps, species: "human" });
    var cantrips = ["fire-bolt", "mage-hand", "prestidigitation"];
    var book = ["shield", "magic-missile", "mage-armor", "detect-magic", "sleep", "find-familiar"];
    var prepared = ["shield", "magic-missile", "mage-armor"];
    var circle = 1; /* book of 1st-circle spells */
    var all = (DATA.spells || []).filter(function (s) { return Number(s.level) === circle; });
    var cards = document.querySelector("[data-create-cards]");
    if (cards) {
      cards.innerHTML = previewHtml("Волшебник", 1, 6, [
        ["Ячейки", "1×2"],
        ["Заклинания", "заговоры 3/3 · книга 6/6 · подг. 3/3"],
        ["Умения", "Магическое восстановление · Использование заклинаний"]
      ]);
    }
    var body = '<div class="lv-setup">';
    body += stripHtml("Волшебник 1", "6 (к6)", 0);
    body += toolbarHtml("Волшебник", 6, 0);
    body += '<div class="lv-ribbon"><article class="lv-lvl is-done">';
    body += '<button class="lv-lvl__head" type="button"><span class="lv-lvl__n">Ур. 1</span>' +
      '<span class="lv-lvl__sum">Магическое восстановление · Использование заклинаний · хиты макс. (6)</span>' +
      '<span class="lv-ok">готово</span></button>';
    body += '<div class="lv-lvl__body">';
    body += '<p class="t-muted lv-hint">заговоры 3/3 · книга 6/6. Выбор — в сетке заклинаний ниже.</p>';
    body += "</div></article></div>";
    body += '<section class="lv-spells"><div class="lv-spells__head"><h3>Заклинания</h3>' +
      '<span class="lv-spells__count">Заговоры 3/3 · Книга 6/6 · Подготовка 3/3 · Ячейки: 1×2</span></div>';
    body += '<p class="lv-spells__slots">На 1 ур. — 6 заклинаний 1 круга в книгу, каждый новый уровень — +2. Книга не равна подготовке.</p>';
    body += '<div class="lv-spells__tools"><input class="field" type="search" placeholder="Поиск заклинания" />' +
      '<div class="race-chip-row">' +
      chip("Заговоры", false) + chip("Круг 1", true) +
      "</div></div>";
    body += '<p class="lv-spells__picked">Выбрано ' + book.length + " из 6</p>";
    body += '<div class="lv-spell-grid">';
    all.forEach(function (s) {
      var on = book.indexOf(s.slug) >= 0;
      body += '<button type="button" class="lv-spell' + (on ? " is-on" : "") + '">' +
        '<span class="lv-spell__name">' + esc(s.name_ru) + "</span>" +
        '<span class="lv-spell__src">' + esc(circleMeta(s)) + "</span></button>";
    });
    body += "</div></section>";
    body += '<div class="lv-mc"><div class="race-chip-row">' + chip("Добавить класс", false) + "</div></div>";
    body += "</div>";
    var detail = document.querySelector("[data-create-detail]");
    if (detail) detail.innerHTML = body;
    footer("leveling", steps, true, true);
    afterDetail(true, null);
  }

  function renderRemaining() {
    var steps = stepsFor("human");
    shell({ step: "class", steps: steps, species: "human" });
    var cls = bySlug(DATA.classes, "fighter");
    var cards = document.querySelector("[data-create-cards]");
    if (cards) cards.innerHTML = catalogCards(DATA.classes, "fighter", function (it) {
      return it.hit_die ? ("кость к" + it.hit_die) : "";
    });
    var skills = (cls.skill_choices && cls.skill_choices.from) || [];
    var issues = [
      "Навыки класса: выбрано 0 из 2",
      "Оружейное мастерство: выбрано 0 из 3",
      "Выберите боевой стиль",
      "Выберите снаряжение класса"
    ];
    var body = '<div class="race-setup">';
    body += '<div class="race-setup__head"><h2>' + esc(cls.name_ru) + "</h2>" +
      '<p class="race-setup__en">Fighter</p><p class="race-setup__source">Источник: PH24</p></div>';
    body += issuesHtml(issues);
    body += '<div class="race-setup__section"><h3>Навыки (0/2)</h3><div class="race-chip-row">' +
      skills.map(function (id) { return chip(SKILL[id] || id, false); }).join("") + "</div></div>";
    body += '<div class="race-setup__section"><h3>Оружейное мастерство</h3>' +
      '<p class="t-muted">Если класс даёт мастерство — выбираете свойства оружия.</p></div>';
    body += "</div>";
    var detail = document.querySelector("[data-create-detail]");
    if (detail) detail.innerHTML = body;
    footer("class", steps, false, false);
    afterDetail(true, "К списку классов");
  }

  function renderReady() {
    var steps = stepsFor("human");
    shell({ step: "leveling", steps: steps, species: "human" });
    var cards = document.querySelector("[data-create-cards]");
    if (cards) cards.innerHTML = previewHtml("Воин", 1, 10, [["Умения", "Второе дыхание · Оборона"]]);
    var detail = document.querySelector("[data-create-detail]");
    if (detail) {
      detail.innerHTML = '<div class="lv-setup">' + toolbarHtml("Воин", 10, 0) +
        '<div class="lv-ribbon"><article class="lv-lvl is-done"><button class="lv-lvl__head" type="button">' +
        '<span class="lv-lvl__n">Ур. 1</span><span class="lv-lvl__sum">Второе дыхание · Оборона</span>' +
        '<span class="lv-ok">готово</span></button></article></div></div>';
    }
    footer("leveling", steps, true, true);
    afterDetail(true, null);
    if (C.openAppDialog) C.openAppDialog("character-ready");
  }

  function renderLobbyCreate() {
    shell({ step: "species", steps: stepsFor(null), lobby: true });
    var cards = document.querySelector("[data-create-cards]");
    if (cards) cards.innerHTML = catalogCards(DATA.species, null, function (it) {
      return (it.size_options || []).map(function (id) { return SIZE[id] || id; }).join(" / ");
    });
    var detail = document.querySelector("[data-create-detail]");
    if (detail) {
      detail.innerHTML = '<div class="race-setup">' + identityHtml({ name: "", gender: null }) +
        "<h2>Вид</h2><p class=\"t-muted\">Создание героя для лобби по правилам 2024 года. Сводка правил старта — над формой.</p>" +
        issuesHtml(["Выберите вид", "Введите имя персонажа", "Выберите пол персонажа"]) + "</div>";
    }
    footer("species", stepsFor(null), false, false);
    afterDetail(false, null);
  }

  function openJoin(mode) {
    document.documentElement.setAttribute("data-rules", "2024");
    if (!C.openAppDialog) return;
    C.openAppDialog("join-lobby");
    var mismatch = document.querySelector("[data-join-mismatch]");
    var conflict = document.querySelector("[data-join-conflict]");
    var hero = document.querySelector("[data-join-hero]");
    if (mismatch) mismatch.hidden = mode !== "rules";
    if (conflict) conflict.hidden = mode !== "copy";
    if (hero) hero.hidden = mode !== "hero";
    var title = document.getElementById("join-lobby-title");
    if (title) title.textContent = "Вступить в лобби · Правила\u00a02024\u00a0года";
    var input = document.getElementById("join-lobby-code");
    if (input) input.value = "CJSZMR";
    var named = document.querySelector("[data-join-lobby-name]");
    if (named) {
      named.hidden = false;
      named.textContent = mode === "copy" ? "Вход в лобби «Эхо рассвета»" : "Вход в лобби «Миллениум»";
    }
  }
  function renderJoinHero() {
    if (C.setPage) C.setPage("lobby");
    openJoin("hero");
  }
  function renderCopy() {
    if (C.setPage) C.setPage("lobby");
    openJoin("copy");
  }
  function renderLobbyOk() {
    if (C.setPage) C.setPage("lobby");
    if (C.setCharsMode) C.setCharsMode("list");
    if (C.closeAllDialogs) C.closeAllDialogs();
    document.documentElement.setAttribute("data-rules", "2024");
    var toast = document.querySelector("[data-create-toast]");
    var notice = document.querySelector("[data-lobby-notice]");
    var isPhone = document.documentElement.getAttribute("data-width") === "phone";
    var text = "Герой создан и добавлен в лобби";
    if (isPhone && notice) {
      notice.hidden = false;
      notice.textContent = text;
      if (toast) toast.hidden = true;
      var head = notice.closest(".chars-head");
      if (head) head.classList.add("has-notice");
    } else if (toast) {
      toast.hidden = false;
      toast.textContent = text;
      if (notice) notice.hidden = true;
    }
  }


  function renderShellSummary() {
    renderSpecies("empty");
    if (C.openAppDialog) C.openAppDialog("pipeline-summary");
  }
  function renderClassSummary() {
    renderClassFighter();
    if (C.openAppDialog) C.openAppDialog("pipeline-summary");
  }

  var VIEWS = {
    "24-species-empty": function () { renderSpecies("empty"); },
    "24-species-human": function () { renderSpecies("human"); },
    "24-feat-origin": renderFeat,
    "24-diff": function () { renderSpecies("empty"); openDiff(); },
    "24-bg-asi": renderBg,
    "24-class-fighter-mastery": renderClassFighter,
    "24-abil-buy": renderAbilities,
    "24-lvl-fighter": renderLvlFighter,
    "24-lvl-wizard-book": renderWizardBook,
    "24-remaining": renderRemaining,
    "24-fin-ready-bridge": renderReady,
    "24-lobby-create": renderLobbyCreate,
    "24-join-hero": renderJoinHero,
    "24-copy-conflict": renderCopy,
    "24-fin-lobby-ok": renderLobbyOk,
    "24-shell-summary": renderShellSummary,
    "24-class-fighter-summary": renderClassSummary
  };
  Object.keys(VIEWS).forEach(function (name) { C.registerView(name, VIEWS[name]); });

  var origSetWidth = C.setWidth;
  C.setWidth = function (width) {
    origSetWidth(width);
    var v = document.documentElement.getAttribute("data-view") || "";
    if (VIEWS[v]) VIEWS[v]();
  };
  var q = new URLSearchParams(location.search);
  var bootView = q.get("view") || document.documentElement.getAttribute("data-view");
  if (bootView && VIEWS[bootView]) C.applyView(bootView);
})();
