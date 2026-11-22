(function () {
  var C = window.CreationStep1;
  var DATA = window.CLASSES_2014;
  if (!C || !C.registerView || !DATA) return;

  var CLASSES = DATA.classes || [];
  var SKILLS = DATA.skills || [];
  var SAVES_RU = DATA.saves_ru || {};
  var ARMOR_RU = DATA.armor_ru || {};
  var WEAPON_RU = DATA.weapon_ru || {};
  var WEAPONS = DATA.weapons || {};
  var FOCUS = DATA.focus || {};
  var PHB_LINES = "phb_lines";
  var SOURCE_FIRST = ["PHB", "TCE"];
  var STEPS5 = ["race", "background", "class", "abilities", "leveling"];

  var CONTEXT = { knownSkills: [], knownTools: [], forcedKit: null };

  var state = emptyState();

  function emptyState() {
    return {
      slug: null,
      search: "",
      source: null,
      browseList: false,
      skills: [],
      tools: [],
      equipmentPackageId: null,
      linePicks: {},
      focusId: null,
      focusCustom: false
    };
  }

  function setContext(ctx) {
    CONTEXT.knownSkills = (ctx && ctx.knownSkills) ? ctx.knownSkills.slice() : [];
    CONTEXT.knownTools = (ctx && ctx.knownTools) ? ctx.knownTools.slice() : [];
    CONTEXT.forcedKit = (ctx && ctx.forcedKit) || null;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function displayDice(text) {
    return String(text || "")
      .replace(/\b(\d+)d(\d+)\b/gi, "$1к$2")
      .replace(/\bd(\d+)\b/gi, "к$1");
  }

  function hitDieLabel(die) {
    var m = String(die || "").match(/(\d+)/);
    return m ? "к" + m[1] : displayDice(die);
  }

  function adaptHints(text) {
    return String(text || "")
      .replace(/в диалоге настройки класса/gi, "здесь")
      .replace(/в попапе/gi, "здесь");
  }

  function skillLabel(id) {
    for (var i = 0; i < SKILLS.length; i++) if (SKILLS[i][0] === id) return SKILLS[i][1];
    return id;
  }

  function takeIfUnique(pool, count) {
    var n = count || 0;
    if (n > 0 && pool.length === n) return pool.slice();
    return [];
  }

  function skillIsBlocked(id) {
    return CONTEXT.knownSkills.indexOf(id) >= 0;
  }

  function toolIsBlocked(name) {
    var key = String(name || "").trim().toLowerCase();
    return CONTEXT.knownTools.some(function (t) { return String(t).trim().toLowerCase() === key; });
  }

  function skillOptions(choice) {
    if (!choice) return [];
    if (choice.from === "any") return SKILLS.map(function (s) { return s[0]; });
    return (choice.from || []).slice();
  }

  function findClass(slug) {
    for (var i = 0; i < CLASSES.length; i++) if (CLASSES[i].slug === slug) return CLASSES[i];
    return null;
  }

  function current() { return findClass(state.slug); }

  function packagesFor(cls) {
    if (!cls) return [];
    var packs = [{ id: PHB_LINES, labelRu: "Снаряжение по строкам PHB", summary: "Выбор по каждой строке книги." }];
    (cls.gold || []).forEach(function (g) { packs.push(g); });
    var kit = CONTEXT.forcedKit;
    if (kit === "class_equipment") return packs.filter(function (p) { return p.id === PHB_LINES; });
    if (kit === "class_gold" || kit === "fixed_gold") return packs.filter(function (p) { return p.id === "gold"; });
    return packs;
  }

  function uniqueLinePicks(cls) {
    var picks = {};
    (cls.lines || []).forEach(function (line) {
      if (line.options && line.options.length === 1) {
        picks[line.id] = { optionId: line.options[0].id, weaponName: null, weaponNames: null };
      }
    });
    return picks;
  }

  function findOption(line, optionId) {
    var opts = (line && line.options) || [];
    for (var i = 0; i < opts.length; i++) if (opts[i].id === optionId) return opts[i];
    return null;
  }

  function weaponNeed(option) {
    if (!option || !option.pickWeapon) return 0;
    return Math.max(1, option.pickWeaponCount || 1);
  }

  function weaponList(group) {
    return (WEAPONS[group] || []).slice();
  }

  function detectFocusKind(name) {
    var key = String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (!key) return null;
    if (key.indexOf("мешочек") >= 0 || key.indexOf("сумка с компонент") >= 0 || key.indexOf("компонентская") >= 0) return null;
    if (key.indexOf("священный символ") >= 0 || key === "священный символ") return "holy";
    if (key.indexOf("фокус друида") >= 0 || key.indexOf("друидический фокус") >= 0) return "druidic";
    if (key.indexOf("магический фокус") >= 0 || key.indexOf("фокус заклинателя") >= 0 || key === "arcane focus") return "arcane";
    if (key === "фокус" || /фокус/.test(key)) {
      if (key.indexOf("друид") >= 0) return "druidic";
      return "any";
    }
    return null;
  }

  function focusPlaceholder(cls) {
    if (!cls || state.equipmentPackageId !== PHB_LINES) return null;
    var lines = cls.lines || [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var pick = state.linePicks[line.id];
      if (!pick || !pick.optionId) continue;
      var opt = findOption(line, pick.optionId);
      if (!opt) continue;
      var names = [opt.summary, opt.labelRu, line.labelRu];
      for (var j = 0; j < names.length; j++) {
        var kind = detectFocusKind(names[j]);
        if (kind) return { name: names[j], kind: kind };
      }
    }
    return null;
  }

  function focusOptions(kind) {
    if (kind === "any") {
      return (FOCUS.arcane || []).concat(FOCUS.druidic || []).concat(FOCUS.holy || []);
    }
    return (FOCUS[kind] || []).slice();
  }

  function defaultPackageId(cls) {
    var packs = packagesFor(cls);
    if (packs.length === 1) return packs[0].id;
    return null;
  }

  function applyDefaultEquipment(cls) {
    state.equipmentPackageId = defaultPackageId(cls);
    state.linePicks = state.equipmentPackageId === PHB_LINES ? uniqueLinePicks(cls) : {};
    state.focusId = null;
    state.focusCustom = false;
  }

  function selectClass(slug) {
    var search = state.search;
    var source = state.source;
    state = emptyState();
    state.search = search;
    state.source = source;
    state.slug = slug;
    var cls = findClass(slug);
    if (cls) {
      var pool = skillOptions(cls.skillChoices).filter(function (id) { return !skillIsBlocked(id); });
      var need = (cls.skillChoices && cls.skillChoices.count) || 0;
      state.skills = takeIfUnique(pool, need);
      if (cls.toolChoices && cls.toolChoices.from) {
        var tools = cls.toolChoices.from.filter(function (n) { return !toolIsBlocked(n); });
        state.tools = takeIfUnique(tools, cls.toolChoices.count || 0);
      }
      applyDefaultEquipment(cls);
    }
    state.browseList = false;
  }

  function reasonsFor(cls) {
    var reasons = [];
    if (!cls) {
      reasons.push({ key: "empty", text: "Выберите класс." });
      return reasons;
    }
    var need = (cls.skillChoices && cls.skillChoices.count) || 0;
    if (state.skills.length !== need) {
      reasons.push({ key: "skills", text: "Выбери навыки: нужно " + need + ", сейчас " + state.skills.length + "." });
    }
    var toolNeed = (cls.toolChoices && cls.toolChoices.count) || 0;
    if (state.tools.length !== toolNeed) {
      reasons.push({ key: "tools", text: "Выбери инструменты: нужно " + toolNeed + ", сейчас " + state.tools.length + "." });
    }
    var packs = packagesFor(cls);
    if (packs.length > 0 && !state.equipmentPackageId) {
      reasons.push({ key: "pack", text: "Выбери стартовое снаряжение." });
    } else if (state.equipmentPackageId === PHB_LINES) {
      (cls.lines || []).forEach(function (line) {
        var pick = state.linePicks[line.id];
        if (!pick || !pick.optionId) {
          reasons.push({ key: "line:" + line.id, text: "Выбери: " + line.labelRu + "." });
          return;
        }
        var opt = findOption(line, pick.optionId);
        if (!opt) {
          reasons.push({ key: "line:" + line.id, text: "Неизвестный вариант в «" + line.labelRu + "»." });
          return;
        }
        if (opt.pickFrom && opt.pickFrom.length) {
          if (!pick.weaponName) reasons.push({ key: "line:" + line.id, text: "Выбери предмет в «" + line.labelRu + "»." });
        } else {
          var needW = weaponNeed(opt);
          if (needW === 1 && !pick.weaponName) {
            reasons.push({ key: "line:" + line.id, text: "Выбери оружие в «" + line.labelRu + "»." });
          } else if (needW > 1) {
            var names = pick.weaponNames || [];
            var have = names.filter(Boolean).length;
            if (have < needW) {
              reasons.push({ key: "line:" + line.id, text: "Выбери оружие (" + have + "/" + needW + ") в «" + line.labelRu + "»." });
            }
          }
        }
      });
    }
    var focus = focusPlaceholder(cls);
    if (focus && !state.focusId && !state.focusCustom) {
      reasons.push({ key: "focus", text: "Выбери фокус / символ." });
    }
    return reasons;
  }

  function isReady() {
    return !!current() && reasonsFor(current()).length === 0;
  }

  function reasonAt(key) {
    var list = current() ? reasonsFor(current()) : [];
    var html = "";
    list.forEach(function (row) {
      if (row.key === key) html += '<p class="race-setup__block">' + esc(row.text) + "</p>";
    });
    return html;
  }

  function chip(label, on, attrs, extraClass) {
    return '<button class="seg' + (on ? " is-on" : "") + (extraClass ? " " + extraClass : "") + '" type="button"' + (attrs || "") + ">" + esc(label) + "</button>";
  }

  function sourcesInUse() {
    var set = {};
    CLASSES.forEach(function (r) { if (r.source) set[r.source] = 1; });
    var rest = Object.keys(set).filter(function (s) { return SOURCE_FIRST.indexOf(s) < 0; }).sort();
    return SOURCE_FIRST.filter(function (s) { return set[s]; }).concat(rest);
  }

  function filteredClasses() {
    var q = (state.search || "").trim().toLowerCase();
    return CLASSES.filter(function (r) {
      if (state.source && r.source !== state.source) return false;
      if (!q) return true;
      return (r.name_ru || "").toLowerCase().indexOf(q) >= 0
        || (r.name_en || "").toLowerCase().indexOf(q) >= 0
        || (r.slug || "").toLowerCase().indexOf(q) >= 0;
    });
  }

  function catalogHtml() {
    var items = filteredClasses().map(function (row) {
      var on = row.slug === state.slug;
      return '<li><button class="create-pipeline__card' + (on ? " is-selected" : "") + '" type="button" data-cl-id="' + esc(row.slug) + '"' + (on ? ' aria-pressed="true"' : "") + ">" +
        '<span class="create-pipeline__card-title">' + esc(row.name_ru) + "</span>" +
        '<span class="create-pipeline__card-sub">' + esc(row.name_en) + "</span>" +
        '<span class="create-pipeline__card-source">' + esc(row.source) + "</span></button></li>";
    }).join("");
    var sourceChips = chip("Все", !state.source, ' data-cl-source=""') +
      sourcesInUse().map(function (s) {
        return chip(s, state.source === s, ' data-cl-source="' + esc(s) + '"');
      }).join("");
    return '<div class="create-pipeline__catalog-list">' +
      '<div class="create-pipeline__filters">' +
      '<label class="field-label" for="create-search">Поиск</label>' +
      '<input class="field" id="create-search" type="search" placeholder="Поиск по имени…" autocomplete="off" value="' + esc(state.search) + '" />' +
      '<p class="field-label">Источники</p>' +
      '<div class="create-pipeline__source-row">' + sourceChips + "</div></div>" +
      '<ul class="create-pipeline__card-list">' + (items || '<li class="t-muted">В каталоге пока мало классов</li>') + "</ul></div>";
  }

  function profLines(cls) {
    var lines = [];
    if (cls.saves && cls.saves.length) {
      lines.push("Спасброски: " + cls.saves.map(function (k) { return SAVES_RU[k] || k; }).join(", "));
    }
    if (cls.armor && cls.armor.length) {
      lines.push("Доспехи: " + cls.armor.map(function (k) { return ARMOR_RU[k] || k; }).join(", "));
    }
    var weapons = (cls.weapons || []).map(function (k) { return WEAPON_RU[k] || k; }).concat(cls.weaponExtras || []);
    if (weapons.length) lines.push("Оружие: " + weapons.join(", "));
    if (cls.skillChoices) {
      var from = cls.skillChoices.from === "any" ? "любые" : (cls.skillChoices.from || []).map(skillLabel).join(", ");
      lines.push("Навыки: выбрать " + cls.skillChoices.count + " (" + from + ")");
    }
    if (cls.toolsFixed && cls.toolsFixed.length) lines.push("Инструменты: " + cls.toolsFixed.join(", "));
    if (cls.toolChoices) {
      lines.push("Инструменты (выбор " + cls.toolChoices.count + "): " + cls.toolChoices.from.join(", "));
    }
    return lines;
  }

  function toggleInCap(list, id, cap) {
    var i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1);
    else if (list.length < cap) list.push(id);
    return list;
  }

  function detailHtml() {
    var phone = document.documentElement.getAttribute("data-width") === "phone";
    var cls = current();
    if (!cls) {
      return "<h2>Класс</h2>" +
        '<p class="t-muted">' + esc(C.emptyPickHint()) + "</p>";
    }
    var html = '<div class="race-setup class-setup">';
    if (phone) html += '<button class="race-back" type="button" data-cl-back>← К списку классов</button>';
    html += '<div class="race-setup__head"><h2>' + esc(cls.name_ru) + "</h2>" +
      (cls.name_en ? '<p class="race-setup__en">' + esc(cls.name_en) + "</p>" : "") +
      '<p class="race-setup__source">Источник: ' + esc(cls.source) + "</p></div>";
    var lines = cls.lines || [];
    html += '<p class="t-muted">' + esc(
      lines.length
        ? "Выбери навыки и снаряжение по каждой строке PHB. Серые навыки — уже есть (раса / предыстория)."
        : "Выбери навыки, инструменты и снаряжение. Серые — уже есть (раса / предыстория)."
    ) + "</p>";
    if (CONTEXT.forcedKit === "fixed_gold" || CONTEXT.forcedKit === "class_gold") {
      html += '<p class="t-muted">Правила лобби: стартовый набор — золото.</p>';
    } else if (CONTEXT.forcedKit === "class_equipment") {
      html += '<p class="t-muted">Правила лобби: стартовый набор — снаряжение класса.</p>';
    }

    var need = (cls.skillChoices && cls.skillChoices.count) || 0;
    var from = skillOptions(cls.skillChoices);
    if (need > 0 && from.length) {
      html += '<div class="race-setup__section"><h3>Навыки (' + state.skills.length + "/" + need + ")</h3>";
      html += '<div class="race-chip-row">';
      from.forEach(function (id) {
        var isBlocked = skillIsBlocked(id);
        var on = !isBlocked && state.skills.indexOf(id) >= 0;
        var label = skillLabel(id) + (isBlocked ? " · уже есть" : "");
        var attrs = isBlocked
          ? ' disabled title="Уже есть (раса / предыстория)"'
          : ' data-cl-skill="' + esc(id) + ":" + need + '"';
        html += chip(label, on, attrs, isBlocked ? "is-blocked" : "");
      });
      html += "</div>" + reasonAt("skills") + "</div>";
    }

    if (cls.toolsFixed && cls.toolsFixed.length) {
      html += '<p class="bg-fixed">Инструменты: ' + esc(cls.toolsFixed.join(", ")) + "</p>";
    }
    if (cls.toolChoices && cls.toolChoices.from && cls.toolChoices.count) {
      var tNeed = cls.toolChoices.count;
      html += '<div class="race-setup__section"><h3>Инструменты на выбор (' + state.tools.length + "/" + tNeed + ")</h3>";
      if (cls.toolChoices.from.some(toolIsBlocked)) html += '<p class="t-muted">Серые — уже есть (раса / предыстория).</p>';
      html += '<div class="race-chip-row">';
      cls.toolChoices.from.forEach(function (name) {
        var isBlocked = toolIsBlocked(name);
        var on = !isBlocked && state.tools.indexOf(name) >= 0;
        var label = name + (isBlocked ? " · уже есть" : "");
        var attrs = isBlocked
          ? ' disabled title="Уже есть (раса / предыстория)"'
          : ' data-cl-tool="' + esc(name) + ":" + tNeed + '"';
        html += chip(label, on, attrs, isBlocked ? "is-blocked" : "seg--wrap");
      });
      html += "</div>" + reasonAt("tools") + "</div>";
    }

    var packs = packagesFor(cls);
    if (packs.length) {
      html += '<div class="race-setup__section"><h3>Стартовое снаряжение</h3><div class="race-chip-row">';
      packs.forEach(function (pack) {
        html += chip(pack.labelRu, state.equipmentPackageId === pack.id, ' data-cl-pack="' + esc(pack.id) + '"');
      });
      html += "</div>";
      var selectedPack = null;
      packs.forEach(function (p) { if (p.id === state.equipmentPackageId) selectedPack = p; });
      if (selectedPack && selectedPack.summary) {
        html += '<p class="bg-pack-note">' + esc(displayDice(selectedPack.summary)) + "</p>";
      }
      html += reasonAt("pack");

      if (state.equipmentPackageId === PHB_LINES) {
        (cls.lines || []).forEach(function (line) {
          var pick = state.linePicks[line.id] || {};
          html += '<div class="class-eq-line"><h3>' + esc(line.labelRu) + "</h3><div class=\"race-chip-row\">";
          (line.options || []).forEach(function (opt) {
            var on = pick.optionId === opt.id;
            var label = opt.labelRu + (opt.noteRu ? " *" : "");
            html += chip(label, on, ' data-cl-line="' + esc(line.id) + ":" + esc(opt.id) + '"' + (opt.noteRu ? ' title="' + esc(opt.noteRu) + '"' : ""), "seg--wrap");
          });
          html += "</div>";
          var opt = findOption(line, pick.optionId);
          if (opt && opt.noteRu) html += '<p class="t-muted">' + esc(opt.noteRu) + "</p>";
          if (opt && opt.summary && !opt.pickWeapon && !opt.pickFrom) {
            html += '<p class="bg-pack-note">' + esc(opt.summary) + "</p>";
          }
          if (opt && opt.pickFrom && opt.pickFrom.length) {
            html += '<div class="race-chip-row">';
            opt.pickFrom.forEach(function (name) {
              html += chip(name, pick.weaponName === name, ' data-cl-wname="' + esc(line.id) + ":" + esc(name) + '"', "seg--wrap");
            });
            html += "</div>";
          }
          var needW = opt ? weaponNeed(opt) : 0;
          if (opt && opt.pickWeapon && needW === 1) {
            html += '<div class="race-chip-row class-weapon-row">';
            weaponList(opt.pickWeapon).forEach(function (name) {
              html += chip(name, pick.weaponName === name, ' data-cl-wname="' + esc(line.id) + ":" + esc(name) + '"');
            });
            html += "</div>";
          }
          if (opt && opt.pickWeapon && needW > 1) {
            for (var slot = 0; slot < needW; slot++) {
              html += '<p class="t-muted">Оружие ' + (slot + 1) + "</p><div class=\"race-chip-row class-weapon-row\">";
              var cur = (pick.weaponNames || [])[slot] || null;
              weaponList(opt.pickWeapon).forEach(function (name) {
                html += chip(name, cur === name, ' data-cl-wslot="' + esc(line.id) + ":" + slot + ":" + esc(name) + '"');
              });
              html += "</div>";
            }
          }
          html += reasonAt("line:" + line.id) + "</div>";
        });
      }

      var focus = focusPlaceholder(cls);
      if (focus) {
        var opts = focusOptions(focus.kind);
        html += '<div class="race-setup__section"><h3>Фокус / символ</h3>' +
          '<p class="t-muted">В пакете «' + esc(focus.name) + "» — выбери конкретный предмет.</p>" +
          '<div class="race-chip-row">';
        opts.forEach(function (opt) {
          html += chip(opt.labelRu, !state.focusCustom && state.focusId === opt.id, ' data-cl-focus="' + esc(opt.id) + '"');
        });
        html += chip("Свой фокус", !!state.focusCustom, ' data-cl-focus="__custom__"');
        html += "</div>" + reasonAt("focus") + "</div>";
      }
      html += "</div>";
    }

    html += '<div class="race-setup__section"><h3>Кость хитов</h3><p>' + esc(hitDieLabel(cls.hitDie)) + "</p></div>";
    var prof = profLines(cls);
    if (prof.length) {
      html += '<div class="race-setup__section"><h3>Владения (1 ур.)</h3><ul class="class-detail-list">';
      prof.forEach(function (line) { html += "<li>" + esc(line) + "</li>"; });
      html += "</ul></div>";
    }
    if (cls.features1 && cls.features1.length) {
      html += '<div class="race-setup__section"><h3>Умения 1 уровня</h3><ul class="class-detail-list">';
      cls.features1.forEach(function (f) {
        html += "<li><strong>" + esc(f.name_ru) + "</strong>";
        if (f.summary_ru) html += " — " + esc(displayDice(f.summary_ru));
        html += "</li>";
      });
      html += "</ul>";
      html += "</div>";
    }
    html += "</div>";
    return html;
  }

  function footerHtml() {
    var ready = isReady();
    return '<button class="btn btn-accent" type="button"' + (ready ? "" : " disabled") + ">Далее · Характеристики</button>";
  }

  function scrollSelectedCard() {
    var selected = document.querySelector(".create-pipeline__card.is-selected");
    var pane = document.querySelector(".create-pipeline__cards");
    if (!selected || !pane || pane.offsetParent === null) return;
    var pr = pane.getBoundingClientRect();
    var cr = selected.getBoundingClientRect();
    if (cr.top >= pr.top + 4 && cr.bottom <= pr.bottom - 4) return;
    var rel = cr.top - pr.top + pane.scrollTop;
    var next = rel - Math.max(8, (pane.clientHeight - selected.offsetHeight) / 2);
    pane.scrollTop = Math.max(0, next);
  }

  function paint() {
    var cards = document.querySelector("[data-create-cards]");
    if (cards) {
      cards.innerHTML = catalogHtml();
      cards.scrollTop = 0;
    }
    var detail = document.querySelector("[data-create-detail]");
    if (detail) detail.innerHTML = detailHtml();
    var right = document.querySelector("[data-create-footer-right]");
    if (right) right.innerHTML = footerHtml();
    var sheet = document.querySelector("[data-summary-body]");
    if (sheet) sheet.innerHTML = detailHtml();
    var shell = document.querySelector("[data-create-shell]");
    var phone = document.documentElement.getAttribute("data-width") === "phone";
    if (shell) {
      var primary = phone && !!state.slug && !state.browseList;
      shell.classList.toggle("create-pipeline--detail-primary", primary);
    }
    bind();
    requestAnimationFrame(function () { scrollSelectedCard(); });
  }

  function bind() {
    var search = document.getElementById("create-search");
    if (search) {
      search.addEventListener("input", function () {
        state.search = search.value;
        var cards = document.querySelector("[data-create-cards]");
        if (cards) {
          var keep = search;
          paint();
          var again = document.getElementById("create-search");
          if (again) {
            again.value = state.search;
            again.focus();
            try { again.setSelectionRange(again.value.length, again.value.length); } catch (e) {}
          }
        }
      });
    }
    document.querySelectorAll("[data-cl-id]").forEach(function (b) {
      b.addEventListener("click", function () { selectClass(b.getAttribute("data-cl-id")); paint(); });
    });
    document.querySelectorAll("[data-cl-source]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.source = b.getAttribute("data-cl-source") || null;
        paint();
      });
    });
    document.querySelectorAll("[data-cl-skill]").forEach(function (b) {
      b.addEventListener("click", function () {
        var parts = (b.getAttribute("data-cl-skill") || "").split(":");
        if (skillIsBlocked(parts[0])) return;
        toggleInCap(state.skills, parts[0], +parts[1] || 1);
        paint();
      });
    });
    document.querySelectorAll("[data-cl-tool]").forEach(function (b) {
      b.addEventListener("click", function () {
        var parts = (b.getAttribute("data-cl-tool") || "").split(":");
        if (toolIsBlocked(parts[0])) return;
        toggleInCap(state.tools, parts[0], +parts[1] || 1);
        paint();
      });
    });
    document.querySelectorAll("[data-cl-pack]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-cl-pack");
        state.equipmentPackageId = id;
        var cls = current();
        state.linePicks = id === PHB_LINES && cls ? uniqueLinePicks(cls) : {};
        state.focusId = null;
        state.focusCustom = false;
        paint();
      });
    });
    document.querySelectorAll("[data-cl-line]").forEach(function (b) {
      b.addEventListener("click", function () {
        var parts = (b.getAttribute("data-cl-line") || "").split(":");
        var lineId = parts[0];
        var optionId = parts.slice(1).join(":");
        var cls = current();
        var line = cls && (cls.lines || []).filter(function (l) { return l.id === lineId; })[0];
        var opt = findOption(line, optionId);
        var needW = weaponNeed(opt);
        state.equipmentPackageId = PHB_LINES;
        state.linePicks[lineId] = {
          optionId: optionId,
          weaponName: null,
          weaponNames: needW > 1 ? Array.from({ length: needW }, function () { return null; }) : null
        };
        state.focusId = null;
        state.focusCustom = false;
        paint();
      });
    });
    document.querySelectorAll("[data-cl-wname]").forEach(function (b) {
      b.addEventListener("click", function () {
        var raw = b.getAttribute("data-cl-wname") || "";
        var cut = raw.indexOf(":");
        var lineId = raw.slice(0, cut);
        var name = raw.slice(cut + 1);
        if (!state.linePicks[lineId]) return;
        state.linePicks[lineId].weaponName = name;
        paint();
      });
    });
    document.querySelectorAll("[data-cl-wslot]").forEach(function (b) {
      b.addEventListener("click", function () {
        var raw = b.getAttribute("data-cl-wslot") || "";
        var parts = raw.split(":");
        var lineId = parts[0];
        var slot = +parts[1];
        var name = parts.slice(2).join(":");
        if (!state.linePicks[lineId]) return;
        var names = (state.linePicks[lineId].weaponNames || []).slice();
        while (names.length <= slot) names.push(null);
        names[slot] = name;
        state.linePicks[lineId].weaponNames = names;
        paint();
      });
    });
    document.querySelectorAll("[data-cl-focus]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-cl-focus");
        if (id === "__custom__") {
          state.focusCustom = true;
          state.focusId = "custom";
        } else {
          state.focusCustom = false;
          state.focusId = id;
        }
        paint();
      });
    });
    var back = document.querySelector("[data-cl-back]");
    if (back) back.addEventListener("click", function () { state.browseList = true; paint(); });
  }

  var PRESETS = {
    "class-empty": function () { state = emptyState(); },
    "class-fighter": function () { state = emptyState(); selectClass("fighter"); },
    "class-fighter-ready": function () {
      state = emptyState();
      selectClass("fighter");
      state.skills = ["acrobatics", "perception"];
      state.equipmentPackageId = PHB_LINES;
      state.linePicks = {
        armor: { optionId: "chain", weaponName: null, weaponNames: null },
        weapons: { optionId: "martial_shield", weaponName: "Длинный меч", weaponNames: null },
        ranged: { optionId: "crossbow", weaponName: null, weaponNames: null },
        pack: { optionId: "dungeoneer", weaponName: null, weaponNames: null }
      };
    },
    "class-rogue": function () { state = emptyState(); selectClass("rogue"); },
    "class-cleric": function () { state = emptyState(); selectClass("cleric"); },
    "class-wizard": function () { state = emptyState(); selectClass("wizard"); },
    "class-warlock": function () { state = emptyState(); selectClass("warlock"); },
    "class-filter": function () { state = emptyState(); state.source = "PHB"; },
    "class-lobby-gold": function () {
      state = emptyState();
      selectClass("fighter");
    }
  };

  function contextFor(name) {
    if (name === "class-fighter" || name === "class-fighter-ready" || name === "class-lobby-gold" || name === "class-warlock") {
      return {
        knownSkills: ["athletics", "intimidation"],
        knownTools: ["Транспорт (наземный)"],
        forcedKit: name === "class-lobby-gold" ? "fixed_gold" : null
      };
    }
    if (name === "class-rogue") {
      return {
        knownSkills: ["sleight_of_hand", "stealth"],
        knownTools: ["Воровские инструменты", "Набор для грима"],
        forcedKit: null
      };
    }
    return {
      knownSkills: ["insight", "religion"],
      knownTools: [],
      forcedKit: null
    };
  }

  function renderClassView(name) {
    setContext(contextFor(name));
    var prep = PRESETS[name];
    if (prep) prep();
    C.renderPipeline({ step: "class", steps: STEPS5 });
    paint();
  }

  Object.keys(PRESETS).forEach(function (name) {
    C.registerView(name, function () { renderClassView(name); });
  });

  var origSetWidth = C.setWidth;
  C.setWidth = function (width) {
    origSetWidth(width);
    var v = document.documentElement.getAttribute("data-view") || "";
    if (PRESETS[v]) renderClassView(v);
  };

  var q = new URLSearchParams(location.search);
  var bootView = q.get("view") || document.documentElement.getAttribute("data-view");
  if (bootView && PRESETS[bootView]) C.applyView(bootView);
})();
