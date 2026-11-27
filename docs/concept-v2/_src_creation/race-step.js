(function () {
  var C = window.CreationStep1;
  var DATA = window.RACES_2014;
  if (!C || !C.registerView || !DATA) return;

  var ROOTS = DATA.roots || [];
  var LANGS = DATA.languages || [];
  var SKILLS = DATA.skills || [];
  var AB_ORDER = DATA.ability_order || ["str", "dex", "con", "int", "wis", "cha"];
  var AB_LABEL = DATA.ability_labels || {};
  var SIZE_LABEL = DATA.size_labels || {};
  var TASHA_MODES = [
    {
      id: "plus2_plus1",
      short: "+2 и +1",
      labelRu: "Увеличьте одну любую характеристику на +2 и любую другую характеристику на +1",
      buckets: [{ amount: 2, count: 1 }, { amount: 1, count: 1 }]
    },
    {
      id: "plus1x3",
      short: "три +1",
      labelRu: "Увеличьте одну любую характеристику на +1, любую другую на +1 и третью на +1",
      buckets: [{ amount: 1, count: 3 }]
    }
  ];
  var SOURCE_FIRST = ["PHB", "TCE", "MPMM"];
  var DEFAULT_NAME = "Новый персонаж";
  var NONE = "__none__";

  var state = emptyState();
  var genTick = 0;

  function emptyState() {
    return {
      slug: null,
      sub: null,
      name: DEFAULT_NAME,
      gender: null,
      size: null,
      trait: null,
      ancestry: null,
      langs: [],
      skills: [],
      tools: [],
      asiMode: null,
      asi: {},
      search: "",
      source: null,
      browseList: false
    };
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function adaptTraits(text) {
    return String(text || "")
      .replace(/в попапе/gi, "здесь")
      .replace(/в окне настройки расы/gi, "в панели расы");
  }

  function skillLabel(id) {
    for (var i = 0; i < SKILLS.length; i++) {
      if (SKILLS[i][0] === id) return SKILLS[i][1];
    }
    return id;
  }

  function findRoot(slug) {
    for (var i = 0; i < ROOTS.length; i++) if (ROOTS[i].slug === slug) return ROOTS[i];
    return null;
  }

  function findSub(root, slug) {
    var list = (root && root.subraces) || [];
    for (var i = 0; i < list.length; i++) if (list[i].slug === slug) return list[i];
    return null;
  }

  function pickVal(sub, root, key) {
    if (sub && sub[key] != null) return sub[key];
    return root ? root[key] : undefined;
  }

  function union(a, b) {
    var out = [];
    var seen = {};
    function add(list) {
      (list || []).forEach(function (x) {
        var k = typeof x === "string" ? x : JSON.stringify(x);
        if (seen[k]) return;
        seen[k] = 1;
        out.push(x);
      });
    }
    add(a); add(b);
    return out;
  }

  function mergeDef(root, sub) {
    if (!root) return null;
    if (!sub) {
      return Object.assign({}, root);
    }
    return {
      slug: sub.slug,
      name_ru: sub.name_ru,
      name_en: sub.name_en,
      source: sub.source || root.source,
      speed: pickVal(sub, root, "speed"),
      size: pickVal(sub, root, "size") || "medium",
      size_choices: sub.size_choices && sub.size_choices.length ? sub.size_choices : (root.size_choices || []),
      darkvision: pickVal(sub, root, "darkvision") || 0,
      ability_bonuses: (sub.ability_bonuses && Object.keys(sub.ability_bonuses).length)
        ? sub.ability_bonuses
        : (root.ability_bonuses || {}),
      ability_bonus_choices: sub.ability_bonus_choices || root.ability_bonus_choices,
      languages: union(root.languages, sub.languages),
      languages_choose: sub.languages_choose != null ? sub.languages_choose : (root.languages_choose || 0),
      skill_proficiencies: union(root.skill_proficiencies, sub.skill_proficiencies),
      skill_choices: sub.skill_choices || root.skill_choices,
      tool_choices: sub.tool_choices || root.tool_choices,
      weapon_proficiencies: union(root.weapon_proficiencies, sub.weapon_proficiencies),
      traits_text: (function () {
        var a = (root.traits_text || "").trim();
        var b = (sub.traits_text || "").trim();
        if (a && b && a !== b) return a + "\n\n" + b;
        return b || a;
      })(),
      feat_pick: !!(sub.feat_pick || root.feat_pick),
      feat_note_ru: sub.feat_note_ru || root.feat_note_ru || "",
      ancestry_choices: (sub.ancestry_choices && sub.ancestry_choices.length) ? sub.ancestry_choices : (root.ancestry_choices || []),
      variable_trait_choices: (sub.variable_trait_choices && sub.variable_trait_choices.length) ? sub.variable_trait_choices : (root.variable_trait_choices || []),
      racial_spells: union(root.racial_spells, sub.racial_spells),
      damage_resistances: union(root.damage_resistances, sub.damage_resistances)
    };
  }

  function currentRoot() { return findRoot(state.slug); }

  function currentEff() {
    var root = currentRoot();
    if (!root) return null;
    var subs = root.subraces || [];
    if (subs.length) {
      if (!state.sub) return null;
      if (state.sub === NONE) return mergeDef(root, null);
      return mergeDef(root, findSub(root, state.sub));
    }
    return mergeDef(root, null);
  }

  function defaultSub(root) {
    var subs = (root && root.subraces) || [];
    if (!subs.length) return null;
    if (subs.length === 1 && root.subrace_required) return subs[0].slug;
    /* На проде при развилке subraceKey стартует как null; «Без подрасы» не подставляем. */
    return null;
  }

  function resolveModes(choice) {
    if (!choice) return [];
    if (choice.preset === "tasha_flexible") return TASHA_MODES;
    if (choice.modes && choice.modes.length) return choice.modes;
    var count = choice.count || 0;
    var amount = choice.amount || 1;
    if (count <= 0) return [];
    return [{
      id: "default",
      short: "+" + amount + " к " + count + (count === 1 ? " характеристике" : " характеристикам"),
      labelRu: "+" + amount + " к " + count + (count === 1 ? " характеристике" : " характеристикам"),
      buckets: [{ amount: amount, count: count }],
      exclude: choice.exclude || []
    }];
  }

  function modeExclude(choice, mode) {
    return (mode && mode.exclude) || (choice && choice.exclude) || [];
  }

  function takeIfUnique(pool, count) {
    var n = count || 0;
    if (n > 0 && pool.length === n) return pool.slice();
    return [];
  }

  function defaultAsi(choice) {
    var modes = resolveModes(choice);
    if (!modes.length) return { asiMode: null, asi: {} };
    if (modes.length > 1) return { asiMode: null, asi: {} };
    var mode = modes[0];
    var exclude = modeExclude(choice, mode);
    var pool = AB_ORDER.filter(function (k) { return exclude.indexOf(k) < 0; });
    var asi = {};
    var used = {};
    (mode.buckets || []).forEach(function (b) {
      var available = pool.filter(function (k) { return !used[k]; });
      var keys = takeIfUnique(available, b.count || 0);
      keys.forEach(function (k) { used[k] = 1; });
      asi[String(b.amount)] = keys;
    });
    return { asiMode: mode.id, asi: asi };
  }

  function fillAsiForMode(choice, mode) {
    var asi = {};
    if (!mode) return asi;
    var exclude = modeExclude(choice, mode);
    var pool = AB_ORDER.filter(function (k) { return exclude.indexOf(k) < 0; });
    var used = {};
    (mode.buckets || []).forEach(function (b) {
      var available = pool.filter(function (k) { return !used[k]; });
      var keys = takeIfUnique(available, b.count || 0);
      keys.forEach(function (k) { used[k] = 1; });
      asi[String(b.amount)] = keys;
    });
    return asi;
  }

  function skillOptions(choice, trait) {
    var ch = choice;
    if (trait && trait.skill_choices) ch = trait.skill_choices;
    if (!ch) return [];
    if (ch.from === "any") return SKILLS.map(function (s) { return s[0]; });
    return ch.from || [];
  }

  function defaultPicks(eff) {
    var picks = {
      size: null,
      trait: null,
      ancestry: null,
      langs: [],
      skills: [],
      tools: [],
      asiMode: null,
      asi: {}
    };
    if (!eff) return picks;
    if (eff.size_choices && eff.size_choices.length === 1) {
      picks.size = eff.size_choices[0];
    } else if (eff.size_choices && eff.size_choices.length > 1) {
      picks.size = null;
    } else {
      picks.size = eff.size || "medium";
    }
    var traits = eff.variable_trait_choices || [];
    if (traits.length === 1) picks.trait = traits[0].id;
    var ancs = eff.ancestry_choices || [];
    if (ancs.length === 1) picks.ancestry = ancs[0].id;
    var known = eff.languages || [];
    var nLang = eff.languages_choose || 0;
    if (nLang > 0) {
      var availLangs = LANGS.filter(function (l) { return known.indexOf(l) < 0; });
      picks.langs = takeIfUnique(availLangs, nLang);
    }
    var traitObj = null;
    if (picks.trait) {
      for (var i = 0; i < traits.length; i++) if (traits[i].id === picks.trait) traitObj = traits[i];
    }
    var sk = skillOptions(eff.skill_choices, traitObj);
    var skCount = (traitObj && traitObj.skill_choices && traitObj.skill_choices.count) || (eff.skill_choices && eff.skill_choices.count) || 0;
    picks.skills = takeIfUnique(sk, skCount);
    var tools = eff.tool_choices;
    if (tools && tools.from && tools.from.length) {
      picks.tools = takeIfUnique(tools.from, tools.count || 1);
    }
    var asi = defaultAsi(eff.ability_bonus_choices);
    picks.asiMode = asi.asiMode;
    picks.asi = asi.asi;
    return picks;
  }

  function applyPicks(picks) {
    state.size = picks.size;
    state.trait = picks.trait;
    state.ancestry = picks.ancestry;
    state.langs = picks.langs.slice();
    state.skills = picks.skills.slice();
    state.tools = picks.tools.slice();
    state.asiMode = picks.asiMode;
    state.asi = {};
    Object.keys(picks.asi || {}).forEach(function (k) {
      state.asi[k] = (picks.asi[k] || []).slice();
    });
  }

  function selectRoot(slug, keepIdentity) {
    var name = keepIdentity ? state.name : DEFAULT_NAME;
    var gender = keepIdentity ? state.gender : null;
    var search = state.search;
    var source = state.source;
    state = emptyState();
    state.search = search;
    state.source = source;
    state.name = name || DEFAULT_NAME;
    state.gender = gender;
    state.slug = slug;
    var root = findRoot(slug);
    state.sub = defaultSub(root);
    if (state.sub && state.sub !== NONE) {
      applyPicks(defaultPicks(mergeDef(root, findSub(root, state.sub))));
    } else if (state.sub === NONE || !((root && root.subraces) || []).length) {
      applyPicks(defaultPicks(mergeDef(root, null)));
    } else {
      applyPicks(defaultPicks(null));
    }
    state.browseList = false;
  }

  function selectSub(slug) {
    var root = currentRoot();
    state.sub = slug;
    var sub = slug && slug !== NONE ? findSub(root, slug) : null;
    applyPicks(defaultPicks(mergeDef(root, sub)));
  }

  function selectedTrait() {
    var eff = currentEff();
    if (!eff || !state.trait) return null;
    var list = eff.variable_trait_choices || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === state.trait) return list[i];
    return null;
  }

  function asiReady(eff) {
    var modes = resolveModes(eff && eff.ability_bonus_choices);
    if (!modes.length) return true;
    var mode = null;
    for (var i = 0; i < modes.length; i++) if (modes[i].id === state.asiMode) mode = modes[i];
    if (!mode) return false;
    for (var b = 0; b < (mode.buckets || []).length; b++) {
      var bucket = mode.buckets[b];
      var keys = (state.asi && state.asi[String(bucket.amount)]) || [];
      if (keys.length !== (bucket.count || 0)) return false;
    }
    return true;
  }

  function blockingState() {
    var root = currentRoot();
    var eff = currentEff();
    if (!root) return null;
    if (!(state.name || "").trim()) {
      return { key: "name", text: "Укажи имя персонажа, чтобы продолжить." };
    }
    if (state.gender !== "male" && state.gender !== "female") {
      return { key: "gender", text: "Выбери пол персонажа." };
    }
    var subs = root.subraces || [];
    if (subs.length) {
      if (root.subrace_required && (!state.sub || state.sub === NONE)) {
        return { key: "subrace", text: "Выбери разновидность, чтобы продолжить." };
      }
      if (!root.subrace_required && !state.sub) {
        return { key: "subrace", text: "Выбери разновидность или «Без подрасы»." };
      }
    }
    if (!eff) return { key: "subrace", text: "Выбери разновидность, чтобы продолжить." };
    if (eff.size_choices && eff.size_choices.length && !state.size) {
      return { key: "size", text: "Выбери размер персонажа." };
    }
    if ((eff.variable_trait_choices || []).length && !state.trait) {
      return { key: "trait", text: "Выбери переменную черту." };
    }
    if (!asiReady(eff)) {
      var modes = resolveModes(eff.ability_bonus_choices);
      if (modes.length > 1 && !state.asiMode) {
        return { key: "asi", text: "Выбери вариант увеличения характеристик." };
      }
      var need = 0, have = 0, mode = null, bi;
      for (bi = 0; bi < modes.length; bi++) if (modes[bi].id === state.asiMode) mode = modes[bi];
      if (mode) {
        (mode.buckets || []).forEach(function (bucket) {
          need += bucket.count || 0;
          have += ((state.asi && state.asi[String(bucket.amount)]) || []).length;
        });
      }
      return { key: "asi", text: "Выбери характеристики: нужно " + (need || 2) + ", сейчас " + have + "." };
    }
    var needLang = eff.languages_choose || 0;
    if (state.langs.length < needLang) return { key: "langs", text: "Выбери дополнительные языки." };
    var trait = selectedTrait();
    var skCount = (trait && trait.skill_choices && trait.skill_choices.count) || (eff.skill_choices && eff.skill_choices.count) || 0;
    if (state.skills.length < skCount) return { key: "skills", text: "Выбери навыки." };
    var tools = eff.tool_choices;
    if (tools && (tools.count || 0) > 0 && state.tools.length < (tools.count || 0)) {
      return { key: "tools", text: "Выбери инструмент." };
    }
    if ((eff.ancestry_choices || []).length && !state.ancestry) {
      return { key: "ancestry", text: "Выбери драконье происхождение." };
    }
    return null;
  }

  function blockingReason() {
    var s = blockingState();
    return s ? s.text : "";
  }

  function reasonAt(key) {
    var s = blockingState();
    if (!s || s.key !== key) return "";
    return '<p class="race-setup__block">' + esc(s.text) + "</p>";
  }

  function isReady() {
    return !!state.slug && !blockingReason();
  }

  function hasFeat() {
    var eff = currentEff();
    return !!(eff && eff.feat_pick);
  }

  function nextLabel() {
    return hasFeat() ? "Далее · Черта" : "Далее · Предыстория";
  }

  function sourcesInUse() {
    var set = {};
    ROOTS.forEach(function (r) { if (r.source) set[r.source] = 1; });
    var rest = Object.keys(set).filter(function (s) { return SOURCE_FIRST.indexOf(s) < 0; }).sort();
    return SOURCE_FIRST.filter(function (s) { return set[s]; }).concat(rest);
  }

  function filteredRoots() {
    var q = (state.search || "").trim().toLowerCase();
    return ROOTS.filter(function (r) {
      if (state.source && r.source !== state.source) return false;
      if (!q) return true;
      return (r.name_ru || "").toLowerCase().indexOf(q) >= 0
        || (r.name_en || "").toLowerCase().indexOf(q) >= 0
        || (r.slug || "").toLowerCase().indexOf(q) >= 0;
    });
  }

  function chip(label, on, attrs) {
    return '<button class="seg' + (on ? " is-on" : "") + '" type="button"' + (attrs || "") + ">" + esc(label) + "</button>";
  }

  function catalogHtml() {
    var items = filteredRoots().map(function (row) {
      var on = row.slug === state.slug;
      return '<li><button class="create-pipeline__card' + (on ? " is-selected" : "") + '" type="button" data-race-id="' + esc(row.slug) + '"' + (on ? ' aria-pressed="true"' : "") + ">" +
        '<span class="create-pipeline__card-title">' + esc(row.name_ru) + "</span>" +
        '<span class="create-pipeline__card-sub">' + esc(row.name_en) + "</span>" +
        (row.meta ? '<span class="create-pipeline__card-meta">' + esc(row.meta) + "</span>" : "") +
        '<span class="create-pipeline__card-source">' + esc(row.source) + "</span></button></li>";
    }).join("");
    var sourceChips = chip("Все", !state.source, ' data-race-source=""') +
      sourcesInUse().map(function (s) {
        return chip(s, state.source === s, ' data-race-source="' + esc(s) + '"');
      }).join("");
    return '<div class="create-pipeline__catalog-list">' +
      '<div class="create-pipeline__filters">' +
      '<label class="field-label" for="create-search">Поиск</label>' +
      '<input class="field" id="create-search" type="search" placeholder="Поиск по имени…" autocomplete="off" value="' + esc(state.search) + '" />' +
      '<p class="field-label">Источники</p>' +
      '<div class="create-pipeline__source-row">' + sourceChips + "</div></div>" +
      '<ul class="create-pipeline__card-list">' + items + "</ul></div>";
  }

  function factsHtml(eff) {
    var rows = [];
    if (eff.speed != null) rows.push(["Скорость", eff.speed + " фт"]);
    rows.push(["Размер", SIZE_LABEL[state.size || eff.size] || state.size || eff.size || "Средний"]);
    var dv = eff.darkvision || 0;
    if (state.trait) {
      var t = selectedTrait();
      if (t && t.darkvision) dv = t.darkvision;
      if (t && t.id === "skill") dv = eff.darkvision || 0;
    }
    rows.push(["Тёмное зрение", dv ? dv + " фт" : "нет"]);
    var fixed = [];
    var bonuses = eff.ability_bonuses || {};
    AB_ORDER.forEach(function (k) {
      if (bonuses[k]) fixed.push((AB_LABEL[k] || k) + "+" + bonuses[k]);
    });
    if (fixed.length) rows.push(["Фиксированные бонусы", fixed.join(" · ")]);
    var langs = (eff.languages || []).slice();
    langs = langs.concat(state.langs);
    if (langs.length) rows.push(["Языки", langs.join(", ")]);
    var skills = (eff.skill_proficiencies || []).map(skillLabel).concat(state.skills.map(skillLabel));
    if (skills.length) rows.push(["Навыки", skills.join(", ")]);
    if (state.tools.length) rows.push(["Инструменты", state.tools.join(", ")]);
    if (eff.weapon_proficiencies && eff.weapon_proficiencies.length) {
      rows.push(["Оружие", eff.weapon_proficiencies.join(", ")]);
    }
    return '<dl class="race-facts">' + rows.map(function (r) {
      return "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd>";
    }).join("") + "</dl>";
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

  function identityHtml(root) {
    var hasFork = (root.subraces || []).length > 0;
    var genOff = !state.gender || (hasFork && !state.sub);
    var hasNaming = !!(root.naming);
    return '<div class="race-setup__section race-ident">' +
      '<label class="field-label" for="race-name">Имя</label>' +
      '<div class="race-ident__name">' +
      '<input class="field" id="race-name" type="text" autocomplete="off" value="' + esc(state.name) + '" />' +
      (hasNaming ? '<button class="btn" type="button" data-race-gen' + (genOff ? " disabled" : "") + ">Сгенерировать имя</button>" : "") +
      "</div>" +
      '<p class="field-label">Пол</p>' +
      '<div class="race-chip-row">' +
      chip("Мужской", state.gender === "male", ' data-race-gender="male"') +
      chip("Женский", state.gender === "female", ' data-race-gender="female"') +
      "</div>" + reasonAt("name") + reasonAt("gender") + "</div>";
  }

  function subraceHtml(root) {
    var subs = root.subraces || [];
    if (!subs.length) return "";
    var chips = "";
    if (!root.subrace_required) {
      chips += chip("Без подрасы", state.sub === NONE, ' data-race-sub="' + NONE + '"');
    }
    chips += subs.map(function (s) {
      return chip(s.name_ru, state.sub === s.slug, ' data-race-sub="' + esc(s.slug) + '"');
    }).join("");
    var title = root.subrace_required ? "Разновидности (обязательно)" : "Разновидности (необязательно)";
    return '<div class="race-setup__section"><h3>' + title + "</h3><div class=\"race-chip-row\">" + chips + "</div>" + reasonAt("subrace") + "</div>";
  }

  function choiceChips(title, items, selected, attr) {
    if (!items.length) return "";
    return '<div class="race-setup__section"><h3>' + esc(title) + "</h3><div class=\"race-chip-row\">" +
      items.map(function (it) {
        return chip(it.label, selected.indexOf(it.id) >= 0 || selected === it.id, " " + attr + '="' + esc(it.id) + '"');
      }).join("") + "</div></div>";
  }

  function asiHtml(eff) {
    var choice = eff.ability_bonus_choices;
    var modes = resolveModes(choice);
    if (!modes.length) return "";
    var mode = null;
    for (var i = 0; i < modes.length; i++) if (modes[i].id === state.asiMode) mode = modes[i];
    var html = '<div class="race-setup__section"><h3>Бонусы характеристик</h3>';
    if (modes.length > 1) {
      html += '<div class="race-chip-row">' + modes.map(function (m) {
        return chip(m.short || m.labelRu, state.asiMode === m.id, ' data-race-asi-mode="' + esc(m.id) + '"');
      }).join("") + "</div>";
    }
    if (mode) {
      html += '<p class="race-setup__mode-text">' + esc(mode.labelRu) + "</p>";
      var exclude = modeExclude(choice, mode);
      var pool = AB_ORDER.filter(function (k) { return exclude.indexOf(k) < 0; });
      (mode.buckets || []).forEach(function (b) {
        var keys = (state.asi && state.asi[String(b.amount)]) || [];
        html += '<p class="field-label">+' + b.amount + "</p>";
        html += '<div class="race-chip-row">' + pool.map(function (k) {
          return chip(AB_LABEL[k] || k, keys.indexOf(k) >= 0, ' data-race-asi="' + b.amount + ":" + k + '"');
        }).join("") + "</div>";
      });
    }
    html += reasonAt("asi");
    return html + "</div>";
  }

  function detailHtml() {
    var phone = document.documentElement.getAttribute("data-width") === "phone";
    var root = currentRoot();
    if (!root) {
      return "<h2>Раса</h2>" +
        '<p class="t-muted">' + esc(C.emptyPickHint()) + "</p>";
    }
    var eff = currentEff();
    var headName = (eff && state.sub && state.sub !== NONE) ? eff.name_ru : root.name_ru;
    var headEn = (eff && state.sub && state.sub !== NONE) ? (eff.name_en || root.name_en) : root.name_en;
    var src = (eff && state.sub && state.sub !== NONE && eff.source) ? eff.source : root.source;
    var html = '<div class="race-setup">';
    if (phone) html += '<button class="race-back" type="button" data-race-back>← К списку рас</button>';
    html += '<div class="race-setup__head"><h2>' + esc(headName) + "</h2>" +
      (headEn ? '<p class="race-setup__en">' + esc(headEn) + "</p>" : "") +
      '<p class="race-setup__source">Источник: ' + esc(src) + "</p></div>";
    var hasFork = (root.subraces || []).length > 0;
    if (hasFork && !state.sub) {
      html += '<p class="t-muted">Сначала разновидность' + (root.subrace_required ? " (обязательно)" : "") + " — от неё зависят имена и черты. Затем пол и имя.</p>";
    }
    html += identityHtml(root);
    html += subraceHtml(root);
    if (eff) {
      if (eff.size_choices && eff.size_choices.length) {
        html += '<div class="race-setup__section"><h3>Размер</h3><div class="race-chip-row">' +
          eff.size_choices.map(function (s) {
            return chip(SIZE_LABEL[s] || s, state.size === s, ' data-race-size="' + esc(s) + '"');
          }).join("") + "</div>" + reasonAt("size") + "</div>";
      }
      var traits = eff.variable_trait_choices || [];
      if (traits.length) {
        html += '<div class="race-setup__section"><h3>Дополнительная черта</h3><div class="race-chip-row">' +
          traits.map(function (t) {
            return chip(t.label_ru || t.id, state.trait === t.id, ' data-race-trait="' + esc(t.id) + '"');
          }).join("") + "</div>" + reasonAt("trait") + "</div>";
      }
      html += asiHtml(eff);
      var known = eff.languages || [];
      var needLang = eff.languages_choose || 0;
      if (needLang) {
        var opts = LANGS.filter(function (l) { return known.indexOf(l) < 0; });
        html += '<div class="race-setup__section"><h3>Дополнительные языки</h3><div class="race-chip-row">' +
          opts.map(function (l) {
            return chip(l, state.langs.indexOf(l) >= 0, ' data-race-lang="' + esc(l) + '"');
          }).join("") + "</div>" + reasonAt("langs") + "</div>";
      }
      var trait = selectedTrait();
      var skFrom = skillOptions(eff.skill_choices, trait);
      var skCount = (trait && trait.skill_choices && trait.skill_choices.count) || (eff.skill_choices && eff.skill_choices.count) || 0;
      if (skCount && skFrom.length) {
        html += '<div class="race-setup__section"><h3>Навыки на выбор</h3><div class="race-chip-row">' +
          skFrom.map(function (id) {
            return chip(skillLabel(id), state.skills.indexOf(id) >= 0, ' data-race-skill="' + esc(id) + '"');
          }).join("") + "</div>" + reasonAt("skills") + "</div>";
      }
      if (eff.tool_choices && eff.tool_choices.from) {
        html += '<div class="race-setup__section"><h3>Инструменты</h3><div class="race-chip-row">' +
          eff.tool_choices.from.map(function (id) {
            return chip(id, state.tools.indexOf(id) >= 0, ' data-race-tool="' + esc(id) + '"');
          }).join("") + "</div>" + reasonAt("tools") + "</div>";
      }
      if (eff.ancestry_choices && eff.ancestry_choices.length) {
        var anc = null;
        eff.ancestry_choices.forEach(function (a) { if (a.id === state.ancestry) anc = a; });
        html += '<div class="race-setup__section"><h3>Драконье происхождение</h3><div class="race-chip-row">' +
          eff.ancestry_choices.map(function (a) {
            return chip(a.label_ru || a.id, state.ancestry === a.id, ' data-race-anc="' + esc(a.id) + '"');
          }).join("") + "</div>";
        if (anc) {
          html += '<p class="race-setup__note">' + esc((anc.damage || "") + (anc.breath ? " · дыхание " + anc.breath : "")) + "</p>";
        }
        html += reasonAt("ancestry") + "</div>";
      }
      if (eff.feat_pick || eff.feat_note_ru) {
        html += '<div class="race-setup__section"><h3>Черта</h3><p class="race-setup__note">' +
          esc(eff.feat_note_ru || "Черту расы выберешь на следующем шаге «Черта».") + "</p></div>";
      }
      html += '<div class="race-setup__section"><h3>Основные</h3>' + factsHtml(eff) + "</div>";
      if (eff.racial_spells && eff.racial_spells.length) {
        html += '<div class="race-setup__section"><h3>Расовые заклинания</h3><p class="race-setup__note">' +
          esc(eff.racial_spells.map(function (s) { return s.name_ru || s.id; }).join(" · ")) + "</p></div>";
      }
      if (eff.traits_text) {
        html += '<div class="race-setup__section"><h3>Черты</h3><p class="race-setup__traits">' + esc(adaptTraits(eff.traits_text)) + "</p></div>";
      }
    }
    html += "</div>";
    return html;
  }

  function footerHtml() {
    var ready = isReady();
    return '<button class="btn btn-accent" type="button"' + (ready ? "" : " disabled") + ">" + esc(nextLabel()) + "</button>";
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
    var clipped = pane.querySelectorAll(".create-pipeline__card");
    for (var i = 0; i < clipped.length; i++) {
      var r = clipped[i].getBoundingClientRect();
      if (r.top < pr.top - 1 && r.bottom > pr.top + 10) {
        var need = pr.top - r.top;
        var room = pr.bottom - selected.getBoundingClientRect().bottom;
        if (room >= need) pane.scrollTop = Math.max(0, pane.scrollTop - need);
        break;
      }
    }
  }

  function generateName() {
    var root = currentRoot();
    if (!root || !root.naming || !state.gender) return;
    var pools = root.naming.pools || {};
    var patterns = root.naming.patterns || [];
    if (!patterns.length) return;
    var pat = patterns[genTick % patterns.length];
    genTick += 1;
    var genderKey = state.gender === "female" ? "female" : "male";
    var text = pat.template || "{given}";
    Object.keys(pools).forEach(function (key) {
      var pool = pools[key];
      var list = Array.isArray(pool) ? pool : ((pool && (pool[genderKey] || pool.any)) || []);
      if (!list.length) return;
      var word = list[(genTick + key.length) % list.length];
      text = text.replace(new RegExp("\\{" + key + "\\}", "g"), word);
    });
    state.name = text;
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
    document.querySelectorAll("[data-race-source]").forEach(function (b) {
      b.addEventListener("click", function () {
        var v = b.getAttribute("data-race-source") || "";
        state.source = v || null;
        paint();
      });
    });
    bindCards();
    var name = document.getElementById("race-name");
    if (name) {
      name.addEventListener("input", function () {
        var start = name.selectionStart, end = name.selectionEnd;
        state.name = name.value;
        paint();
        var again = document.getElementById("race-name");
        if (again) {
          again.focus();
          try { again.setSelectionRange(start, end); } catch (e) {}
        }
      });
    }
    var gen = document.querySelector("[data-race-gen]");
    if (gen) gen.addEventListener("click", function () { generateName(); paint(); });
    document.querySelectorAll("[data-race-gender]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.gender = b.getAttribute("data-race-gender");
        paint();
      });
    });
    document.querySelectorAll("[data-race-sub]").forEach(function (b) {
      b.addEventListener("click", function () {
        selectSub(b.getAttribute("data-race-sub"));
        paint();
      });
    });
    document.querySelectorAll("[data-race-size]").forEach(function (b) {
      b.addEventListener("click", function () { state.size = b.getAttribute("data-race-size"); paint(); });
    });
    document.querySelectorAll("[data-race-trait]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.trait = b.getAttribute("data-race-trait");
        var trait = selectedTrait();
        if (trait && trait.skill_choices) {
          var opts = skillOptions(null, trait);
          state.skills = takeIfUnique(opts, trait.skill_choices.count || 0);
        } else if (!(currentEff() && currentEff().skill_choices)) {
          state.skills = [];
        }
        paint();
      });
    });
    document.querySelectorAll("[data-race-asi-mode]").forEach(function (b) {
      b.addEventListener("click", function () {
        var eff = currentEff();
        state.asiMode = b.getAttribute("data-race-asi-mode");
        var modes = resolveModes(eff && eff.ability_bonus_choices);
        var mode = null;
        for (var i = 0; i < modes.length; i++) if (modes[i].id === state.asiMode) mode = modes[i];
        if (mode) {
          state.asi = fillAsiForMode(eff && eff.ability_bonus_choices, mode);
        } else {
          state.asi = {};
        }
        paint();
      });
    });
    document.querySelectorAll("[data-race-asi]").forEach(function (b) {
      b.addEventListener("click", function () {
        var raw = b.getAttribute("data-race-asi") || "";
        var parts = raw.split(":");
        var amount = parts[0];
        var key = parts[1];
        var eff = currentEff();
        var modes = resolveModes(eff && eff.ability_bonus_choices);
        var mode = null;
        for (var i = 0; i < modes.length; i++) if (modes[i].id === state.asiMode) mode = modes[i];
        var cap = 1;
        if (mode) {
          (mode.buckets || []).forEach(function (bucket) {
            if (String(bucket.amount) === amount) cap = bucket.count || 1;
          });
        }
        /* unique across buckets */
        Object.keys(state.asi).forEach(function (a) {
          if (a === amount) return;
          state.asi[a] = (state.asi[a] || []).filter(function (k) { return k !== key; });
        });
        if (!state.asi[amount]) state.asi[amount] = [];
        toggleIn(state.asi[amount], key, cap);
        paint();
      });
    });
    document.querySelectorAll("[data-race-lang]").forEach(function (b) {
      b.addEventListener("click", function () {
        var eff = currentEff();
        toggleIn(state.langs, b.getAttribute("data-race-lang"), (eff && eff.languages_choose) || 1);
        paint();
      });
    });
    document.querySelectorAll("[data-race-skill]").forEach(function (b) {
      b.addEventListener("click", function () {
        var eff = currentEff();
        var trait = selectedTrait();
        var cap = (trait && trait.skill_choices && trait.skill_choices.count) || (eff && eff.skill_choices && eff.skill_choices.count) || 1;
        toggleIn(state.skills, b.getAttribute("data-race-skill"), cap);
        paint();
      });
    });
    document.querySelectorAll("[data-race-tool]").forEach(function (b) {
      b.addEventListener("click", function () {
        var eff = currentEff();
        var cap = (eff && eff.tool_choices && eff.tool_choices.count) || 1;
        toggleIn(state.tools, b.getAttribute("data-race-tool"), cap);
        paint();
      });
    });
    document.querySelectorAll("[data-race-anc]").forEach(function (b) {
      b.addEventListener("click", function () { state.ancestry = b.getAttribute("data-race-anc"); paint(); });
    });
    var back = document.querySelector("[data-race-back]");
    if (back) back.addEventListener("click", function () { state.browseList = true; paint(); });
  }

  function bindCards() {
    document.querySelectorAll("[data-race-id]").forEach(function (b) {
      b.addEventListener("click", function () {
        selectRoot(b.getAttribute("data-race-id"), true);
        paint();
      });
    });
  }

  var PRESETS = {
    "race-empty": function () {
      state = emptyState();
    },
    "race-no-subrace": function () {
      state = emptyState();
      selectRoot("half_orc", false);
      selectSub(NONE);
      state.gender = "male";
    },
    "race-subraces": function () {
      state = emptyState();
      selectRoot("dwarf", false);
      state.sub = null;
      applyPicks(defaultPicks(null));
      state.gender = "male";
    },
    "race-subrace-picked": function () {
      state = emptyState();
      selectRoot("dwarf", false);
      selectSub("hill_dwarf");
      state.gender = "male";
    },
    "race-half-elf": function () {
      state = emptyState();
      selectRoot("half_elf", false);
      selectSub(NONE);
      state.gender = "female";
    },
    "race-human-variant": function () {
      state = emptyState();
      selectRoot("human", false);
      selectSub("human_variant");
      state.gender = "male";
    },
    "race-filter": function () {
      state = emptyState();
      state.source = "PHB";
    },
    "race-dragonborn": function () {
      state = emptyState();
      selectRoot("dragonborn", false);
      selectSub(NONE);
      state.gender = "female";
    }
  };

  function renderRaceView(name) {
    var prep = PRESETS[name];
    if (prep) prep();
    var steps = hasFeat() ? ["race", "feat", "background", "class", "abilities", "leveling"]
      : ["race", "background", "class", "abilities", "leveling"];
    C.renderPipeline({ step: "race", steps: steps });
    paint();
  }

  Object.keys(PRESETS).forEach(function (name) {
    C.registerView(name, function () { renderRaceView(name); });
  });

  var origSetWidth = C.setWidth;
  C.setWidth = function (width) {
    origSetWidth(width);
    var v = document.documentElement.getAttribute("data-view") || "";
    if (PRESETS[v]) renderRaceView(v);
  };

  C.paintRaceStep = paint;
  C.getRaceState = function () { return state; };

  var q = new URLSearchParams(location.search);
  var bootView = q.get("view") || document.documentElement.getAttribute("data-view");
  if (bootView && PRESETS[bootView]) C.applyView(bootView);
})();
