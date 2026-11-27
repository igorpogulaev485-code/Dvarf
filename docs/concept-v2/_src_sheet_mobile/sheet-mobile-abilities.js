  const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];
  const ABILITY_NAMES = { str: "Сила", dex: "Ловкость", con: "Телосложение", int: "Интеллект", wis: "Мудрость", cha: "Харизма" };
  const ABILITY_GENITIVE = { str: "Силы", dex: "Ловкости", con: "Телосложения", int: "Интеллекта", wis: "Мудрости", cha: "Харизмы" };
  const ARMOR_PROF_OPTIONS = [
    { key: "light", label: "Лёгкие" },
    { key: "medium", label: "Средние" },
    { key: "heavy", label: "Тяжёлые" },
    { key: "shields", label: "Щиты" }
  ];
  const WEAPON_PROF_OPTIONS = [
    { key: "simple", label: "Простое" },
    { key: "martial", label: "Воинское" }
  ];
  const LANGUAGE_PRESETS = ["Общий","Дварфийский","Эльфийский","Великаний","Гномий","Гоблинский","Полуросликов","Орочий","Бездны","Небесный","Драконий","Глубинная речь","Инфернальный","Первичный","Акван","Сильван","Подземный","Друидический"];
  const TOOL_PRESETS = ["Воровские инструменты","Набор травника","Набор целителя","Набор отравителя","Инструменты кузнеца","Инструменты плотника","Инструменты кожевника","Инструменты резчика","Инструменты ювелира","Инструменты стеклодува","Инструменты ткача","Инструменты гончара","Инструменты пивовара","Инструменты каллиграфа","Инструменты картографа","Инструменты навигатора","Инструменты каменщика","Музыкальный инструмент","Игровой набор","Транспорт (наземный)","Транспорт (водный)"];
  const WEAPON_EXTRA_PRESETS = ["Рапира","Длинный меч","Короткий меч","Ятаган","Кинжал","Ручной арбалет","Лёгкий арбалет","Короткий лук","Длинный лук","Боевой топор","Ручной топор","Боевой молот","Лёгкий молот","Булава","Боевой посох","Дубинка","Копьё","Метательное копьё","Трезубец","Сеть","Секира","Дротик"];
  const SKILL_ORDER = [
    "athletics",
    "acrobatics", "stealth", "sleight",
    "religion", "history", "arcana", "nature", "investigation",
    "insight", "medicine", "perception", "survival", "animal",
    "persuasion", "deception", "intimidation", "performance"
  ];

  function classIdOf(s) {
    const c = (s.classes || [])[0];
    return c && c.id ? c.id : "";
  }
  function defaultSaves(s) {
    const id = classIdOf(s);
    const all = { str: false, dex: false, con: false, int: false, wis: false, cha: false };
    const map = {
      cleric: ["wis", "cha"],
      paladin: ["wis", "cha"],
      rogue: ["dex", "int"],
      barbarian: ["str", "con"],
      wizard: ["int", "wis"],
      sorcerer: ["con", "cha"],
      fighter: ["str", "con"],
      ranger: ["str", "dex"],
      bard: ["dex", "cha"],
      druid: ["int", "wis"],
      monk: ["str", "dex"],
      warlock: ["wis", "cha"]
    };
    (map[id] || []).forEach((k) => { all[k] = true; });
    return all;
  }
  function defaultDarkvision(s) {
    const race = String(s.race || "").toLowerCase();
    if (/полуросл/.test(race) || /halfling/.test(race)) return 0;
    if (/дварф|орк|эльф|tiefling|тифлинг|гном/.test(race)) return 60;
    return 0;
  }
  function defaultOwnership(s) {
    const id = s.id;
    if (id === "kaedrin") {
      return {
        armor: { light: true, medium: true, heavy: false, shields: true },
        weapons: { simple: true, martial: false, extras: ["Боевой топор", "Ручной топор", "Лёгкий молот", "Боевой молот"] },
        tools: ["Инструменты каменщика"],
        languages: ["Общий", "Дварфийский"]
      };
    }
    if (id === "nilla") {
      return {
        armor: { light: true, medium: false, heavy: false, shields: false },
        weapons: { simple: true, martial: false, extras: ["Рапира", "Короткий меч", "Длинный меч", "Ручной арбалет"] },
        tools: ["Воровские инструменты"],
        languages: ["Общий", "Полуросликов"]
      };
    }
    if (id === "gorn") {
      return {
        armor: { light: true, medium: true, heavy: false, shields: true },
        weapons: { simple: true, martial: true, extras: [] },
        tools: [],
        languages: ["Общий", "Орочий"]
      };
    }
    const cid = classIdOf(s);
    const armor = { light: false, medium: false, heavy: false, shields: false };
    const weapons = { simple: true, martial: false, extras: [] };
    if (cid === "cleric" || cid === "druid" || cid === "ranger" || cid === "barbarian") {
      armor.light = true; armor.medium = true; armor.shields = true;
    }
    if (cid === "paladin" || cid === "fighter") {
      armor.light = true; armor.medium = true; armor.heavy = true; armor.shields = true;
      weapons.martial = true;
    }
    if (cid === "rogue" || cid === "bard" || cid === "warlock") armor.light = true;
    if (cid === "barbarian" || cid === "ranger") weapons.martial = true;
    const race = String(s.race || "");
    const languages = ["Общий"];
    if (/дварф/i.test(race)) languages.push("Дварфийский");
    else if (/эльф/i.test(race)) languages.push("Эльфийский");
    else if (/орк/i.test(race)) languages.push("Орочий");
    else if (/полуросл/i.test(race)) languages.push("Полуросликов");
    const tools = [];
    if (cid === "rogue") tools.push("Воровские инструменты");
    return { armor: armor, weapons: weapons, tools: tools, languages: languages };
  }
  function laterItems() {
    const hasSkills = Object.keys(sheet.skills || {}).some((k) => skillProf(k) >= 1);
    const hasAtk = (sheet.attacks || []).length > 0;
    const load = (typeof MAGIC_LOADOUTS !== "undefined" && MAGIC_LOADOUTS[sheet.id]) || null;
    const loadSpells = load && (load.spells || load.prepared || load.known || load.always);
    const hasSpellList = !!(load && (
      (Array.isArray(loadSpells) && loadSpells.length) ||
      (load.prepared && load.prepared.length) ||
      (load.known && load.known.length) ||
      (load.always && load.always.length)
    ));
    const hasSpells = !isCaster() || hasSpellList;
    return [
      { id: "name", name: "Имя и аватар", hint: "В шапке / «Основное»", done: !!(sheet.name && String(sheet.name).trim()), go: "identity" },
      { id: "hp", name: "Хиты и КД", hint: "Шапка боя; КД от доспеха в снаряжении", done: (Number(sheet.hpMax) || 0) > 0, go: "hp" },
      { id: "skills", name: "Навыки класса", hint: "Владения обычно уже с создания", done: hasSkills, laterSkills: true },
      { id: "attack", name: "Хотя бы одна атака", hint: "Панель «Атаки» или сцена Бой", done: hasAtk, go: "attacks-settings" },
      { id: "spells", name: "Заклинания (если кастер)", hint: "Подготовь 1–2 и ячейки «От класса»", done: hasSpells, go: "prepare" },
      { id: "look", name: "Пара строк о внешности", hint: "Тексты и заметки", done: !!(sheet.appearance && String(sheet.appearance).trim()), go: "identity" },
      { id: "setup", name: "Нужно настроить", hint: "Бейдж в шапке — незакрытые выборы", done: !sheet.needsSetup, go: "needs-setup" }
    ];
  }

  function ensureAbilityState() {
    if (!sheet.abilityBase) sheet.abilityBase = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    ABILITY_KEYS.forEach((k) => {
      const n = Number(sheet.abilityBase[k]);
      sheet.abilityBase[k] = Number.isFinite(n) ? Math.min(30, Math.max(1, Math.trunc(n))) : 10;
    });
    if (!sheet.saves) sheet.saves = defaultSaves(sheet);
    ABILITY_KEYS.forEach((k) => { if (sheet.saves[k] == null) sheet.saves[k] = false; });
    if (!sheet.skills) sheet.skills = {};
    Object.keys(SKILL_DEFS).forEach((k) => {
      if (!sheet.skills[k]) sheet.skills[k] = { p: 0 };
      const p = Number(sheet.skills[k].p) || 0;
      sheet.skills[k].p = p >= 2 ? 2 : (p === 1 ? 1 : 0);
    });
    if (sheet.darkvisionBase == null) sheet.darkvisionBase = defaultDarkvision(sheet);
    if (sheet.darkvisionEff == null) sheet.darkvisionEff = sheet.darkvisionBase;
    if (!sheet.ownership) sheet.ownership = defaultOwnership(sheet);
    const o = sheet.ownership;
    if (!o.armor) o.armor = { light: false, medium: false, heavy: false, shields: false };
    if (!o.weapons) o.weapons = { simple: false, martial: false, extras: [] };
    if (!Array.isArray(o.weapons.extras)) o.weapons.extras = [];
    if (!Array.isArray(o.tools)) o.tools = [];
    if (!Array.isArray(o.languages)) o.languages = [];
    if (!Array.isArray(state.abilOrder) || state.abilOrder.length !== 6) state.abilOrder = ABILITY_KEYS.slice();
    ABILITY_KEYS.forEach((k) => { if (state.abilOrder.indexOf(k) < 0) state.abilOrder.push(k); });
    state.abilOrder = state.abilOrder.filter((k) => ABILITY_KEYS.indexOf(k) >= 0);
    if (!state.abilCollapsed) state.abilCollapsed = {};
    if (state.ownCollapsed == null) state.ownCollapsed = true;
    if (state.laterOpen == null) state.laterOpen = false;
    if (state.ownMore == null) state.ownMore = null;
    if (sheet.needsSetup == null) sheet.needsSetup = false;
    if (!sheet.abilityKey || ABILITY_KEYS.indexOf(sheet.abilityKey) < 0) sheet.abilityKey = "str";
  }

  function openAbilities() {
    ensureAbilityState();
    state.abilOpen = true;
    state.dialog = null;
    state.moreOpen = false;
    state.ownMore = null;
    render();
  }
  function closeAbilities() {
    state.abilOpen = false;
    state.ownMore = null;
    if (state.dialog === "abil-break" || state.dialog === "skill-break" || state.dialog === "ownership" || state.dialog === "sense") {
      state.dialog = null;
    }
    render();
  }
  function allAbilCollapsed() {
    return ABILITY_KEYS.every((k) => state.abilCollapsed[k]);
  }
  function setAbilCollapsedAll(on) {
    ABILITY_KEYS.forEach((k) => { state.abilCollapsed[k] = !!on; });
    render();
  }
  function toggleAbil(key) {
    state.abilCollapsed[key] = !state.abilCollapsed[key];
    render();
  }
  function saveProf(key) { return !!(sheet.saves && sheet.saves[key]); }
  function saveTotal(key) {
    const gear = (typeof gearSaveBonus === "function") ? Number(gearSaveBonus(key)) || 0 : 0;
    const base = ability(key) + (saveProf(key) ? pb() : 0) + gear;
    if (typeof applyBonusStack === "function") {
      return applyBonusStack(base, bonusesFor(key + "_save"), formulaVars()).total;
    }
    return base;
  }
  function checkTotal(key) {
    const base = ability(key);
    if (typeof applyBonusStack === "function") {
      return applyBonusStack(base, bonusesFor(key + "_check"), formulaVars()).total;
    }
    return base;
  }
  function senseShown() { return Math.max(0, Number(sheet.darkvisionEff) || 0, Number(sheet.darkvisionBase) || 0); }

  function rollCheck(key) {
    const mod = ability(key);
    const r = rollWithAdv();
    const total = r.pick + mod;
    const text = r.line + " " + fmtMod(mod) + " → " + total;
    addRoll("Проверка " + ABILITY_NAMES[key], text);
    toast("Проверка " + ABILITY_NAMES[key] + ": " + text);
    render();
  }
  function rollSave(key) {
    const mod = saveTotal(key);
    const r = rollWithAdv();
    const total = r.pick + mod;
    const text = r.line + " " + fmtMod(mod) + " → " + total;
    addRoll("Спас " + ABILITY_NAMES[key], text);
    toast("Спасбросок " + ABILITY_NAMES[key] + ": " + text);
    render();
  }

  function profMark(p) {
    const lvl = p >= 2 ? 2 : (p === 1 ? 1 : 0);
    const cls = "skill-prof-wrap" + (lvl === 2 ? " is-expert" : "") + (lvl === 1 ? " is-on" : "");
    const skillCls = lvl === 2 ? " is-expert" : (lvl === 1 ? " is-on" : "");
    return `<span class="${cls}" aria-hidden="true"><span class="skill-prof${skillCls}"></span></span>`;
  }

  function skillsOf(key) {
    return SKILL_ORDER.filter((id) => SKILL_DEFS[id] && SKILL_DEFS[id].abil === key);
  }

  function abilCardHtml(key) {
    const score = (typeof baseScoreOf === "function") ? baseScoreOf(key) : (Number((sheet.abilityBase || {})[key]) || 10);
    const total = (typeof scoreTotal === "function") ? scoreTotal(key) : score;
    const mod = ability(key);
    const eff = total !== score
      ? '<span class="abil-card__effective" title="С учётом предметов и бафов">→ ' + total + "</span>"
      : "";
    const open = !state.abilCollapsed[key];
    const sk = skillsOf(key);
    const saveOn = saveProf(key);
    const skills = sk.map((id) => {
      const p = skillProf(id);
      const total = skillTotal(id);
      const expert = p >= 2 ? " is-expert" : "";
      const on = p >= 1 ? " is-on" : "";
      return `<div class="abil-skill${on}${expert}" data-p="${p}">
        <button type="button" class="abil-skill__pip" data-toggle-skill-prof="${esc(id)}" aria-label="${esc(SKILL_DEFS[id].name)}: владение" title="Цикл: нет / владение / компетентность">${profMark(p)}</button>
        <button type="button" class="abil-skill__name" data-open-skill="${esc(id)}">${esc(SKILL_DEFS[id].name)}</button>
        <button type="button" class="abil-skill__roll" data-roll-skill="${esc(id)}" aria-label="Бросок: ${esc(SKILL_DEFS[id].name)}">${fmtMod(total)}</button>
      </div>`;
    }).join("");
    const chev = `<button type="button" class="abil-card__chev" data-toggle-abil="${key}" aria-expanded="${open ? "true" : "false"}" aria-label="${open ? "Свернуть" : "Развернуть"} навыки ${esc(ABILITY_NAMES[key])}"><span class="abil-card__chev-ico"></span></button>`;
    const skillsBody = sk.length ? skills : `<p class="abil-block__empty">—</p>`;
    return `<article class="abil-card${open ? " is-open" : ""}" data-abil="${key}" style="--abil: var(--abil-${key}); --abil-soft: var(--abil-${key}-soft);">
      <span class="abil-grip" aria-hidden="true"><i></i><i></i></span>
      <div class="abil-card__head" data-abil-head="${key}">
        <div class="abil-card__label">
          ${chev}
          <button type="button" class="abil-card__name" data-open-abil="${key}">${esc(ABILITY_NAMES[key])}</button>
        </div>
        <div class="abil-card__meta">
          <span class="abil-card__score-wrap">
            <button type="button" class="abil-card__score" data-open-abil="${key}" title="Базовое значение. Открыть разборку" aria-label="Базовое значение ${esc(ABILITY_NAMES[key])}: ${score}${total !== score ? ", с предметами " + total : ""}. Открыть разборку">${score}</button>
            ${eff}
          </span>
          <button type="button" class="abil-roll" data-roll-check="${key}" aria-label="Проверка ${esc(ABILITY_NAMES[key])}"><span class="abil-roll__k">Пр</span> <span class="abil-roll__v">${fmtMod(mod)}</span></button>
          <span class="abil-mod-pair">
            <button type="button" class="abil-save-pip${saveOn ? " is-on" : ""}" data-toggle-save="${key}" aria-pressed="${saveOn ? "true" : "false"}" aria-label="Владение спасброском ${esc(ABILITY_NAMES[key])}" title="${saveOn ? "владение — клик: снять" : "без владения — клик: владение"}"><span class="abil-save-pip__mark"></span></button>
            <button type="button" class="abil-roll" data-roll-save="${key}" aria-label="Спасбросок ${esc(ABILITY_NAMES[key])}"><span class="abil-roll__k">Сп</span> <span class="abil-roll__v">${fmtMod(saveTotal(key))}</span></button>
          </span>
        </div>
      </div>
      <div class="abil-card__skills"${open ? "" : " hidden"}>${skillsBody}</div>
    </article>`;
  }

  function groupChips(label, items, groupId) {
    const chips = (items || []).map((t) => `<span class="abil-chip">${esc(t)}</span>`).join("");
    return `<div class="own-glance__group" data-own-group="${esc(groupId)}">
      <span class="own-glance__lab">${esc(label)}</span>
      <div class="own-glance__row" data-chip-row>${chips}<button type="button" class="abil-chip abil-chip--more" data-own-more="${esc(groupId)}" hidden>+0</button></div>
    </div>`;
  }
  function ownershipGlance() {
    ensureAbilityState();
    const o = sheet.ownership;
    const armor = ARMOR_PROF_OPTIONS.filter((opt) => o.armor[opt.key]).map((opt) => opt.label);
    const weapons = WEAPON_PROF_OPTIONS.filter((opt) => o.weapons[opt.key]).map((opt) => opt.label).concat(o.weapons.extras || []);
    return groupChips("Доспехи", armor, "armor")
      + groupChips("Оружие", weapons, "weapons")
      + groupChips("Инструменты", o.tools || [], "tools")
      + groupChips("Языки", o.languages || [], "languages");
  }

  function renderAbilitiesPage() {
    const page = $("[data-abil-page]");
    if (!page) return;
    ensureAbilityState();
    const order = state.abilOrder.slice();
    const later = laterItems();
    const remain = later.filter((it) => !it.done).length;
    const sense = senseShown();
    const senseLabel = sense > 0 ? (sense + " фт") : "нет";
    const pass = [
      { key: "perception", short: "Внимат.", full: "Внимательность" },
      { key: "investigation", short: "Анализ", full: "Анализ" },
      { key: "insight", short: "Прониц.", full: "Проницательность" }
    ];
    const passHtml = pass.map((p) => {
      const v = 10 + skillTotal(p.key);
      return `<div class="abil-pass" title="Пассивная ${esc(p.full)}: 10 ${fmtMod(skillTotal(p.key))}">
        <span class="abil-pass__lab">${esc(p.short)}</span>
        <strong class="abil-pass__num">${v}</strong>
      </div>`;
    }).join("");
    const laterHtml = later.map((it) => {
      const mark = it.done ? " is-done" : "";
      const attr = it.laterSkills ? 'data-later-skills' : `data-later-go="${esc(it.go)}"`;
      const aria = it.done ? "сделано" : "не сделано";
      return `<button type="button" class="later-item${mark}" ${attr} aria-label="${esc(it.name)} — ${aria}">
        <span class="later-item__mark" aria-hidden="true"></span>
        <span class="later-item__body">
          <span class="later-item__name">${esc(it.name)}</span>
          <span class="later-item__hint">${esc(it.hint)}</span>
        </span>
      </button>`;
    }).join("");
    const moreMenu = state.ownMore ? renderOwnMoreMenu() : "";
    page.classList.toggle("is-later", !!state.laterOpen);
    page.innerHTML = `
      <header class="abil-page__bar">
        <button type="button" class="abil-page__back" data-abil-back aria-label="Назад">←</button>
        <h1 class="abil-page__title">Характеристики</h1>
        <div class="abil-page__tools">
          <button type="button" class="abil-chip-btn" data-collapse-abils="1">Свернуть все</button>
          <button type="button" class="abil-chip-btn" data-collapse-abils="0">Развернуть все</button>
          <button type="button" class="abil-page__help" data-abil-help title="Число → бросок · кружок → владение / компетентность · название → разборка" aria-label="Число → бросок · кружок → владение / компетентность · название → разборка">?</button>
        </div>
      </header>
      <div class="abil-page__scroll">
        <div class="abil-list" data-abil-list>${order.map(abilCardHtml).join("")}</div>
      </div>
      <footer class="abil-page__foot">
        <section class="abil-passives-wrap" aria-label="Пассивы">
          <div class="abil-passives__label">Пассивы</div>
          <div class="abil-passives">
          ${passHtml}
          <button type="button" class="abil-pass abil-pass--tz" data-open-sense aria-label="Тёмное зрение: ${esc(senseLabel)}">
            <span class="abil-pass__lab">ТЗ</span>
            <strong class="abil-pass__num">${esc(senseLabel)}</strong>
          </button>
          </div>
        </section>
        <section class="own-glance${state.ownCollapsed ? " is-collapsed" : ""}" data-own-summary>
          <div class="own-glance__head">
            <button type="button" class="own-glance__open" data-open-own>Владения</button>
            <button type="button" class="own-glance__toggle" data-own-toggle aria-expanded="${state.ownCollapsed ? "false" : "true"}" aria-label="Свернуть или развернуть владения"><span class="own-glance__chev">${state.ownCollapsed ? "▸" : "▾"}</span></button>
          </div>
          <div class="own-glance__body" data-own-groups ${state.ownCollapsed ? "hidden" : ""}>${ownershipGlance()}</div>
          ${moreMenu}
        </section>
        <section class="later-box${state.laterOpen ? " is-open" : " is-collapsed"}" data-later>
          <button type="button" class="later-box__head" data-toggle-later aria-expanded="${state.laterOpen ? "true" : "false"}">
            <span class="later-box__title">Можно позже</span>
            <span class="later-box__count">· ${remain}</span>
            <span class="later-box__chev">${state.laterOpen ? "▾" : "▸"}</span>
          </button>
          <div class="later-box__body"${state.laterOpen ? "" : " hidden"}>
            <p class="later-box__intro">Уже можно играть. Остальное — по желанию.</p>
            <div class="later-box__list">${laterHtml}</div>
          </div>
        </section>
      </footer>`;
    layoutOwnChips();
    bindAbilDrag();
  }

  function renderOwnMoreMenu() {
    const id = state.ownMore;
    const o = sheet.ownership || {};
    let items = [];
    if (id === "armor") items = ARMOR_PROF_OPTIONS.filter((opt) => o.armor[opt.key]).map((opt) => opt.label);
    else if (id === "weapons") items = WEAPON_PROF_OPTIONS.filter((opt) => o.weapons[opt.key]).map((opt) => opt.label).concat(o.weapons.extras || []);
    else if (id === "tools") items = o.tools || [];
    else if (id === "languages") items = o.languages || [];
    if (!items.length) return "";
    return `<div class="own-more-pop" data-own-more-pop role="menu">${items.map((t) => `<span class="abil-chip">${esc(t)}</span>`).join("")}</div>`;
  }

  function layoutOwnChips() {
    $$("[data-own-group]").forEach((group) => {
      const row = group.querySelector("[data-chip-row]");
      const more = group.querySelector("[data-own-more]");
      if (!row || !more) return;
      const chips = [...row.querySelectorAll(".abil-chip:not(.abil-chip--more)")];
      chips.forEach((ch) => { ch.hidden = false; });
      more.hidden = true;
      more.textContent = "+0";
      const maxH = 52;
      const top0 = row.getBoundingClientRect().top;
      const hidden = [];
      chips.forEach((ch) => {
        if (ch.getBoundingClientRect().top - top0 + ch.offsetHeight > maxH + 1) {
          ch.hidden = true;
          hidden.push(ch);
        }
      });
      if (hidden.length) {
        more.hidden = false;
        more.textContent = "+" + hidden.length;
        chips.forEach((ch) => { ch.hidden = false; });
        hidden.length = 0;
        const top1 = row.getBoundingClientRect().top;
        chips.forEach((ch) => {
          if (ch.getBoundingClientRect().top - top1 + ch.offsetHeight > maxH + 1) {
            ch.hidden = true;
            hidden.push(ch);
          }
        });
        if (more.getBoundingClientRect().top - top1 + more.offsetHeight > maxH + 1 && hidden.length) {
          const lastVis = chips.filter((c) => !c.hidden).pop();
          if (lastVis) { lastVis.hidden = true; hidden.unshift(lastVis); }
        }
        more.textContent = "+" + hidden.length;
        if (!hidden.length) more.hidden = true;
      }
    });
  }

  function renderAbilDialog(id) {
    if (id === "abil-break") renderAbilBreak();
    else if (id === "skill-break") renderSkillBreak();
    else if (id === "ownership") renderOwnershipEditor();
    else if (id === "sense") renderSenseSheet();
  }

  function renderAbilBreak() {
    const box = $("[data-abil-break-body]");
    const title = $("[data-abil-break-title]");
    const key = sheet.abilityKey || "str";
    if (title) title.textContent = ABILITY_NAMES[key];
    if (!box) return;
    ensureAbilityState();
    const name = ABILITY_NAMES[key];
    const base = (typeof baseScoreOf === "function") ? baseScoreOf(key) : (Number((sheet.abilityBase || {})[key]) || 10);
    const vars = (typeof formulaVars === "function") ? formulaVars() : {};
    const baseVars = (typeof baseFormulaVars === "function") ? baseFormulaVars() : vars;
    const scoreStack = (typeof applyBonusStack === "function")
      ? applyBonusStack(base, bonusesFor(key + "_score"), baseVars)
      : { total: base, applied: [] };
    const gearBits = (typeof gearBonusLines === "function") ? gearBonusLines(key + "_score") : [];
    const gearSum = gearBits.reduce((s, r) => s + (Number(r.value) || 0), 0);
    const totalScore = Math.min(30, Math.max(1, scoreStack.total + gearSum));
    const mod = ability(key);
    const checkStack = (typeof applyBonusStack === "function")
      ? applyBonusStack(mod, bonusesFor(key + "_check"), vars)
      : { total: mod, applied: [] };
    const sav = saveTotal(key);
    const scoreHint = (typeof formatBonusSummary === "function") ? formatBonusSummary(scoreStack.applied) : "";
    const checkHint = (typeof formatBonusSummary === "function") ? formatBonusSummary(checkStack.applied) : "";
    const saveHint = (typeof formatBonusSummary === "function")
      ? formatBonusSummary(((typeof applyBonusStack === "function") ? applyBonusStack(ability(key) + (saveProf(key) ? pb() : 0), bonusesFor(key + "_save"), vars) : { applied: [] }).applied)
      : "";
    const summary = ["Значение " + totalScore, "проверка " + fmtMod(checkStack.total), "спас " + fmtMod(sav)].join(" · ") + (scoreHint ? " · " + scoreHint : "");
    const gearNote = totalScore !== base
      ? (base + " до предметов · с предметами и бафами " + totalScore)
      : (base + " до расовых и бафов");
    const profOn = saveProf(key);
    const gearLines = gearBits.map((r) => `<div class="ac-break__base">${esc(r.name)} ${fmtMod(r.value)}</div>`).join("");
    const saveGearBits = (typeof gearBonusLines === "function") ? gearBonusLines(key + "_save") : [];
    const saveGearLines = saveGearBits.map((r) => `<div class="ac-break__base">${esc(r.name)} ${fmtMod(r.value)}</div>`).join("");
    box.innerHTML = `
      <div class="ac-break ability-breakdown" style="--abil: var(--abil-${key}); --abil-soft: var(--abil-${key}-soft);">
        <div class="ac-break__hero">
          <p class="ac-break__sum" data-break-sum>${esc(summary)}</p>
          <div class="ac-break__badge" aria-label="Модификатор ${fmtMod(mod)}"><b>${fmtMod(mod)}</b><span>мод.</span></div>
        </div>
        <section class="ac-break__sec">
          <h3 class="ac-break__lab">Значение</h3>
          <label class="field ability-breakdown__base">Базовое значение
            <input type="number" min="1" max="30" inputmode="numeric" value="${base}" data-abil-score="${esc(key)}" aria-label="Базовое значение ${esc(name)}">
            <span class="ability-breakdown__base-hint">${esc(gearNote)}</span>
          </label>
          ${gearLines}
          ${typeof renderBonusEditor === "function" ? renderBonusEditor(key + "_score") : ""}
        </section>
        <section class="ac-break__sec">
          <h3 class="ac-break__lab">Проверки</h3>
          <p class="ability-breakdown__channel-hint">Проверка ${fmtMod(checkStack.total)}${checkHint ? " · " + esc(checkHint) : ""}</p>
          ${typeof renderBonusEditor === "function" ? renderBonusEditor(key + "_check") : ""}
        </section>
        <section class="ac-break__sec">
          <h3 class="ac-break__lab">Спасбросок</h3>
          <div class="ac-break__seg" role="group" aria-label="Владение">
            <button type="button" class="${!profOn ? "is-on" : ""}" data-sheet-act="abil-save-prof" data-v="0" aria-pressed="${!profOn ? "true" : "false"}">Нет</button>
            <button type="button" class="${profOn ? "is-on" : ""}" data-sheet-act="abil-save-prof" data-v="1" aria-pressed="${profOn ? "true" : "false"}">Владение${profOn ? " (" + fmtMod(pb()) + ")" : ""}</button>
          </div>
          <p class="ability-breakdown__channel-hint">Спас ${fmtMod(sav)}${saveHint ? " · " + esc(saveHint) : ""}</p>
          ${saveGearLines}
          ${typeof renderBonusEditor === "function" ? renderBonusEditor(key + "_save") : ""}
        </section>
        ${typeof renderVarPicker === "function" ? renderVarPicker() : ""}
        ${typeof renderBreakFoot === "function" ? renderBreakFoot() : ""}
      </div>`;
  }
  function renderSkillBreak() {
    const box = $("[data-skill-break-body]");
    const title = $("[data-skill-break-title]");
    const key = state.skillKey;
    const def = SKILL_DEFS[key];
    if (title) title.textContent = def ? def.name : "Навык";
    if (!box || !def) return;
    const p = skillProf(key);
    const abilMod = ability(def.abil);
    const base = (typeof baseScoreOf === "function") ? baseScoreOf(def.abil) : 10;
    const totalScore = (typeof scoreTotal === "function") ? scoreTotal(def.abil) : base;
    const scoreLabel = totalScore !== base
      ? (ABILITY_NAMES[def.abil] + " " + totalScore + " (база " + base + " → " + totalScore + ")")
      : ABILITY_NAMES[def.abil];
    const bonus = p === 2 ? pb() * 2 : (p === 1 ? pb() : 0);
    const mark = p === 2 ? "компетентность" : (p === 1 ? "владение" : "нет владения");
    box.innerHTML = `
      <div class="abil-break" style="--abil: var(--abil-${def.abil}); --abil-soft: var(--abil-${def.abil}-soft);">
        <div class="abil-break__row"><span>${esc(scoreLabel)}</span><strong>${fmtMod(abilMod)}</strong></div>
        <div class="abil-break__row"><span>Владение</span><button type="button" class="abil-skill__pip" data-toggle-skill-prof="${esc(key)}" aria-label="${esc(def.name)}: владение">${profMark(p)}</button><strong>${p ? fmtMod(bonus) : "—"}</strong><span class="abil-break__note">${mark}</span></div>
        <div class="abil-break__row abil-break__row--total"><span>Итого</span><strong>${fmtMod(skillTotal(key))}</strong></div>
        <button type="button" class="abil-break__roll" data-roll-skill="${esc(key)}">Бросить к20 ${fmtMod(skillTotal(key))}</button>
      </div>`;
  }
  function chipToggle(on, attrs, label) {
    return `<button type="button" class="sheet-chip${on ? " is-on" : ""}" ${attrs} aria-pressed="${on ? "true" : "false"}">${esc(label)}</button>`;
  }
  function pickList(kind, value, presets) {
    const q = String(value || "").trim();
    const have = new Set(((kind === "weapons" ? (sheet.ownership.weapons.extras || []) : (sheet.ownership[kind] || [])).map((x) => String(x))));
    if (!q) return "";
    const opts = presets.filter((p) => !have.has(p) && p.toLowerCase().indexOf(q.toLowerCase()) >= 0);
    if (!opts.length && !q) return "";
    const rows = (q && !presets.some((p) => p.toLowerCase() === q.toLowerCase()) && !have.has(q))
      ? [`<button type="button" data-own-add="${esc(kind)}" data-own-value="${esc(q)}">Добавить «${esc(q)}»</button>`].concat(opts.map((p) => `<button type="button" data-own-add="${esc(kind)}" data-own-value="${esc(p)}">${esc(p)}</button>`))
      : opts.map((p) => `<button type="button" data-own-add="${esc(kind)}" data-own-value="${esc(p)}">${esc(p)}</button>`);
    return `<ul class="own-pick__list">${rows.join("")}</ul>`;
  }
  function tagList(kind, items) {
    return (items || []).map((t) => `<span class="own-tag">${esc(t)}<button type="button" class="own-tag__x" data-own-remove="${esc(kind)}" data-own-value="${esc(t)}" aria-label="Убрать ${esc(t)}">×</button></span>`).join("");
  }
  function renderOwnershipEditor() {
    const box = $("[data-own-body]");
    if (!box) return;
    ensureAbilityState();
    const o = sheet.ownership;
    const armor = ARMOR_PROF_OPTIONS.map((opt) => chipToggle(!!o.armor[opt.key], `data-own-armor="${opt.key}"`, opt.label)).join("");
    const weapons = WEAPON_PROF_OPTIONS.map((opt) => chipToggle(!!o.weapons[opt.key], `data-own-weapon="${opt.key}"`, opt.label)).join("");
    const sense = Number(sheet.darkvisionBase) || 0;
    const draftW = state.ownDraftWeapon || "";
    const draftT = state.ownDraftTool || "";
    const draftL = state.ownDraftLang || "";
    box.innerHTML = `
      <div class="own-window">
        <section class="own-panel">
          <div class="own-panel__head"><h4>Доспехи и оружие</h4></div>
          <p class="ownership-editor__lab">Доспехи</p>
          <div class="chip-row">${armor}</div>
          <p class="ownership-editor__lab">Оружие</p>
          <div class="chip-row">${weapons}</div>
          <p class="ownership-editor__lab">Дополнительное оружие</p>
          <div class="own-tags">${tagList("weapons", o.weapons.extras)}</div>
          <div class="own-pick">
            <div class="own-pick__row">
              <input type="text" data-own-draft="weapons" value="${esc(draftW)}" placeholder="Например, боевой топор">
              <button type="button" class="own-pick__add" data-own-add="weapons">Добавить</button>
            </div>
            ${pickList("weapons", draftW, WEAPON_EXTRA_PRESETS)}
          </div>
        </section>
        <section class="own-panel">
          <div class="own-panel__head"><h4>Языки и инструменты</h4></div>
          <p class="ownership-editor__lab">Языки</p>
          <div class="own-tags">${tagList("languages", o.languages)}</div>
          <div class="own-pick">
            <div class="own-pick__row">
              <input type="text" data-own-draft="languages" value="${esc(draftL)}" placeholder="Например, эльфийский">
              <button type="button" class="own-pick__add" data-own-add="languages">Добавить</button>
            </div>
            ${pickList("languages", draftL, LANGUAGE_PRESETS)}
          </div>
          <p class="ownership-editor__lab">Инструменты</p>
          <div class="own-tags">${tagList("tools", o.tools)}</div>
          <div class="own-pick">
            <div class="own-pick__row">
              <input type="text" data-own-draft="tools" value="${esc(draftT)}" placeholder="Например, инструменты каменщика">
              <button type="button" class="own-pick__add" data-own-add="tools">Добавить</button>
            </div>
            ${pickList("tools", draftT, TOOL_PRESETS)}
          </div>
        </section>
        <section class="own-panel">
          <div class="own-panel__head"><h4>Чувства</h4></div>
          <label class="abil-break__base">Тёмное зрение, база, фт
            <input type="number" min="0" step="5" value="${sense}" data-sense-input>
          </label>
          <p class="flags" data-sense-hint>${senseHint()}</p>
        </section>
      </div>`;
  }
  function senseHint() {
    const race = String(sheet.race || "");
    const base = Number(sheet.darkvisionBase) || 0;
    const eff = Number(sheet.darkvisionEff) || 0;
    let hint = "0 = нет.";
    if (/горн.*дварф/i.test(race) || /дварф/i.test(race)) hint += " У горного дварфа база 60 фт.";
    else if (/полуорк|орк/i.test(race)) hint += " У полуорка база 60 фт.";
    else if (/эльф/i.test(race)) hint += " У эльфа база 60 фт.";
    else if (/полуросл/i.test(race)) hint += " У легконогого полурослика тёмного зрения нет.";
    if (eff && eff !== base) hint += " Эффект сейчас " + eff + " фт.";
    return hint;
  }
  function renderSenseSheet() {
    const box = $("[data-sense-body]");
    if (!box) return;
    ensureAbilityState();
    const sense = Number(sheet.darkvisionBase) || 0;
    box.innerHTML = `
      <label class="abil-break__base">База, фт
        <input type="number" min="0" step="5" value="${sense}" data-sense-input>
      </label>
      <p class="flags" data-sense-hint>${esc(senseHint())}</p>`;
  }

  function setSenseBase(n) {
    sheet.darkvisionBase = Math.max(0, Math.trunc(Number(n) || 0));
    if (sheet.darkvisionEff < sheet.darkvisionBase || sheet.darkvisionEff == null) sheet.darkvisionEff = sheet.darkvisionBase;
    if (sheet.darkvisionBase === 0) sheet.darkvisionEff = 0;
  }

  let abilDragBound = false;
  function bindAbilDrag() {
    const list = $("[data-abil-list]");
    if (!list) return;
    if (abilDragBound) return;
    abilDragBound = true;
    const page = $("[data-abil-page]");
    if (!page) return;
    let timer = 0, startX = 0, startY = 0, armed = false, dragging = false, fromEl = null, pointerId = 0;
    const skipSel = "[data-roll-check],[data-roll-save],[data-toggle-save],[data-toggle-skill-prof],[data-open-skill],[data-roll-skill],[data-open-abil],[data-toggle-abil]";
    function cleanup() {
      clearTimeout(timer);
      timer = 0;
      armed = false;
      dragging = false;
      if (fromEl) fromEl.classList.remove("is-dragging");
      fromEl = null;
      try { if (pointerId) page.releasePointerCapture(pointerId); } catch (e) {}
      page.removeEventListener("pointermove", onMove);
      page.removeEventListener("pointerup", onUp);
      page.removeEventListener("pointercancel", onUp);
    }
    function reorderFromPoint(y) {
      const cards = [...$$("article.abil-card")];
      if (!fromEl) return;
      const others = cards.filter((c) => c !== fromEl);
      let insert = others.length;
      for (let i = 0; i < others.length; i++) {
        const r = others[i].getBoundingClientRect();
        if (y < r.top + r.height / 2) { insert = i; break; }
      }
      const keys = others.map((c) => c.getAttribute("data-abil"));
      const from = fromEl.getAttribute("data-abil");
      keys.splice(insert, 0, from);
      const same = keys.length === state.abilOrder.length && keys.every((k, i) => k === state.abilOrder[i]);
      if (!same) {
        state.abilOrder = keys;
        const scroll = $("[data-abil-list]") && $("[data-abil-list]").parentElement;
        const top = scroll ? scroll.scrollTop : 0;
        renderAbilitiesPage();
        const again = $("article.abil-card[data-abil='" + from + "']");
        if (again) {
          again.classList.add("is-dragging");
          fromEl = again;
        }
        if (scroll) scroll.scrollTop = top;
      }
    }
    function onMove(e) {
      if (e.pointerId !== pointerId) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (!armed && Math.hypot(dx, dy) > 10) { cleanup(); return; }
      if (!armed) return;
      e.preventDefault();
      dragging = true;
      reorderFromPoint(e.clientY);
    }
    function onUp(e) {
      if (e && e.pointerId !== pointerId) return;
      const wasArmed = armed;
      const wasDrag = dragging;
      const key = fromEl && fromEl.getAttribute("data-abil");
      cleanup();
      if (wasArmed && !wasDrag && key) {
        /* hold without move: keep order, drop highlight already cleared */
      }
    }
    page.addEventListener("pointerdown", (e) => {
      if (e.button && e.button !== 0) return;
      if (!state.abilOpen) return;
      if (e.target.closest(skipSel)) return;
      const card = e.target.closest("article.abil-card");
      if (!card) return;
      pointerId = e.pointerId;
      fromEl = card;
      startX = e.clientX;
      startY = e.clientY;
      armed = false;
      dragging = false;
      timer = setTimeout(() => {
        armed = true;
        if (fromEl) fromEl.classList.add("is-dragging");
        try { page.setPointerCapture(pointerId); } catch (err) {}
      }, 300);
      page.addEventListener("pointermove", onMove, { passive: false });
      page.addEventListener("pointerup", onUp);
      page.addEventListener("pointercancel", onUp);
    });
  }

  function handleLaterGo(go) {
    if (go === "ownership") { openDialog("ownership"); return; }
    if (go === "attacks-settings") {
      closeAbilities();
      setScene("combat");
      if (typeof openExtra === "function") openExtra("attacks-settings", "Настроить атаки");
      return;
    }
    if (go === "prepare") {
      closeAbilities();
      if (isCaster() && typeof openExtra === "function") {
        state.magicOpen = true;
        state.combatPane = "spells";
        state.prepareTab = "prepared";
        openExtra("prepare", "Подготовить");
      } else {
        toast("Этот персонаж не заклинатель");
      }
      return;
    }
    if (go === "needs-setup") {
      toast(sheet.needsSetup ? "Есть незакрытые выборы" : "Нет незакрытых выборов");
      return;
    }
    closeAbilities();
    if (go) openDialog(go);
  }

  function addOwnItem(kind, value) {
    const v = String(value || "").trim();
    if (!v) return;
    ensureAbilityState();
    if (kind === "weapons") {
      const list = sheet.ownership.weapons.extras;
      if (list.indexOf(v) < 0) list.push(v);
      state.ownDraftWeapon = "";
    } else if (kind === "tools" || kind === "languages") {
      const list = sheet.ownership[kind];
      if (list.indexOf(v) < 0) list.push(v);
      if (kind === "tools") state.ownDraftTool = "";
      else state.ownDraftLang = "";
    }
    render();
  }
  function removeOwnItem(kind, value) {
    ensureAbilityState();
    if (kind === "weapons") {
      sheet.ownership.weapons.extras = (sheet.ownership.weapons.extras || []).filter((x) => x !== value);
    } else if (kind === "tools" || kind === "languages") {
      sheet.ownership[kind] = (sheet.ownership[kind] || []).filter((x) => x !== value);
    }
    render();
  }

  document.addEventListener("click", (e) => {
    const morePop = e.target.closest("[data-own-more-pop]");
    const moreBtn = e.target.closest("[data-own-more]");
    if (!moreBtn && !morePop && state.ownMore) {
      state.ownMore = null;
      const pop = $("[data-own-more-pop]");
      if (pop) pop.remove();
    }
    const t = e.target.closest("[data-abil-back],[data-collapse-abils],[data-abil-help],[data-toggle-abil],[data-open-abil],[data-roll-check],[data-roll-save],[data-toggle-save],[data-toggle-skill-prof],[data-open-skill],[data-roll-skill],[data-open-sense],[data-open-own],[data-own-toggle],[data-own-more],[data-toggle-later],[data-later-skills],[data-later-go],[data-own-armor],[data-own-weapon],[data-own-add],[data-own-remove],[data-abil-head]");
    if (!t) return;
    if (t.matches("[data-abil-back]")) { closeAbilities(); return; }
    if (t.matches("[data-collapse-abils]")) { setAbilCollapsedAll(t.getAttribute("data-collapse-abils") === "1"); return; }
    if (t.matches("[data-abil-help]")) { toast("Число → бросок · кружок → владение / компетентность · название → разборка"); return; }
    if (t.matches("[data-toggle-abil]")) { toggleAbil(t.getAttribute("data-toggle-abil")); return; }
    if (t.matches("[data-open-abil]")) { sheet.abilityKey = t.getAttribute("data-open-abil"); openDialog("abil-break"); return; }
    if (t.matches("[data-roll-check]")) { rollCheck(t.getAttribute("data-roll-check")); return; }
    if (t.matches("[data-roll-save]")) { rollSave(t.getAttribute("data-roll-save")); return; }
    if (t.matches("[data-toggle-save]")) {
      ensureAbilityState();
      const k = t.getAttribute("data-toggle-save");
      sheet.saves[k] = !sheet.saves[k];
      render();
      return;
    }
    if (t.matches("[data-toggle-skill-prof]")) {
      const k = t.getAttribute("data-toggle-skill-prof");
      ensureAbilityState();
      const cur = skillProf(k);
      sheet.skills[k].p = cur >= 2 ? 0 : cur + 1;
      render();
      return;
    }
    if (t.matches("[data-open-skill]")) { state.skillKey = t.getAttribute("data-open-skill"); openDialog("skill-break"); return; }
    if (t.matches("[data-roll-skill]")) { rollSkill(t.getAttribute("data-roll-skill")); return; }
    if (t.matches("[data-open-sense]")) { openDialog("sense"); return; }
    if (t.matches("[data-open-own]")) { openDialog("ownership"); return; }
    if (t.matches("[data-own-toggle]")) { state.ownCollapsed = !state.ownCollapsed; render(); return; }
    if (t.matches("[data-own-more]")) {
      e.stopPropagation();
      const id = t.getAttribute("data-own-more");
      state.ownMore = state.ownMore === id ? null : id;
      render();
      return;
    }
    if (t.matches("[data-toggle-later]")) { state.laterOpen = !state.laterOpen; render(); return; }
    if (t.matches("[data-later-skills]")) { setAbilCollapsedAll(false); return; }
    if (t.matches("[data-later-go]")) { handleLaterGo(t.getAttribute("data-later-go")); return; }
    if (t.matches("[data-own-armor]")) {
      const k = t.getAttribute("data-own-armor");
      sheet.ownership.armor[k] = !sheet.ownership.armor[k];
      render();
      return;
    }
    if (t.matches("[data-own-weapon]")) {
      const k = t.getAttribute("data-own-weapon");
      sheet.ownership.weapons[k] = !sheet.ownership.weapons[k];
      render();
      return;
    }
    if (t.matches("[data-own-add]")) {
      const kind = t.getAttribute("data-own-add");
      const direct = t.getAttribute("data-own-value");
      if (direct) addOwnItem(kind, direct);
      else {
        const input = t.closest(".own-pick") && t.closest(".own-pick").querySelector("[data-own-draft]");
        addOwnItem(kind, input ? input.value : "");
      }
      return;
    }
    if (t.matches("[data-own-remove]")) {
      removeOwnItem(t.getAttribute("data-own-remove"), t.getAttribute("data-own-value"));
      return;
    }
    if (t.matches("[data-abil-head]")) {
      const skip = e.target.closest("[data-roll-check],[data-roll-save],[data-toggle-save],[data-open-abil],[data-toggle-abil]");
      if (skip) return;
      toggleAbil(t.getAttribute("data-abil-head"));
    }
  });

  document.addEventListener("input", (e) => {
    if (e.target.matches("[data-abil-score]")) {
      const k = e.target.getAttribute("data-abil-score");
      let n = Math.trunc(Number(e.target.value) || 0);
      n = Math.min(30, Math.max(1, n));
      sheet.abilityBase[k] = n;
      const hint = e.target.closest(".abil-break");
      renderAbilBreak();
      const page = $("[data-abil-page]");
      if (page && state.abilOpen) renderAbilitiesPage();
      return;
    }
    if (e.target.matches("[data-sense-input]")) {
      setSenseBase(e.target.value);
      const hint = e.target.parentElement && e.target.parentElement.parentElement && e.target.parentElement.parentElement.querySelector("[data-sense-hint]");
      if (hint) hint.textContent = senseHint();
      if (state.abilOpen) renderAbilitiesPage();
      return;
    }
    if (e.target.matches("[data-own-draft]")) {
      const kind = e.target.getAttribute("data-own-draft");
      const v = e.target.value;
      if (kind === "weapons") state.ownDraftWeapon = v;
      else if (kind === "tools") state.ownDraftTool = v;
      else state.ownDraftLang = v;
      const hold = e.target;
      const pos = hold.selectionStart;
      renderOwnershipEditor();
      const again = $("[data-own-draft='" + kind + "']");
      if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (err) {} }
    }
  });

  function setAbil(opts) {
    opts = opts || {};
    if (opts.open || opts.open === undefined && (opts.breakdown || opts.ownership || opts.sense || opts.dragHold || opts.ownExpanded || opts.laterOpen || opts.collapseAll || opts.expandAll)) {
      state.abilOpen = true;
    }
    if ("open" in opts) state.abilOpen = !!opts.open;
    if (opts.collapseAll || opts.expandAll === false) {
      ABILITY_KEYS.forEach((k) => { state.abilCollapsed[k] = true; });
    }
    if (opts.expandAll) {
      ABILITY_KEYS.forEach((k) => { state.abilCollapsed[k] = false; });
    }
    if ("ownCollapsed" in opts) state.ownCollapsed = !!opts.ownCollapsed;
    if ("ownExpanded" in opts) state.ownCollapsed = !opts.ownExpanded;
    if ("laterOpen" in opts) state.laterOpen = !!opts.laterOpen;
    if (opts.breakdown) {
      sheet.abilityKey = opts.breakdown;
      state.dialog = "abil-break";
    }
    if (opts.skill) {
      state.skillKey = opts.skill;
      state.dialog = "skill-break";
    }
    if (opts.ownership) state.dialog = "ownership";
    if (opts.sense) state.dialog = "sense";
    if (opts.order) state.abilOrder = opts.order.slice();
    render();
    if (opts.dragHold) {
      const card = $("article.abil-card[data-abil='" + opts.dragHold + "']");
      if (card) card.classList.add("is-dragging");
    }
  }
