(function () {
  var C = window.CreationStep1;
  var DATA = window.FEATS_2014;
  if (!C || !C.registerView || !DATA) return;

  var FEATS = DATA.feats || [];
  var LANGS = DATA.languages || [];
  var SKILLS = DATA.skills || [];
  var AB_ORDER = DATA.ability_order || ["str", "dex", "con", "int", "wis", "cha"];
  var AB_LABEL = DATA.ability_labels || {};
  var SOURCE_FIRST = ["PHB", "TCE", "XGE", "FTD"];
  var STEPS6 = ["race", "feat", "background", "class", "abilities", "leveling"];

  var CONTEXT = {
    abilities: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 },
    armor: {},
    hasSpellcasting: false,
    hasMartialWeapons: false,
    raceSlug: "human_variant",
    raceParentSlug: "human",
    size: "medium",
    characterLevel: 1,
    takenSlugs: [],
    classSlugs: [],
    backgroundSlug: null,
    proficientSkills: ["acrobatics"],
    knownLanguages: ["Общий", "Дварфийский"],
    needsCatalog: true,
    featAtLevel1: false,
    featNote: "",
    acknowledged: false
  };

  var state = emptyState();

  function emptyState() {
    return {
      slug: null,
      search: "",
      source: null,
      browseList: false,
      abilityKeys: {},
      enumIds: {},
      enumLists: {},
      languages: [],
      skills: [],
      tools: [],
      weapons: [],
      expertiseSkills: [],
      customTool: "",
      customWeapon: "",
      customLanguage: ""
    };
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

  function skillLabel(id) {
    for (var i = 0; i < SKILLS.length; i++) if (SKILLS[i][0] === id) return SKILLS[i][1];
    return id;
  }

  function findFeat(slug) {
    for (var i = 0; i < FEATS.length; i++) if (FEATS[i].slug === slug) return FEATS[i];
    return null;
  }

  function matchRace(allowed, slug, parent) {
    var set = (allowed || []).map(function (s) { return String(s).toLowerCase(); });
    if (!set.length) return false;
    var a = String(slug || "").toLowerCase();
    var b = String(parent || "").toLowerCase();
    return (a && set.indexOf(a) >= 0) || (b && set.indexOf(b) >= 0);
  }

  function unmet(def) {
    if (!def) return "";
    var need = def.prerequisites || {};
    var abilities = CONTEXT.abilities;
    var key;
    for (key in (need.abilities || {})) {
      if ((abilities[key] ?? 10) < need.abilities[key]) {
        return "Требуется " + (AB_LABEL[key] || key.toUpperCase()) + " " + need.abilities[key] + "+";
      }
    }
    if (need.abilitiesOneOf && need.abilitiesOneOf.length) {
      var okOne = need.abilitiesOneOf.some(function (row) {
        return Object.keys(row).every(function (k) { return (abilities[k] ?? 10) >= (row[k] ?? 0); });
      });
      if (!okOne) return "Не выполнены требования к характеристикам";
    }
    var armor = need.armor || [];
    for (var i = 0; i < armor.length; i++) {
      if (!CONTEXT.armor[armor[i]]) return "Требуется владение: " + armor[i];
    }
    var access = [];
    if (need.classesAny && need.classesAny.length) {
      var owned = (CONTEXT.classSlugs || []).map(function (s) { return s.toLowerCase(); });
      access.push(need.classesAny.some(function (s) { return owned.indexOf(String(s).toLowerCase()) >= 0; }));
    }
    if (need.backgroundsAny && need.backgroundsAny.length) {
      var bg = String(CONTEXT.backgroundSlug || "").toLowerCase();
      access.push(Boolean(bg) && need.backgroundsAny.indexOf(bg) >= 0);
    }
    var flags = need.flagsAny || [];
    if (flags.indexOf("spellcasting") >= 0) access.push(!!CONTEXT.hasSpellcasting);
    if (flags.indexOf("martial_weapon_prof") >= 0) access.push(!!CONTEXT.hasMartialWeapons);
    if (access.length && !access.some(Boolean)) {
      return def.prerequisites_ru
        ? "Требования: " + def.prerequisites_ru
        : "Не выполнены требования (класс / предыстория / владение)";
    }
    if (need.minLevel != null && CONTEXT.characterLevel < need.minLevel) {
      return "Требуется " + need.minLevel + "-й уровень персонажа";
    }
    if (need.racesAny && need.racesAny.length) {
      if (!matchRace(need.racesAny, CONTEXT.raceSlug, CONTEXT.raceParentSlug)) {
        return def.prerequisites_ru
          ? "Требования: " + def.prerequisites_ru
          : "Раса не подходит для этой черты";
      }
    }
    if (need.sizeAny && need.sizeAny.length) {
      var sz = String(CONTEXT.size || "").toLowerCase();
      if (need.sizeAny.indexOf(sz) < 0) return "Размер не подходит для этой черты";
    }
    return "";
  }

  function choicesOf(def) {
    return (def && def.choices) || [];
  }

  function takeIfUnique(pool, count) {
    var n = count || 0;
    if (n > 0 && pool.length === n) return pool.slice();
    return [];
  }

  function defaultPicks(def) {
    var picks = {
      abilityKeys: {},
      enumIds: {},
      enumLists: {},
      languages: [],
      skills: [],
      tools: [],
      weapons: [],
      expertiseSkills: []
    };
    if (!def) return picks;
    choicesOf(def).forEach(function (ch) {
      if (ch.type === "ability_one" && ch.from && ch.from.length === 1) {
        picks.abilityKeys[ch.id] = ch.from[0];
      } else if (ch.type === "enum" && ch.options && ch.options.length === 1) {
        picks.enumIds[ch.id] = ch.options[0].id;
      } else if (ch.type === "enum_multi" && ch.options) {
        var ids = ch.options.map(function (o) { return o.id; });
        picks.enumLists[ch.id] = takeIfUnique(ids, ch.count || 1);
      } else if (ch.type === "languages") {
        var known = CONTEXT.knownLanguages || [];
        var langs = LANGS.filter(function (l) { return known.indexOf(l) < 0; });
        picks.languages = takeIfUnique(langs, ch.count || 1);
      } else if (ch.type === "skill_or_tool") {
        var have = CONTEXT.proficientSkills || [];
        var sk = SKILLS.map(function (s) { return s[0]; }).filter(function (id) { return have.indexOf(id) < 0; });
        picks.skills = takeIfUnique(sk, ch.count || 1);
      } else if (ch.type === "expertise") {
        var pool = (CONTEXT.proficientSkills || []).slice();
        picks.expertiseSkills = takeIfUnique(pool, ch.count || 1);
      } else if (ch.type === "spell_one") {
        var opts = spellOptions(def, ch);
        if (opts.length === 1) picks.enumIds[ch.id] = opts[0].id;
      }
      /* weapons: названия не выдумываем; автовыбор только если вариант буквально один */
    });
    return picks;
  }

  function applyPicks(picks) {
    state.abilityKeys = Object.assign({}, picks.abilityKeys);
    state.enumIds = Object.assign({}, picks.enumIds);
    state.enumLists = {};
    Object.keys(picks.enumLists || {}).forEach(function (k) {
      state.enumLists[k] = (picks.enumLists[k] || []).slice();
    });
    state.languages = (picks.languages || []).slice();
    state.skills = (picks.skills || []).slice();
    state.tools = (picks.tools || []).slice();
    state.weapons = (picks.weapons || []).slice();
    state.expertiseSkills = (picks.expertiseSkills || []).slice();
  }

  function selectFeat(slug, withDefaults) {
    state.slug = slug;
    state.browseList = false;
    var def = findFeat(slug);
    if (withDefaults && def && !unmet(def)) applyPicks(defaultPicks(def));
    else applyPicks({ abilityKeys: {}, enumIds: {}, enumLists: {}, languages: [], skills: [], tools: [], weapons: [], expertiseSkills: [] });
  }

  function blockingReason() {
    if (!state.slug) {
      return CONTEXT.needsCatalog
        ? "Выбери черту из каталога (раса даёт черту с 1 уровня)."
        : "";
    }
    var def = findFeat(state.slug);
    if (!def) return "Выбери черту из каталога (раса даёт черту с 1 уровня).";
    var pre = unmet(def);
    if (pre) return pre;
    var list = choicesOf(def);
    for (var i = 0; i < list.length; i++) {
      var ch = list[i];
      if (ch.type === "note") continue;
      if (ch.type === "ability_one") {
        var key = state.abilityKeys[ch.id];
        if (!key || (ch.from && ch.from.indexOf(key) < 0)) return "Выбери: " + ch.label_ru;
      } else if (ch.type === "enum") {
        var id = state.enumIds[ch.id];
        if (!id || !(ch.options || []).some(function (o) { return o.id === id; })) return "Выбери: " + ch.label_ru;
      } else if (ch.type === "enum_multi") {
        var need = ch.count || 1;
        var got = state.enumLists[ch.id] || [];
        if (got.length !== need) return "Выбери " + need + ": " + ch.label_ru;
      } else if (ch.type === "languages") {
        if (state.languages.length < (ch.count || 1)) return "Выбери: " + ch.label_ru;
      } else if (ch.type === "skill_or_tool") {
        if (state.skills.length + state.tools.length < (ch.count || 1)) return "Выбери: " + ch.label_ru;
      } else if (ch.type === "expertise") {
        if (state.expertiseSkills.length < (ch.count || 1)) return "Выбери: " + ch.label_ru;
      } else if (ch.type === "weapons") {
        if (state.weapons.length < (ch.count || 1)) return "Выбери: " + ch.label_ru;
      } else if (ch.type === "spell_one") {
        var sid = state.enumIds[ch.id];
        var opts = spellOptions(def, ch);
        if (!sid || !opts.some(function (o) { return o.id === sid; })) return "Выбери: " + ch.label_ru;
      }
    }
    return "";
  }

  function isReady() {
    return !!state.slug && !blockingReason();
  }

  function choiceIncompleteText(def, ch) {
    if (!ch || ch.type === "note") return "";
    if (ch.type === "ability_one") {
      var key = state.abilityKeys[ch.id];
      if (!key || (ch.from && ch.from.indexOf(key) < 0)) return "Выбери: " + ch.label_ru;
    } else if (ch.type === "enum") {
      var id = state.enumIds[ch.id];
      if (!id || !(ch.options || []).some(function (o) { return o.id === id; })) return "Выбери: " + ch.label_ru;
    } else if (ch.type === "enum_multi") {
      var need = ch.count || 1;
      var got = state.enumLists[ch.id] || [];
      if (got.length !== need) return "Выбери " + need + ": " + ch.label_ru;
    } else if (ch.type === "languages") {
      if (state.languages.length < (ch.count || 1)) return "Выбери: " + ch.label_ru;
    } else if (ch.type === "skill_or_tool") {
      if (state.skills.length + state.tools.length < (ch.count || 1)) return "Выбери: " + ch.label_ru;
    } else if (ch.type === "expertise") {
      if (state.expertiseSkills.length < (ch.count || 1)) return "Выбери: " + ch.label_ru;
    } else if (ch.type === "weapons") {
      if (state.weapons.length < (ch.count || 1)) return "Выбери: " + ch.label_ru;
    } else if (ch.type === "spell_one") {
      var sid = state.enumIds[ch.id];
      var opts = spellOptions(def, ch);
      if (!sid || !opts.some(function (o) { return o.id === sid; })) return "Выбери: " + ch.label_ru;
    }
    return "";
  }

  function firstIncompleteChoiceId(def) {
    var list = choicesOf(def);
    for (var i = 0; i < list.length; i++) {
      if (choiceIncompleteText(def, list[i])) return list[i].id;
    }
    return null;
  }

  function choiceReason(def, ch) {
    if (!ch || firstIncompleteChoiceId(def) !== ch.id) return "";
    var text = choiceIncompleteText(def, ch);
    return text ? '<p class="race-setup__block">' + esc(text) + "</p>" : "";
  }

  function spellOptions(def, ch) {
    if (ch.options && ch.options.length) return ch.options;
    return [];
  }

  function sourcesInUse() {
    var set = {};
    FEATS.forEach(function (f) { if (f.source) set[f.source] = 1; });
    var rest = Object.keys(set).filter(function (s) { return SOURCE_FIRST.indexOf(s) < 0; }).sort();
    return SOURCE_FIRST.filter(function (s) { return set[s]; }).concat(rest);
  }

  function filteredFeats() {
    var q = (state.search || "").trim().toLowerCase();
    return FEATS.filter(function (f) {
      if (state.source && f.source !== state.source) return false;
      if (!q) return true;
      return (f.name_ru || "").toLowerCase().indexOf(q) >= 0
        || (f.name_en || "").toLowerCase().indexOf(q) >= 0
        || (f.slug || "").toLowerCase().indexOf(q) >= 0;
    });
  }

  function chip(label, on, attrs) {
    return '<button class="seg' + (on ? " is-on" : "") + '" type="button"' + (attrs || "") + ">" + esc(label) + "</button>";
  }

  function skipHtml() {
    if (CONTEXT.needsCatalog) return "";
    var note = CONTEXT.featNote || (CONTEXT.featAtLevel1 ? "Черта на 1 уровне — правило лобби." : "Раса даёт черту с 1 уровня.");
    var html = '<div class="feat-skip">';
    html += '<p class="t-muted">' + esc(note) + "</p>";
    html += '<p class="t-muted">В каталоге пока мало черт — можно отметить заметку расы и продолжить.</p>';
    if (CONTEXT.acknowledged) {
      html += '<p class="t-muted">Черта отмечена без карточки каталога</p>';
    } else {
      html += '<div class="create-pipeline__method-row"><button class="btn" type="button" data-feat-ack>Отметить без каталога</button></div>';
    }
    html += "</div>";
    return html;
  }

  function catalogHtml() {
    var items = filteredFeats().map(function (row) {
      var on = row.slug === state.slug;
      var lock = unmet(row);
      var cls = "create-pipeline__card" + (on ? " is-selected" : "") + (lock ? " is-locked" : "");
      return '<li><button class="' + cls + '" type="button" data-feat-id="' + esc(row.slug) + '"' + (on ? ' aria-pressed="true"' : "") + ">" +
        '<span class="create-pipeline__card-title">' + esc(row.name_ru) + "</span>" +
        '<span class="create-pipeline__card-sub">' + esc(row.name_en) + "</span>" +
        (lock ? '<span class="create-pipeline__card-reason">' + esc(lock) + "</span>" : "") +
        '<span class="create-pipeline__card-source">' + esc(row.source) + "</span></button></li>";
    }).join("");
    var sourceChips = chip("Все", !state.source, ' data-feat-source=""') +
      sourcesInUse().map(function (s) {
        return chip(s, state.source === s, ' data-feat-source="' + esc(s) + '"');
      }).join("");
    var phone = document.documentElement.getAttribute("data-width") === "phone";
    return '<div class="create-pipeline__catalog-list">' +
      (phone ? skipHtml() : "") +
      '<div class="create-pipeline__filters">' +
      '<label class="field-label" for="create-search">Поиск</label>' +
      '<input class="field" id="create-search" type="search" placeholder="Поиск по имени…" autocomplete="off" value="' + esc(state.search) + '" />' +
      '<p class="field-label">Источники</p>' +
      '<div class="create-pipeline__source-row">' + sourceChips + "</div></div>" +
      '<ul class="create-pipeline__card-list">' + (items || '<li class="t-muted">В каталоге пока мало черт</li>') + "</ul></div>";
  }

  function toggleIn(list, id, cap) {
    var i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1);
    else {
      if (cap && list.length >= cap) list.shift();
      list.push(id);
    }
    return list;
  }

  function choicesHtml(def) {
    var html = "";
    choicesOf(def).forEach(function (ch) {
      if (ch.type === "note") {
        html += '<p class="race-setup__note">' + esc(displayDice(ch.label_ru || ch.text_ru || "")) + "</p>";
        return;
      }
      if (ch.type === "ability_one") {
        html += '<div class="race-setup__section"><h3>' + esc(ch.label_ru) + "</h3><div class=\"race-chip-row\">";
        (ch.from || []).forEach(function (k) {
          var lab = (AB_LABEL[k] || k) + " " + (CONTEXT.abilities[k] ?? 8) + (ch.amount ? " (+" + ch.amount + ")" : "");
          html += chip(lab, state.abilityKeys[ch.id] === k, ' data-feat-ab="' + esc(ch.id) + ":" + k + '"');
        });
        html += "</div>" + choiceReason(def, ch) + "</div>";
        return;
      }
      if (ch.type === "enum" || ch.type === "spell_one") {
        var opts = ch.type === "spell_one" ? spellOptions(def, ch) : (ch.options || []);
        var cur = state.enumIds[ch.id];
        html += '<div class="race-setup__section"><h3>' + esc(ch.label_ru) + "</h3>";
        if (ch.notes_ru) html += '<p class="race-setup__note">' + esc(displayDice(ch.notes_ru)) + "</p>";
        html += '<div class="race-chip-row">' +
          opts.map(function (o) {
            return chip(o.label_ru || o.id, cur === o.id, ' data-feat-enum="' + esc(ch.id) + ":" + esc(o.id) + '"');
          }).join("") + "</div>" + choiceReason(def, ch) + "</div>";
        return;
      }
      if (ch.type === "enum_multi") {
        var have = state.enumLists[ch.id] || [];
        html += '<div class="race-setup__section"><h3>' + esc(ch.label_ru) + " (" + have.length + "/" + (ch.count || 1) + ")</h3><div class=\"race-chip-row\">";
        (ch.options || []).forEach(function (o) {
          html += chip(o.label_ru || o.id, have.indexOf(o.id) >= 0, ' data-feat-multi="' + esc(ch.id) + ":" + esc(o.id) + ":" + (ch.count || 1) + '"');
        });
        html += "</div>" + choiceReason(def, ch) + "</div>";
        return;
      }
      if (ch.type === "languages") {
        var known = CONTEXT.knownLanguages || [];
        html += '<div class="race-setup__section"><h3>' + esc(ch.label_ru) + " (" + state.languages.length + "/" + (ch.count || 1) + ")</h3><div class=\"race-chip-row\">";
        LANGS.filter(function (l) { return known.indexOf(l) < 0; }).forEach(function (l) {
          html += chip(l, state.languages.indexOf(l) >= 0, ' data-feat-lang="' + esc(l) + ":" + (ch.count || 1) + '"');
        });
        html += "</div>" + choiceReason(def, ch) + "</div>";
        return;
      }
      if (ch.type === "skill_or_tool") {
        var need = ch.count || 1;
        var total = state.skills.length + state.tools.length;
        html += '<div class="race-setup__section"><h3>' + esc(ch.label_ru) + " (" + total + "/" + need + ")</h3><div class=\"race-chip-row\">";
        SKILLS.forEach(function (s) {
          html += chip(s[1], state.skills.indexOf(s[0]) >= 0, ' data-feat-skill="' + esc(s[0]) + ":" + need + '"');
        });
        state.tools.forEach(function (t) {
          html += chip(t + " ×", true, ' data-feat-tool-off="' + esc(t) + '"');
        });
        html += "</div>" +
          '<div class="race-ident__name" style="margin-top:6px">' +
          '<input class="field" type="text" data-feat-tool-input placeholder="Инструмент" value="' + esc(state.customTool) + '" />' +
          '<button class="btn" type="button" data-feat-tool-add>Добавить</button></div></div>';
        return;
      }
      if (ch.type === "expertise") {
        var pool = (CONTEXT.proficientSkills || []).concat(state.skills);
        var seen = {};
        html += '<div class="race-setup__section"><h3>' + esc(ch.label_ru) + "</h3><div class=\"race-chip-row\">";
        pool.forEach(function (id) {
          if (seen[id]) return;
          seen[id] = 1;
          html += chip(skillLabel(id), state.expertiseSkills.indexOf(id) >= 0, ' data-feat-exp="' + esc(id) + ":" + (ch.count || 1) + '"');
        });
        if (!pool.length) html += '<p class="race-setup__note">Сначала нужно владение навыком.</p>';
        html += "</div>" + choiceReason(def, ch) + "</div>";
        return;
      }
      if (ch.type === "weapons") {
        html += '<div class="race-setup__section"><h3>' + esc(ch.label_ru) + " (" + state.weapons.length + "/" + (ch.count || 1) + ")</h3><div class=\"race-chip-row\">";
        state.weapons.forEach(function (w) {
          html += chip(w + " ×", true, ' data-feat-weapon-off="' + esc(w) + '"');
        });
        html += "</div>" +
          '<div class="race-ident__name" style="margin-top:6px">' +
          '<input class="field" type="text" data-feat-weapon-input placeholder="Название оружия" value="' + esc(state.customWeapon) + '" />' +
          '<button class="btn" type="button" data-feat-weapon-add>Добавить</button></div></div>';
        return;
      }
      html += '<p class="race-setup__note">' + esc(ch.label_ru) + (ch.text_ru ? ": " + displayDice(ch.text_ru) : "") + "</p>";
    });
    return html;
  }

  function detailHtml() {
    var phone = document.documentElement.getAttribute("data-width") === "phone";
    var def = state.slug ? findFeat(state.slug) : null;
    if (!def) {
      var html = "<h2>Черта</h2>";
      html += '<p class="t-muted">' + esc(C.emptyPickHint()) + "</p>";
      if (CONTEXT.needsCatalog) {
        html += '<p class="t-muted">Раса даёт черту с 1 уровня — настрой её здесь (не на шаге расы).</p>';
        html += '<p class="race-setup__block">Выбери черту из каталога (раса даёт черту с 1 уровня).</p>';
      } else {
        html += skipHtml();
      }
      return html;
    }
    var block = blockingReason();
    var html = '<div class="race-setup feat-setup">';
    if (phone) html += '<button class="race-back" type="button" data-feat-back>← К списку черт</button>';
    html += '<div class="race-setup__head"><h2>' + esc(def.name_ru) + "</h2>" +
      (def.name_en ? '<p class="race-setup__en">' + esc(def.name_en) + "</p>" : "") +
      '<p class="race-setup__source">Источник: ' + esc(def.source) + "</p></div>";
    if (def.prerequisites_ru) {
      html += '<div class="race-setup__section"><h3>Требования</h3><p class="race-setup__note">' + esc(displayDice(def.prerequisites_ru)) + "</p></div>";
    }
    var pre = unmet(def);
    if (block && pre && block !== "Требования: " + def.prerequisites_ru) {
      html += '<p class="race-setup__block">' + esc(block) + "</p>";
    }
    if (!pre) html += choicesHtml(def);
    if (def.summary_ru) html += '<p class="race-setup__traits">' + esc(displayDice(def.summary_ru)) + "</p>";
    if (def.benefits_ru) html += '<p class="race-setup__note">' + esc(displayDice(def.benefits_ru)) + "</p>";
    html += "</div>";
    return html;
  }

  function footerHtml() {
    var ready = isReady() || (!CONTEXT.needsCatalog && CONTEXT.acknowledged);
    var html = "";
    if (!state.slug && !CONTEXT.needsCatalog && !CONTEXT.acknowledged) {
      /* кнопка уже в детали; футер ждёт отметки или черты */
    }
    html += '<button class="btn btn-accent" type="button"' + (ready ? "" : " disabled") + ">Далее · Предыстория</button>";
    return html;
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
    pr = pane.getBoundingClientRect();
    var cards = pane.querySelectorAll(".create-pipeline__card");
    for (var i = 0; i < cards.length; i++) {
      var r = cards[i].getBoundingClientRect();
      if (r.top < pr.top - 1 && r.bottom > pr.top + 10) {
        var need = pr.top - r.top;
        var room = pr.bottom - selected.getBoundingClientRect().bottom;
        if (room >= need) pane.scrollTop = Math.max(0, pane.scrollTop - need);
        break;
      }
    }
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
    if (shell) shell.classList.toggle("create-pipeline--detail-primary", phone && !!state.slug && !state.browseList);
    bind();
    requestAnimationFrame(function () { scrollSelectedCard(); });
  }

  function bind() {
    var search = document.getElementById("create-search");
    if (search) {
      search.addEventListener("input", function () {
        state.search = search.value;
        var list = document.querySelector(".create-pipeline__card-list");
        if (!list) return;
        var tmp = document.createElement("div");
        tmp.innerHTML = catalogHtml();
        var next = tmp.querySelector(".create-pipeline__card-list");
        if (next) list.replaceWith(next);
        bindCards();
      });
    }
    document.querySelectorAll("[data-feat-source]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.source = b.getAttribute("data-feat-source") || null;
        paint();
      });
    });
    bindCards();
    var ack = document.querySelector("[data-feat-ack]");
    if (ack) ack.addEventListener("click", function () {
      CONTEXT.acknowledged = true;
      paint();
      var toast = document.querySelector("[data-create-toast]");
      if (toast) {
        toast.hidden = false;
        toast.textContent = "Черта отмечена. Далее — предыстория.";
      }
    });
    var back = document.querySelector("[data-feat-back]");
    if (back) back.addEventListener("click", function () { state.browseList = true; paint(); });
    document.querySelectorAll("[data-feat-ab]").forEach(function (b) {
      b.addEventListener("click", function () {
        var parts = (b.getAttribute("data-feat-ab") || "").split(":");
        state.abilityKeys[parts[0]] = parts[1];
        paint();
      });
    });
    document.querySelectorAll("[data-feat-enum]").forEach(function (b) {
      b.addEventListener("click", function () {
        var raw = b.getAttribute("data-feat-enum") || "";
        var i = raw.indexOf(":");
        state.enumIds[raw.slice(0, i)] = raw.slice(i + 1);
        paint();
      });
    });
    document.querySelectorAll("[data-feat-multi]").forEach(function (b) {
      b.addEventListener("click", function () {
        var parts = (b.getAttribute("data-feat-multi") || "").split(":");
        var id = parts[0], opt = parts[1], cap = +parts[2] || 1;
        if (!state.enumLists[id]) state.enumLists[id] = [];
        toggleIn(state.enumLists[id], opt, cap);
        paint();
      });
    });
    document.querySelectorAll("[data-feat-lang]").forEach(function (b) {
      b.addEventListener("click", function () {
        var parts = (b.getAttribute("data-feat-lang") || "").split(":");
        toggleIn(state.languages, parts[0], +parts[1] || 1);
        paint();
      });
    });
    document.querySelectorAll("[data-feat-skill]").forEach(function (b) {
      b.addEventListener("click", function () {
        var parts = (b.getAttribute("data-feat-skill") || "").split(":");
        var cap = +parts[1] || 1;
        var i = state.skills.indexOf(parts[0]);
        if (i >= 0) state.skills.splice(i, 1);
        else if (state.skills.length + state.tools.length < cap) state.skills.push(parts[0]);
        else { state.skills.shift(); state.skills.push(parts[0]); }
        paint();
      });
    });
    document.querySelectorAll("[data-feat-exp]").forEach(function (b) {
      b.addEventListener("click", function () {
        var parts = (b.getAttribute("data-feat-exp") || "").split(":");
        toggleIn(state.expertiseSkills, parts[0], +parts[1] || 1);
        paint();
      });
    });
    document.querySelectorAll("[data-feat-tool-off]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.tools = state.tools.filter(function (t) { return t !== b.getAttribute("data-feat-tool-off"); });
        paint();
      });
    });
    document.querySelectorAll("[data-feat-weapon-off]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.weapons = state.weapons.filter(function (t) { return t !== b.getAttribute("data-feat-weapon-off"); });
        paint();
      });
    });
    var toolAdd = document.querySelector("[data-feat-tool-add]");
    var toolIn = document.querySelector("[data-feat-tool-input]");
    if (toolIn) toolIn.addEventListener("input", function () { state.customTool = toolIn.value; });
    if (toolAdd) toolAdd.addEventListener("click", function () {
      var name = (state.customTool || "").trim();
      if (!name) return;
      if (state.tools.indexOf(name) < 0) state.tools.push(name);
      state.customTool = "";
      paint();
    });
    var wAdd = document.querySelector("[data-feat-weapon-add]");
    var wIn = document.querySelector("[data-feat-weapon-input]");
    if (wIn) wIn.addEventListener("input", function () { state.customWeapon = wIn.value; });
    if (wAdd) wAdd.addEventListener("click", function () {
      var name = (state.customWeapon || "").trim();
      if (!name) return;
      if (state.weapons.indexOf(name) < 0) state.weapons.push(name);
      state.customWeapon = "";
      paint();
    });
  }

  function bindCards() {
    document.querySelectorAll("[data-feat-id]").forEach(function (b) {
      b.addEventListener("click", function () {
        selectFeat(b.getAttribute("data-feat-id"), true);
        paint();
      });
    });
  }

  var PRESETS = {
    "feat-empty": function () {
      state = emptyState();
    },
    "feat-simple": function () {
      state = emptyState();
      selectFeat("lucky", true);
    },
    "feat-choice": function () {
      state = emptyState();
      selectFeat("fey_touched", true);
    },
    "feat-choice-filled": function () {
      state = emptyState();
      selectFeat("fey_touched", true);
      state.abilityKeys.ability = "int";
      state.enumIds.bonus_spell = "bless";
    },
    "feat-filter": function () {
      state = emptyState();
      state.source = "TCE";
    },
    "feat-locked": function () {
      state = emptyState();
      selectFeat("war_caster", false);
    },
    "feat-error": function () {
      state = emptyState();
      selectFeat("resilient", false);
    },
    "feat-lobby-ack": function () {
      state = emptyState();
      CONTEXT.needsCatalog = false;
      CONTEXT.featAtLevel1 = true;
      CONTEXT.featNote = "Черта на 1 уровне — правило лобби.";
      CONTEXT.acknowledged = false;
      CONTEXT.raceSlug = "hill_dwarf";
      CONTEXT.raceParentSlug = "dwarf";
    }
  };

  function renderFeatView(name) {
    CONTEXT.needsCatalog = true;
    CONTEXT.featAtLevel1 = false;
    CONTEXT.featNote = "";
    CONTEXT.acknowledged = false;
    CONTEXT.raceSlug = "human_variant";
    CONTEXT.raceParentSlug = "human";
    var prep = PRESETS[name];
    if (prep) prep();
    C.renderPipeline({ step: "feat", steps: STEPS6, lobby: name === "feat-lobby-ack" });
    if (name === "feat-lobby-ack") {
      var rules = document.querySelector("[data-start-rules]");
      if (rules) {
        rules.innerHTML = "<li>Стартовый уровень: 1</li><li>Характеристики: любой метод</li><li>Книги: Книга игрока</li><li>Стартовый набор: снаряжение класса</li>";
      }
    }
    paint();
  }

  Object.keys(PRESETS).forEach(function (name) {
    C.registerView(name, function () { renderFeatView(name); });
  });

  var origSetWidth = C.setWidth;
  C.setWidth = function (width) {
    origSetWidth(width);
    var v = document.documentElement.getAttribute("data-view") || "";
    if (PRESETS[v]) renderFeatView(v);
  };

  var q = new URLSearchParams(location.search);
  var bootView = q.get("view") || document.documentElement.getAttribute("data-view");
  if (bootView && PRESETS[bootView]) C.applyView(bootView);
})();
