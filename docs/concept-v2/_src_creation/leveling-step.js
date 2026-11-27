(function () {
  var C = window.CreationStep1;
  var DATA = window.LEVELING_2014;
  if (!C || !C.registerView || !DATA) return;

  var STEPS5 = ["race", "background", "class", "abilities", "leveling"];
  var ORDER = ["str", "dex", "con", "int", "wis", "cha"];
  var SHORT = { str: "СИЛ", dex: "ЛОВ", con: "ТЕЛ", int: "ИНТ", wis: "МУД", cha: "ХАР" };
  var LONG = { str: "Сила", dex: "Ловкость", con: "Телосложение", int: "Интеллект", wis: "Мудрость", cha: "Харизма" };
  var CLASSES = DATA.classes || [];
  var STYLES = DATA.fighting_styles || [];
  var FIGHTER_STYLES = DATA.fighter_fighting_styles || [];
  var INVS = DATA.invocations || [];
  var BOONS = DATA.pact_boons || [];
  var SPELLS = DATA.spells || [];
  var PROG = DATA.progression || {};
  var PREREQ = DATA.mc_prereq || {};
  var SKILLS = DATA.skills || [];
  var PALADIN_STYLES = DATA.paladin_fighting_styles || [];
  var RANGER_STYLES = DATA.ranger_fighting_styles || [];
  var METAMAGIC = DATA.metamagic || [];
  var INFUSIONS = DATA.infusions || [];
  var FAV_ENEMY = DATA.ranger_favored_enemies || [];
  var FAV_TERRAIN = DATA.ranger_favored_terrains || [];
  var SCHOOL_RU = {
    abjuration: "ограждение",
    conjuration: "вызов",
    divination: "прорицание",
    enchantment: "очарование",
    evocation: "воплощение",
    illusion: "иллюзия",
    necromancy: "некромантия",
    transmutation: "преобразование"
  };

  function schoolLabelRu(school) {
    if (!school) return "";
    return SCHOOL_RU[String(school).toLowerCase()] || "";
  }

  function spellMetaLine(sp, extra) {
    var bits = [];
    bits.push(sp.level === 0 ? "Заговор" : (sp.level + " круг"));
    var sch = schoolLabelRu(sp.school);
    if (sch) bits.push(sch);
    (extra || []).forEach(function (x) { if (x) bits.push(x); });
    return bits.join(" · ");
  }

  var CONTEXT = { abilities: emptyAbil(10), knownSkills: [], lobby: false, startLevel: 1 };

  var state = emptyState();

  function emptyAbil(v) {
    var o = {};
    ORDER.forEach(function (k) { o[k] = v; });
    return o;
  }

  function classBySlug(slug) {
    for (var i = 0; i < CLASSES.length; i++) if (CLASSES[i].slug === slug) return CLASSES[i];
    return null;
  }

  function newClassRow(slug, level, primary) {
    var def = classBySlug(slug);
    return {
      id: slug + "-" + Math.random().toString(36).slice(2, 7),
      slug: slug,
      name_ru: def ? def.name_ru : slug,
      level: level || 1,
      primary: !!primary
    };
  }

  function emptyFork() {
    return {
      subclass: null,
      style: null,
      pact: null,
      invocations: [],
      asiMode: null,
      asiKeys: [],
      featSlug: null,
      mcSkills: [],
      expertise: [],
      metamagic: [],
      infusions: [],
      favoredEnemy: null,
      favoredTerrain: null
    };
  }

  function emptySpells() {
    return { cantrips: [], known: [], book: [], prepared: [], ritualView: false, circle: 0 };
  }

  function emptyState() {
    return {
      classes: [],
      hp: {},
      forks: {},
      spells: {},
      mcOpen: false,
      ritualWizard: false,
      ui: { tab: null, open: {}, q: "", scrollNeed: false }
    };
  }

  function ensureRow(row) {
    if (!state.forks[row.id]) state.forks[row.id] = emptyFork();
    if (!state.spells[row.id]) state.spells[row.id] = emptySpells();
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

  function dieSides(die) {
    var m = String(die || "d8").match(/(\d+)/);
    return m ? Number(m[1]) : 8;
  }

  function dieLabel(die) {
    return "к" + dieSides(die);
  }

  function averageFace(die) {
    return Math.floor(dieSides(die) / 2) + 1;
  }

  function totalLevel() {
    return state.classes.reduce(function (s, r) { return s + (r.level || 0); }, 0);
  }

  function hpKey(id, lvl) { return id + ":" + lvl; }

  function syncHp() {
    var next = {};
    state.classes.forEach(function (row, idx) {
      for (var lvl = 1; lvl <= row.level; lvl++) {
        var key = hpKey(row.id, lvl);
        var prev = state.hp[key];
        var origin = (row.primary || idx === 0) && lvl === 1;
        next[key] = prev ? { mode: origin ? "max" : prev.mode, rolled: origin ? null : prev.rolled } : { mode: origin ? "max" : null, rolled: null };
      }
    });
    state.hp = next;
  }

  function modOf(score) { return Math.floor(((score || 10) - 10) / 2); }

  function featsList() {
    var pack = window.FEATS_2014 || {};
    return pack.feats || pack || [];
  }

  function spellBySlug(slug) {
    for (var i = 0; i < SPELLS.length; i++) if (SPELLS[i].slug === slug) return SPELLS[i];
    return null;
  }

  function spellsFor(clsSlug, level) {
    return SPELLS.filter(function (s) {
      return s.classes.indexOf(clsSlug) >= 0 && (level == null || s.level === level);
    });
  }

  function featureAt(def, id) {
    var list = (def && def.features) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id || (list[i].id && list[i].id.indexOf(id) === 0)) return list[i];
    return null;
  }

  function featuresUpTo(def, level) {
    return ((def && def.features) || []).filter(function (f) { return f.level <= level && !f.optional; });
  }

  function hasFeature(def, level, test) {
    return featuresUpTo(def, level).some(test);
  }

  function subclassOpen(def, level) {
    var gate = def && def.subclass_level;
    return !!gate && level >= gate;
  }

  function styleOpen(def, level) {
    return hasFeature(def, level, function (f) {
      return /fighting_style/.test(f.id || "") || (f.choice && /fighting_styles/.test(f.choice.options_from || ""));
    });
  }

  function asiOpen(def, level) {
    return hasFeature(def, level, function (f) { return f.id.indexOf("asi_") === 0 || (f.name_en === "Ability Score Improvement"); });
  }

  function invocationsNeeded(level) {
    if (level >= 18) return 8;
    if (level >= 15) return 7;
    if (level >= 12) return 6;
    if (level >= 9) return 5;
    if (level >= 7) return 4;
    if (level >= 5) return 3;
    if (level >= 2) return 2;
    return 0;
  }

  function cantripsMax(def, level) {
    var arr = def.slug === "warlock" ? PROG.warlock_cantrips : def.slug === "wizard" ? PROG.wizard_cantrips : def.slug === "cleric" ? PROG.cleric_cantrips : null;
    return arr ? (arr[level] || 0) : 0;
  }

  function knownMax(def, level) {
    if (def.spell_mode !== "known") return 0;
    if (def.slug === "warlock") return (PROG.warlock_known || [])[level] || 0;
    return 0;
  }

  function bookNeed(def, level) {
    if (def.spell_mode !== "spellbook") return 0;
    return 6 + 2 * (Math.max(1, level) - 1);
  }

  function prepareMax(def) {
    if (def.spell_mode !== "prepared_list" && def.spell_mode !== "spellbook") return 0;
    var abil = def.slug === "cleric" || def.slug === "druid" ? "wis" : "int";
    var row = state.classes.filter(function (r) { return r.slug === def.slug; })[0];
    var lvl = row ? row.level : 1;
    return Math.max(1, modOf(CONTEXT.abilities[abil]) + lvl);
  }

  function slotsFor(def, level) {
    if (def.slug === "warlock") return PROG.pact && PROG.pact[String(level)];
    if (def.spell_mode) return PROG.full_slots && PROG.full_slots[String(level)];
    return null;
  }

  function formatSlots(def, level) {
    if (def.slug === "warlock") {
      var p = slotsFor(def, level);
      if (!p) return "";
      return "Ячейки договора " + p.slots + "×" + p.level;
    }
    var slots = slotsFor(def, level) || {};
    var parts = [];
    Object.keys(slots).sort(function (a, b) { return Number(a) - Number(b); }).forEach(function (k) {
      if (slots[k] > 0) parts.push(k + "×" + slots[k]);
    });
    return parts.length ? parts.join(" · ") : "нет ячеек";
  }

  function casterProgression(def) {
    if (!def) return "none";
    if (def.slug === "warlock") return "pact";
    if (def.slug === "paladin" || def.slug === "ranger") return "half";
    if (def.slug === "artificer") return "half_up";
    if (def.spell_mode) return "full";
    return "none";
  }

  function isSlotContributor(row) {
    var def = rowDef(row);
    var p = casterProgression(def);
    if (p === "full" || p === "half_up") return true;
    if (p === "half" && row.level >= 2) return true;
    return false;
  }

  function casterRows() {
    return state.classes.filter(function (row) {
      var def = rowDef(row);
      return def && (def.spell_mode || def.slug === "warlock");
    });
  }

  function multiclassCasterLevel() {
    var total = 0;
    state.classes.forEach(function (row) {
      var def = rowDef(row);
      var p = casterProgression(def);
      var lv = Math.max(0, row.level || 0);
      if (p === "full") total += lv;
      else if (p === "half") total += Math.floor(lv / 2);
      else if (p === "half_up") total += Math.ceil(lv / 2);
    });
    return Math.min(20, Math.max(0, total));
  }

  function formatSlotMap(slots) {
    var parts = [];
    Object.keys(slots || {}).sort(function (a, b) { return Number(a) - Number(b); }).forEach(function (k) {
      if (slots[k] > 0) parts.push(k + "×" + slots[k]);
    });
    return parts.join(" · ");
  }

  function sharedSlotMap() {
    var contributors = state.classes.filter(isSlotContributor);
    if (contributors.length === 0) return {};
    if (contributors.length === 1) return slotsFor(rowDef(contributors[0]), contributors[0].level) || {};
    var lvl = multiclassCasterLevel();
    return (PROG.full_slots && PROG.full_slots[String(lvl)]) || {};
  }

  function pactSlotParts() {
    var parts = [];
    state.classes.forEach(function (row) {
      var def = rowDef(row);
      if (!def || def.slug !== "warlock") return;
      var lab = formatSlots(def, row.level);
      if (lab) parts.push(lab);
    });
    return parts;
  }

  function sharedSlotsLine() {
    var brief = formatSlotMap(sharedSlotMap());
    var parts = [];
    var many = state.classes.filter(isSlotContributor).length > 1;
    if (brief) parts.push(many ? ("Ячейки общие: " + brief) : ("Ячейки: " + brief));
    pactSlotParts().forEach(function (p) { parts.push(p); });
    return parts.length ? parts.join(" · ") : "нет ячеек";
  }

  function previewSlotsText() {
    var contributors = state.classes.filter(isSlotContributor);
    var pact = pactSlotParts();
    if (contributors.length > 1) {
      var brief = formatSlotMap(sharedSlotMap());
      var parts = [brief ? ("общие " + brief) : "нет ячеек"];
      return parts.concat(pact).join(" · ");
    }
    if (contributors.length === 1) {
      var row = contributors[0];
      var lab = formatSlots(rowDef(row), row.level);
      var parts = lab ? [row.name_ru + ": " + lab] : [];
      return (parts.concat(pact).join(" · ")) || "нет ячеек";
    }
    return pact.length ? pact.join(" · ") : "нет ячеек";
  }

  function classAloneMaxCircle(def, level) {
    if (!def) return 0;
    if (def.slug === "warlock") {
      var pact = slotsFor(def, level);
      return pact ? pact.level : 0;
    }
    var p = casterProgression(def);
    var map = null;
    if (p === "full") map = slotsFor(def, level);
    else if (p === "half") map = level >= 2 ? ((PROG.full_slots && PROG.full_slots[String(Math.ceil(level / 2))]) || {}) : {};
    else if (p === "half_up") map = (PROG.full_slots && PROG.full_slots[String(Math.ceil(level / 2))]) || {};
    var max = 0;
    Object.keys(map || {}).forEach(function (k) { if (map[k] > 0) max = Math.max(max, Number(k)); });
    return max;
  }

  function poolCountParts(row) {
    var def = rowDef(row);
    if (!def) return [];
    var sp = spellOf(row);
    var parts = [];
    var cmax = cantripsMax(def, row.level);
    if (cmax) parts.push("Заговоры " + sp.cantrips.length + "/" + cmax);
    if (def.spell_mode === "spellbook") parts.push("Книга " + sp.book.length + "/" + bookNeed(def, row.level));
    if (def.spell_mode === "known") {
      var kmax = knownMax(def, row.level);
      if (kmax) parts.push("Известные " + sp.known.length + "/" + kmax);
    }
    var pmax = prepareMax(def);
    if ((def.spell_mode === "prepared_list" || def.spell_mode === "spellbook") && pmax) {
      parts.push("Подготовка " + sp.prepared.length + "/" + pmax);
    }
    return parts;
  }

  function poolModeLabel(def) {
    if (!def) return "";
    if (def.spell_mode === "spellbook") return "Книга";
    if (def.spell_mode === "known") return "Известные";
    if (def.spell_mode === "prepared_list") return "Подготовка";
    return "";
  }

  function spellsPreviewText() {
    var rows = casterRows();
    if (!rows.length) return "";
    return rows.map(function (row) {
      var parts = poolCountParts(row).map(function (x) {
        return x.replace("Заговоры ", "заг. ").replace("Книга ", "книга ").replace("Известные ", "изв. ").replace("Подготовка ", "подг. ");
      });
      return row.name_ru.toLowerCase() + (parts.length ? " " + parts.join(" · ") : "");
    }).join(", ");
  }

  function otherPoolNames(slug, exceptRow) {
    var names = [];
    casterRows().forEach(function (row) {
      if (exceptRow && row.id === exceptRow.id) return;
      var sp = spellOf(row);
      var lists = (sp.cantrips || []).concat(sp.book || [], sp.known || [], sp.prepared || []);
      if (lists.indexOf(slug) >= 0) names.push(row.name_ru.toLowerCase());
    });
    return names;
  }

  function sourceFeature(def, kind, subclassName) {
    if (def && def.slug === "warlock") return "Магия договора";
    if (kind === "domain") return subclassName || "Божественный домен";
    if (kind === "book" || kind === "cantrip" || kind === "prepare") {
      var f = featuresUpTo(def, 20).filter(function (x) { return /заклинаний|spellcasting/i.test(x.name_ru + x.id); })[0];
      return (f && f.name_ru) || "Использование заклинаний";
    }
    if (kind === "known") {
      var g = featuresUpTo(def, 20).filter(function (x) { return /договора|pact_magic|заклинаний/i.test(x.name_ru + x.id); })[0];
      return (g && g.name_ru) || "Магия договора";
    }
    return "Использование заклинаний";
  }

  function formatPrereq(slug) {
    var p = PREREQ[slug];
    if (!p) return "";
    var keys = p.all || p.any || [];
    var joiner = p.any ? " или " : " и ";
    return keys.map(function (k) { return SHORT[k]; }).join(joiner) + " " + p.min;
  }

  function mcCheck(slug) {
    var have = state.classes.some(function (r) { return r.slug === slug; });
    if (have) return { ok: false, detail: "уже есть" };
    var p = PREREQ[slug];
    if (!p) return { ok: true, detail: "ОК" };
    var keys = p.all || p.any || [];
    var ok = p.all ? keys.every(function (k) { return (CONTEXT.abilities[k] || 0) >= p.min; }) : keys.some(function (k) { return (CONTEXT.abilities[k] || 0) >= p.min; });
    return { ok: ok, detail: ok ? ("ОК · " + formatPrereq(slug)) : formatPrereq(slug) };
  }

  function rowDef(row) { return classBySlug(row.slug); }

  function forkOf(row) { ensureRow(row); return state.forks[row.id]; }

  function spellOf(row) { ensureRow(row); return state.spells[row.id]; }

  function subclassName(def, slug) {
    var list = (def && def.subclasses) || [];
    for (var i = 0; i < list.length; i++) if (list[i].slug === slug) return list[i].name_ru;
    return slug;
  }

  function alwaysPrepared(def, fork, classLevel) {
    var sc = ((def && def.subclasses) || []).filter(function (s) { return s.slug === (fork && fork.subclass); })[0];
    if (!sc) return [];
    return (sc.always_prepared || []).filter(function (s) { return (s.from_level || 1) <= classLevel; });
  }

  function blockingFor(row) {
    var def = rowDef(row);
    var fork = forkOf(row);
    var reasons = [];
    if (styleOpen(def, row.level) && !fork.style) reasons.push("Выберите боевой стиль.");
    if (subclassOpen(def, row.level) && !fork.subclass) {
      var gate = featuresUpTo(def, row.level).filter(function (f) { return /archetype|patron|domain|tradition|origin|path|circle|oath/i.test((f.name_en || "") + " " + f.id); })[0];
      reasons.push("Выберите «" + ((gate && gate.name_ru) || "архетип") + "».");
    }
    if (def.slug === "warlock" && row.level >= 3 && !fork.pact) reasons.push("Выберите дар договора.");
    if (def.slug === "warlock" && invocationsNeeded(row.level) > 0 && fork.invocations.length < invocationsNeeded(row.level)) {
      reasons.push("Выберите воззвания: " + fork.invocations.length + "/" + invocationsNeeded(row.level) + ".");
    }
    if (asiOpen(def, row.level)) {
      if (!fork.asiMode) reasons.push("Выберите увеличение характеристик или черту.");
      else if (fork.asiMode === "plus2" && fork.asiKeys.length !== 1) reasons.push("Выберите характеристику для +2.");
      else if (fork.asiMode === "plus1x2" && fork.asiKeys.length !== 2) reasons.push("Выберите две характеристики для +1.");
      else if (fork.asiMode === "feat" && !fork.featSlug) reasons.push("Выберите черту.");
    }
    if (!row.primary) {
      var need = ((def.mc_skills && (def.mc_skills.count || def.mc_skills.choose || def.mc_skills.pick)) || 0);
      /* skillChoices in class json is {count, from} or similar */
      var skillCount = skillNeed(def);
      if (skillCount && fork.mcSkills.length < skillCount) reasons.push("Выберите владения мультикласса (" + fork.mcSkills.length + "/" + skillCount + ").");
    }
    var needE = expertiseNeed(def, row.level);
    if (needE && (fork.expertise || []).length < needE) {
      reasons.push("Выберите компетентность: " + (fork.expertise || []).length + "/" + needE + ".");
    }
    var metaF = featureByFrom(def, row.level, "sorcerer_metamagic", false);
    if (metaF) {
      var needM = maxPicksAt(metaF.choice, row.level);
      if (needM && (fork.metamagic || []).length < needM) {
        reasons.push("Выберите метамагию: " + (fork.metamagic || []).length + "/" + needM + ".");
      }
    }
    var infF = featureByFrom(def, row.level, "artificer_infusions", false);
    if (infF) {
      var needI = maxPicksAt(infF.choice, row.level);
      if (needI && (fork.infusions || []).length < needI) {
        reasons.push("Выберите инфузии: " + (fork.infusions || []).length + "/" + needI + ".");
      }
    }
    if (featureByFrom(def, row.level, "ranger_favored_enemies", false) && !fork.favoredEnemy) {
      reasons.push("Выберите избранного врага.");
    }
    if (featureByFrom(def, row.level, "ranger_favored_terrains", false) && !fork.favoredTerrain) {
      reasons.push("Выберите избранную местность.");
    }
    var book = bookNeed(def, row.level);
    if (book && spellOf(row).book.length < book) reasons.push("Заполните книгу заклинаний: " + spellOf(row).book.length + "/" + book + ".");
    var cmax = cantripsMax(def, row.level);
    if (cmax && spellOf(row).cantrips.length < cmax && def.spell_mode === "spellbook") {
      reasons.push("Выберите заговоры: " + spellOf(row).cantrips.length + "/" + cmax + ".");
    }
    /* HP after 1st */
    var missingHp = 0;
    for (var lvl = 1; lvl <= row.level; lvl++) {
      var rec = state.hp[hpKey(row.id, lvl)];
      if (!rec) continue;
      if (rec.mode == null) missingHp += 1;
    }
    if (missingHp) reasons.push("Выберите среднее или бросок хитов для уровней после 1.");
    return reasons;
  }

  function skillNeed(def) {
    var ch = def && def.mc_skills;
    if (!ch) return 0;
    if (typeof ch === "number") return ch;
    return ch.count || ch.choose || ch.pick || (Array.isArray(ch.from) && ch.count) || 0;
  }

  function skillPool(def) {
    var ch = def && def.mc_skills;
    if (!ch) return [];
    var from = ch.from || ch.options || ch.pool || [];
    if (from === "any" || from === "all") return SKILLS.map(function (s) { return s[0]; });
    if (typeof from === "string") return [];
    if (!from.length && SKILLS.length) return SKILLS.map(function (s) { return s[0]; });
    return from;
  }

  function skillLabel(id) {
    if (id === "thieves_tools") return "Воровские инструменты";
    for (var i = 0; i < SKILLS.length; i++) if (SKILLS[i][0] === id) return SKILLS[i][1];
    return id;
  }

  function softSpellGaps() {
    var gaps = [];
    state.classes.forEach(function (row) {
      var def = rowDef(row);
      if (!def || !def.spell_mode) return;
      if (def.spell_mode === "spellbook") return; /* hard */
      var cmax = cantripsMax(def, row.level);
      var haveC = spellOf(row).cantrips.length;
      if (cmax && haveC < cmax) gaps.push(row.name_ru + ": заговоры " + haveC + "/" + cmax);
      if (def.spell_mode === "known") {
        var kmax = knownMax(def, row.level);
        var haveK = spellOf(row).known.length;
        if (kmax && haveK < kmax) gaps.push(row.name_ru + ": известные " + haveK + "/" + kmax);
      }
    });
    return gaps;
  }

  function hardReasons() {
    var all = [];
    if (!state.classes.length) all.push("Задайте уровни в прокачке.");
    state.classes.forEach(function (row) {
      blockingFor(row).forEach(function (r) { all.push(r); });
    });
    return all;
  }

  function isReady() { return hardReasons().length === 0; }

  function setLevel(id, next) {
    var min = CONTEXT.lobby ? Math.max(1, CONTEXT.startLevel) : 1;
    state.classes = state.classes.map(function (row) {
      if (row.id !== id) return row;
      var n = Math.max(row.primary ? min : 1, Math.min(20, next));
      return { ...dummyFix(row), level: n };
    });
    syncHp();
  }

  function dummyFix(row) {
    return { id: row.id, slug: row.slug, name_ru: row.name_ru, level: row.level, primary: row.primary };
  }

  /* Avoid object spread if old engines — but concept chrome is modern. Keep manual clone. */

  function bumpLevel(id, delta) {
    var row = state.classes.filter(function (r) { return r.id === id; })[0];
    if (!row) return;
    setLevel(id, row.level + delta);
  }

  function addMc(slug) {
    var check = mcCheck(slug);
    if (!check.ok) return;
    var row = newClassRow(slug, 1, false);
    state.classes.push(row);
    ensureRow(row);
    syncHp();
    state.ui.tab = row.id;
    state.mcOpen = false;
  }

  function removeClass(id) {
    if (state.classes.length <= 1) return;
    var row = state.classes.filter(function (r) { return r.id === id; })[0];
    if (!row || row.primary) return;
    state.classes = state.classes.filter(function (r) { return r.id !== id; });
    delete state.forks[id];
    delete state.spells[id];
    syncHp();
  }

  function chip(label, on, attrs, extra) {
    return '<button class="seg' + (on ? " is-on" : "") + (extra ? " " + extra : "") + '" type="button"' + (attrs || "") + ">" + label + "</button>";
  }

  function featuresAt(def, level) {
    return ((def && def.features) || []).filter(function (f) { return f.level === level; });
  }

  function profBonus(lvl) {
    return 2 + Math.floor((Math.max(1, lvl) - 1) / 4);
  }

  function expertiseNeed(def, level) {
    var f = featuresUpTo(def, level).filter(function (x) {
      return x.choice && x.choice.options_from === "expertise_skills_tools";
    })[0];
    return f && f.choice ? (f.choice.max_picks || 2) : 0;
  }

  function expertiseAt(def, level) {
    return featuresAt(def, level).some(function (x) {
      return x.choice && x.choice.options_from === "expertise_skills_tools";
    });
  }

  function expertisePool(row) {
    var ids = [];
    (CONTEXT.knownSkills || []).forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
    (forkOf(row).mcSkills || []).forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
    var def = rowDef(row);
    var fixed = ((def && def.mc_skills && def.mc_skills.tools_fixed) || (def && def.mc_tools_fixed) || []);
    if (row.slug === "rogue" || fixed.indexOf("thieves_tools") >= 0) {
      if (ids.indexOf("thieves_tools") < 0) ids.push("thieves_tools");
    }
    return ids;
  }

  function focusedRow() {
    var id = state.ui.tab;
    var row = state.classes.filter(function (r) { return r.id === id; })[0];
    return row || state.classes[0] || null;
  }

  function hpValue(row, lvl) {
    var def = rowDef(row);
    var die = def ? def.hit_die : "d8";
    var rec = state.hp[hpKey(row.id, lvl)] || { mode: null, rolled: null };
    if (rec.mode === "max") return dieSides(die);
    if (rec.mode === "average") return averageFace(die);
    if (rec.mode === "roll" && rec.rolled != null) return rec.rolled;
    return null;
  }

  function hpParts() {
    var parts = [];
    var missing = 0;
    var sum = 0;
    state.classes.forEach(function (row) {
      for (var lvl = 1; lvl <= row.level; lvl++) {
        var v = hpValue(row, lvl);
        if (v == null) { parts.push("?"); missing += 1; }
        else { parts.push(String(v)); sum += v; }
      }
    });
    return { parts: parts, missing: missing, sum: sum };
  }

  function remainingPicks() {
    var items = [];
    state.classes.forEach(function (row) {
      var def = rowDef(row);
      var fork = forkOf(row);
      var sp = spellOf(row);
      for (var lvl = 1; lvl <= row.level; lvl++) {
        if (styleOpen(def, lvl) && styleOpen(def, lvl) && featuresAt(def, lvl).some(function (f) { return /fighting_style/.test(f.id) || (f.choice && /fighting_styles/.test(f.choice.options_from || "")); }) && !fork.style) {
          items.push({ row: row, level: lvl, key: "style", label: "боевой стиль" });
        }
        if (subclassOpen(def, lvl) && def.subclass_level === lvl && !fork.subclass) {
          items.push({ row: row, level: lvl, key: "subclass", label: "архетип" });
        }
        if (def.slug === "warlock" && lvl === 3 && row.level >= 3 && !fork.pact) {
          items.push({ row: row, level: lvl, key: "pact", label: "дар договора" });
        }
        if (def.slug === "warlock") {
          var before = invocationsNeeded(lvl - 1);
          var now = invocationsNeeded(lvl);
          if (now > before) {
            var short = now - fork.invocations.length;
            if (short > 0) {
              for (var i = 0; i < short; i++) items.push({ row: row, level: lvl, key: "inv", label: "воззвание" });
            }
          }
        }
        if (asiOpen(def, lvl) && featuresAt(def, lvl).some(isAsiFeature)) {
          if (!fork.asiMode) items.push({ row: row, level: lvl, key: "asi", label: "увеличение характеристик" });
          else if (fork.asiMode === "plus2" && fork.asiKeys.length !== 1) items.push({ row: row, level: lvl, key: "asi", label: "характеристика для +2" });
          else if (fork.asiMode === "plus1x2" && fork.asiKeys.length !== 2) items.push({ row: row, level: lvl, key: "asi", label: "две характеристики для +1" });
          else if (fork.asiMode === "feat" && !fork.featSlug) items.push({ row: row, level: lvl, key: "asi", label: "черта" });
        }
        if (lvl >= 2 || !row.primary) {
          var rec = state.hp[hpKey(row.id, lvl)];
          if (!rec || rec.mode == null) items.push({ row: row, level: lvl, key: "hp", label: "хиты" });
        }
        if (expertiseAt(def, lvl)) {
          var needE = expertiseNeed(def, lvl);
          var haveE = (fork.expertise || []).length;
          for (var e = haveE; e < needE; e++) items.push({ row: row, level: lvl, key: "exp", label: "компетентность" });
        }
        if (!row.primary && lvl === 1) {
          var sn = skillNeed(def);
          var haveS = fork.mcSkills.length;
          for (var s = haveS; s < sn; s++) items.push({ row: row, level: lvl, key: "mcskill", label: "владение мультикласса" });
        }
        var metaAt = featureByFrom(def, lvl, "sorcerer_metamagic", true);
        if (metaAt) {
          var needM = maxPicksAt(metaAt.choice, row.level);
          var haveM = (fork.metamagic || []).length;
          var gainM = needM - maxPicksAt(metaAt.choice, lvl - 1);
          var shortM = Math.max(0, needM - haveM);
          var addM = lvl === metaAt.level ? shortM : (haveM >= needM - gainM ? Math.min(gainM, shortM) : 0);
          for (var mi = 0; mi < addM; mi++) items.push({ row: row, level: lvl, key: "meta", label: "метамагия" });
        }
        var infAt = featureByFrom(def, lvl, "artificer_infusions", true);
        if (infAt) {
          var needI = maxPicksAt(infAt.choice, row.level);
          var haveI = (fork.infusions || []).length;
          var gainI = needI - maxPicksAt(infAt.choice, lvl - 1);
          var shortI = Math.max(0, needI - haveI);
          var addI = lvl === infAt.level ? shortI : (haveI >= needI - gainI ? Math.min(gainI, shortI) : 0);
          for (var ii = 0; ii < addI; ii++) items.push({ row: row, level: lvl, key: "inf", label: "инфузия" });
        }
        if (featureByFrom(def, lvl, "ranger_favored_enemies", true) && !fork.favoredEnemy) {
          items.push({ row: row, level: lvl, key: "enemy", label: "избранный враг" });
        }
        if (featureByFrom(def, lvl, "ranger_favored_terrains", true) && !fork.favoredTerrain) {
          items.push({ row: row, level: lvl, key: "terrain", label: "избранная местность" });
        }
        if (def.spell_mode === "spellbook") {
          if (lvl === 1) {
            var cmax = cantripsMax(def, row.level);
            var shortC = Math.max(0, cmax - sp.cantrips.length);
            var book = bookNeed(def, row.level);
            /* book/cantrips counted on L1 plus later increments below */
          }
          var bookBefore = lvl <= 1 ? 0 : bookNeed(def, lvl - 1);
          var bookNow = bookNeed(def, lvl);
          var bookGain = bookNow - bookBefore;
          if (bookGain > 0) {
            var bookShort = Math.max(0, bookNow - sp.book.length);
            var count = Math.min(bookGain, bookShort);
            /* if behind more than this level's gain, keep remainder on earliest incomplete — L1 holds leftover */
            if (lvl === 1) count = bookShort;
            else if (sp.book.length >= bookBefore) count = Math.min(bookGain, bookShort);
            else count = 0;
            for (var b = 0; b < count; b++) items.push({ row: row, level: lvl, key: "book", label: "заклинание в книгу" });
          }
          var cBefore = cantripsMax(def, Math.max(0, lvl - 1));
          var cNow = cantripsMax(def, lvl);
          if (cNow > cBefore) {
            var cShort = Math.max(0, cantripsMax(def, row.level) - sp.cantrips.length);
            var cCount = lvl === 1 ? cShort : (sp.cantrips.length >= cBefore ? Math.min(cNow - cBefore, cShort) : 0);
            for (var c = 0; c < cCount; c++) items.push({ row: row, level: lvl, key: "cantrip", label: "заговор" });
          }
        }
      }
    });
    return items;
  }

  function isAsiFeature(f) {
    return f && (String(f.id || "").indexOf("asi_") === 0 || f.name_en === "Ability Score Improvement");
  }

  function isStyleFeature(f) {
    return f && (/fighting_style/.test(f.id || "") || (f.choice && /fighting_styles/.test(f.choice.options_from || "")));
  }

  function levelPending(row, level) {
    return remainingPicks().some(function (p) { return p.row.id === row.id && p.level === level; });
  }

  function openKey(row, level) { return row.id + ":" + level; }

  function levelIsOpen(row, level, pending) {
    var flag = state.ui.open[openKey(row, level)];
    if (flag === true) return true;
    if (flag === false) return false;
    return pending;
  }

  function keyFeatures(row) {
    var def = rowDef(row);
    var fork = forkOf(row);
    var bits = [];
    featuresUpTo(def, row.level).forEach(function (f) {
      if (f.optional) return;
      if (isStyleFeature(f)) {
        var st = styleList().filter(function (s) { return s.id === fork.style; })[0];
        bits.push(st ? ("Боевой стиль: " + st.name_ru) : "Боевой стиль");
        return;
      }
      if (isAsiFeature(f)) {
        if (fork.asiMode === "plus2" && fork.asiKeys[0]) bits.push("Характеристики: +2 " + SHORT[fork.asiKeys[0]]);
        else if (fork.asiMode === "plus1x2" && fork.asiKeys.length) bits.push("Характеристики: +1 " + fork.asiKeys.map(function (k) { return SHORT[k]; }).join(" и +1 "));
        else if (fork.asiMode === "feat" && fork.featSlug) {
          var feat = featsList().filter(function (x) { return x.slug === fork.featSlug; })[0];
          bits.push("Черта: " + ((feat && feat.name_ru) || fork.featSlug));
        } else bits.push("Увеличение характеристик");
        return;
      }
      if (/archetype|patron|domain|tradition|college|otherworldly|divine_domain|bard_college|pact_boon|eldritch_invocations/.test((f.id || "") + " " + (f.name_en || ""))) {
        if (f.id === "pact_boon") {
          var boon = BOONS.filter(function (b) { return b.id === fork.pact; })[0];
          bits.push(boon ? ("Дар договора: " + boon.name_ru) : f.name_ru);
          return;
        }
        if (f.id === "eldritch_invocations") {
          bits.push("Воззвания " + fork.invocations.length + "/" + invocationsNeeded(row.level));
          return;
        }
        bits.push(fork.subclass ? (f.name_ru + ": " + subclassName(def, fork.subclass)) : f.name_ru);
        return;
      }
      if (f.choice && f.choice.options_from === "expertise_skills_tools") {
        bits.push("Компетентность " + (fork.expertise || []).length + "/" + (f.choice.max_picks || 2));
        return;
      }
      bits.push(f.name_ru);
    });
    return bits;
  }

  function hpPreviewLabel() {
    var hp = hpParts();
    if (!hp.parts.length) return { text: "—", missing: true, strip: "—" };
    var lv = totalLevel();
    var first = state.classes[0];
    var die = dieLabel((rowDef(first) || {}).hit_die || "d8");
    if (lv <= 1 && !hp.missing) {
      return { text: hp.sum + " (" + die + ")", missing: false, strip: String(hp.sum) };
    }
    var bones = hp.parts.join(" + ");
    var head = hp.missing ? (hp.sum ? (hp.sum + " + ?") : "?") : String(hp.sum);
    return { text: head + " (кости " + bones + ")", missing: !!hp.missing, strip: head.replace(/ /g, "") };
  }

  function previewHtml(inline) {
    var hp = hpParts();
    var hpLabel = hpPreviewLabel();
    var slotsText = previewSlotsText();
    var spellsText = spellsPreviewText();
    var classesLine = state.classes.map(function (r) {
      return r.name_ru + " " + r.level;
    }).join(" / ") || "—";
    var feats = [];
    var manyClasses = state.classes.length > 1;
    state.classes.forEach(function (row) {
      var bits = keyFeatures(row);
      if (!bits.length) return;
      if (manyClasses) feats.push(row.name_ru + ": " + bits.join(" · "));
      else bits.forEach(function (x) { feats.push(x); });
    });
    var remain = remainingPicks();
    var cls = "lv-preview" + (inline ? " lv-preview--inline" : "");
    var html = '<div class="' + cls + '"><h2 class="lv-preview__title">Итог</h2>';
    html += '<p class="lv-preview__classes">' + esc(classesLine) + (totalLevel() ? " · всего " + totalLevel() : "") + "</p>";
    html += '<ul class="lv-pv-list">';
    html += '<li><span class="lv-pv-k">Мастерство</span><span class="lv-pv-v">+' + profBonus(totalLevel() || 1) + "</span></li>";
    html += '<li><span class="lv-pv-k">Хиты</span><span class="lv-pv-v' + (hpLabel.missing ? " is-need" : "") + '">' + esc(hpLabel.text) + "</span></li>";
    html += '<li><span class="lv-pv-k">Ячейки</span><span class="lv-pv-v">' + esc(slotsText) + "</span></li>";
    if (spellsText) html += '<li><span class="lv-pv-k">Заклинания</span><span class="lv-pv-v">' + esc(spellsText) + "</span></li>";
    html += '<li><span class="lv-pv-k">Умения</span><span class="lv-pv-v">' + esc(feats.length ? feats.join(" · ") : "—") + "</span></li>";
    if (remain.length) {
      html += '<li><span class="lv-pv-k">Осталось</span><span class="lv-pv-v is-need">' + remain.length + " · " + esc(remain[0].label) + "</span></li>";
    }
    html += "</ul></div>";
    return html;
  }

  function summaryHtml() { return previewHtml(false); }

  function previewStripHtml() {
    var hpLabel = hpPreviewLabel();
    var classesLine = state.classes.map(function (r) { return r.name_ru + " " + r.level; }).join(" / ") || "—";
    var remain = remainingPicks().length;
    return '<div class="lv-strip"><span class="lv-strip__who">' + esc(classesLine) +
      "</span><span>хиты " + esc(hpLabel.strip) + "</span><span>мастерство +" + profBonus(totalLevel() || 1) +
      "</span><span" + (remain ? ' class="is-need"' : "") + ">Осталось: " + remain + "</span></div>";
  }

  function styleList() {
    var ids = FIGHTER_STYLES;
    return STYLES.filter(function (s) { return ids.indexOf(s.id) >= 0; });
  }

  function styleListFor(def) {
    var feat = ((def && def.features) || []).filter(isStyleFeature)[0];
    var from = feat && feat.choice && feat.choice.options_from;
    if (from === "paladin_fighting_styles") {
      return STYLES.filter(function (st) { return PALADIN_STYLES.indexOf(st.id) >= 0; });
    }
    if (from === "ranger_fighting_styles") {
      return STYLES.filter(function (st) { return RANGER_STYLES.indexOf(st.id) >= 0; });
    }
    return styleList();
  }

  function maxPicksAt(choice, level) {
    if (!choice) return 0;
    if (choice.max_picks) return choice.max_picks;
    var map = choice.max_picks_by_level;
    if (!map) return 1;
    var best = 0;
    Object.keys(map).forEach(function (k) {
      if (Number(k) <= level) best = Math.max(best, Number(map[k]));
    });
    return best;
  }

  function featureByFrom(def, level, from, exact) {
    var list = exact ? featuresAt(def, level) : featuresUpTo(def, level);
    return list.filter(function (f) { return f.choice && f.choice.options_from === from; })[0];
  }

  function pickBlock(title, body, pending) {
    return '<div class="lv-pick"' + (pending ? " data-lv-need" : "") + '><h3 class="lv-pick__lab">' + esc(title) + "</h3>" + body + "</div>";
  }

  function hpPickHtml(row, lvl) {
    var def = rowDef(row);
    var die = def ? def.hit_die : "d8";
    var rec = state.hp[hpKey(row.id, lvl)] || { mode: null, rolled: null };
    if (rec.mode === "max" && row.primary && lvl === 1) {
      return "";
    }
    var pending = rec.mode == null;
    var body = '<div class="lv-hp-row">';
    body += chip("Среднее (" + averageFace(die) + ")", rec.mode === "average", ' data-lv-hp="' + esc(row.id) + ":" + lvl + ':average"');
    var rollLab = rec.mode === "roll" && rec.rolled != null ? ("Бросок: " + rec.rolled) : "Бросок";
    body += chip(rollLab, rec.mode === "roll", ' data-lv-hp="' + esc(row.id) + ":" + lvl + ':roll"');
    body += "</div>";
    return pickBlock("Хиты · " + dieLabel(die), body, pending);
  }

  function forksAtLevel(row, level) {
    var def = rowDef(row);
    var fork = forkOf(row);
    var html = "";
    if (featuresAt(def, level).some(isStyleFeature)) {
      var list = styleListFor(def);
      var body = '<div class="race-chip-row">';
      if (!list.length) {
        body += '<p class="t-muted lv-hint">Список стилей этого класса в выгрузке пока не приложен — варианты не выдумываем.</p>';
      } else {
        list.forEach(function (s) {
          var lab = esc(s.name_ru) + (s.source && s.source !== "PHB" ? " · " + esc(s.source) : "");
          body += chip(lab, fork.style === s.id, ' data-lv-style="' + esc(row.id) + ":" + esc(s.id) + '" title="' + esc(s.summary_ru || "") + '"', "seg--wrap");
        });
      }
      body += "</div>";
      html += pickBlock("Боевой стиль", body, !fork.style);
    }
    if (def.subclass_level === level && subclassOpen(def, row.level)) {
      var gate = featuresAt(def, level).filter(function (f) {
        return /archetype|patron|domain|tradition|origin|path|college|circle|oath|otherworldly|divine_domain|bard_college/.test((f.name_en || "") + " " + f.id);
      })[0];
      var title = (gate && gate.name_ru) || "Архетип";
      var body2 = '<div class="race-chip-row">';
      (def.subclasses || []).forEach(function (s) {
        var lab = esc(s.name_ru) + (s.source && s.source !== "PHB" ? " · " + esc(s.source) : "");
        body2 += chip(lab, fork.subclass === s.slug, ' data-lv-sub="' + esc(row.id) + ":" + esc(s.slug) + '"', "seg--wrap");
      });
      body2 += "</div>";
      html += pickBlock(title, body2, !fork.subclass);
    }
    if (def.slug === "warlock" && level === 3 && row.level >= 3) {
      var body3 = '<div class="race-chip-row">';
      BOONS.forEach(function (b) {
        var lab = esc(b.name_ru) + (b.source && b.source !== "PHB" ? " · " + esc(b.source) : "");
        body3 += chip(lab, fork.pact === b.id, ' data-lv-pact="' + esc(row.id) + ":" + esc(b.id) + '" title="' + esc(b.summary_ru || "") + '"', "seg--wrap");
      });
      body3 += "</div>";
      html += pickBlock("Дар договора", body3, !fork.pact);
    }
    if (def.slug === "warlock" && invocationsNeeded(level) > invocationsNeeded(level - 1)) {
      var need = invocationsNeeded(row.level);
      var body4 = '<div class="race-chip-row">';
      INVS.forEach(function (inv) {
        var on = fork.invocations.indexOf(inv.id) >= 0;
        var lab = esc(inv.name_ru) + (inv.source && inv.source !== "PHB" ? " · " + esc(inv.source) : "");
        body4 += chip(lab, on, ' data-lv-inv="' + esc(row.id) + ":" + esc(inv.id) + '" title="' + esc(inv.summary_ru || "") + '"', "seg--wrap");
      });
      body4 += "</div>";
      html += pickBlock("Воззвания · " + fork.invocations.length + "/" + need, body4, fork.invocations.length < need);
    }
    if (featuresAt(def, level).some(isAsiFeature)) {
      var body5 = '<div class="race-chip-row">';
      body5 += chip("+2 к одной", fork.asiMode === "plus2", ' data-lv-asi="' + esc(row.id) + ':plus2"');
      body5 += chip("+1 и +1", fork.asiMode === "plus1x2", ' data-lv-asi="' + esc(row.id) + ':plus1x2"');
      body5 += chip("Черта", fork.asiMode === "feat", ' data-lv-asi="' + esc(row.id) + ':feat"');
      body5 += "</div>";
      if (fork.asiMode === "plus2" || fork.asiMode === "plus1x2") {
        body5 += '<div class="race-chip-row">';
        ORDER.forEach(function (k) {
          body5 += chip(LONG[k], fork.asiKeys.indexOf(k) >= 0, ' data-lv-asik="' + esc(row.id) + ":" + k + '"');
        });
        body5 += "</div>";
      }
      if (fork.asiMode === "feat") {
        body5 += '<div class="race-chip-row">';
        featsList().forEach(function (ft) {
          var lab = esc(ft.name_ru || ft.slug);
          body5 += chip(lab, fork.featSlug === ft.slug, ' data-lv-feat="' + esc(row.id) + ":" + esc(ft.slug) + '"', "seg--wrap");
        });
        body5 += "</div>";
      }
      var asiPending = !fork.asiMode || (fork.asiMode === "plus2" && fork.asiKeys.length !== 1) || (fork.asiMode === "plus1x2" && fork.asiKeys.length !== 2) || (fork.asiMode === "feat" && !fork.featSlug);
      html += pickBlock("Увеличение характеристик", body5, asiPending);
    }
    if (expertiseAt(def, level)) {
      var needE = expertiseNeed(def, level);
      var pool = expertisePool(row);
      var bodyE = '<div class="race-chip-row">';
      if (!pool.length) {
        bodyE += '<p class="t-muted lv-hint">Нет владений, к которым можно применить компетентность.</p>';
      } else {
        pool.forEach(function (id) {
          var on = (fork.expertise || []).indexOf(id) >= 0;
          bodyE += chip(esc(skillLabel(id)), on, ' data-lv-exp="' + esc(row.id) + ":" + esc(id) + '"');
        });
      }
      bodyE += "</div>";
      html += pickBlock("Компетентность · " + (fork.expertise || []).length + "/" + needE, bodyE, (fork.expertise || []).length < needE);
    }
    if (!row.primary && level === 1 && skillNeed(def) > 0) {
      var needS = skillNeed(def);
      var bodyS = '<div class="race-chip-row">';
      skillPool(def).forEach(function (id) {
        var blocked = CONTEXT.knownSkills.indexOf(id) >= 0;
        var on = fork.mcSkills.indexOf(id) >= 0;
        var lab = esc(skillLabel(id)) + (blocked ? " · уже есть" : "");
        var attrs = ' data-lv-msk="' + esc(row.id) + ":" + esc(id) + '"';
        if (blocked) attrs += " disabled";
        bodyS += chip(lab, on, attrs, blocked ? "is-blocked" : "");
      });
      bodyS += "</div>";
      html += pickBlock("Владения мультикласса · " + fork.mcSkills.length + "/" + needS, bodyS, fork.mcSkills.length < needS);
      var fixed = (def.mc_skills && def.mc_skills.tools_fixed) || [];
      if (fixed.indexOf("thieves_tools") >= 0) {
        html += '<p class="t-muted lv-hint">Воровские инструменты выдаются сразу, без выбора.</p>';
      }
    }

    function multiCatalog(from, list, selected, attr, title, pending) {
      var body = '<div class="race-chip-row">';
      list.forEach(function (it) {
        var id = it.id;
        var on = selected.indexOf(id) >= 0;
        var lab = esc(it.name_ru) + (it.source && it.source !== "PHB" ? " · " + esc(it.source) : "");
        body += chip(lab, on, " " + attr + '="' + esc(row.id) + ":" + esc(id) + '" title="' + esc(it.summary_ru || "") + '"', "seg--wrap");
      });
      body += "</div>";
      html += pickBlock(title, body, pending);
    }
    function singleCatalog(from, list, value, attr, title) {
      var body = '<div class="race-chip-row">';
      list.forEach(function (it) {
        var lab = esc(it.name_ru);
        body += chip(lab, value === it.id, " " + attr + '="' + esc(row.id) + ":" + esc(it.id) + '"', "seg--wrap");
      });
      body += "</div>";
      html += pickBlock(title, body, !value);
    }

    var metaAt = featureByFrom(def, level, "sorcerer_metamagic", true);
    if (metaAt) {
      var needM = maxPicksAt(metaAt.choice, row.level);
      multiCatalog("sorcerer_metamagic", METAMAGIC, fork.metamagic || [], "data-lv-meta", "Метамагия · " + (fork.metamagic || []).length + "/" + needM, (fork.metamagic || []).length < needM);
    }
    var infAt = featureByFrom(def, level, "artificer_infusions", true);
    if (infAt) {
      var needI = maxPicksAt(infAt.choice, row.level);
      var infList = INFUSIONS.filter(function (it) { return (it.min_level || 2) <= row.level; });
      multiCatalog("artificer_infusions", infList, fork.infusions || [], "data-lv-inf", "Инфузии · " + (fork.infusions || []).length + "/" + needI, (fork.infusions || []).length < needI);
    }
    if (featureByFrom(def, level, "ranger_favored_enemies", true)) {
      singleCatalog("ranger_favored_enemies", FAV_ENEMY, fork.favoredEnemy, "data-lv-enemy", "Избранный враг");
    }
    if (featureByFrom(def, level, "ranger_favored_terrains", true)) {
      singleCatalog("ranger_favored_terrains", FAV_TERRAIN, fork.favoredTerrain, "data-lv-terrain", "Избранная местность");
    }
    return html;
  }

  function levelSummary(row, level) {
    var def = rowDef(row);
    var fork = forkOf(row);
    var bits = [];
    featuresAt(def, level).forEach(function (f) {
      if (f.optional) return;
      if (isStyleFeature(f) && fork.style) {
        var st = styleListFor(def).filter(function (s) { return s.id === fork.style; })[0];
        bits.push(st ? st.name_ru : "стиль");
        return;
      }
      if (def.subclass_level === level && fork.subclass && /archetype|patron|domain|tradition|origin|path|college|circle|oath|otherworldly|divine_domain|bard_college/.test((f.id || "") + " " + (f.name_en || ""))) {
        bits.push(subclassName(def, fork.subclass));
        return;
      }
      if (isAsiFeature(f) && fork.asiMode) {
        if (fork.asiMode === "feat") {
          var ft = featsList().filter(function (x) { return x.slug === fork.featSlug; })[0];
          bits.push((ft && ft.name_ru) || "черта");
        } else if (fork.asiMode === "plus2" && fork.asiKeys[0]) bits.push("+2 " + SHORT[fork.asiKeys[0]]);
        else if (fork.asiMode === "plus1x2") bits.push(fork.asiKeys.map(function (k) { return "+1 " + SHORT[k]; }).join(", "));
        else bits.push("ASI");
        return;
      }
      bits.push(f.name_ru);
    });
    if (def.slug === "warlock" && level === 3 && fork.pact) {
      var boon = BOONS.filter(function (b) { return b.id === fork.pact; })[0];
      if (boon) bits.push(boon.name_ru);
    }
    var rec = state.hp[hpKey(row.id, level)] || { mode: null };
    if (rec.mode === "max") bits.push("хиты макс. (" + hpValue(row, level) + ")");
    else if (rec.mode === "average") bits.push("хиты среднее (" + hpValue(row, level) + ")");
    else if (rec.mode === "roll") bits.push("хиты бросок (" + hpValue(row, level) + ")");
    return bits.join(" · ");
  }

  function grantHasPicker(def, f) {
    if (!f) return false;
    if (isStyleFeature(f) || isAsiFeature(f)) return true;
    var from = f.choice && f.choice.options_from;
    if (from === "expertise_skills_tools" || from === "sorcerer_metamagic" || from === "artificer_infusions" || from === "ranger_favored_enemies" || from === "ranger_favored_terrains" || from === "warlock_invocations" || from === "warlock_pact_boons") return true;
    if (f.id === "pact_boon" || f.id === "eldritch_invocations") return true;
    if (/archetype|patron|domain|tradition|origin|path|college|circle|oath|otherworldly|divine_domain|bard_college/.test((f.id || "") + " " + (f.name_en || ""))) return true;
    return false;
  }

  function levelCard(row, level) {
    var def = rowDef(row);
    var pending = levelPending(row, level);
    var open = levelIsOpen(row, level, pending);
    var cls = "lv-lvl" + (pending ? " is-pending" : " is-done") + (open ? " is-open" : "");
    var html = '<article class="' + cls + '">';
    html += '<button class="lv-lvl__head" type="button" data-lv-toggle="' + esc(row.id) + ":" + level + '">';
    html += '<span class="lv-lvl__n">Ур. ' + level + "</span>";
    if (!open && !pending) {
      html += '<span class="lv-lvl__sum">' + esc(levelSummary(row, level) || "") + "</span>";
    }
    if (pending) html += '<span class="lv-need"' + (open ? " data-lv-need" : "") + ">Нужно выбрать</span>";
    else html += '<span class="lv-ok">готово</span>';
    html += "</button>";
    html += '<div class="lv-lvl__body">';
    var grants = featuresAt(def, level).filter(function (f) { return !grantHasPicker(def, f); });
    if (grants.length) {
      html += '<ul class="lv-grants">';
      grants.forEach(function (f) {
        var extra = f.optional ? " · по желанию" : "";
        var sum = f.summary_ru ? displayDice(f.summary_ru) : "";
        html += "<li" + (f.optional ? ' class="is-opt"' : "") + ">";
        html += '<span class="lv-grant__name">' + esc(f.name_ru + extra) + "</span>";
        if (sum) html += '<span class="lv-grant__sum">' + esc(sum) + "</span>";
        html += "</li>";
      });
      html += "</ul>";
    }
    html += hpPickHtml(row, level);
    html += forksAtLevel(row, level);
    if (def.spell_mode === "spellbook" && (bookNeed(def, level) > bookNeed(def, level - 1) || cantripsMax(def, level) > cantripsMax(def, Math.max(0, level - 1)))) {
      var sp = spellOf(row);
      var bits = [];
      var cmax = cantripsMax(def, row.level);
      var book = bookNeed(def, row.level);
      if (cmax) bits.push("заговоры " + sp.cantrips.length + "/" + cmax);
      bits.push("книга " + sp.book.length + "/" + book);
      var short = (cmax && sp.cantrips.length < cmax) || sp.book.length < book;
      html += '<p class="t-muted lv-hint"' + (short ? " data-lv-need" : "") + ">" + esc(bits.join(" · ")) + ". Выбор — в сетке заклинаний ниже.</p>";
    }
    html += "</div></article>";
    return html;
  }

  function spellsHtml(row) {
    var casters = casterRows();
    if (!casters.length) return "";
    var poolRow = row && casters.some(function (c) { return c.id === row.id; }) ? row : casters[0];
    var def = rowDef(poolRow);
    if (!def || (!def.spell_mode && def.slug !== "warlock")) {
      poolRow = casters[0];
      def = rowDef(poolRow);
    }
    if (!def) return "";
    var many = casters.length > 1;
    var sp = spellOf(poolRow);
    var fork = forkOf(poolRow);
    var cmax = cantripsMax(def, poolRow.level);
    var book = bookNeed(def, poolRow.level);
    var kmax = knownMax(def, poolRow.level);
    var pmax = prepareMax(def);
    var circle = sp.circle || 0;
    var q = state.ui.q || "";
    var maxCircle = classAloneMaxCircle(def, poolRow.level);
    if (circle > maxCircle) circle = 0;

    var html = '<section class="lv-spells">';
    html += '<div class="lv-spells__head"><h3>Заклинания</h3>';
    if (!many) {
      var counts = poolCountParts(poolRow);
      var slotLab = def.slug === "warlock" ? formatSlots(def, poolRow.level) : sharedSlotsLine();
      counts.push(slotLab);
      html += '<span class="lv-spells__count">' + esc(counts.join(" · ")) + "</span>";
    }
    html += "</div>";
    if (many) {
      html += '<p class="lv-spells__budgets">';
      casters.forEach(function (cRow, i) {
        var short = poolCountParts(cRow).map(function (x) {
          return x.replace("Заговоры ", "заг. ").replace("Книга ", "книга ").replace("Известные ", "изв. ").replace("Подготовка ", "подг. ");
        }).join(" · ");
        if (i) html += " ";
        html += '<span>' + esc(cRow.name_ru + ": " + short) + "</span>";
      });
      html += "</p>";
      html += '<p class="lv-spells__slots">' + esc(sharedSlotsLine()) + "</p>";
    }
    if (def.spell_mode === "spellbook") {
      html += '<p class="t-muted lv-hint">На 1 ур. — 6 бесплатно в книгу, каждый новый уровень — +2. Книга не равна подготовке.</p>';
    } else if (def.spell_mode === "known") {
      html += '<p class="t-muted lv-hint">Известные сразу готовы к бою. Полный лимит можно добрать на листе.</p>';
    } else if (def.spell_mode === "prepared_list") {
      html += '<p class="t-muted lv-hint">Полный лимит подготовки не обязателен — можно заполнить на листе.</p>';
    }

    function currentKind() {
      if (circle === 0) return "cantrips";
      if (def.spell_mode === "spellbook") return "book";
      if (def.spell_mode === "known") return "known";
      return "prepared";
    }

    var kind = currentKind();
    var selected = sp[kind] || [];
    var max = kind === "cantrips" ? cmax : kind === "book" ? book : kind === "known" ? kmax : pmax;
    var locked = [];
    if (kind === "prepared") {
      locked = alwaysPrepared(def, fork, poolRow.level).map(function (s) { return s.slug; });
    }
    var pool = [];
    if (kind === "cantrips") pool = spellsFor(def.slug, 0);
    else if (kind === "book") {
      pool = spellsFor(def.slug, 1).concat(poolRow.level >= 3 ? spellsFor(def.slug, 2) : []);
      if (sp.ritualView) pool = pool.filter(function (s) { return s.ritual; });
      pool = pool.filter(function (s) { return s.level === circle; });
    } else if (kind === "known") {
      pool = spellsFor(def.slug, circle);
    } else if (def.spell_mode === "spellbook") {
      pool = sp.book.map(spellBySlug).filter(Boolean).filter(function (s) { return s.level === circle; });
    } else {
      pool = spellsFor(def.slug, circle);
    }

    var pickedHere = pool.filter(function (s) { return selected.indexOf(s.slug) >= 0 || locked.indexOf(s.slug) >= 0; }).length;
    html += '<div class="lv-spells__tools">';
    html += '<input type="search" data-lv-q="' + esc(poolRow.id) + '" value="' + esc(q) + '" placeholder="Поиск заклинания" />';
    var tabs = [0];
    for (var c = 1; c <= maxCircle; c++) tabs.push(c);
    tabs.forEach(function (c) {
      var lab = c === 0 ? "Заговоры" : ("Круг " + c);
      html += chip(lab, circle === c, ' data-lv-circle="' + esc(poolRow.id) + ":" + c + '"');
    });
    if (def.spell_mode === "spellbook") {
      html += chip("Ритуалы из книги", sp.ritualView, ' data-lv-ritual="' + esc(poolRow.id) + '"');
    }
    html += "</div>";
    html += '<p class="lv-spells__picked">Выбрано ' + selected.length + (max ? " из " + max : "") + (kind === "prepared" && locked.length ? " · домен не в лимите" : "") + (circle ? " · на круге " + pickedHere : "") + "</p>";
    html += '<div class="lv-spell-grid">';
    var ql = q.trim().toLowerCase();
    pool.forEach(function (s) {
      var on = selected.indexOf(s.slug) >= 0 || locked.indexOf(s.slug) >= 0;
      var isLocked = locked.indexOf(s.slug) >= 0;
      var name = s.name_ru + (s.ritual ? " · ритуал" : "");
      var hide = ql && String(s.name_ru).toLowerCase().indexOf(ql) < 0;
      var attrs = ' type="button" class="lv-spell' + (on ? " is-on" : "") + (isLocked ? " is-locked" : "") + '" data-lv-sp="' + esc(poolRow.id) + ":" + esc(kind) + ":" + esc(s.slug) + '" data-name="' + esc(String(s.name_ru).toLowerCase()) + '"';
      if (isLocked) attrs += " disabled";
      if (hide) attrs += " hidden";
      var extra = otherPoolNames(s.slug, poolRow).map(function (n) { return "также у " + n; });
      var meta = spellMetaLine(s, extra);
      html += "<button" + attrs + '><span class="lv-spell__name">' + esc(name) + "</span>" + (meta ? '<span class="lv-spell__src">' + esc(meta) + "</span>" : "") + "</button>";
    });
    html += "</div></section>";
    return html;
  }

  function toolbarHtml(row) {
    if (!row) return "";
    var def = rowDef(row);
    var min = row.primary && CONTEXT.lobby ? Math.max(1, CONTEXT.startLevel) : 1;
    var remain = remainingPicks();
    var html = '<div class="lv-toolbar">';
    html += '<span class="lv-toolbar__who">' + esc(row.name_ru) + "</span>";
    html += '<span class="lv-toolbar__meta">' + (row.primary ? "основной" : "мультикласс") + " · кость " + dieLabel(def ? def.hit_die : "d8") + "</span>";
    html += '<div class="lv-level"><span class="lv-level__lab">Уровень</span><div class="abil-stepper">';
    html += '<button class="seg" type="button" data-lv-bump="' + esc(row.id) + ':-1"' + (row.level <= min ? " disabled" : "") + ">−</button>";
    html += '<span class="abil-stepper__val">' + row.level + "</span>";
    html += '<button class="seg" type="button" data-lv-bump="' + esc(row.id) + ':1"' + (row.level >= 20 ? " disabled" : "") + ">+</button>";
    html += "</div></div>";
    if (!row.primary) html += chip("Убрать класс", false, ' data-lv-remove="' + esc(row.id) + '"');
    html += '<div class="lv-remain' + (remain.length ? " is-need" : "") + '"><span class="lv-remain__n">Осталось выборов: ' + remain.length + "</span>";
    if (remain.length) html += chip("К следующему", false, " data-lv-next");
    html += "</div></div>";
    return html;
  }

  function tabsHtml() {
    if (state.classes.length < 2) return "";
    var html = '<div class="lv-tabs">';
    state.classes.forEach(function (row) {
      var on = focusedRow() && focusedRow().id === row.id;
      var lab = esc(row.name_ru) + " " + row.level;
      html += chip(lab, on, ' data-lv-tab="' + esc(row.id) + '"');
    });
    html += "</div>";
    return html;
  }

  function ribbonHtml(row) {
    if (!row) return "";
    var html = '<div class="lv-ribbon">';
    for (var lvl = 1; lvl <= row.level; lvl++) html += levelCard(row, lvl);
    html += "</div>";
    return html;
  }

  function mcHtml() {
    var html = '<div class="lv-mc"><div class="race-chip-row">' + chip("Добавить класс", state.mcOpen, " data-lv-mc-toggle") + "</div>";
    if (state.mcOpen) {
      html += '<ul class="lv-mc-list">';
      CLASSES.slice().sort(function (a, b) {
        var ca = mcCheck(a.slug); var cb = mcCheck(b.slug);
        return Number(cb.ok) - Number(ca.ok) || a.name_ru.localeCompare(b.name_ru, "ru");
      }).forEach(function (c) {
        var check = mcCheck(c.slug);
        var lab = esc(c.name_ru);
        var sub = check.ok ? check.detail : (check.detail === "уже есть" ? "уже есть" : ("нужно: " + (formatPrereq(c.slug) || check.detail)));
        html += "<li>" + chip(lab + " · " + esc(sub), false, check.ok ? ' data-lv-mc="' + esc(c.slug) + '"' : " disabled", check.ok ? "" : "is-blocked") + "</li>";
      });
      html += "</ul>";
    }
    html += "</div>";
    return html;
  }

  function detailHtml() {
    var row = focusedRow();
    var html = '<div class="lv-setup' + (casterRows().length > 1 ? " lv-setup--mc-casters" : "") + '">';
    html += previewStripHtml();
    html += toolbarHtml(row);
    html += tabsHtml();
    var focusItems = row ? remainingPicks().filter(function (p) { return p.row.id === row.id; }) : [];
    var spellsFirst = casterRows().length > 1 || !!(focusItems[0] && (focusItems[0].key === "book" || focusItems[0].key === "cantrip"));
    if (spellsFirst) html += spellsHtml(row);
    html += ribbonHtml(row);
    if (!spellsFirst) html += spellsHtml(row);
    html += mcHtml();
    var soft = softSpellGaps();
    if (soft.length && isReady()) {
      html += '<p class="t-muted lv-hint">' + esc(soft.join("; ")) + ". Можно заполнить на листе.</p>";
    }
    html += "</div>";
    return html;
  }

  function footerHtml() {
    return '<div class="lv-footer-actions">' +
      '<button class="btn" type="button">Сохранить черновик</button>' +
      '<button class="btn btn-accent" type="button"' + (isReady() ? "" : " disabled") + ">Готово</button>" +
      "</div>";
  }

  function paint() {
    state.classes.forEach(ensureRow);
    var cards = document.querySelector("[data-create-cards]");
    if (cards) cards.innerHTML = summaryHtml();
    var detail = document.querySelector("[data-create-detail]");
    if (detail) detail.innerHTML = detailHtml();
    var sheet = document.querySelector("[data-summary-body]");
    if (sheet) sheet.innerHTML = summaryHtml();
    var right = document.querySelector("[data-create-footer-right]");
    if (right) right.innerHTML = footerHtml();
    bind();
  }

  function bind() {
    document.querySelectorAll("[data-lv-bump]").forEach(function (el) {
      el.addEventListener("click", function () {
        var p = el.getAttribute("data-lv-bump").split(":");
        bumpLevel(p[0], Number(p[1]));
        paint();
      });
    });
    document.querySelectorAll("[data-lv-remove]").forEach(function (el) {
      el.addEventListener("click", function () { removeClass(el.getAttribute("data-lv-remove")); paint(); });
    });
    document.querySelectorAll("[data-lv-hp]").forEach(function (el) {
      el.addEventListener("click", function () {
        var p = el.getAttribute("data-lv-hp").split(":");
        var key = hpKey(p[0], Number(p[1]));
        var mode = p[2];
        var def = rowDef(state.classes.filter(function (r) { return r.id === p[0]; })[0]);
        var rolled = mode === "roll" ? (1 + Math.floor(Math.random() * dieSides(def ? def.hit_die : "d8"))) : null;
        state.hp[key] = { mode: mode, rolled: rolled };
        paint();
      });
    });
    document.querySelectorAll("[data-lv-style]").forEach(function (el) {
      el.addEventListener("click", function () {
        var p = el.getAttribute("data-lv-style").split(":");
        var f = state.forks[p[0]]; if (f) f.style = f.style === p[1] ? null : p[1];
        paint();
      });
    });
    document.querySelectorAll("[data-lv-sub]").forEach(function (el) {
      el.addEventListener("click", function () {
        var p = el.getAttribute("data-lv-sub").split(":");
        var f = state.forks[p[0]]; if (f) f.subclass = f.subclass === p[1] ? null : p[1];
        paint();
      });
    });
    document.querySelectorAll("[data-lv-pact]").forEach(function (el) {
      el.addEventListener("click", function () {
        var p = el.getAttribute("data-lv-pact").split(":");
        var f = state.forks[p[0]]; if (f) f.pact = f.pact === p[1] ? null : p[1];
        paint();
      });
    });
    document.querySelectorAll("[data-lv-inv]").forEach(function (el) {
      el.addEventListener("click", function () {
        var p = el.getAttribute("data-lv-inv").split(":");
        var f = state.forks[p[0]]; if (!f) return;
        var need = invocationsNeeded((state.classes.filter(function (r) { return r.id === p[0]; })[0] || {}).level || 1);
        f.invocations = toggleIn(f.invocations.slice(), p[1], need);
        paint();
      });
    });
    document.querySelectorAll("[data-lv-asi]").forEach(function (el) {
      el.addEventListener("click", function () {
        var p = el.getAttribute("data-lv-asi").split(":");
        var f = state.forks[p[0]]; if (!f) return;
        f.asiMode = f.asiMode === p[1] ? null : p[1];
        f.asiKeys = [];
        f.featSlug = null;
        paint();
      });
    });
    document.querySelectorAll("[data-lv-asik]").forEach(function (el) {
      el.addEventListener("click", function () {
        var p = el.getAttribute("data-lv-asik").split(":");
        var f = state.forks[p[0]]; if (!f) return;
        var max = f.asiMode === "plus2" ? 1 : 2;
        f.asiKeys = toggleIn(f.asiKeys.slice(), p[1], max);
        paint();
      });
    });
    document.querySelectorAll("[data-lv-feat]").forEach(function (el) {
      el.addEventListener("click", function () {
        var p = el.getAttribute("data-lv-feat").split(":");
        var f = state.forks[p[0]]; if (!f) return;
        f.featSlug = f.featSlug === p[1] ? null : p[1];
        paint();
      });
    });
    document.querySelectorAll("[data-lv-msk]").forEach(function (el) {
      el.addEventListener("click", function () {
        var p = el.getAttribute("data-lv-msk").split(":");
        var f = state.forks[p[0]]; if (!f) return;
        var row = state.classes.filter(function (r) { return r.id === p[0]; })[0];
        var need = skillNeed(rowDef(row));
        if (CONTEXT.knownSkills.indexOf(p[1]) >= 0) return;
        f.mcSkills = toggleIn(f.mcSkills.slice(), p[1], need);
        paint();
      });
    });
    document.querySelectorAll("[data-lv-sp]").forEach(function (el) {
      el.addEventListener("click", function () {
        var p = el.getAttribute("data-lv-sp").split(":");
        var id = p[0], kind = p[1], slug = p[2];
        var sp = state.spells[id]; if (!sp) return;
        var row = state.classes.filter(function (r) { return r.id === id; })[0];
        var def = rowDef(row);
        var max = kind === "cantrips" ? cantripsMax(def, row.level) : kind === "book" ? bookNeed(def, row.level) : kind === "known" ? knownMax(def, row.level) : kind === "prepared" ? prepareMax(def) : 0;
        if (kind === "prepared") {
          var always = alwaysPrepared(def, forkOf(row), row.level).map(function (s) { return s.slug; });
          if (always.indexOf(slug) >= 0) return;
        }
        sp[kind] = toggleIn((sp[kind] || []).slice(), slug, max);
        paint();
      });
    });
    document.querySelectorAll("[data-lv-ritual]").forEach(function (el) {
      el.addEventListener("click", function () {
        var id = el.getAttribute("data-lv-ritual");
        var sp = state.spells[id]; if (sp) sp.ritualView = !sp.ritualView;
        paint();
      });
    });
    var tog = document.querySelector("[data-lv-mc-toggle]");
    if (tog) tog.addEventListener("click", function () { state.mcOpen = !state.mcOpen; paint(); });
    document.querySelectorAll("[data-lv-mc]").forEach(function (el) {
      el.addEventListener("click", function () { addMc(el.getAttribute("data-lv-mc")); paint(); });
    });
    document.querySelectorAll("[data-lv-tab]").forEach(function (el) {
      el.addEventListener("click", function () { state.ui.tab = el.getAttribute("data-lv-tab"); paint(); });
    });
    document.querySelectorAll("[data-lv-toggle]").forEach(function (el) {
      el.addEventListener("click", function () {
        var p = el.getAttribute("data-lv-toggle").split(":");
        var row = state.classes.filter(function (r) { return r.id === p[0]; })[0];
        var lvl = Number(p[1]);
        var key = p[0] + ":" + lvl;
        var pending = row ? levelPending(row, lvl) : false;
        var cur = row ? levelIsOpen(row, lvl, pending) : false;
        state.ui.open[key] = !cur;
        paint();
      });
    });
    document.querySelectorAll("[data-lv-next]").forEach(function (el) {
      el.addEventListener("click", function () {
        var items = remainingPicks();
        if (!items.length) return;
        var it = items[0];
        state.ui.tab = it.row.id;
        state.ui.open[openKey(it.row, it.level)] = true;
        state.ui.scrollNeed = true;
        paint();
      });
    });
    document.querySelectorAll("[data-lv-circle]").forEach(function (el) {
      el.addEventListener("click", function () {
        var p = el.getAttribute("data-lv-circle").split(":");
        var sp = state.spells[p[0]];
        if (sp) sp.circle = Number(p[1]);
        paint();
      });
    });
    document.querySelectorAll("[data-lv-q]").forEach(function (el) {
      el.addEventListener("input", function () {
        state.ui.q = el.value;
        var q = el.value.trim().toLowerCase();
        var root = el.closest(".lv-spells") || document;
        root.querySelectorAll(".lv-spell").forEach(function (tile) {
          var name = tile.getAttribute("data-name") || "";
          tile.hidden = !!(q && name.indexOf(q) < 0);
        });
      });
    });
    document.querySelectorAll("[data-lv-exp]").forEach(function (el) {
      el.addEventListener("click", function () {
        var p = el.getAttribute("data-lv-exp").split(":");
        var f = state.forks[p[0]]; if (!f) return;
        var row = state.classes.filter(function (r) { return r.id === p[0]; })[0];
        var need = expertiseNeed(rowDef(row), row.level);
        f.expertise = toggleIn((f.expertise || []).slice(), p[1], need);
        paint();
      });
    });
    document.querySelectorAll("[data-lv-meta]").forEach(function (el) {
      el.addEventListener("click", function () {
        var p = el.getAttribute("data-lv-meta").split(":");
        var f = state.forks[p[0]]; if (!f) return;
        var row = state.classes.filter(function (r) { return r.id === p[0]; })[0];
        var feat = featureByFrom(rowDef(row), row.level, "sorcerer_metamagic", false);
        var need = maxPicksAt(feat && feat.choice, row.level);
        f.metamagic = toggleIn((f.metamagic || []).slice(), p[1], need);
        paint();
      });
    });
    document.querySelectorAll("[data-lv-inf]").forEach(function (el) {
      el.addEventListener("click", function () {
        var p = el.getAttribute("data-lv-inf").split(":");
        var f = state.forks[p[0]]; if (!f) return;
        var row = state.classes.filter(function (r) { return r.id === p[0]; })[0];
        var feat = featureByFrom(rowDef(row), row.level, "artificer_infusions", false);
        var need = maxPicksAt(feat && feat.choice, row.level);
        f.infusions = toggleIn((f.infusions || []).slice(), p[1], need);
        paint();
      });
    });
    document.querySelectorAll("[data-lv-enemy]").forEach(function (el) {
      el.addEventListener("click", function () {
        var p = el.getAttribute("data-lv-enemy").split(":");
        var f = state.forks[p[0]]; if (!f) return;
        f.favoredEnemy = f.favoredEnemy === p[1] ? null : p[1];
        paint();
      });
    });
    document.querySelectorAll("[data-lv-terrain]").forEach(function (el) {
      el.addEventListener("click", function () {
        var p = el.getAttribute("data-lv-terrain").split(":");
        var f = state.forks[p[0]]; if (!f) return;
        f.favoredTerrain = f.favoredTerrain === p[1] ? null : p[1];
        paint();
      });
    });
    if (state.ui.scrollNeed) {
      state.ui.scrollNeed = false;
      var target = document.querySelector("[data-lv-need]");
      if (target) target.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }

  function addPrimary(slug, level) {
    var row = newClassRow(slug, level || 1, true);
    /* stable ids for presets */
    row.id = slug + "-main";
    state.classes = [row];
    ensureRow(row);
    syncHp();
    return row;
  }

  function scoreSet(map) {
    CONTEXT.abilities = emptyAbil(8);
    Object.keys(map).forEach(function (k) { CONTEXT.abilities[k] = map[k]; });
  }

  /* Mountain dwarf + class-priority finals used as current scores. */
  var SCORES = {
    fighter: { str: 17, dex: 13, con: 16, int: 8, wis: 12, cha: 10 },
    cleric: { str: 13, dex: 12, con: 16, int: 8, wis: 16, cha: 10 },
    wizard: { str: 10, dex: 13, con: 16, int: 15, wis: 12, cha: 8 },
    warlock: { str: 10, dex: 13, con: 16, int: 10, wis: 12, cha: 15 },
    clericWizard: { str: 13, dex: 12, con: 14, int: 15, wis: 16, cha: 10 }
  };

  function fillHpAverage(row) {
    for (var lvl = 2; lvl <= row.level; lvl++) {
      state.hp[hpKey(row.id, lvl)] = { mode: "average", rolled: null };
    }
  }

  var PRESETS = {
    "lvl-fighter": function () {
      scoreSet(SCORES.fighter);
      addPrimary("fighter", 1);
    },
    "lvl-cleric": function () {
      scoreSet(SCORES.cleric);
      addPrimary("cleric", 1);
    },
    "lvl-cleric-ready": function () {
      scoreSet(SCORES.cleric);
      var row = addPrimary("cleric", 1);
      var f = forkOf(row);
      f.subclass = "life_domain";
      var sp = spellOf(row);
      sp.cantrips = ["sacred_flame", "guidance", "spare_the_dying"];
      sp.prepared = ["healing_word", "guiding_bolt", "shield_of_faith", "sanctuary"];
    },
    "lvl-wizard": function () {
      scoreSet(SCORES.wizard);
      addPrimary("wizard", 1);
    },
    "lvl-wizard-ready": function () {
      scoreSet(SCORES.wizard);
      var row = addPrimary("wizard", 1);
      var sp = spellOf(row);
      sp.cantrips = ["fire_bolt", "mage_hand", "prestidigitation"];
      sp.book = ["magic_missile", "mage_armor", "shield", "detect_magic", "comprehend_languages", "find_familiar"];
    },
    "lvl-warlock3-ready": function () {
      scoreSet(SCORES.warlock);
      var row = addPrimary("warlock", 3);
      var f = forkOf(row);
      f.subclass = "the_fiend";
      f.pact = "blade";
      f.invocations = ["agonizing_blast", "devils_sight"];
      var sp = spellOf(row);
      sp.cantrips = ["eldritch_blast", "prestidigitation"];
      sp.known = ["hex", "hellish_rebuke", "armor_of_agathys", "misty_step"];
      fillHpAverage(row);
    },
    "lvl-fighter4": function () {
      scoreSet(SCORES.fighter);
      var row = addPrimary("fighter", 4);
      forkOf(row).style = "defense";
    },
    "lvl-fighter4-feat": function () {
      scoreSet(SCORES.fighter);
      var row = addPrimary("fighter", 4);
      var f = forkOf(row);
      f.style = "defense";
      f.subclass = "champion";
      f.asiMode = "feat";
      f.featSlug = "alert";
      fillHpAverage(row);
    },
    "lvl-mc": function () {
      scoreSet(SCORES.fighter);
      var row = addPrimary("fighter", 3);
      forkOf(row).style = "defense";
      var rogue = newClassRow("rogue", 1, false);
      rogue.id = "rogue-mc";
      state.classes.push(rogue);
      ensureRow(rogue);
      syncHp();
      fillHpAverage(row);
      state.mcOpen = true;
    },
    "lvl-mc-cw-cleric": function () { presetClericWizard(false, "cleric"); },
    "lvl-mc-cw-wizard": function () { presetClericWizard(false, "wizard"); },
    "lvl-mc-cw-ready": function () { presetClericWizard(true, "cleric"); }
  };

  function presetClericWizard(ready, tabSlug) {
    scoreSet(SCORES.clericWizard);
    var cleric = addPrimary("cleric", 3);
    var wizard = newClassRow("wizard", 2, false);
    wizard.id = "wizard-mc";
    state.classes.push(wizard);
    ensureRow(wizard);
    syncHp();
    forkOf(cleric).subclass = "life_domain";
    if (ready) {
      forkOf(wizard).subclass = "school_of_evocation";
      fillHpAverage(cleric);
      fillHpAverage(wizard);
      state.hp[hpKey(wizard.id, 1)] = { mode: "average", rolled: null };
      var csp = spellOf(cleric);
      csp.cantrips = ["sacred_flame", "guidance", "light"];
      csp.prepared = ["healing_word", "guiding_bolt", "detect_magic", "shield_of_faith"];
      var wsp = spellOf(wizard);
      wsp.cantrips = ["fire_bolt", "mage_hand", "light"];
      wsp.book = ["magic_missile", "mage_armor", "shield", "detect_magic", "comprehend_languages", "find_familiar", "thunderwave", "sleep"];
      wsp.prepared = ["magic_missile", "shield"];
    }
    var tabRow = tabSlug === "wizard" ? wizard : cleric;
    state.ui.tab = tabRow.id;
    state.mcOpen = false;
  }

  function contextFor(name) {
    CONTEXT.knownSkills = (name.indexOf("fighter") >= 0 || name === "lvl-mc") ? ["athletics", "intimidation"] : (name.indexOf("cleric") >= 0 || name.indexOf("mc-cw") >= 0 ? ["insight", "religion"] : []);
    CONTEXT.lobby = false;
    CONTEXT.startLevel = 1;
  }

  function renderView(name) {
    state = emptyState();
    contextFor(name);
    var prep = PRESETS[name];
    if (prep) prep();
    /* fiend slug check patched below if needed */
    C.renderPipeline({ step: "leveling", steps: STEPS5, lobby: CONTEXT.lobby });
    paint();
  }

  Object.keys(PRESETS).forEach(function (name) {
    C.registerView(name, function () { renderView(name); });
  });

  var origSetWidth = C.setWidth;
  C.setWidth = function (width) {
    origSetWidth(width);
    var v = document.documentElement.getAttribute("data-view") || "";
    if (PRESETS[v]) renderView(v);
  };

  var q = new URLSearchParams(location.search);
  var bootView = q.get("view") || document.documentElement.getAttribute("data-view");
  if (bootView && PRESETS[bootView]) C.applyView(bootView);
})();
