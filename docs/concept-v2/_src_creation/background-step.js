(function () {
  var C = window.CreationStep1;
  var DATA = window.BACKGROUNDS_2014;
  if (!C || !C.registerView || !DATA) return;

  var ROOTS = DATA.roots || [];
  var LANGS = DATA.languages || [];
  var SKILLS = DATA.skills || [];
  var ARTISAN = DATA.artisan_tools || [];
  var MUSICAL = DATA.musical_instruments || [];
  var GAMING = DATA.gaming_sets || [];
  var HOUSE = DATA.house_agent_tools || [];
  var KEEP = "__root__";
  var COMMON = "общий";
  var SOURCE_FIRST = ["PHB", "SCAG", "GGR"];
  var STEPS5 = ["race", "background", "class", "abilities", "leveling"];

  var DEFAULT_CONTEXT = {
    knownLanguages: ["Общий", "Эльфийский"],
    knownSkills: []
  };
  var CONTEXT = {
    knownLanguages: DEFAULT_CONTEXT.knownLanguages.slice(),
    knownSkills: DEFAULT_CONTEXT.knownSkills.slice()
  };

  function setContext(ctx) {
    CONTEXT.knownLanguages = (ctx && ctx.knownLanguages) ? ctx.knownLanguages.slice() : [];
    CONTEXT.knownSkills = (ctx && ctx.knownSkills) ? ctx.knownSkills.slice() : [];
  }

  var state = emptyState();

  function emptyState() {
    return {
      slug: null,
      variant: null,
      search: "",
      source: null,
      browseList: false,
      skills: [],
      tools: [],
      languages: [],
      equipmentPackageId: null,
      equipmentOrPicks: {},
      choiceTablePicks: {},
      personalityTraits: [],
      ideal: null,
      bond: null,
      flaw: null
    };
  }

  function emptyPicks() {
    return {
      skills: [],
      tools: [],
      languages: [],
      equipmentPackageId: null,
      equipmentOrPicks: {},
      choiceTablePicks: {},
      personalityTraits: [],
      ideal: null,
      bond: null,
      flaw: null
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

  function adaptHints(text) {
    return String(text || "").replace(/в попапе/gi, "здесь");
  }

  function skillLabel(id) {
    for (var i = 0; i < SKILLS.length; i++) if (SKILLS[i][0] === id) return SKILLS[i][1];
    return id;
  }

  function normLang(name) {
    return String(name || "").trim().toLowerCase();
  }

  function takeIfUnique(pool, count) {
    var n = count || 0;
    if (n > 0 && pool.length === n) return pool.slice();
    return [];
  }

  function expandToolToken(token) {
    if (token === "artisan_tools") return ARTISAN.slice();
    if (token === "musical_instruments") return MUSICAL.slice();
    if (token === "gaming_sets") return GAMING.slice();
    if (token === "thieves_tools") return ["Воровские инструменты"];
    if (token === "cartographer_or_navigator") return ["Инструменты картографа", "Инструменты навигатора"];
    if (token === "disguise_or_musical") return ["Набор для грима"].concat(MUSICAL);
    if (token === "house_agent_tools") return HOUSE.slice();
    return [token];
  }

  function expandToolChoices(raw) {
    if (!raw || !raw.count) return null;
    var from = [];
    var seen = {};
    (raw.from || []).forEach(function (token) {
      expandToolToken(token).forEach(function (name) {
        var key = name.toLowerCase();
        if (seen[key]) return;
        seen[key] = 1;
        from.push(name);
      });
    });
    return from.length ? { count: raw.count, from: from } : null;
  }

  function skillOptions(choice) {
    if (!choice) return [];
    if (choice.from === "any") return SKILLS.map(function (s) { return s[0]; });
    return (choice.from || []).slice();
  }

  function findRoot(slug) {
    for (var i = 0; i < ROOTS.length; i++) if (ROOTS[i].slug === slug) return ROOTS[i];
    return null;
  }

  function findVariant(root, slug) {
    var list = (root && root.variants) || [];
    for (var i = 0; i < list.length; i++) if (list[i].slug === slug) return list[i];
    return null;
  }

  function defOf(entry) {
    if (!entry) return null;
    return {
      slug: entry.slug,
      labelRu: entry.name_ru,
      nameEn: entry.name_en,
      source: entry.source,
      skillProficiencies: entry.skill_proficiencies || [],
      skillChoices: entry.skill_choices || null,
      toolProficiencies: entry.tool_proficiencies || [],
      toolChoices: expandToolChoices(entry.tool_choices),
      languages: entry.languages || [],
      languagesChoose: entry.languages_choose || 0,
      languagesChooseNoteRu: entry.languages_choose_note_ru || null,
      featureNameRu: entry.feature_name_ru || null,
      featureTextRu: entry.feature_text_ru || null,
      featNoteRu: entry.feat_note_ru || null,
      equipment: entry.equipment || [],
      equipmentOrChoices: entry.equipment_or_choices || [],
      equipmentNoteRu: entry.equipment_note_ru || null,
      choiceTables: entry.choice_tables || [],
      personalityTraits: entry.personality_traits || [],
      ideals: entry.ideals || [],
      bonds: entry.bonds || [],
      flaws: entry.flaws || [],
      notesRu: entry.notes_ru || null
    };
  }

  function currentRoot() { return findRoot(state.slug); }

  function currentEntry() {
    var root = currentRoot();
    if (!root) return null;
    var vars = root.variants || [];
    if (!vars.length) return root;
    if (!state.variant) return null;
    if (state.variant === KEEP) return root;
    return findVariant(root, state.variant);
  }

  function currentDef() { return defOf(currentEntry()); }

  function personalityPickCount(def) {
    var n = (def && def.personalityTraits && def.personalityTraits.length) || 0;
    if (n >= 2) return 2;
    if (n === 1) return 1;
    return 0;
  }

  function hasRp(def) {
    if (!def) return false;
    return (def.personalityTraits && def.personalityTraits.length) ||
      (def.ideals && def.ideals.length) ||
      (def.bonds && def.bonds.length) ||
      (def.flaws && def.flaws.length);
  }

  function blockedLangSet() {
    var set = {};
    (CONTEXT.knownLanguages || []).forEach(function (name) {
      var key = normLang(name);
      if (key && key !== COMMON) set[key] = 1;
    });
    return set;
  }

  function blockedSkillSet() {
    var set = {};
    (CONTEXT.knownSkills || []).forEach(function (id) {
      if (id) set[id] = 1;
    });
    return set;
  }

  function skillIsBlocked(id) {
    return !!blockedSkillSet()[id];
  }

  function languageOptions(def) {
    var fixed = {};
    (def.languages || []).forEach(function (n) { fixed[normLang(n)] = 1; });
    return LANGS.filter(function (name) {
      var key = normLang(name);
      if (key === COMMON) return false;
      if (fixed[key]) return false;
      return true;
    });
  }

  function applyPicks(p) {
    state.skills = (p.skills || []).filter(function (id) { return !skillIsBlocked(id); });
    state.tools = (p.tools || []).slice();
    state.languages = (p.languages || []).slice();
    state.equipmentPackageId = p.equipmentPackageId || null;
    state.equipmentOrPicks = Object.assign({}, p.equipmentOrPicks || {});
    state.choiceTablePicks = {};
    Object.keys(p.choiceTablePicks || {}).forEach(function (k) {
      state.choiceTablePicks[k] = (p.choiceTablePicks[k] || []).slice();
    });
    state.personalityTraits = (p.personalityTraits || []).slice();
    state.ideal = p.ideal || null;
    state.bond = p.bond || null;
    state.flaw = p.flaw || null;
  }

  function defaultPicks(def) {
    var p = emptyPicks();
    if (!def) return p;
    var sk = skillOptions(def.skillChoices).filter(function (id) { return !skillIsBlocked(id); });
    var skNeed = (def.skillChoices && def.skillChoices.count) || 0;
    p.skills = takeIfUnique(sk, skNeed);
    if (def.toolChoices && def.toolChoices.from) {
      p.tools = takeIfUnique(def.toolChoices.from, def.toolChoices.count || 0);
    }
    if (def.languagesChoose > 0) {
      var blocked = blockedLangSet();
      var opts = languageOptions(def).filter(function (n) { return !blocked[normLang(n)]; });
      p.languages = takeIfUnique(opts, def.languagesChoose);
    }
    (def.choiceTables || []).forEach(function (table) {
      p.choiceTablePicks[table.id] = takeIfUnique(table.options || [], table.count || 1);
    });
    /* equipment always has «Без снаряжения» as a second option — never auto */
    return p;
  }

  function selectRoot(slug) {
    var search = state.search;
    var source = state.source;
    state = emptyState();
    state.search = search;
    state.source = source;
    state.slug = slug;
    var root = findRoot(slug);
    var vars = (root && root.variants) || [];
    if (!vars.length) {
      state.variant = KEEP;
      applyPicks(defaultPicks(defOf(root)));
    } else {
      state.variant = null;
      applyPicks(emptyPicks());
    }
    state.browseList = false;
  }

  function selectVariant(key) {
    state.variant = key;
    var entry = currentEntry();
    applyPicks(defaultPicks(defOf(entry)));
  }

  function picksNow() {
    return {
      skills: state.skills.slice(),
      tools: state.tools.slice(),
      languages: state.languages.slice(),
      equipmentPackageId: state.equipmentPackageId,
      equipmentOrPicks: Object.assign({}, state.equipmentOrPicks),
      choiceTablePicks: state.choiceTablePicks,
      personalityTraits: state.personalityTraits.slice(),
      ideal: state.ideal,
      bond: state.bond,
      flaw: state.flaw
    };
  }

  function blockingState() {
    var root = currentRoot();
    if (!root) return [];
    var vars = root.variants || [];
    if (vars.length && !state.variant) {
      return [{ key: "variant", text: "Выбери базовый вариант или ответвление." }];
    }
    var def = currentDef();
    if (!def) {
      return [{ key: "variant", text: "Для этой записи пока нет пакета эффектов — закрой и заполни вручную." }];
    }
    var reasons = [];
    var picks = picksNow();
    (def.choiceTables || []).forEach(function (table) {
      var picked = picks.choiceTablePicks[table.id] || [];
      if (picked.length !== (table.count || 1)) {
        reasons.push({ key: "table:" + table.id, text: "Выбери «" + table.labelRu + "»: нужно " + (table.count || 1) + ", сейчас " + picked.length + "." });
      }
    });
    var skillNeed = (def.skillChoices && def.skillChoices.count) || 0;
    if (picks.skills.length !== skillNeed) {
      reasons.push({ key: "skills", text: "Выбери навыки: нужно " + skillNeed + ", сейчас " + picks.skills.length + "." });
    }
    var toolNeed = (def.toolChoices && def.toolChoices.count) || 0;
    if (picks.tools.length !== toolNeed) {
      reasons.push({ key: "tools", text: "Выбери инструменты: нужно " + toolNeed + ", сейчас " + picks.tools.length + "." });
    }
    if (picks.languages.length !== def.languagesChoose) {
      reasons.push({ key: "langs", text: "Выбери языки: нужно " + def.languagesChoose + ", сейчас " + picks.languages.length + "." });
    }
    if ((def.equipment || []).length > 0) {
      var id = picks.equipmentPackageId;
      if (!id) {
        reasons.push({ key: "equip", text: "Выбери снаряжение предыстории или «Без снаряжения»." });
      } else if (id !== "skip") {
        (def.equipmentOrChoices || []).forEach(function (choice) {
          if (!picks.equipmentOrPicks[choice.id]) {
            reasons.push({ key: "or:" + choice.id, text: "Выбери вариант: " + choice.labelRu + "." });
          }
        });
      }
    }
    var traitNeed = personalityPickCount(def);
    if (picks.personalityTraits.length > 0 && picks.personalityTraits.length !== traitNeed) {
      reasons.push({
        key: "traits",
        text: "Черты характера: нужно " + traitNeed + ", сейчас " + picks.personalityTraits.length + " (или сними все — заполнишь позже)."
      });
    }
    return reasons;
  }

  function blockingReason() {
    var list = blockingState();
    return list.length ? list[0].text : "";
  }

  function reasonAt(key) {
    var list = blockingState();
    var html = "";
    list.forEach(function (row) {
      if (row.key === key) html += '<p class="race-setup__block">' + esc(row.text) + "</p>";
    });
    return html;
  }

  function isReady() {
    return !!currentDef() && blockingState().length === 0;
  }

  function chip(label, on, attrs, extraClass) {
    return '<button class="seg' + (on ? " is-on" : "") + (extraClass ? " " + extraClass : "") + '" type="button"' + (attrs || "") + ">" + esc(label) + "</button>";
  }

  function cardMeta(root) {
    var def = defOf(root);
    if (!def) return "";
    if (def.skillProficiencies.length) {
      return def.skillProficiencies.map(skillLabel).join(", ");
    }
    if (def.skillChoices) return "навыки: выбрать " + def.skillChoices.count;
    return "";
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

  function catalogHtml() {
    var items = filteredRoots().map(function (row) {
      var on = row.slug === state.slug;
      var meta = cardMeta(row);
      return '<li><button class="create-pipeline__card' + (on ? " is-selected" : "") + '" type="button" data-bg-id="' + esc(row.slug) + '"' + (on ? ' aria-pressed="true"' : "") + ">" +
        '<span class="create-pipeline__card-title">' + esc(row.name_ru) + "</span>" +
        '<span class="create-pipeline__card-sub">' + esc(row.name_en) + "</span>" +
        (meta ? '<span class="create-pipeline__card-meta">' + esc(meta) + "</span>" : "") +
        '<span class="create-pipeline__card-source">' + esc(row.source) + "</span></button></li>";
    }).join("");
    var sourceChips = chip("Все", !state.source, ' data-bg-source=""') +
      sourcesInUse().map(function (s) {
        return chip(s, state.source === s, ' data-bg-source="' + esc(s) + '"');
      }).join("");
    return '<div class="create-pipeline__catalog-list">' +
      '<div class="create-pipeline__filters">' +
      '<label class="field-label" for="create-search">Поиск</label>' +
      '<input class="field" id="create-search" type="search" placeholder="Поиск по имени…" autocomplete="off" value="' + esc(state.search) + '" />' +
      '<p class="field-label">Источники</p>' +
      '<div class="create-pipeline__source-row">' + sourceChips + "</div></div>" +
      '<ul class="create-pipeline__card-list">' + (items || '<li class="t-muted">В каталоге пока мало предысторий</li>') + "</ul></div>";
  }

  function toggleInCap(list, id, cap) {
    var i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1);
    else if (list.length < cap) list.push(id);
    return list;
  }

  function fixedLine(def) {
    var parts = [];
    var skillHtml = "";
    if (def.skillProficiencies.length) {
      var anyBlocked = def.skillProficiencies.some(function (id) { return skillIsBlocked(id); });
      if (anyBlocked) {
        skillHtml = '<div class="race-setup__section"><h3>Навыки</h3>' +
          '<p class="t-muted">Серые — уже есть с расы.</p><div class="race-chip-row">';
        def.skillProficiencies.forEach(function (id) {
          var isBlocked = skillIsBlocked(id);
          var label = skillLabel(id) + (isBlocked ? " · уже есть" : "");
          var cls = isBlocked ? "is-blocked" : "is-static";
          skillHtml += chip(label, false, ' disabled title="' + (isBlocked ? "Уже есть с расы" : "Фиксированный навык") + '"', cls);
        });
        skillHtml += "</div></div>";
      } else {
        parts.push("Навыки: " + def.skillProficiencies.map(skillLabel).join(", "));
      }
    }
    if (def.toolProficiencies.length) parts.push("Инструменты: " + def.toolProficiencies.join(", "));
    if (def.languages.length) parts.push("Языки: " + def.languages.join(", "));
    var rest = parts.length ? '<p class="bg-fixed">' + esc(parts.join(" · ")) + "</p>" : "";
    return skillHtml + rest;
  }

  function detailHtml() {
    var phone = document.documentElement.getAttribute("data-width") === "phone";
    var root = currentRoot();
    if (!root) {
      return "<h2>Предыстория</h2>" +
        '<p class="t-muted">' + esc(C.emptyPickHint()) + "</p>";
    }
    var entry = currentEntry();
    var def = currentDef();
    var headName = entry ? entry.name_ru : root.name_ru;
    var headEn = entry ? (entry.name_en || root.name_en) : root.name_en;
    var src = entry && entry.source ? entry.source : root.source;
    var html = '<div class="race-setup bg-setup">';
    if (phone) html += '<button class="race-back" type="button" data-bg-back>← К списку предысторий</button>';
    html += '<div class="race-setup__head"><h2>' + esc(headName) + "</h2>" +
      (headEn ? '<p class="race-setup__en">' + esc(headEn) + "</p>" : "") +
      '<p class="race-setup__source">Источник: ' + esc(src) + "</p></div>";
    html += '<p class="t-muted">' + esc(
      "Сначала вариант (если есть), затем механика и таблицы из книги. Черты/идеалы можно пропустить. Смена предыстории отзовёт пакет."
    ) + "</p>";

    var vars = root.variants || [];
    if (vars.length) {
      var chips = chip(root.name_ru + " (базовый)", state.variant === KEEP, ' data-bg-var="' + KEEP + '"');
      chips += vars.map(function (v) {
        return chip(v.name_ru, state.variant === v.slug, ' data-bg-var="' + esc(v.slug) + '"');
      }).join("");
      html += '<div class="race-setup__section"><h3>Вариант предыстории</h3>' +
        '<p class="t-muted">Как подраса у расы — выбираешь здесь.</p>' +
        '<div class="race-chip-row">' + chips + "</div>" + reasonAt("variant") + "</div>";
    }

    if (def) {
      html += fixedLine(def);

      (def.choiceTables || []).forEach(function (table) {
        var picked = state.choiceTablePicks[table.id] || [];
        var long = (table.options || []).some(function (o) { return o.length > 48; });
        html += '<div class="race-setup__section"><h3>' + esc(table.labelRu) + " (" + picked.length + "/" + (table.count || 1) + ")</h3><div class=\"race-chip-row\">";
        (table.options || []).forEach(function (opt) {
          html += chip(opt, picked.indexOf(opt) >= 0, ' data-bg-table="' + esc(table.id) + ":" + esc(opt) + ":" + (table.count || 1) + '"', long ? "seg--wrap" : "");
        });
        html += "</div>" + reasonAt("table:" + table.id) + "</div>";
      });

      var skNeed = (def.skillChoices && def.skillChoices.count) || 0;
      var skFrom = skillOptions(def.skillChoices);
      if (skNeed > 0 && skFrom.length) {
        var anySkillBlocked = skFrom.some(function (id) { return skillIsBlocked(id); });
        html += '<div class="race-setup__section"><h3>Навыки на выбор (' + state.skills.length + "/" + skNeed + ")</h3>";
        if (anySkillBlocked) html += '<p class="t-muted">Серые — уже есть с расы.</p>';
        html += '<div class="race-chip-row">';
        skFrom.forEach(function (id) {
          var isBlocked = skillIsBlocked(id);
          var on = !isBlocked && state.skills.indexOf(id) >= 0;
          var label = skillLabel(id) + (isBlocked ? " · уже есть" : "");
          var attrs = isBlocked
            ? ' disabled title="Уже есть с расы" data-bg-skill-blocked="1"'
            : ' data-bg-skill="' + esc(id) + ":" + skNeed + '"';
          html += chip(label, on, attrs, isBlocked ? "is-blocked" : "");
        });
        html += "</div>" + reasonAt("skills") + "</div>";
      }

      if (def.toolChoices && def.toolChoices.from && def.toolChoices.count) {
        var tNeed = def.toolChoices.count;
        html += '<div class="race-setup__section"><h3>Инструменты на выбор (' + state.tools.length + "/" + tNeed + ")</h3><div class=\"race-chip-row\">";
        def.toolChoices.from.forEach(function (name) {
          html += chip(name, state.tools.indexOf(name) >= 0, ' data-bg-tool="' + esc(name) + ":" + tNeed + '"');
        });
        html += "</div>" + reasonAt("tools") + "</div>";
      }

      if (def.languagesChoose > 0) {
        var blocked = blockedLangSet();
        var opts = languageOptions(def);
        var hint = def.languagesChooseNoteRu
          ? adaptHints(def.languagesChooseNoteRu)
          : (Object.keys(blocked).length
            ? "Серые — уже с расы. Общий не в списке: он есть у всех."
            : "Общий не в списке: он есть у всех.");
        html += '<div class="race-setup__section"><h3>Языки на выбор (' + state.languages.length + "/" + def.languagesChoose + ")</h3>" +
          '<p class="t-muted">' + esc(hint) + "</p><div class=\"race-chip-row\">";
        opts.forEach(function (name) {
          var isBlocked = !!blocked[normLang(name)];
          var on = !isBlocked && state.languages.indexOf(name) >= 0;
          var label = name + (isBlocked ? " · уже есть" : "");
          var attrs = isBlocked
            ? ' disabled title="Уже есть с расы" data-bg-lang-blocked="1"'
            : ' data-bg-lang="' + esc(name) + ":" + def.languagesChoose + '"';
          html += chip(label, on, attrs, isBlocked ? "is-blocked" : "");
        });
        html += "</div>" + reasonAt("langs") + "</div>";
      }

      if ((def.equipment || []).length) {
        html += '<div class="race-setup__section"><h3>Снаряжение предыстории</h3>';
        if (def.equipmentNoteRu) html += '<p class="t-muted">' + esc(adaptHints(def.equipmentNoteRu)) + "</p>";
        html += '<div class="race-chip-row">';
        def.equipment.forEach(function (pack) {
          html += chip(pack.labelRu, state.equipmentPackageId === pack.id, ' data-bg-pack="' + esc(pack.id) + '"');
        });
        html += chip("Без снаряжения", state.equipmentPackageId === "skip", ' data-bg-pack="skip"');
        html += "</div>";
        var selectedPack = null;
        def.equipment.forEach(function (pack) { if (pack.id === state.equipmentPackageId) selectedPack = pack; });
        if (selectedPack && selectedPack.summary) {
          html += '<p class="bg-pack-note">' + esc(selectedPack.summary) + "</p>";
        } else if (state.equipmentPackageId === "skip") {
          html += '<p class="bg-pack-note">Куплю снаряжение за золото / заполню сам</p>';
        } else if (def.equipment.length === 1 && def.equipment[0].summary) {
          html += '<p class="bg-pack-note">' + esc(def.equipment[0].summary) + "</p>";
        }
        html += reasonAt("equip") + "</div>";

        if (state.equipmentPackageId && state.equipmentPackageId !== "skip") {
          (def.equipmentOrChoices || []).forEach(function (choice) {
            html += '<div class="race-setup__section"><h3>Снаряжение: ' + esc(choice.labelRu) + "</h3><div class=\"race-chip-row\">";
            (choice.options || []).forEach(function (opt) {
              html += chip(opt, state.equipmentOrPicks[choice.id] === opt, ' data-bg-or="' + esc(choice.id) + ":" + esc(opt) + '"');
            });
            html += "</div>" + reasonAt("or:" + choice.id) + "</div>";
          });
        }
      }

      if (def.featureNameRu) {
        html += '<div class="race-setup__section"><h3>Умение: ' + esc(def.featureNameRu) + "</h3>" +
          '<p class="race-setup__note">' + esc(displayDice(def.featureTextRu || "—")) + "</p>";
        if (def.featNoteRu) html += '<p class="race-setup__note">' + esc(displayDice(def.featNoteRu)) + "</p>";
        html += "</div>";
      }

      if (hasRp(def)) {
        var traitNeed = personalityPickCount(def);
        html += '<div class="race-setup__section"><h3 class="bg-rp-label">Персонализация <span>— по желанию</span></h3>';
        if (traitNeed > 0) {
          html += "<h3>Черты характера (" + state.personalityTraits.length + "/" + traitNeed + ")</h3><div class=\"race-chip-row\">";
          def.personalityTraits.forEach(function (opt) {
            html += chip(opt, state.personalityTraits.indexOf(opt) >= 0, ' data-bg-trait="' + esc(opt) + ":" + traitNeed + '"', "seg--wrap");
          });
          html += "</div>" + reasonAt("traits");
        }
        if (def.ideals.length) {
          html += "<h3>Идеал</h3><div class=\"race-chip-row\">";
          def.ideals.forEach(function (opt) {
            html += chip(opt, state.ideal === opt, ' data-bg-ideal="' + esc(opt) + '"', "seg--wrap");
          });
          html += "</div>";
        }
        if (def.bonds.length) {
          html += "<h3>Привязанность</h3><div class=\"race-chip-row\">";
          def.bonds.forEach(function (opt) {
            html += chip(opt, state.bond === opt, ' data-bg-bond="' + esc(opt) + '"', "seg--wrap");
          });
          html += "</div>";
        }
        if (def.flaws.length) {
          html += "<h3>Слабость</h3><div class=\"race-chip-row\">";
          def.flaws.forEach(function (opt) {
            html += chip(opt, state.flaw === opt, ' data-bg-flaw="' + esc(opt) + '"', "seg--wrap");
          });
          html += "</div>";
        }
        html += "</div>";
      }

      if (def.notesRu) html += '<p class="race-setup__note">' + esc(adaptHints(displayDice(def.notesRu))) + "</p>";
    }

    html += "</div>";
    return html;
  }

  function footerHtml() {
    var ready = isReady();
    return '<button class="btn btn-accent" type="button"' + (ready ? "" : " disabled") + ">Далее · Класс</button>";
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
    if (shell) {
      var primary = phone && !!state.slug && !state.browseList;
      shell.classList.toggle("create-pipeline--detail-primary", primary);
    }
    bind();
    requestAnimationFrame(function () { scrollSelectedCard(); });
  }

  function bindCards() {
    document.querySelectorAll("[data-bg-id]").forEach(function (b) {
      b.addEventListener("click", function () {
        selectRoot(b.getAttribute("data-bg-id"));
        paint();
      });
    });
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
    document.querySelectorAll("[data-bg-source]").forEach(function (b) {
      b.addEventListener("click", function () {
        var v = b.getAttribute("data-bg-source") || "";
        state.source = v || null;
        paint();
      });
    });
    bindCards();
    document.querySelectorAll("[data-bg-var]").forEach(function (b) {
      b.addEventListener("click", function () { selectVariant(b.getAttribute("data-bg-var")); paint(); });
    });
    document.querySelectorAll("[data-bg-skill]").forEach(function (b) {
      b.addEventListener("click", function () {
        var parts = (b.getAttribute("data-bg-skill") || "").split(":");
        toggleInCap(state.skills, parts[0], +parts[1] || 1);
        paint();
      });
    });
    document.querySelectorAll("[data-bg-tool]").forEach(function (b) {
      b.addEventListener("click", function () {
        var parts = (b.getAttribute("data-bg-tool") || "").split(":");
        toggleInCap(state.tools, parts[0], +parts[1] || 1);
        paint();
      });
    });
    document.querySelectorAll("[data-bg-lang]").forEach(function (b) {
      b.addEventListener("click", function () {
        var parts = (b.getAttribute("data-bg-lang") || "").split(":");
        toggleInCap(state.languages, parts[0], +parts[1] || 1);
        paint();
      });
    });
    document.querySelectorAll("[data-bg-table]").forEach(function (b) {
      b.addEventListener("click", function () {
        var raw = b.getAttribute("data-bg-table") || "";
        var bits = raw.split(":");
        var id = bits[0], cap = +bits[bits.length - 1] || 1;
        var opt = bits.slice(1, -1).join(":");
        if (!state.choiceTablePicks[id]) state.choiceTablePicks[id] = [];
        if (cap <= 1) {
          state.choiceTablePicks[id] = state.choiceTablePicks[id][0] === opt ? [] : [opt];
        } else {
          toggleInCap(state.choiceTablePicks[id], opt, cap);
        }
        paint();
      });
    });
    document.querySelectorAll("[data-bg-pack]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-bg-pack");
        state.equipmentPackageId = id;
        if (id === "skip") state.equipmentOrPicks = {};
        paint();
      });
    });
    document.querySelectorAll("[data-bg-or]").forEach(function (b) {
      b.addEventListener("click", function () {
        var raw = b.getAttribute("data-bg-or") || "";
        var i = raw.indexOf(":");
        state.equipmentOrPicks[raw.slice(0, i)] = raw.slice(i + 1);
        paint();
      });
    });
    document.querySelectorAll("[data-bg-trait]").forEach(function (b) {
      b.addEventListener("click", function () {
        var parts = (b.getAttribute("data-bg-trait") || "").split(":");
        var cap = +parts[parts.length - 1] || 1;
        var opt = parts.slice(0, -1).join(":");
        toggleInCap(state.personalityTraits, opt, cap);
        paint();
      });
    });
    document.querySelectorAll("[data-bg-ideal]").forEach(function (b) {
      b.addEventListener("click", function () {
        var v = b.getAttribute("data-bg-ideal");
        state.ideal = state.ideal === v ? null : v;
        paint();
      });
    });
    document.querySelectorAll("[data-bg-bond]").forEach(function (b) {
      b.addEventListener("click", function () {
        var v = b.getAttribute("data-bg-bond");
        state.bond = state.bond === v ? null : v;
        paint();
      });
    });
    document.querySelectorAll("[data-bg-flaw]").forEach(function (b) {
      b.addEventListener("click", function () {
        var v = b.getAttribute("data-bg-flaw");
        state.flaw = state.flaw === v ? null : v;
        paint();
      });
    });
    var back = document.querySelector("[data-bg-back]");
    if (back) back.addEventListener("click", function () { state.browseList = true; paint(); });
  }

  var PRESETS = {
    "bg-empty": function () {
      state = emptyState();
    },
    "bg-simple": function () {
      state = emptyState();
      selectRoot("urchin");
    },
    "bg-simple-ready": function () {
      state = emptyState();
      selectRoot("urchin");
      state.equipmentPackageId = "pack";
    },
    "bg-langs": function () {
      state = emptyState();
      selectRoot("acolyte");
    },
    "bg-variant": function () {
      state = emptyState();
      selectRoot("criminal");
    },
    "bg-tools": function () {
      state = emptyState();
      selectRoot("criminal");
      selectVariant(KEEP);
    },
    "bg-filter": function () {
      state = emptyState();
      state.source = "PHB";
    },
    "bg-filled": function () {
      state = emptyState();
      selectRoot("acolyte");
      state.languages = ["Дварфийский", "Великаний"];
      state.equipmentPackageId = "pack";
      state.equipmentOrPicks = { or_1: "Молитвенник" };
    },
    "bg-skill-conflict": function () {
      state = emptyState();
      selectRoot("soldier");
    }
  };

  function renderBgView(name) {
    if (name === "bg-skill-conflict") {
      setContext({ knownLanguages: ["Общий", "Орочий"], knownSkills: ["intimidation"] });
    } else {
      setContext(DEFAULT_CONTEXT);
    }
    var prep = PRESETS[name];
    if (prep) prep();
    C.renderPipeline({ step: "background", steps: STEPS5 });
    paint();
  }

  Object.keys(PRESETS).forEach(function (name) {
    C.registerView(name, function () { renderBgView(name); });
  });

  var origSetWidth = C.setWidth;
  C.setWidth = function (width) {
    origSetWidth(width);
    var v = document.documentElement.getAttribute("data-view") || "";
    if (PRESETS[v]) renderBgView(v);
  };

  var q = new URLSearchParams(location.search);
  var bootView = q.get("view") || document.documentElement.getAttribute("data-view");
  if (bootView && PRESETS[bootView]) C.applyView(bootView);
})();
