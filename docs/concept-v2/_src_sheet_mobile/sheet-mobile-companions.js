  /* ===== Step 6: companions, forms, familiars (from desktop concept) ===== */
  /* Desktop identifiers → mobile state */
  var scene = (typeof state !== "undefined" && state.scene) || "combat";
  var magicOpen = (typeof state !== "undefined" && state.magicOpen) || false;
  function renderScene() {
    if (typeof state !== "undefined") {
      if (typeof scene === "string") state.scene = scene;
      if (typeof magicOpen === "boolean") state.magicOpen = magicOpen;
    }
    if (typeof render === "function") render();
  }
  if (typeof LIVE === "undefined") { var LIVE = {}; }
  window.SheetLive = LIVE;

  /* ===== Step 6: companions, forms, familiars ===== */
  const COMP_KIND_LABELS = {
    beast_companion: "Зверь-спутник",
    steel_defender: "Стальной защитник",
    eldritch_cannon: "Мистическая пушка",
    drake: "Дрейк",
    primal_companion: "Первобытный спутник",
    familiar: "Фамильяр",
    ally: "Напарник",
    transformed_self: "Облик",
    other: "Напарник"
  };
  const COMP_KIND_SHORT = {
    beast_companion: "Зверь",
    steel_defender: "Защитник",
    eldritch_cannon: "Пушка",
    drake: "Дрейк",
    primal_companion: "Спутник",
    familiar: "Фамильяр",
    ally: "Призыв",
    transformed_self: "Облик",
    other: "Спутник"
  };
  const COMP_FILTERS = [
    { id: "all", label: "Все" },
    { id: "companion", label: "Спутники" },
    { id: "ally", label: "Призывы" },
    { id: "sourced", label: "От умения" }
  ];
  const COMP_CONDS = [
    { id: "prone", label: "Сбит с ног" },
    { id: "frightened", label: "Испуган" },
    { id: "poisoned", label: "Отравлен" },
    { id: "blinded", label: "Ослеплён" },
    { id: "invisible", label: "Невидимый" },
    { id: "restrained", label: "Опутан" },
    { id: "deafened", label: "Оглохший" }
  ];
  const COMP_PARTY = [
    { id: "self", name: "Каэдрин (ты)" },
    { id: "elara", name: "Элара · Стол Каэдрина" }
  ];

  function abilMod(score) {
    if (score == null || score === "") return 0;
    return Math.floor((Number(score) - 10) / 2);
  }
  function signedMod(n) {
    const v = Number(n) || 0;
    return (v >= 0 ? "+" : "") + v;
  }
  function parseCr(cr) {
    if (cr == null) return null;
    const s = String(cr);
    if (s.includes("/")) {
      const p = s.split("/");
      return Number(p[0]) / Number(p[1]);
    }
    return Number(s);
  }
  function speedLine(p) {
    const bits = [];
    if (p.speed_walk) bits.push(p.speed_walk + " фт");
    if (p.speed_fly) bits.push("полёт " + p.speed_fly);
    if (p.speed_swim) bits.push("плав. " + p.speed_swim);
    if (p.speed_climb) bits.push("лазание " + p.speed_climb);
    return bits.join(", ") || "—";
  }
  function formSourceBadge(form) {
    if (!form) return "Это ты · Облик";
    if (form.form_source === "wild_shape") return "Это ты · Дикий облик";
    if (form.form_source === "elemental_wild_shape") return "Это ты · Элементальный облик";
    if (form.form_source === "spell") return "Это ты · " + (form.labelRu || "Заклинание");
    if (form.form_source === "item") return "Это ты · Предмет";
    if (form.form_source === "feature") return "Это ты · " + (form.labelRu || "Умение");
    return "Это ты · Облик";
  }
  function isSelfForm(row) { return row && (row.role === "self_form" || row.kind === "transformed_self"); }
  function isSteed(row) { return row && (row.steed || (row.source && (row.source.spellId === "find_steed" || row.source.spellId === "find_greater_steed"))); }
  function isPermanentAlly(row) {
    if (!row || isSelfForm(row)) return false;
    if (row.kind === "familiar" || isSteed(row) || row.kind === "primal_companion" || row.kind === "beast_companion" || row.kind === "steel_defender" || row.kind === "drake") return true;
    if (row.nature === "summoned" && row.source && row.source.kind === "spell" && !row.permanent) return false;
    return true;
  }
  const BESTIARY = [
    { slug: "bat", name: "Летучая мышь", type: "beast", cr: "0", ac: 12, hp: 1, size: "крошечная", speed_walk: 5, speed_fly: 30, str: 2, dex: 15, con: 8, int: 2, wis: 12, cha: 4, tags: ["familiar"], notes: "Тёмное зрение 60 фт.", actions_text: "Не атакует; телепатия; передача касания." },
    { slug: "cat", name: "Кошка", type: "beast", cr: "0", ac: 12, hp: 2, size: "крошечная", speed_walk: 40, str: 3, dex: 15, con: 10, int: 3, wis: 12, cha: 7, tags: ["familiar"], skills: [{ name: "Внимательность", mod: 3 }, { name: "Скрытность", mod: 4 }], actions_text: "Не атакует; телепатия; передача касания." },
    { slug: "owl", name: "Сова", type: "beast", cr: "0", ac: 11, hp: 1, size: "крошечная", speed_walk: 5, speed_fly: 60, str: 3, dex: 13, con: 8, int: 2, wis: 12, cha: 7, tags: ["familiar"], skills: [{ name: "Внимательность", mod: 3 }, { name: "Скрытность", mod: 3 }], notes: "Зрение (тьма) 120 фт, полёт без провокации.", actions_text: "Не атакует; телепатия; передача касания." },
    { slug: "raven", name: "Ворон", type: "beast", cr: "0", ac: 12, hp: 1, size: "крошечная", speed_walk: 10, speed_fly: 50, str: 2, dex: 14, con: 8, int: 2, wis: 12, cha: 6, tags: ["familiar"], notes: "Подражание.", actions_text: "Не атакует; телепатия; передача касания." },
    { slug: "crab", name: "Краб", type: "beast", cr: "0", ac: 11, hp: 2, size: "крошечная", speed_walk: 15, speed_swim: 15, str: 2, dex: 11, con: 10, int: 1, wis: 8, cha: 2, tags: ["familiar"], actions_text: "Не атакует; телепатия; передача касания." },
    { slug: "frog", name: "Лягушка", type: "beast", cr: "0", ac: 11, hp: 1, size: "крошечная", speed_walk: 20, speed_swim: 20, str: 1, dex: 13, con: 8, int: 1, wis: 8, cha: 3, tags: ["familiar"], actions_text: "Не атакует; телепатия; передача касания." },
    { slug: "hawk", name: "Ястреб", type: "beast", cr: "0", ac: 13, hp: 1, size: "крошечная", speed_walk: 10, speed_fly: 60, str: 5, dex: 16, con: 8, int: 2, wis: 14, cha: 6, tags: ["familiar"], actions_text: "Не атакует; телепатия; передача касания." },
    { slug: "lizard", name: "Ящерица", type: "beast", cr: "0", ac: 10, hp: 2, size: "крошечная", speed_walk: 20, speed_climb: 20, str: 2, dex: 11, con: 10, int: 1, wis: 8, cha: 3, tags: ["familiar"], actions_text: "Не атакует; телепатия; передача касания." },
    { slug: "octopus", name: "Осьминог", type: "beast", cr: "0", ac: 12, hp: 3, size: "маленькая", speed_walk: 5, speed_swim: 30, str: 4, dex: 15, con: 11, int: 3, wis: 10, cha: 4, tags: ["familiar"], actions_text: "Не атакует; телепатия; передача касания." },
    { slug: "poisonous_snake", name: "Ядовитая змея", type: "beast", cr: "1/8", ac: 13, hp: 2, size: "крошечная", speed_walk: 30, speed_swim: 30, str: 2, dex: 16, con: 11, int: 1, wis: 10, cha: 3, tags: ["familiar"], actions_text: "Не атакует; телепатия; передача касания." },
    { slug: "quipper", name: "Квиппер", type: "beast", cr: "0", ac: 13, hp: 1, size: "крошечная", speed_walk: 0, speed_swim: 40, str: 2, dex: 16, con: 9, int: 1, wis: 7, cha: 2, tags: ["familiar"], actions_text: "Не атакует; телепатия; передача касания." },
    { slug: "rat", name: "Крыса", type: "beast", cr: "0", ac: 10, hp: 1, size: "крошечная", speed_walk: 20, str: 2, dex: 11, con: 9, int: 2, wis: 10, cha: 4, tags: ["familiar"], actions_text: "Не атакует; телепатия; передача касания." },
    { slug: "sea_horse", name: "Морской конёк", type: "beast", cr: "0", ac: 11, hp: 1, size: "крошечная", speed_walk: 0, speed_swim: 20, str: 1, dex: 12, con: 8, int: 1, wis: 10, cha: 2, tags: ["familiar"], actions_text: "Не атакует; телепатия; передача касания." },
    { slug: "spider", name: "Паук", type: "beast", cr: "0", ac: 12, hp: 1, size: "крошечная", speed_walk: 20, speed_climb: 20, str: 2, dex: 14, con: 8, int: 1, wis: 10, cha: 2, tags: ["familiar"], actions_text: "Не атакует; телепатия; передача касания." },
    { slug: "weasel", name: "Ласка", type: "beast", cr: "0", ac: 13, hp: 1, size: "крошечная", speed_walk: 30, str: 3, dex: 16, con: 8, int: 3, wis: 12, cha: 3, tags: ["familiar"], actions_text: "Не атакует; телепатия; передача касания." }
  ];
  BESTIARY.push(
    { slug: "imp", name: "Бес", type: "fiend", cr: "1", ac: 13, hp: 10, size: "крошечная", speed_walk: 20, speed_fly: 40, str: 6, dex: 17, con: 13, int: 11, wis: 12, cha: 14, tags: ["chain"], notes: "Сопротивление урону, дьявольское зрение.", attacks: [{ name: "Жало", bonus: 5, damage: "1к4+3", dtype: "колющий + яд" }], actions_text: "Жало; невидимость; смена облика. Телепатия хозяина." },
    { slug: "quasit", name: "Квазит", type: "fiend", cr: "1", ac: 13, hp: 7, size: "крошечная", speed_walk: 40, str: 5, dex: 17, con: 10, int: 7, wis: 10, cha: 10, tags: ["chain"], attacks: [{ name: "Когти", bonus: 4, damage: "1к4+3", dtype: "колющий" }], actions_text: "Когти; страх; невидимость; смена облика." },
    { slug: "pseudodragon", name: "Псевдодракон", type: "dragon", cr: "1/4", ac: 13, hp: 7, size: "крошечная", speed_walk: 15, speed_fly: 60, str: 6, dex: 15, con: 13, int: 10, wis: 12, cha: 10, tags: ["chain"], attacks: [{ name: "Укус", bonus: 4, damage: "1к4+2", dtype: "колющий" }, { name: "Жало", bonus: 4, damage: "1к4+2", dtype: "колющий + яд" }], actions_text: "Укус; жало (яд). Телепатия." },
    { slug: "sprite", name: "Спрайт", type: "fey", cr: "1/4", ac: 15, hp: 2, size: "крошечная", speed_walk: 10, speed_fly: 40, str: 3, dex: 18, con: 10, int: 14, wis: 13, cha: 11, tags: ["chain"], attacks: [{ name: "Длинный меч", bonus: 2, damage: "1", dtype: "колющий" }, { name: "Короткий лук", bonus: 6, damage: "1к1", dtype: "колющий + яд" }], actions_text: "Длинный меч; короткий лук; взгляд в сердце; невидимость." },
    { slug: "warhorse", name: "Боевой конь", type: "beast", cr: "1/2", ac: 11, hp: 19, size: "крупное", speed_walk: 60, str: 18, dex: 12, con: 13, int: 2, wis: 12, cha: 7, tags: ["steed"], attacks: [{ name: "Копыта", bonus: 6, damage: "2к6+4", dtype: "дробящий" }] },
    { slug: "pony", name: "Пони", type: "beast", cr: "1/8", ac: 10, hp: 11, size: "среднее", speed_walk: 40, str: 15, dex: 10, con: 13, int: 2, wis: 11, cha: 7, tags: ["steed"], attacks: [{ name: "Копыта", bonus: 4, damage: "2к4+2", dtype: "дробящий" }] },
    { slug: "camel", name: "Верблюд", type: "beast", cr: "1/8", ac: 9, hp: 15, size: "крупное", speed_walk: 50, str: 16, dex: 8, con: 14, int: 2, wis: 8, cha: 5, tags: ["steed"], attacks: [{ name: "Укус", bonus: 5, damage: "1к4", dtype: "дробящий" }] },
    { slug: "elk", name: "Лось", type: "beast", cr: "1/4", ac: 10, hp: 13, size: "крупное", speed_walk: 50, str: 16, dex: 10, con: 12, int: 2, wis: 10, cha: 6, tags: ["steed"], attacks: [{ name: "Рога", bonus: 5, damage: "1к6+3", dtype: "дробящий" }] },
    { slug: "mastiff", name: "Мастиф", type: "beast", cr: "1/8", ac: 12, hp: 5, size: "среднее", speed_walk: 40, str: 13, dex: 14, con: 12, int: 3, wis: 12, cha: 7, tags: ["steed"], attacks: [{ name: "Укус", bonus: 3, damage: "1к6+1", dtype: "колющий" }] },
    { slug: "riding_horse", name: "Ездовая лошадь", type: "beast", cr: "1/4", ac: 10, hp: 13, size: "крупное", speed_walk: 60, str: 16, dex: 10, con: 12, int: 2, wis: 11, cha: 7, attacks: [{ name: "Копыта", bonus: 5, damage: "2к4+3", dtype: "дробящий" }] },
    { slug: "wolf", name: "Волк", type: "beast", cr: "1/4", ac: 13, hp: 11, size: "среднее", speed_walk: 40, str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6, tags: ["known"], skills: [{ name: "Внимательность", mod: 3 }, { name: "Скрытность", mod: 4 }], notes: "Острый слух и обоняние, тактика стаи.", attacks: [{ name: "Укус", bonus: 4, damage: "2к4+2", dtype: "колющий" }] },
    { slug: "black_bear", name: "Чёрный медведь", type: "beast", cr: "1/2", ac: 11, hp: 19, size: "среднее", speed_walk: 40, speed_climb: 30, str: 15, dex: 10, con: 14, int: 2, wis: 12, cha: 7, tags: ["known"], attacks: [{ name: "Укус", bonus: 3, damage: "1к6+2", dtype: "колющий" }, { name: "Когти", bonus: 3, damage: "2к4+2", dtype: "рубящий" }] },
    { slug: "brown_bear", name: "Бурый медведь", type: "beast", cr: "1", ac: 11, hp: 34, size: "крупное", speed_walk: 40, speed_climb: 30, str: 19, dex: 10, con: 16, int: 2, wis: 13, cha: 7, attacks: [{ name: "Укус", bonus: 5, damage: "1к8+4", dtype: "колющий" }, { name: "Когти", bonus: 5, damage: "2к6+4", dtype: "рубящий" }] },
    { slug: "boar", name: "Вепрь", type: "beast", cr: "1/4", ac: 11, hp: 11, size: "среднее", speed_walk: 40, str: 13, dex: 11, con: 12, int: 2, wis: 9, cha: 5, attacks: [{ name: "Бивни", bonus: 3, damage: "1к6+1", dtype: "рубящий" }] },
    { slug: "crocodile", name: "Крокодил", type: "beast", cr: "1/2", ac: 12, hp: 19, size: "крупное", speed_walk: 20, speed_swim: 30, str: 15, dex: 10, con: 13, int: 2, wis: 10, cha: 5, attacks: [{ name: "Укус", bonus: 4, damage: "1к10+2", dtype: "колющий" }] },
    { slug: "panther", name: "Пантера", type: "beast", cr: "1/4", ac: 12, hp: 13, size: "среднее", speed_walk: 50, speed_climb: 40, str: 14, dex: 15, con: 10, int: 3, wis: 14, cha: 7, attacks: [{ name: "Укус", bonus: 4, damage: "1к6+2", dtype: "колющий" }, { name: "Когти", bonus: 4, damage: "1к4+2", dtype: "рубящий" }] },
    { slug: "dire_wolf", name: "Лютый волк", type: "beast", cr: "1", ac: 14, hp: 37, size: "крупное", speed_walk: 50, str: 17, dex: 15, con: 15, int: 3, wis: 12, cha: 7, tags: ["greater_steed"], attacks: [{ name: "Укус", bonus: 5, damage: "2к6+3", dtype: "колющий" }] },
    { slug: "lion", name: "Лев", type: "beast", cr: "1", ac: 12, hp: 26, size: "крупное", speed_walk: 50, str: 17, dex: 15, con: 13, int: 3, wis: 12, cha: 8, attacks: [{ name: "Укус", bonus: 5, damage: "1к8+3", dtype: "колющий" }, { name: "Когти", bonus: 5, damage: "1к6+3", dtype: "рубящий" }] },
    { slug: "tiger", name: "Тигр", type: "beast", cr: "1", ac: 12, hp: 37, size: "крупное", speed_walk: 40, str: 17, dex: 15, con: 14, int: 3, wis: 12, cha: 8, attacks: [{ name: "Укус", bonus: 5, damage: "1к10+3", dtype: "колющий" }, { name: "Когти", bonus: 5, damage: "1к8+3", dtype: "рубящий" }] },
    { slug: "skeleton", name: "Скелет", type: "undead", cr: "1/4", ac: 13, hp: 13, size: "среднее", speed_walk: 30, str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5, tags: ["undead"], attacks: [{ name: "Короткий меч", bonus: 4, damage: "1к6+2", dtype: "колющий" }, { name: "Короткий лук", bonus: 4, damage: "1к6+2", dtype: "колющий" }] },
    { slug: "zombie", name: "Зомби", type: "undead", cr: "1/4", ac: 8, hp: 22, size: "среднее", speed_walk: 20, str: 13, dex: 6, con: 16, int: 3, wis: 6, cha: 5, tags: ["undead"], attacks: [{ name: "Удар", bonus: 3, damage: "1к6+1", dtype: "дробящий" }] },
    { slug: "air_elemental", name: "Воздушный элементаль", type: "elemental", cr: "5", ac: 15, hp: 90, size: "крупное", speed_walk: 0, speed_fly: 90, str: 14, dex: 20, con: 14, int: 6, wis: 10, cha: 6, tags: ["elemental"], attacks: [{ name: "Удар", bonus: 8, damage: "2к8+5", dtype: "дробящий" }] },
    { slug: "earth_elemental", name: "Земляной элементаль", type: "elemental", cr: "5", ac: 17, hp: 126, size: "крупное", speed_walk: 30, speed_climb: 30, str: 20, dex: 8, con: 20, int: 5, wis: 10, cha: 5, tags: ["elemental"], attacks: [{ name: "Удар", bonus: 8, damage: "2к8+5", dtype: "дробящий" }] },
    { slug: "fire_elemental", name: "Огненный элементаль", type: "elemental", cr: "5", ac: 13, hp: 102, size: "крупное", speed_walk: 50, str: 10, dex: 17, con: 14, int: 6, wis: 10, cha: 7, tags: ["elemental"], attacks: [{ name: "Касание", bonus: 6, damage: "2к6+3", dtype: "огонь" }] },
    { slug: "water_elemental", name: "Водный элементаль", type: "elemental", cr: "5", ac: 14, hp: 114, size: "крупное", speed_walk: 30, speed_swim: 90, str: 18, dex: 14, con: 18, int: 5, wis: 10, cha: 8, tags: ["elemental"], attacks: [{ name: "Удар", bonus: 7, damage: "2к8+4", dtype: "дробящий" }] }
  );
  const FAMILIAR_BEAST_SLUGS = ["bat","cat","crab","frog","hawk","lizard","octopus","owl","poisonous_snake","quipper","rat","raven","sea_horse","spider","weasel"];
  const PACT_CHAIN_SLUGS = ["imp","quasit","sprite","pseudodragon"];
  const STEED_SLUGS = ["warhorse","pony","camel","elk","mastiff"];
  function bestiaryBySlug(slug) { return BESTIARY.find(function (p) { return p.slug === slug; }); }
  function companionFromPick(pick, extra) {
    extra = extra || {};
    const attacks = (pick.attacks || []).map(function (a) { return Object.assign({}, a); });
    return Object.assign({
      id: extra.id || ("cmp-" + pick.slug + "-" + Date.now().toString(36)),
      kind: extra.kind || "other",
      role: extra.role || "ally",
      name: pick.name,
      slug: pick.slug,
      type: pick.type,
      cr: pick.cr,
      size: pick.size || "",
      nature: extra.nature || "living",
      active: extra.active !== false,
      is_primary: !!extra.is_primary,
      permanent: !!extra.permanent,
      steed: !!extra.steed,
      steed_spirit_type: extra.steed_spirit_type || null,
      mounted: false,
      away: false,
      hp: pick.hp,
      hp_max: pick.hp,
      hp_temp: 0,
      ac: pick.ac,
      speed_walk: pick.speed_walk || 0,
      speed_fly: pick.speed_fly || 0,
      speed_swim: pick.speed_swim || 0,
      speed_climb: pick.speed_climb || 0,
      str: pick.str, dex: pick.dex, con: pick.con, int: pick.int, wis: pick.wis, cha: pick.cha,
      skills: (pick.skills || []).slice(),
      notes: pick.notes || "",
      actions_text: pick.actions_text || "",
      attacks: attacks,
      conditions: [],
      source: extra.source || null,
      form: extra.form || null,
      pack: extra.pack || null
    }, extra.more || {});
  }
  function defaultCompState() {
    const horse = companionFromPick(bestiaryBySlug("riding_horse"), {
      id: "horse", kind: "other", role: "ally", nature: "living", permanent: true, is_primary: true, active: true,
      story: true, source: { kind: "manual", labelRu: "Добавлен вручную" }
    });
    const dog = companionFromPick(bestiaryBySlug("mastiff"), {
      id: "mastiff", kind: "other", role: "ally", nature: "living", permanent: true, is_primary: false, active: true,
      story: true, source: { kind: "manual", labelRu: "Добавлен вручную" }
    });
    return {
      list: [horse, dog], filter: "all", query: "", openId: "", editId: "", deleteId: "",
      pickKind: "story", pickQuery: "", pickType: "all",
      familiarMode: "spell", familiarQuery: "",
      wild: { step: "fork", query: "", used: 0, max: 2, constellation: "archer", elemental: "air" },
      spellForm: { slug: "polymorph", query: "", labelRu: "Полиморф", maxCr: 5, allowedTypes: ["beast"] },
      featureForm: { query: "", labelRu: "Перевёртыш", maxCr: 1 },
      allyAbility: { name: "Способность", target: "elara" },
      hasChain: false, hasFindFamiliar: false, hasFindSteed: false, hasPolymorph: false, hasShapechanger: false,
      wildUnlocked: false, circleFeatures: [], druidLevel: 0,
      knownForms: []
    };
  }
  function ensureCompanionsState() {
    if (!sheet.comp || !Array.isArray(sheet.comp.list)) sheet.comp = defaultCompState();
    return sheet.comp;
  }
  function visibleCompanions() {
    const c = ensureCompanionsState();
    return c.list.filter(function (row) {
      if (c.filter === "companion") {
        if (isSelfForm(row)) return false;
        return isPermanentAlly(row) || row.kind === "other" || row.kind === "familiar";
      }
      if (c.filter === "ally") return !isSelfForm(row) && (row.kind === "ally" || (row.nature === "summoned" && !isPermanentAlly(row)));
      if (c.filter === "sourced") return !!(row.source && (row.source.kind === "feature" || row.source.kind === "class" || row.source.kind === "subclass" || row.source.kind === "feat"));
      return true;
    });
  }
  function metaLine(row) {
    const hp = (row.hp == null ? "—" : (row.hp + "/" + (row.hp_max == null ? "—" : row.hp_max) + " хитов"));
    const bits = [hp];
    if (row.hp_temp > 0) bits[0] += " · +" + row.hp_temp;
    if (row.ac != null) bits.push("КД " + row.ac);
    const sp = speedLine(row);
    if (sp && sp !== "—") bits.push(sp);
    return bits.join(" · ");
  }
  function findComp(id) { return ensureCompanionsState().list.find(function (r) { return r.id === id; }); }
  function cardComp(el) {
    const card = el && el.closest ? el.closest("[data-companion]") : null;
    return card ? findComp(card.getAttribute("data-companion")) : null;
  }
  function renderCompanions() {
    const c = ensureCompanionsState();
    const panel = $('[data-panel="companions"]');
    if (!panel) return;
    const links = panel.querySelector("[data-comp-links]") || panel.querySelector("h2 .links");
    if (links) links.innerHTML = '<button type="button" class="ghost" data-comp-act="add">+ Добавить</button>';
    let filters = panel.querySelector("[data-comp-filters]");
    if (!filters) {
      filters = document.createElement("div");
      filters.className = "filters";
      filters.setAttribute("data-comp-filters", "");
      filters.setAttribute("role", "tablist");
      filters.setAttribute("aria-label", "Фильтр напарников");
      const list0 = panel.querySelector("[data-companion-list]");
      if (list0 && list0.parentNode) list0.parentNode.insertBefore(filters, list0);
    }
    filters.innerHTML = COMP_FILTERS.map(function (f) {
      return '<button type="button" class="chip' + (c.filter === f.id ? " is-on" : "") + '" data-comp-filter="' + f.id + '" role="tab" aria-selected="' + (c.filter === f.id ? "true" : "false") + '">' + esc(f.label) + "</button>";
    }).join("");
    const list = panel.querySelector("[data-companion-list]");
    if (!list) return;
    const rows = visibleCompanions();
    if (!rows.length) {
      list.innerHTML = '<div class="empty">Нет строк в этом фильтре.</div>';
      syncCompanionChrome();
      return;
    }
    list.innerHTML = rows.map(function (row) { return renderCompanionCard(row, c.openId === row.id); }).join("");
    syncCompanionChrome();
  }
  function renderCompanionCard(row, open) {
    const self = isSelfForm(row);
    const away = !row.active || row.away;
    const badge = self ? formSourceBadge(row.form) : (COMP_KIND_SHORT[row.kind] || "Спутник");
    const tags = [];
    tags.push('<span class="plaque-tag' + (row.kind === "familiar" || self ? " is-on" : "") + '">' + esc(badge) + "</span>");
    if (!self && row.is_primary) tags.push('<span class="plaque-tag">основной</span>');
    if (isSteed(row)) tags.push('<span class="plaque-tag">скакун</span>');
    if (row.pack && row.pack.alive_count > 1) tags.push('<span class="plaque-tag">×' + row.pack.alive_count + "</span>");
    tags.push('<span class="plaque-tag" data-away-tag' + (away && !self ? "" : " hidden") + ">не призван</span>");
    const hpLabel = (row.hp == null ? "—" : (row.hp + "/" + row.hp_max + " хитов")) + (row.hp_temp > 0 ? " · +" + row.hp_temp : "");
    const abilKey = { str: ["Сил","Сила"], dex: ["Лов","Ловкость"], con: ["Тел","Телосложение"], int: ["Инт","Интеллект"], wis: ["Мдр","Мудрость"], cha: ["Хар","Харизма"] };
    const abils = ["str","dex","con","int","wis","cha"].map(function (k) {
      const score = row[k];
      if (score == null) return "";
      const m = abilMod(score);
      return '<button type="button" class="companion-chip" data-companion-roll="check" data-label="' + abilKey[k][1] + '" data-mod="' + m + '"><span>' + abilKey[k][0] + "</span><b>" + signedMod(m) + "</b></button>";
    }).join("");
    const skills = (row.skills || []).map(function (s) {
      return '<button type="button" class="companion-chip" data-companion-roll="skill" data-label="' + esc(s.name) + '" data-mod="' + s.mod + '">' + esc(s.name) + " <b>" + signedMod(s.mod) + "</b></button>";
    }).join("");
    const condBtns = COMP_CONDS.map(function (cd) {
      const on = (row.conditions || []).indexOf(cd.id) >= 0;
      return '<button type="button" class="companion-chip' + (on ? " is-on" : "") + '" data-companion-cond="' + cd.id + '" aria-pressed="' + (on ? "true" : "false") + '">' + esc(cd.label) + "</button>";
    }).join("");
    const badges = (row.conditions || []).map(function (id) {
      const cd = COMP_CONDS.find(function (x) { return x.id === id; });
      const title = cd ? cd.label : id;
      return '<span class="effect-chip">' + esc(title) + ' <button type="button" class="effect-chip__x" data-companion-cond-x="' + id + '" aria-label="Снять: ' + esc(title) + '">×</button></span>';
    }).join("");
    let attacksHtml = "";
    if (row.kind === "familiar" && PACT_CHAIN_SLUGS.indexOf(row.slug) < 0) {
      attacksHtml = '<p class="mini-block">Фамильяр не атакует. Может помогать, передавать касание и связываться с тобой телепатически.</p>';
    } else if ((row.attacks || []).length) {
      attacksHtml = row.attacks.map(function (a, i) {
        return '<button type="button" class="btn primary" data-comp-act="attack" data-atk="' + i + '"' + (away ? " hidden" : "") + ">" + esc(a.name) + " " + signedMod(a.bonus) + " · " + esc(a.damage) + " " + esc(a.dtype) + "</button>";
      }).join("");
    } else if (row.actions_text) {
      attacksHtml = '<p class="mini-block">' + esc(row.actions_text) + "</p>";
    }
    const showSummon = away && isPermanentAlly(row);
    const actions = [];
    if (self) actions.push('<button type="button" class="btn primary" data-comp-act="dismiss-form">Сбросить облик</button>');
    else {
      if (!away) actions.push('<button type="button" class="btn companion-dismiss" data-companion-dismiss>Отпустить</button>');
      if (showSummon) actions.push('<button type="button" class="btn primary companion-summon" data-companion-summon>Призвать снова</button>');
    }
    actions.push('<button type="button" class="btn" data-comp-act="edit">Править</button>');
    if (!self) actions.push('<button type="button" class="btn" data-comp-act="delete">Удалить</button>');
    const source = row.source && row.source.labelRu ? '<p class="companion-source">' + esc(row.source.labelRu) + "</p>" : "";
    const hostNote = (self && row.form) ? ('<p class="companion-form-host">Хиты хозяина на входе: ' + (row.form.host_hp_at_enter != null ? (row.form.host_hp_at_enter + "/" + row.form.host_hp_max_at_enter) : "—") + (row.form.duration_minutes ? (" · " + (row.form.duration_minutes % 60 === 0 ? (row.form.duration_minutes / 60) + " ч." : row.form.duration_minutes + " мин.")) : "") + "</p>") : "";
    const mount = isSteed(row) ? (
      '<button type="button" class="mode-chip' + (row.mounted ? " is-on" : "") + '" data-companion-mount aria-pressed="' + (row.mounted ? "true" : "false") + '">' + (row.mounted ? "Спешиться" : "Верхом") + "</button>" +
      '<span class="companion-mount-note" data-mount-badge' + (row.mounted ? "" : " hidden") + ">верхом · Рывок / Отход / Уклонение</span>"
    ) : "";
    const initMod = abilMod(row.dex);
    return '<article class="scene-card is-companion' + (open ? " is-open" : "") + (self ? " is-form" : "") + (away && !self ? " is-away" : "") + '" data-inv="companion-card" data-companion="' + esc(row.id) + '" data-companion-kind="' + esc(row.kind) + '" data-hp="' + row.hp + '" data-hp-max="' + row.hp_max + '" data-hp-temp="' + (row.hp_temp || 0) + '" data-away="' + (away ? "1" : "0") + '" data-mounted="' + (row.mounted ? "1" : "0") + '">' +
      '<div class="scene-card__hit"><button type="button" class="companion-hit__main" data-toggle-card data-comp-toggle="' + esc(row.id) + '">' +
        '<span class="scene-card__name">' + esc(row.name) + " " + tags.join(" ") + "</span>" +
        '<span class="scene-card__meta" data-companion-meta>' + esc(metaLine(row)) + "</span></button>" +
        '<div class="companion-hp" data-companion-hp>' +
          '<button type="button" class="companion-hp__step" data-companion-hp-step="-1" title="Снять 1 хит" aria-label="Снять 1 хит">−</button>' +
          '<button type="button" class="companion-hp__val" data-companion-hp-open aria-haspopup="dialog" aria-expanded="false" title="Урон, лечение и временные хиты">' + esc(hpLabel) + "</button>" +
          '<button type="button" class="companion-hp__step" data-companion-hp-step="1" title="Вернуть 1 хит" aria-label="Вернуть 1 хит">+</button>' +
          '<div class="companion-pop" data-companion-pop="hp" hidden><p class="companion-pop__title">' + (self ? "Урон по облику" : "Урон / Лечение / Врем. хиты") + "</p>" +
            '<div class="companion-pop__row companion-pop__row--num"><input type="number" min="1" step="1" inputmode="numeric" value="1" aria-label="Число хитов" data-companion-hp-input></div>' +
            '<div class="companion-pop__row"><button type="button" class="btn" data-companion-hp-apply="damage">Урон</button><button type="button" class="btn" data-companion-hp-apply="heal">Лечение</button><button type="button" class="btn" data-companion-hp-apply="temp">Врем. хиты</button></div></div></div>' +
        (row.size ? '<span class="scene-card__side">' + esc(row.size) + "</span>" : "") +
      "</div>" +
      '<div class="scene-card__body"' + (open ? "" : " hidden") + ">" + source + hostNote +
        '<div class="companion-stats"><span>КД <b>' + (row.ac == null ? "—" : row.ac) + "</b></span>" +
          '<button type="button" class="companion-chip is-init" data-companion-roll="init" data-label="Инициатива" data-mod="' + initMod + '">Иниц. <b>' + signedMod(initMod) + "</b></button>" +
          "<span>Скорость <b>" + esc(speedLine(row)) + "</b></span>" + mount + "</div>" +
        (abils ? '<div class="companion-abils" aria-label="Характеристики">' + abils + "</div>" : "") +
        (skills ? '<div class="companion-skills" aria-label="Навыки">' + skills + "</div>" : "") +
        (row.notes ? '<p class="mini-block">' + esc(row.notes) + "</p>" : "") +
        '<div class="companion-conds"><button type="button" class="btn" data-companion-cond-open aria-haspopup="dialog" aria-expanded="false">+ Состояние</button><span class="companion-badges" data-companion-badges>' + badges + "</span>" +
          '<div class="companion-pop" data-companion-pop="cond" hidden><p class="companion-pop__title">Состояния</p><div class="companion-pop__row">' + condBtns + "</div></div></div>" +
        '<div class="scene-card__actions">' + attacksHtml + actions.join("") + "</div></div></article>";
  }
  function syncCompanionChrome() {
    const c = ensureCompanionsState();
    const form = c.list.find(function (r) { return isSelfForm(r) && r.active; });
    syncFormEffect(form);
    if (typeof syncHeader === "function") syncHeader();
  }
  function syncFormEffect(form) {
    if (!sheet.effectsList) sheet.effectsList = [];
    const rest = sheet.effectsList.filter(function (e) { return e.id !== "form-active"; });
    if (form) rest.unshift({ id: "form-active", name: "В облике: " + form.name, label: formSourceBadge(form.form), formId: form.id });
    sheet.effectsList = rest;
    if (typeof renderEffects === "function") renderEffects();
    else if (typeof syncEffects === "function") syncEffects();
  }
  function applyHpToComp(row, kind, amount) {
    const n = Math.max(0, Math.floor(Number(amount) || 0));
    if (kind === "temp") { row.hp_temp = n; return { overflow: 0 }; }
    if (kind === "heal") {
      row.hp = Math.min(row.hp_max, (row.hp || 0) + n);
      if (row.hp > 0 && isPermanentAlly(row) && !isSelfForm(row)) { row.away = false; row.active = true; }
      return { overflow: 0 };
    }
    let need = n;
    const fromTemp = Math.min(row.hp_temp || 0, need);
    row.hp_temp = (row.hp_temp || 0) - fromTemp;
    need -= fromTemp;
    const hp = Math.max(0, (row.hp || 0) - need);
    const overflow = need - ((row.hp || 0) - hp);
    row.hp = hp;
    if (hp <= 0) {
      if (isSelfForm(row)) return { overflow: overflow, dropForm: true };
      if (companionUsesDeathSaves(row)) {
        row.active = false;
        row.away = false;
        row.deathOk = row.deathOk || 0;
        row.deathFail = row.deathFail || 0;
        return { overflow: 0, dying: true };
      }
      if (isPermanentAlly(row)) { row.away = true; row.active = false; row.deathOk = 0; row.deathFail = 0; }
      else { row.active = false; row.deathOk = 0; row.deathFail = 0; }
    } else {
      row.deathOk = 0; row.deathFail = 0;
    }
    return { overflow: 0 };
  }
  function dismissForm(row, overflow) {
    const c = ensureCompanionsState();
    const name = row.name;
    if (overflow > 0 && typeof applyHpDamage === "function") applyHpDamage(overflow);
    c.list = c.list.filter(function (r) { return r.id !== row.id; });
    if (c.openId === row.id) c.openId = "";
    toast(overflow > 0 ? ("Облик сброшен · хозяину −" + overflow + " хитов") : ("Облик сброшен: " + name));
    renderCompanions();
  }
  function wildLimits() {
    const c = ensureCompanionsState();
    const level = c.druidLevel || 0;
    const moon = (c.circleFeatures || []).indexOf("circle_forms") >= 0;
    let maxCr = 0.25, allowSwim = false, allowFly = false, combatBonusAction = moon;
    if (moon) {
      maxCr = level >= 6 ? Math.floor(level / 3) : 1;
      if (level >= 4) allowSwim = true;
      if (level >= 8) allowFly = true;
    } else if (level >= 8) { maxCr = 1; allowSwim = true; allowFly = true; }
    else if (level >= 4) { maxCr = 0.5; allowSwim = true; }
    else if (level >= 2) { maxCr = 0.25; }
    return { maxCr: maxCr, allowSwim: allowSwim, allowFly: allowFly, moon: moon, combatBonusAction: combatBonusAction };
  }
  function formatWsLimit(limits) {
    const cr = limits.maxCr >= 1 ? String(limits.maxCr) : (limits.maxCr === 0.5 ? "1/2" : "1/4");
    return "CR " + cr + ", " + (limits.allowSwim ? "плавание" : "без плавания") + " и " + (limits.allowFly ? "полёт" : "без полёта");
  }
  function wildOptions() {
    const c = ensureCompanionsState();
    const unlocked = {};
    (c.circleFeatures || []).forEach(function (id) { unlocked[id] = true; });
    const left = Math.max(0, (c.wild.max || 2) - (c.wild.used || 0));
    const hasWs = c.wildUnlocked || unlocked.wild_shape;
    function opt(id, label, summary, cost, on) {
      if (!on) return { id: id, labelRu: label, summaryRu: summary, cost: cost, disabled: true, disabledReason: "Умение не разблокировано" };
      if (left < cost) return { id: id, labelRu: label, summaryRu: summary, cost: cost, disabled: true, disabledReason: "Нужно " + cost + ", осталось " + left };
      return { id: id, labelRu: label, summaryRu: summary, cost: cost, disabled: false };
    }
    const out = [opt("beast_form", "Дикий облик", "Принять звериный облик из бестиария (лимит CR / плавание / полёт).", 1, hasWs)];
    if (unlocked.wild_companion) out.push(opt("wild_companion", "Дикий спутник", "Как «Поиск фамильяра»: выбери зверя (тип — фея), −1 Дикий облик, часы = ½ ур. друида. Без форм Цепи.", 1, true));
    if (unlocked.starry_form) out.push(opt("starry_form", "Звёздная форма", "Бонусным: форма Лучника / Чаши / Дракона на 10 мин.", 1, true));
    if (unlocked.symbiotic_entity) out.push(opt("symbiotic_entity", "Симбиотическая сущность", "Временные хиты = 4×ур. друида; Ореол спор удвоен на 10 мин.", 1, true));
    if (unlocked.summon_wildfire_spirit) out.push(opt("wildfire_spirit", "Дух дикого огня", "Призвать духа на 1 час (хиты 5+5×ур.).", 1, true));
    if (unlocked.elemental_wild_shape) out.push(opt("elemental_wild_shape", "Элементальный дикий облик", "Потратить оба использования → воздушный / земляной / огненный / водный элементаль.", 2, true));
    return out;
  }
  function spendWild(cost) {
    const c = ensureCompanionsState();
    c.wild.used = Math.min(c.wild.max, (c.wild.used || 0) + cost);
  }
  function hostHpNow() {
    const hp = Number(sheet.hp);
    const hpMax = Number(sheet.hpMax);
    return { hp: Number.isFinite(hp) ? hp : 38, hpMax: Number.isFinite(hpMax) ? hpMax : 38 };
  }
  function applySelfForm(pick, meta) {
    const c = ensureCompanionsState();
    c.list = c.list.filter(function (r) { return !isSelfForm(r); });
    const host = hostHpNow();
    const row = companionFromPick(pick, {
      kind: "transformed_self", role: "self_form", nature: "summoned", active: true, is_primary: true,
      source: { kind: meta.sourceKind || "class", labelRu: meta.labelRu, feature: meta.feature, spellId: meta.spellId },
      form: { form_source: meta.form_source, form_source_ref: meta.ref, labelRu: meta.labelRu, host_hp_at_enter: host.hp, host_hp_max_at_enter: host.hpMax, duration_minutes: meta.duration || null }
    });
    row.id = "form-self";
    c.list.unshift(row);
    c.openId = row.id;
    renderCompanions();
    return row;
  }
  function beastAllowed(p, limits) {
    const cr = parseCr(p.cr);
    if (cr == null || cr > limits.maxCr + 1e-9) return false;
    if (!limits.allowFly && (p.speed_fly || 0) > 0) return false;
    if (!limits.allowSwim && (p.speed_swim || 0) > 0) return false;
    return true;
  }
  function filterBeastsForQuery(list, q) {
    q = (q || "").trim().toLowerCase();
    if (!q) return list;
    return list.filter(function (p) { return p && (p.name.toLowerCase().indexOf(q) >= 0 || p.slug.indexOf(q) >= 0); });
  }
  function pickTypeLabel(p) {
    const ru = { beast: "зверь", fiend: "исчадие", fey: "фея", dragon: "дракон", undead: "нежить", elemental: "элементаль" };
    return ru[p.type] || p.type;
  }
  function renderPickRows(list, act) {
    if (!list.length) return '<p class="flags">Нет существ по этому запросу.</p>';
    return '<div class="comp-pick-list">' + list.map(function (p) {
      return '<button type="button" class="comp-pick-row" data-comp-act="' + act + '" data-slug="' + esc(p.slug) + '"><b>' + esc(p.name) + "</b><small>" + esc(pickTypeLabel(p)) + " · CR " + esc(p.cr) + " · КД " + p.ac + " · хиты " + p.hp + (p.speed_fly ? (" · полёт " + p.speed_fly) : "") + (p.speed_swim ? (" · плав. " + p.speed_swim) : "") + "</small></button>";
    }).join("") + "</div>";
  }
  function renderAddFork() {
    const c = ensureCompanionsState();
    let html = '<div class="companions-add-fork"><p class="flags">Выбери тип — потом можно сменить в карточке.</p>';
    html += '<button type="button" class="companions-add-fork__choice" data-comp-act="fork-bestiary"><strong>Из бестиария</strong><span>Сюжетный напарник или существо из справочника. Потом можно править карточку.</span></button>';
    html += '<button type="button" class="companions-add-fork__choice" data-comp-act="fork-manual"><strong>Вручную</strong><span>Имя, вид, хиты, КД, скорость и атаки — своими числами.</span></button>';
    html += '<button type="button" class="companions-add-fork__choice" data-comp-act="fork-companion"><strong>Спутник</strong><span>Постоянный компаньон архетипа: зверь, дрейк, стальной защитник, пушка…</span></button>';
    html += '<button type="button" class="companions-add-fork__choice" data-comp-act="fork-ally"><strong>Напарник / призыв</strong><span>Временный союзник от умения: дух, призванное существо и т.п.</span></button>';
    if (c.hasChain) html += '<button type="button" class="companions-add-fork__choice" data-comp-act="fork-familiar"><strong>Фамильяр (Цепь)</strong><span>Каст «Поиск фамильяра» — после выбора облика появится карточка.</span></button>';
    return html + "</div>";
  }
  function renderCreaturePick() {
    const c = ensureCompanionsState();
    const kind = c.pickKind || "story";
    const q = (c.pickQuery || "").trim().toLowerCase();
    let titleHint = "";
    let list = BESTIARY.slice();
    if (kind === "steed") {
      const official = list.filter(function (p) { return STEED_SLUGS.indexOf(p.slug) >= 0 && (!q || p.name.toLowerCase().indexOf(q) >= 0); });
      const other = list.filter(function (p) { return STEED_SLUGS.indexOf(p.slug) < 0 && (!q || p.name.toLowerCase().indexOf(q) >= 0 || p.slug.indexOf(q) >= 0); });
      return '<p class="flags">Дух скакуна: выбери форму. Тип духа можно указать на карточке.</p>' +
        '<label>Поиск<input type="search" data-comp-field="pickQuery" placeholder="имя, тип…" value="' + esc(c.pickQuery || "") + '"></label>' +
        '<div class="comp-section-lab">Официальные формы</div>' + renderPickRows(official, "pick-steed") +
        '<div class="comp-section-lab">Другие (можно выбрать любое существо)</div>' + renderPickRows(other.slice(0, 30), "pick-steed");
    }
    if (kind === "undead") { list = BESTIARY.filter(function (p) { return p.type === "undead"; }); titleHint = '<p class="flags">Контроль 24 часа; команда — бонусное.</p>'; }
    else if (kind === "conjure") { list = BESTIARY.filter(function (p) { return p.type === "beast" && parseCr(p.cr) <= 2; }); titleHint = '<p class="flags">Призыв животных: выбери зверей в пределах ячейки. Одинаковых можно собрать в стаю.</p>'; }
    else if (kind === "story") {
      const type = c.pickType || "all";
      if (type === "familiar") list = list.filter(function (p) { return (p.tags || []).indexOf("familiar") >= 0; });
      else if (type === "steed") list = list.filter(function (p) { return (p.tags || []).indexOf("steed") >= 0; });
      else if (type === "undead") list = list.filter(function (p) { return p.type === "undead"; });
      else if (type === "elemental") list = list.filter(function (p) { return p.type === "elemental"; });
      else if (type === "beast") list = list.filter(function (p) { return p.type === "beast"; });
      titleHint = '<p class="flags">Выбери существо — оно появится карточкой напарника.</p>';
    }
    if (q) list = list.filter(function (p) { return p.name.toLowerCase().indexOf(q) >= 0 || p.slug.indexOf(q) >= 0 || (p.type || "").indexOf(q) >= 0; });
    const types = kind === "story" ? ('<div class="chip-row">' + [["all","Все"],["beast","Звери"],["familiar","Фамильяры"],["steed","Скакуны"],["undead","Нежить"],["elemental","Элементали"]].map(function (t) {
      return '<button type="button" class="chip' + ((c.pickType || "all") === t[0] ? " is-on" : "") + '" data-comp-act="pick-type" data-type="' + t[0] + '">' + t[1] + "</button>";
    }).join("") + "</div>") : "";
    const act = kind === "undead" ? "pick-undead" : (kind === "conjure" ? "pick-conjure" : "pick-story");
    return titleHint + '<label>Поиск<input type="search" data-comp-field="pickQuery" placeholder="имя, тип…" value="' + esc(c.pickQuery || "") + '"></label>' + types + renderPickRows(list, act);
  }
  function familiarModeLabel(mode) {
    if (mode === "pact_chain") return "Поиск фамильяра · Цепь";
    if (mode === "wild_companion") return "Дикий спутник";
    return "Поиск фамильяра";
  }
  function familiarModeHint(mode) {
    if (mode === "pact_chain") return "Обычные фамильяры и особые формы Цепи: бес, квазит, спрайт, псевдодракон. Можно как ритуал или ячейкой.";
    if (mode === "wild_companion") return "Как «Поиск фамильяра», но тип — фея. Тратится использование Дикого облика; длительность = ½ ур. друида (часы).";
    return "Можно как ритуал или ячейкой.";
  }
  function renderFamiliarPick() {
    const c = ensureCompanionsState();
    const mode = c.familiarMode || "spell";
    const q = (c.familiarQuery || "").trim().toLowerCase();
    const slugs = mode === "pact_chain" ? FAMILIAR_BEAST_SLUGS.concat(PACT_CHAIN_SLUGS) : FAMILIAR_BEAST_SLUGS.slice();
    let list = slugs.map(bestiaryBySlug).filter(Boolean);
    if (q) list = list.filter(function (p) { return p.name.toLowerCase().indexOf(q) >= 0 || p.slug.indexOf(q) >= 0; });
    const special = mode === "pact_chain" ? list.filter(function (p) { return PACT_CHAIN_SLUGS.indexOf(p.slug) >= 0; }) : [];
    const beasts = list.filter(function (p) { return PACT_CHAIN_SLUGS.indexOf(p.slug) < 0; });
    return '<p class="flags">' + esc(familiarModeHint(mode)) + "</p>" +
      '<label>Поиск<input type="search" data-comp-field="familiarQuery" placeholder="' + (mode === "pact_chain" ? "сова, бес, спрайт…" : "сова, кошка, ворон…") + '" value="' + esc(c.familiarQuery || "") + '"></label>' +
      (special.length ? ('<div class="comp-section-lab">Особые формы Цепи (' + special.length + ")</div>" + renderPickRows(special, "pick-familiar")) : "") +
      '<div class="comp-section-lab">' + (mode === "wild_companion" ? "Облики (как фея)" : "Звери") + " (" + beasts.length + ")</div>" +
      renderPickRows(beasts, "pick-familiar");
  }
  function renderWildShape() {
    const c = ensureCompanionsState();
    const step = c.wild.step || "fork";
    const limits = wildLimits();
    const left = Math.max(0, (c.wild.max || 2) - (c.wild.used || 0));
    if (step === "fork") {
      return '<p class="flags">Лимит облика: ' + esc(formatWsLimit(limits)) + (limits.combatBonusAction ? " · бонусным действием" : "") + " · осталось " + left + "/" + c.wild.max + "</p>" +
        '<div class="companions-add-fork">' + wildOptions().map(function (opt) {
          return '<button type="button" class="companions-add-fork__choice" data-comp-act="wild-opt" data-opt="' + opt.id + '"' + (opt.disabled ? " disabled" : "") + "><strong>" +
            esc(opt.labelRu) + (opt.id === "beast_form" && limits.combatBonusAction ? " (бонусным)" : "") + (opt.cost > 1 ? (" (−" + opt.cost + ")") : "") +
            "</strong><span>" + esc(opt.disabled ? opt.disabledReason : opt.summaryRu) + "</span></button>";
        }).join("") + "</div>";
    }
    if (step === "familiar") {
      c.familiarMode = "wild_companion";
      return '<p class="flags">Как «Поиск фамильяра», но тип — фея. −1 Дикий облик · длительность ' + Math.max(1, Math.floor((c.druidLevel || 2) / 2)) + " ч. Особые формы Цепи недоступны.</p>" +
        '<label>Поиск<input type="search" data-comp-field="wild.query" placeholder="сова, кошка, ворон…" value="' + esc(c.wild.query || "") + '"></label>' +
        renderPickRows(filterBeastsForQuery(FAMILIAR_BEAST_SLUGS.map(bestiaryBySlug).filter(Boolean), c.wild.query), "wild-familiar");
    }
    if (step === "beast") {
      const known = (c.knownForms || []).map(bestiaryBySlug).filter(Boolean).filter(function (p) { return beastAllowed(p, limits); });
      const beasts = BESTIARY.filter(function (p) { return p.type === "beast" && beastAllowed(p, limits) && (c.knownForms || []).indexOf(p.slug) < 0; });
      return '<label>Поиск<input type="search" data-comp-field="wild.query" placeholder="волк, медведь…" value="' + esc(c.wild.query || "") + '"></label>' +
        (known.length ? ('<div class="comp-section-lab">Известные</div>' + renderPickRows(filterBeastsForQuery(known, c.wild.query), "wild-beast")) : "") +
        '<div class="comp-section-lab">Бестиарий (' + filterBeastsForQuery(beasts, c.wild.query).length + ")</div>" + renderPickRows(filterBeastsForQuery(beasts, c.wild.query), "wild-beast");
    }
    if (step === "starry") {
      return '<p class="flags">10 минут. Хиты остаются хитами персонажа (отдельного пула нет).</p>' +
        '<div class="chip-row">' + [["archer","Лучник"],["chalice","Чаша"],["dragon","Дракон"]].map(function (x) {
          return '<button type="button" class="chip' + (c.wild.constellation === x[0] ? " is-on" : "") + '" data-comp-act="starry" data-star="' + x[0] + '">' + x[1] + "</button>";
        }).join("") + "</div>" +
        '<div class="modal-actions"><button type="button" class="btn primary" data-comp-act="confirm-starry">Принять (−1)</button></div>';
    }
    if (step === "elemental") {
      const key = c.wild.elemental || "air";
      const map = { air: "air_elemental", earth: "earth_elemental", fire: "fire_elemental", water: "water_elemental" };
      const prev = bestiaryBySlug(map[key]);
      return '<p class="flags">Стоимость: оба использования Дикого облика (−2). Круг Луны, 10+ уровень.</p>' +
        '<div class="chip-row">' + [["air","Воздух"],["earth","Земля"],["fire","Огонь"],["water","Вода"]].map(function (x) {
          return '<button type="button" class="chip' + (key === x[0] ? " is-on" : "") + '" data-comp-act="elemental" data-el="' + x[0] + '">' + x[1] + "</button>";
        }).join("") + "</div>" +
        (prev ? ('<p class="flags">' + esc(prev.name) + ": КД " + prev.ac + " · хиты " + prev.hp + " · CR " + prev.cr + (prev.speed_fly ? " · полёт" : "") + (prev.speed_swim ? " · плав." : "") + "</p>") : "") +
        '<div class="modal-actions"><button type="button" class="btn primary" data-comp-act="confirm-elemental">Принять (−2)</button></div>';
    }
    return "";
  }
  function renderSpellForm() {
    const c = ensureCompanionsState();
    const q = c.spellForm.query || "";
    const maxCr = c.spellForm.maxCr != null ? c.spellForm.maxCr : 5;
    const allowed = c.spellForm.allowedTypes || ["beast"];
    let list = BESTIARY.filter(function (p) { return parseCr(p.cr) <= maxCr + 1e-9 && (allowed[0] === "any" || allowed.indexOf(p.type) >= 0); });
    list = filterBeastsForQuery(list, q);
    const typeRu = { beast: "зверь", fiend: "исчадие", fey: "фея", elemental: "элементаль", undead: "нежить" };
    const typeHint = allowed[0] === "any" ? "любой тип" : ("только " + allowed.map(function (t) { return typeRu[t] || t; }).join(", "));
    return '<p class="flags">На себя · CR ≤ ' + maxCr + " · " + esc(typeHint) + ". Пока держишь концентрацию.</p>" +
      '<label>Поиск<input type="search" data-comp-field="spellForm.query" placeholder="волк, медведь…" value="' + esc(q) + '"></label>' +
      '<div class="comp-section-lab">Бестиарий (' + list.length + ")</div>" + renderPickRows(list, "spell-form-pick");
  }
  function renderFeatureForm() {
    const c = ensureCompanionsState();
    const q = c.featureForm.query || "";
    const maxCr = c.featureForm.maxCr != null ? c.featureForm.maxCr : 1;
    let list = BESTIARY.filter(function (p) { return p.type === "beast" && parseCr(p.cr) <= maxCr + 1e-9; });
    list = filterBeastsForQuery(list, q);
    return '<p class="flags">Без ячейки · 1× короткий/долгий отдых · только зверь CR ≤ ' + maxCr + ".</p>" +
      '<label>Поиск<input type="search" data-comp-field="featureForm.query" placeholder="волк, ястреб…" value="' + esc(q) + '"></label>' +
      '<div class="comp-section-lab">Бестиарий (' + list.length + ")</div>" + renderPickRows(list, "feature-form-pick");
  }
  function renderAllyAbility() {
    const c = ensureCompanionsState();
    const a = c.allyAbility || { name: "Способность", target: "elara" };
    return '<label>Кому<select data-comp-field="allyAbility.target">' +
      COMP_PARTY.map(function (p) { return '<option value="' + p.id + '"' + (a.target === p.id ? " selected" : "") + ">" + esc(p.name) + "</option>"; }).join("") +
      "</select></label>" +
      '<div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button type="button" class="btn primary" data-comp-act="ally-apply">Применить</button></div>';
  }
  function renderCompanionManual() {
    const c = ensureCompanionsState();
    const m = c.manual || { name: "", kind: "other", hp: "", ac: "", speed: "", attacks: "" };
    return '<div class="form">' +
      '<label>Имя<input data-comp-field="manual.name" placeholder="Имя существа" value="' + esc(m.name || "") + '"></label>' +
      '<label>Вид<select data-comp-field="manual.kind">' + Object.keys(COMP_KIND_LABELS).map(function (k) {
        return '<option value="' + k + '"' + (m.kind === k ? " selected" : "") + ">" + COMP_KIND_LABELS[k] + "</option>";
      }).join("") + "</select></label>" +
      '<label>Хиты<input data-comp-field="manual.hp" inputmode="numeric" value="' + esc(m.hp || "") + '"></label>' +
      '<label>КД<input data-comp-field="manual.ac" inputmode="numeric" value="' + esc(m.ac || "") + '"></label>' +
      '<label>Скорость (фт)<input data-comp-field="manual.speed" inputmode="numeric" value="' + esc(m.speed || "") + '"></label>' +
      '<label>Атаки и действия<textarea data-comp-field="manual.attacks" placeholder="Укус +4 · 2к4+2 колющий">' + esc(m.attacks || "") + "</textarea></label>" +
      '</div><div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button type="button" class="btn primary" data-comp-act="manual-save">Добавить</button></div>';
  }
  function renderCompanionEdit() {
    const c = ensureCompanionsState();
    const row = findComp(c.editId);
    if (!row) return "<p>Карточка не найдена.</p>";
    return '<div class="form">' +
      '<label>Имя<input data-comp-edit="name" value="' + esc(row.name) + '"></label>' +
      '<label>Хиты<input data-comp-edit="hp" inputmode="numeric" value="' + esc(String(row.hp)) + '"></label>' +
      '<label>Макс. хиты<input data-comp-edit="hp_max" inputmode="numeric" value="' + esc(String(row.hp_max)) + '"></label>' +
      '<label>КД<input data-comp-edit="ac" inputmode="numeric" value="' + esc(String(row.ac == null ? "" : row.ac)) + '"></label>' +
      '<label>Скорость (фт)<input data-comp-edit="speed_walk" inputmode="numeric" value="' + esc(String(row.speed_walk || "")) + '"></label>' +
      '<label>Полёт<input data-comp-edit="speed_fly" inputmode="numeric" value="' + esc(String(row.speed_fly || "")) + '"></label>' +
      '<label>Заметки<textarea data-comp-edit="notes">' + esc(row.notes || "") + "</textarea></label>" +
      '</div><div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button type="button" class="btn primary" data-comp-act="edit-save">Готово</button></div>';
  }
  function renderCompanionDelete() {
    const c = ensureCompanionsState();
    const row = findComp(c.deleteId);
    const name = row ? row.name : "этого напарника";
    return "<p>Убрать «" + esc(name) + "» с листа?</p>" +
      '<div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button type="button" class="btn primary" data-comp-act="delete-confirm">Удалить</button></div>';
  }
  function liveTitleCreaturePick() {
    const k = ensureCompanionsState().pickKind;
    if (k === "steed") return "Поиск скакуна";
    if (k === "undead") return "Восставший труп";
    if (k === "conjure") return "Призыв животных";
    return "Выбрать напарника";
  }
  function liveTitleFamiliar() { return familiarModeLabel(ensureCompanionsState().familiarMode) + " — выбери форму"; }
  function liveTitleWild() {
    const step = ensureCompanionsState().wild.step || "fork";
    if (step === "beast") return "Выбери звериный облик";
    if (step === "familiar") return "Дикий спутник — выбери форму";
    if (step === "starry") return "Звёздная форма";
    if (step === "elemental") return "Элементальный облик";
    return "Дикий облик — на что потратить?";
  }
  function liveTitleSpellForm() { const s = ensureCompanionsState().spellForm; return (s.labelRu || "Полиморф") + " — выбери форму"; }
  function liveTitleFeatureForm() { const s = ensureCompanionsState().featureForm; return (s.labelRu || "Перевёртыш") + " — зверь CR ≤ " + (s.maxCr || 1); }
  function liveTitleAlly() { return (ensureCompanionsState().allyAbility && ensureCompanionsState().allyAbility.name) || "Способность"; }
  function registerCompanionLive() {
    LIVE["companion-add-fork"] = { title: "Кого добавить?", body: renderAddFork };
    LIVE["companion-pick"] = { title: liveTitleCreaturePick, wide: true, body: renderCreaturePick };
    LIVE["familiar-pick"] = { title: liveTitleFamiliar, wide: true, body: renderFamiliarPick };
    LIVE["wild-shape"] = { title: liveTitleWild, wide: true, body: renderWildShape };
    LIVE["spell-form"] = { title: liveTitleSpellForm, wide: true, body: renderSpellForm };
    LIVE["feature-self-form"] = { title: liveTitleFeatureForm, wide: true, body: renderFeatureForm };
    LIVE["ally-ability"] = { title: liveTitleAlly, body: renderAllyAbility };
    LIVE["companion-manual"] = { title: "Напарник вручную", body: renderCompanionManual };
    LIVE["companion-edit"] = { title: "Править напарника", body: renderCompanionEdit };
    LIVE["companion-delete"] = { title: "Удалить напарника?", body: renderCompanionDelete };
  }
  function addBlankCompanion(kind) {
    const c = ensureCompanionsState();
    const row = {
      id: "cmp-new-" + Date.now().toString(36), kind: kind, role: "ally",
      name: kind === "ally" ? "Напарник" : "Спутник", nature: "living",
      active: true, is_primary: false, away: false,
      hp: 10, hp_max: 10, hp_temp: 0, ac: 10, speed_walk: 30, speed_fly: 0, speed_swim: 0, speed_climb: 0,
      str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
      skills: [], attacks: [], conditions: [], notes: "Добавлен вручную",
      story: true, story: true, source: { kind: "manual", labelRu: "Добавлен вручную" }
    };
    c.list.push(row); c.openId = row.id; c.filter = kind === "ally" ? "ally" : "companion";
    closeDialog(); renderCompanions(); toast(row.name + " добавлен");
  }
  function upsertFamiliar(pick, mode) {
    const c = ensureCompanionsState();
    const existing = c.list.find(function (r) { return r.kind === "familiar"; });
    const hours = mode === "wild_companion" ? Math.max(1, Math.floor((c.druidLevel || 2) / 2)) : null;
    const src = mode === "wild_companion"
      ? { kind: "feature", labelRu: "Дикий спутник", feature: "wild_companion" }
      : mode === "pact_chain"
        ? { kind: "feature", labelRu: "Поиск фамильяра · Цепь", feature: "pact_of_the_chain", spellId: "find_familiar" }
        : { kind: "spell", labelRu: "Поиск фамильяра", spellId: "find_familiar" };
    const row = companionFromPick(pick, {
      id: existing ? existing.id : "owl", kind: "familiar", role: "ally", nature: "summoned",
      permanent: true, is_primary: existing ? existing.is_primary : true, active: true, source: src,
      more: { notes: pick.notes || (mode === "wild_companion" ? ("Дикий спутник · фея · " + hours + " ч.") : (pick.notes || "")) }
    });
    row.away = false;
    if (existing) c.list[c.list.indexOf(existing)] = row; else c.list.unshift(row);
    c.openId = row.id; closeDialog(); renderCompanions();
    toast(existing ? (familiarModeLabel(mode) + ": снова «" + pick.name + "»") : (familiarModeLabel(mode) + ": «" + pick.name + "»"));
  }
  function addFromPick(pick, kind) {
    const c = ensureCompanionsState();
    let extra = { kind: "other", role: "ally", nature: "living", active: true, story: true, source: { kind: "manual", labelRu: "Из бестиария" } };
    if (kind === "story") extra = { kind: "other", role: "ally", nature: "living", active: true, story: true, source: { kind: "manual", labelRu: "Из бестиария" } };
    if (kind === "steed") extra = { kind: "other", role: "ally", nature: "summoned", permanent: true, steed: true, steed_spirit_type: "celestial", source: { kind: "spell", labelRu: "Поиск скакуна", spellId: "find_steed" } };
    if (kind === "undead") extra = { kind: "ally", role: "ally", nature: "summoned", source: { kind: "spell", labelRu: "Восставший труп", spellId: "animate_dead" }, more: { undead_control: { labelRu: "контроль 24 часа", controlled: true } } };
    if (kind === "conjure") extra = { kind: "ally", role: "ally", nature: "summoned", source: { kind: "spell", labelRu: "Призыв животных", spellId: "conjure_animals" }, pack: { member_count: 8, alive_count: 8, unit_name_ru: pick.name, unit_hp_max: pick.hp } };
    const row = companionFromPick(pick, extra);
    if (kind === "conjure") row.name = pick.name + " ×8";
    if (kind === "steed") {
      const prev = c.list.find(isSteed);
      if (prev) c.list = c.list.filter(function (r) { return r.id !== prev.id; });
    }
    c.list.push(row); c.openId = row.id; closeDialog(); renderCompanions();
    toast(row.name + (kind === "steed" ? " — скакун обновлён" : " добавлен"));
  }
  function setField(path, value) {
    const c = ensureCompanionsState();
    const parts = path.split(".");
    let obj = c;
    while (parts.length > 1) {
      const k = parts.shift();
      if (!obj[k] || typeof obj[k] !== "object") obj[k] = {};
      obj = obj[k];
    }
    obj[parts[0]] = value;
  }
  function onCompInput(e) {
    const el = e.target;
    if (!el || !el.getAttribute) return;
    const field = el.getAttribute("data-comp-field");
    if (field) { setField(field, el.value); refreshLive(); }
  }
  function onCompClick(e) {
    const t = e.target.closest && e.target.closest("[data-comp-act],[data-comp-filter],[data-comp-toggle]");
    if (!t) return;
    const act = t.getAttribute("data-comp-act");
    const c = ensureCompanionsState();
    if (t.hasAttribute("data-comp-filter")) { c.filter = t.getAttribute("data-comp-filter"); renderCompanions(); return; }
    if (t.hasAttribute("data-comp-toggle")) {
      const id = t.getAttribute("data-comp-toggle");
      c.openId = c.openId === id ? "" : id;
      renderCompanions(); e.stopPropagation(); return;
    }
    if (act === "add") { openDialog("companion-add-fork"); return; }
    if (act === "fork-bestiary") { c.pickKind = "story"; c.pickQuery = ""; c.pickType = "all"; openDialog("companion-pick"); return; }
    if (act === "fork-manual") { c.manual = { name: "", kind: "other", hp: "", ac: "", speed: "", attacks: "" }; openDialog("companion-manual"); return; }
    if (act === "fork-companion") { addBlankCompanion("other"); return; }
    if (act === "fork-ally") { addBlankCompanion("ally"); return; }
    if (act === "fork-familiar") { c.familiarMode = "pact_chain"; c.familiarQuery = ""; openDialog("familiar-pick"); return; }
    if (act === "pick-type") { c.pickType = t.getAttribute("data-type"); refreshLive(); return; }
    if (act === "pick-story" || act === "pick-steed" || act === "pick-undead" || act === "pick-conjure") {
      const pick = bestiaryBySlug(t.getAttribute("data-slug"));
      if (pick) addFromPick(pick, act === "pick-story" ? "story" : act.replace("pick-", ""));
      return;
    }
    if (act === "pick-familiar") {
      const pick = bestiaryBySlug(t.getAttribute("data-slug"));
      if (pick) { if (c.familiarMode === "wild_companion") spendWild(1); upsertFamiliar(pick, c.familiarMode || "spell"); }
      return;
    }
    if (act === "wild-opt") {
      const id = t.getAttribute("data-opt");
      if (id === "beast_form") { c.wild.step = "beast"; c.wild.query = ""; refreshLive(); }
      else if (id === "wild_companion") { c.wild.step = "familiar"; c.wild.query = ""; c.familiarMode = "wild_companion"; refreshLive(); }
      else if (id === "starry_form") { c.wild.step = "starry"; refreshLive(); }
      else if (id === "elemental_wild_shape") { c.wild.step = "elemental"; refreshLive(); }
      else if (id === "symbiotic_entity") { const temp = 4 * (c.druidLevel || 2); spendWild(1); closeDialog(); toast("Симбиотическая сущность: " + temp + " вр. хитов · 10 мин."); }
      else if (id === "wildfire_spirit") {
        spendWild(1);
        const hp = 5 + 5 * (c.druidLevel || 2);
        const row = { id: "wildfire", kind: "ally", role: "ally", name: "Дух дикого огня", nature: "summoned", active: true, away: false, is_primary: false, hp: hp, hp_max: hp, hp_temp: 0, ac: 13, speed_walk: 30, speed_fly: 30, str: 10, dex: 14, con: 14, int: 13, wis: 15, cha: 11, skills: [], attacks: [{ name: "Пламя", bonus: 4, damage: "1к6+2", dtype: "огонь" }], conditions: [], notes: "Призван на 1 час.", source: { kind: "feature", labelRu: "Дух дикого огня", feature: "summon_wildfire_spirit" } };
        c.list = c.list.filter(function (r) { return r.id !== "wildfire"; }).concat([row]);
        c.openId = row.id; closeDialog(); renderCompanions(); toast("Дух дикого огня призван");
      }
      return;
    }
    if (act === "wild-beast") {
      const pick = bestiaryBySlug(t.getAttribute("data-slug"));
      if (!pick) return;
      spendWild(1);
      applySelfForm(pick, { form_source: "wild_shape", ref: "wild_shape:" + pick.slug, labelRu: "Дикий облик", sourceKind: "class", feature: "wild_shape", duration: Math.max(1, Math.floor((c.druidLevel || 2) / 2)) * 60 });
      closeDialog(); toast("Дикий облик: " + pick.name); return;
    }
    if (act === "wild-familiar") {
      const pick = bestiaryBySlug(t.getAttribute("data-slug"));
      if (!pick) return;
      spendWild(1); c.familiarMode = "wild_companion"; upsertFamiliar(pick, "wild_companion"); return;
    }
    if (act === "starry") { c.wild.constellation = t.getAttribute("data-star"); refreshLive(); return; }
    if (act === "elemental") { c.wild.elemental = t.getAttribute("data-el"); refreshLive(); return; }
    if (act === "confirm-starry") {
      const map = { archer: "Лучник", chalice: "Чаша", dragon: "Дракон" };
      spendWild(1); closeDialog(); toast("Звёздная форма: " + (map[c.wild.constellation] || "Лучник")); return;
    }
    if (act === "confirm-elemental") {
      const map = { air: "air_elemental", earth: "earth_elemental", fire: "fire_elemental", water: "water_elemental" };
      const pick = bestiaryBySlug(map[c.wild.elemental || "air"]);
      spendWild(2);
      applySelfForm(pick, { form_source: "elemental_wild_shape", ref: "elemental_wild_shape:" + (c.wild.elemental || "air"), labelRu: "Элементальный дикий облик", sourceKind: "class", feature: "elemental_wild_shape" });
      closeDialog(); toast("Элементальный облик: " + pick.name); return;
    }
    if (act === "spell-form-pick") {
      const pick = bestiaryBySlug(t.getAttribute("data-slug"));
      if (!pick) return;
      applySelfForm(pick, { form_source: "spell", ref: "spell:" + (c.spellForm.slug || "polymorph"), labelRu: c.spellForm.labelRu || "Полиморф", sourceKind: "spell", spellId: c.spellForm.slug || "polymorph", duration: 60 });
      closeDialog(); toast((c.spellForm.labelRu || "Полиморф") + ": " + pick.name); return;
    }
    if (act === "feature-form-pick") {
      const pick = bestiaryBySlug(t.getAttribute("data-slug"));
      if (!pick) return;
      applySelfForm(pick, { form_source: "feature", ref: "feature:shapechanger", labelRu: c.featureForm.labelRu || "Перевёртыш", sourceKind: "feature", feature: "shapechanger", duration: 60 });
      closeDialog(); toast((c.featureForm.labelRu || "Перевёртыш") + ": " + pick.name); return;
    }
    if (act === "ally-apply") {
      const a = c.allyAbility || {};
      const tgt = COMP_PARTY.find(function (p) { return p.id === a.target; });
      closeDialog(); toast((a.name || "Способность") + (tgt ? (" · " + tgt.name) : "")); return;
    }
    if (act === "manual-save") {
      const m = c.manual || {};
      const name = (m.name || "").trim() || "Напарник";
      const hp = Math.max(1, parseInt(m.hp, 10) || 10);
      const row = { id: "cmp-man-" + Date.now().toString(36), kind: m.kind || "other", role: "ally", name: name, nature: "living", active: true, away: false, is_primary: false, hp: hp, hp_max: hp, hp_temp: 0, ac: parseInt(m.ac, 10) || 10, speed_walk: parseInt(m.speed, 10) || 30, speed_fly: 0, speed_swim: 0, speed_climb: 0, skills: [], attacks: [], conditions: [], notes: m.attacks || "Добавлен вручную", story: true, source: { kind: "manual", labelRu: "Добавлен вручную" } };
      c.list.push(row); c.openId = row.id; closeDialog(); renderCompanions(); toast(name + " добавлен"); return;
    }
    if (act === "edit") { const row = cardComp(t); if (!row) return; c.editId = row.id; openDialog("companion-edit"); return; }
    if (act === "edit-save") {
      const row = findComp(c.editId);
      const body = $("[data-modal-body]");
      if (row && body) {
        const val = function (sel) { const n = body.querySelector('[data-comp-edit="' + sel + '"]'); return n ? n.value : ""; };
        row.name = val("name") || row.name;
        row.hp = Math.max(0, parseInt(val("hp"), 10) || 0);
        row.hp_max = Math.max(1, parseInt(val("hp_max"), 10) || row.hp_max);
        row.ac = parseInt(val("ac"), 10); if (isNaN(row.ac)) row.ac = null;
        row.speed_walk = parseInt(val("speed_walk"), 10) || 0;
        row.speed_fly = parseInt(val("speed_fly"), 10) || 0;
        row.notes = val("notes");
      }
      closeDialog(); renderCompanions(); return;
    }
    if (act === "delete" || act === "delete-confirm") {
      const row = cardComp(t) || findComp(c.deleteId);
      if (row) {
        c.list = c.list.filter(function (r) { return r.id !== row.id; });
        if (c.openId === row.id) c.openId = "";
        toast(row.name + " удалён");
      }
      if (typeof closeDialog === "function") closeDialog();
      renderCompanions();
      return;
    }
    if (act === "dismiss-form") { const row = cardComp(t); if (row) dismissForm(row, 0); return; }
    if (act === "attack") {
      const row = cardComp(t);
      const atk = row && row.attacks && row.attacks[Number(t.getAttribute("data-atk"))];
      if (atk) {
        const d20 = 1 + Math.floor(Math.random() * 20);
        toast(row.name + " · " + atk.name + ": к20 (" + d20 + ") " + signedMod(atk.bonus) + " → " + (d20 + (atk.bonus || 0)) + " · " + atk.damage + " " + atk.dtype);
      }
    }
  }
  function bootCompanions() {
    ensureCompanionsState();
    registerCompanionLive();
    const panel = $('[data-panel="companions"]');
    if (panel) {
      const links = panel.querySelector("h2 .links");
      if (links) links.setAttribute("data-comp-links", "");
      const fork = panel.querySelector("[data-companion-fork]");
      if (fork) fork.remove();
      const keep = panel.querySelector(".proto-keep");
      if (keep) keep.remove();
    }
    renderCompanions();
    const _renderScene = renderScene;
    renderScene = function () {
      _renderScene();
      if (scene === "companions") renderCompanions();
      const magicBtn = $("[data-magic-btn]");
      if (magicBtn) magicBtn.title = magicOpen ? "Скрыть магию" : "Показать магию";
    };
    document.addEventListener("click", onCompClick);
    document.addEventListener("input", onCompInput);
    document.addEventListener("change", onCompInput);
  }
  const _stepCompanionHp = typeof stepCompanionHp === "function" ? stepCompanionHp : null;
  const _applyCompanionHp = typeof applyCompanionHp === "function" ? applyCompanionHp : null;
  const _setCompanionAway = typeof setCompanionAway === "function" ? setCompanionAway : null;
  const _renderCompanion = typeof renderCompanion === "function" ? renderCompanion : null;
  stepCompanionHp = function (card, delta) {
    const row = card && findComp(card.getAttribute("data-companion"));
    if (!row) { if (_stepCompanionHp) _stepCompanionHp(card, delta); return; }
    const res = applyHpToComp(row, delta < 0 ? "damage" : "heal", Math.abs(delta));
    if (res.dropForm) { dismissForm(row, res.overflow); return; }
    renderCompanions();
  };
  applyCompanionHp = function (card, kind, amount) {
    const row = card && findComp(card.getAttribute("data-companion"));
    if (!row) return _applyCompanionHp ? _applyCompanionHp(card, kind, amount) : false;
    const n = Math.max(0, Math.floor(Number(amount) || 0));
    if (n <= 0) { toast("Укажи число больше 0"); return false; }
    const res = applyHpToComp(row, kind, n);
    if (res.dropForm) { dismissForm(row, res.overflow); return true; }
    renderCompanions();
    return true;
  };
  setCompanionAway = function (card, away) {
    const row = card && findComp(card.getAttribute("data-companion"));
    if (!row) { if (_setCompanionAway) _setCompanionAway(card, away); return; }
    if (isSelfForm(row)) { if (away) dismissForm(row, 0); return; }
    row.away = !!away;
    row.active = !away;
    if (!away && row.hp <= 0) row.hp = row.hp_max;
    toast(away ? (row.name + ": отпущен, не призван") : (row.name + ": призван снова"));
    renderCompanions();
  };
  renderCompanion = function (card) {
    const row = card && findComp(card.getAttribute("data-companion"));
    if (row) {
      const on = [];
      card.querySelectorAll("[data-companion-cond].is-on").forEach(function (b) { on.push(b.getAttribute("data-companion-cond")); });
      row.conditions = on;
      if (card.hasAttribute("data-mounted")) row.mounted = card.getAttribute("data-mounted") === "1";
      renderCompanions();
      return;
    }
    if (_renderCompanion) _renderCompanion(card);
  };
  function canOpenClassDialog(id, kind) {
    const c = ensureCompanionsState();
    if (id === "wild-shape") return !!(c.wildUnlocked || (c.circleFeatures || []).indexOf("wild_shape") >= 0);
    if (id === "familiar-pick") return !!(c.hasFindFamiliar || c.hasChain);
    if (id === "spell-form") return !!c.hasPolymorph;
    if (id === "feature-self-form") return !!c.hasShapechanger;
    if (id === "companion-pick" && (kind || c.pickKind) === "steed") return !!c.hasFindSteed;
    return true;
  }
  function refuseClassDialog() {
    if (typeof toast === "function") toast("Это умение этому персонажу недоступно");
    return false;
  }
  function openWildShape(opts) {
    const c = ensureCompanionsState();
    if (!canOpenClassDialog("wild-shape")) return refuseClassDialog();
    c.wild.step = (opts && opts.step) || "fork";
    c.wild.query = "";
    scene = "companions"; magicOpen = false; renderScene();
    openDialog("wild-shape");
  }
  function openFamiliarPick(mode) {
    const c = ensureCompanionsState();
    if (!canOpenClassDialog("familiar-pick")) return refuseClassDialog();
    c.familiarMode = mode || "spell";
    c.familiarQuery = "";
    scene = "companions"; magicOpen = false; renderScene();
    openDialog("familiar-pick");
  }
  function openCreaturePick(kind) {
    const c = ensureCompanionsState();
    c.pickKind = kind || "story";
    if (!canOpenClassDialog("companion-pick", c.pickKind)) return refuseClassDialog();
    c.pickQuery = "";
    c.pickType = "all";
    scene = "companions"; magicOpen = false; renderScene();
    openDialog("companion-pick");
  }
  function openSpellForm(slug, label, maxCr, types) {
    const c = ensureCompanionsState();
    if (!canOpenClassDialog("spell-form")) return refuseClassDialog();
    c.spellForm = { slug: slug || "polymorph", labelRu: label || "Полиморф", query: "", maxCr: maxCr != null ? maxCr : 5, allowedTypes: types || ["beast"] };
    scene = "companions"; magicOpen = false; renderScene();
    openDialog("spell-form");
  }
  function openFeatureFormDlg() {
    const c = ensureCompanionsState();
    if (!canOpenClassDialog("feature-self-form")) return refuseClassDialog();
    c.featureForm = { query: "", labelRu: "Перевёртыш", maxCr: 1 };
    scene = "companions"; magicOpen = false; renderScene();
    openDialog("feature-self-form");
  }
  function openAllyAbility(name) {
    const c = ensureCompanionsState();
    c.allyAbility = { name: name || "Способность", target: "elara" };
    scene = "companions"; magicOpen = false; renderScene();
    openDialog("ally-ability");
  }
  function openCompanionCard(id) {
    const c = ensureCompanionsState();
    c.openId = id || c.openId;
    if (typeof closeDialog === "function") closeDialog();
    scene = "companions"; magicOpen = false; renderScene();
    renderCompanions();
  }
  function openAddFork() {
    scene = "companions"; magicOpen = false; renderScene();
    openDialog("companion-add-fork");
  }
  /* bootCompanions skipped on mobile: no desktop renderScene / panel */

  function pbFromLevelComp(level) {
    const n = Math.max(1, Number(level) || 1);
    return 2 + Math.floor((n - 1) / 4);
  }
  function blankSkills() {
    return {
      athletics: { p: 0 }, acrobatics: { p: 0 }, stealth: { p: 0 }, sleight: { p: 0 },
      religion: { p: 0 }, history: { p: 0 }, arcana: { p: 0 }, nature: { p: 0 }, investigation: { p: 0 },
      insight: { p: 0 }, medicine: { p: 0 }, perception: { p: 0 }, survival: { p: 0 }, animal: { p: 0 },
      persuasion: { p: 0 }, deception: { p: 0 }, intimidation: { p: 0 }, performance: { p: 0 }
    };
  }
  function withSkills(on) {
    const s = blankSkills();
    (on || []).forEach(function (k) { if (s[k]) s[k] = { p: 1 }; });
    return s;
  }
  function companionsForChar(id) {
    const base = defaultCompState();
    if (id === "brana") {
      base.list = [];
      base.wildUnlocked = true;
      base.druidLevel = 7;
      base.circleFeatures = ["wild_shape", "circle_forms"];
      base.hasPolymorph = true;
      base.knownForms = ["wolf", "black_bear", "brown_bear"];
      return base;
    }
    if (id === "ilis") {
      const owl = companionFromPick(bestiaryBySlug("owl"), {
        id: "owl", kind: "familiar", role: "ally", nature: "summoned", permanent: true, is_primary: true, active: true,
        source: { kind: "spell", labelRu: "Поиск фамильяра", spellId: "find_familiar" }
      });
      base.list = owl ? [owl] : [];
      base.hasFindFamiliar = true;
      base.hasShapechanger = true;
      return base;
    }
    if (id === "aren") {
      const horse = companionFromPick(bestiaryBySlug("warhorse"), {
        id: "horse", kind: "other", role: "ally", nature: "summoned", permanent: true, steed: true, steed_spirit_type: "celestial", is_primary: true, active: true,
        source: { kind: "spell", labelRu: "Поиск скакуна", spellId: "find_steed" }
      });
      base.list = horse ? [horse] : [];
      base.hasFindSteed = true;
      return base;
    }
    return base;
  }
  /* ===== Mobile companions glue ===== */
  function companionUsesDeathSaves(row) {
    if (!row || isSelfForm(row)) return false;
    if (row.story) return true;
    if (row.kind === "beast_companion" || row.kind === "primal_companion" || row.kind === "drake") return false;
    if (row.kind === "familiar") return false;
    if (row.nature === "summoned") return false;
    if (row.source && row.source.kind === "item" && row.nature === "living") return true;
    if (row.source && row.source.kind === "manual" && row.nature === "living") return true;
    return false;
  }
  function companionsVisibleCount() {
    const c = ensureCompanionsState();
    return (c.list || []).filter(function (row) {
      if (isSelfForm(row)) return !!row.active;
      if (!row.active && !isPermanentAlly(row)) return false;
      return true;
    }).length;
  }
  function syncCompanionsHeaderCount() {
    sheet.companions = companionsVisibleCount();
    const chip = document.querySelector("[data-goto-companions]");
    if (chip) {
      const n = sheet.companions;
      chip.hidden = !n;
      chip.textContent = "Напарники " + n;
    }
  }
  function compDeathHtml(row) {
    if (!companionUsesDeathSaves(row) || (row.hp != null && row.hp > 0)) return "";
    const ok = row.deathOk || 0;
    const bad = row.deathFail || 0;
    function pips(kind, val) {
      let s = "";
      for (let i = 1; i <= 3; i++) {
        s += '<button type="button" class="death-pip ' + (kind === "ok" ? "is-ok" : "is-bad") + (val >= i ? " is-filled" : "") + '" data-comp-death="' + kind + '" data-i="' + i + '" aria-label="' + (kind === "ok" ? "Успехи" : "Провалы") + ": " + i + ' из 3"></button>';
      }
      return s;
    }
    return '<div class="comp-death" role="group" aria-label="Спасы от смерти">' +
      '<span class="comp-death__lab">Спасы от смерти</span>' +
      '<span class="comp-death__track"><span>Успехи</span><span class="death-pips">' + pips("ok", ok) + "</span></span>" +
      '<span class="comp-death__track"><span>Провалы</span><span class="death-pips">' + pips("bad", bad) + "</span></span>" +
      '<button type="button" class="chip" data-comp-death-roll>к20</button>' +
    "</div>";
  }
  const _renderCompanionCardDesk = renderCompanionCard;
  renderCompanionCard = function (row, open) {
    let html = _renderCompanionCardDesk(row, open);
    html = html.replace('<span aria-hidden="true"></span>', "");
    html = html.replace('class="btn primary"', 'class="inv-act is-primary"');
    html = html.replace(/class="btn"/g, 'class="inv-act"');
    html = html.replace(/class="btn is-danger"/g, 'class="inv-act is-danger"');
    html = html.replace(/class="btn companion-dismiss"/g, 'class="inv-act companion-dismiss"');
    html = html.replace(/class="btn primary companion-summon"/g, 'class="inv-act is-primary companion-summon"');
    if (open && companionUsesDeathSaves(row) && !(row.hp > 0)) {
      html = html.replace('<div class="scene-card__actions">', compDeathHtml(row) + '<div class="scene-card__actions">');
      if (html.indexOf("comp-death") < 0) {
        html = html.replace("</article>", compDeathHtml(row) + "</article>");
      }
    }
    return html;
  };
  function renderCompanionsBody() {
    const c = ensureCompanionsState();
    const rows = visibleCompanions();
    const menuOpen = !!(state && state.compMenuOpen);
    const menuItems = [];
    menuItems.push('<button type="button" data-comp-act="collapse-all">Свернуть все</button>');
    menuItems.push('<button type="button" data-comp-act="expand-all">Развернуть все</button>');
    if (c.wildUnlocked || (c.circleFeatures || []).indexOf("wild_shape") >= 0) {
      menuItems.push('<button type="button" data-open="wild-shape" data-class-tool="wild-shape">Дикий облик</button>');
    }
    if (c.hasPolymorph) menuItems.push('<button type="button" data-open="spell-form">Полиморф</button>');
    menuItems.push('<button type="button" data-open="ally-ability">Способность союзника</button>');
    const menu = menuOpen ? '<div class="inv-menu" data-scene-menu>' + menuItems.join("") + "</div>" : "";
    const tools = '<button type="button" class="chip" data-comp-act="add">+ Добавить</button>' +
      '<button type="button" class="turn-config" data-toggle-comp-menu aria-label="Настроить напарников" title="Настроить напарников" aria-expanded="' + (menuOpen ? "true" : "false") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-settings"/></svg></button>' +
      menu;
    const filters = COMP_FILTERS.map(function (f) {
      return '<button type="button" class="chip' + (c.filter === f.id ? " is-on" : "") + '" data-comp-filter="' + f.id + '" role="tab" aria-selected="' + (c.filter === f.id ? "true" : "false") + '">' + esc(f.label) + "</button>";
    }).join("");
    let empty;
    if (!(c.list || []).length) {
      empty = '<div class="inv-empty"><p class="inv-empty__title">Пока пусто</p><p>Спутники архетипа и призывы умений появятся здесь. Можно добавить вручную.</p></div>';
    } else {
      empty = '<p class="inv-empty">Нет строк в этом фильтре.</p>';
    }
    const list = rows.length
      ? rows.map(function (row) { return renderCompanionCard(row, c.openId === row.id || (c.openIds && c.openIds[row.id])); }).join("")
      : empty;
    return '<div class="explore companions-scene">' +
      '<div class="explore-head"><div class="explore-head__tools">' + tools + "</div></div>" +
      '<div class="filters inv-filters" role="tablist" aria-label="Фильтр напарников">' + filters + "</div>" +
      '<div class="inv-list" data-companion-list>' + list + "</div></div>";
  }
  const _renderCompanionsDesk = renderCompanions;
  renderCompanions = function () {
    syncCompanionsHeaderCount();
    if (typeof state !== "undefined" && state.scene === "companions") {
      const box = document.querySelector("[data-scene-body]");
      if (box && !(state.magicOpen && typeof showMagicUi === "function" && showMagicUi())) {
        box.innerHTML = renderCompanionsBody();
      }
    }
    if (typeof renderVitals === "function" && state && state.scene !== "companions") {
      /* chip text is updated in syncCompanionsHeaderCount */
    }
  };
  function refreshLive() {
    if (typeof state !== "undefined" && state.dialog && typeof LIVE !== "undefined" && LIVE[state.dialog] && typeof renderLiveDialog === "function") {
      renderLiveDialog(state.dialog);
    }
  }
  const _onCompClick0 = onCompClick;
  onCompClick = function (e) {
    const t = e.target.closest && e.target.closest("[data-comp-act],[data-comp-filter],[data-comp-toggle],[data-toggle-comp-menu],[data-companion-hp-step],[data-companion-hp-open],[data-companion-hp-apply],[data-companion-roll],[data-companion-cond],[data-companion-cond-x],[data-companion-dismiss],[data-companion-summon],[data-companion-mount],[data-comp-death],[data-comp-death-roll],[data-toggle-card]");
    if (!t) { _onCompClick0(e); return; }
    const c = ensureCompanionsState();
    const row = cardComp(t);
    if (t.hasAttribute("data-toggle-comp-menu")) {
      state.compMenuOpen = !state.compMenuOpen;
      renderCompanions(); e.stopPropagation(); return;
    }
    if (t.closest && t.closest("[data-scene-menu]")) state.compMenuOpen = false;
    if (t.hasAttribute("data-comp-act") && t.getAttribute("data-comp-act") === "collapse-all") {
      c.openId = ""; c.openIds = {}; renderCompanions(); e.stopPropagation(); return;
    }
    if (t.hasAttribute("data-comp-act") && t.getAttribute("data-comp-act") === "expand-all") {
      c.openIds = {};
      visibleCompanions().forEach(function (r) { c.openIds[r.id] = true; });
      c.openId = visibleCompanions()[0] ? visibleCompanions()[0].id : "";
      renderCompanions(); e.stopPropagation(); return;
    }
    if (t.hasAttribute("data-companion-hp-step") && row) {
      const delta = Number(t.getAttribute("data-companion-hp-step")) || 0;
      const res = applyHpToComp(row, delta < 0 ? "damage" : "heal", Math.abs(delta));
      if (res.dropForm) { dismissForm(row, res.overflow); return; }
      renderCompanions(); e.stopPropagation(); return;
    }
    if (t.hasAttribute("data-companion-hp-open") && row) {
      const pop = t.closest("[data-companion-hp]") && t.closest("[data-companion-hp]").querySelector("[data-companion-pop='hp']");
      if (pop) pop.hidden = !pop.hidden;
      e.stopPropagation(); return;
    }
    if (t.hasAttribute("data-companion-hp-apply") && row) {
      const kind = t.getAttribute("data-companion-hp-apply");
      const root = t.closest("[data-companion-hp]");
      const inp = root && root.querySelector("[data-companion-hp-amt]");
      const n = inp ? Number(inp.value) : 0;
      const res = applyHpToComp(row, kind, n);
      if (res.dropForm) { dismissForm(row, res.overflow); return; }
      renderCompanions(); e.stopPropagation(); return;
    }
    if (t.hasAttribute("data-companion-roll") && row) {
      const typ = t.getAttribute("data-companion-roll");
      const mod = Number(t.getAttribute("data-mod")) || 0;
      const label = t.getAttribute("data-label") || typ;
      const d20 = 1 + Math.floor(Math.random() * 20);
      toast(row.name + " · " + label + ": к20 (" + d20 + ") " + signedMod(mod) + " → " + (d20 + mod));
      e.stopPropagation(); return;
    }
    if (t.hasAttribute("data-companion-cond") && row) {
      const id = t.getAttribute("data-companion-cond");
      row.conditions = row.conditions || [];
      const i = row.conditions.indexOf(id);
      if (i >= 0) row.conditions.splice(i, 1); else row.conditions.push(id);
      renderCompanions(); e.stopPropagation(); return;
    }
    if (t.hasAttribute("data-companion-cond-x") && row) {
      const id = t.getAttribute("data-companion-cond-x");
      row.conditions = (row.conditions || []).filter(function (x) { return x !== id; });
      renderCompanions(); e.stopPropagation(); return;
    }
    if (t.hasAttribute("data-companion-dismiss") && row) {
      if (isPermanentAlly(row)) { row.active = false; row.away = true; }
      else { row.active = false; }
      renderCompanions(); toast(row.name + " отпущен"); e.stopPropagation(); return;
    }
    if (t.hasAttribute("data-companion-summon") && row) {
      row.active = true; row.away = false;
      if (row.hp <= 0 && row.hp_max) row.hp = row.hp_max;
      row.deathOk = 0; row.deathFail = 0;
      renderCompanions(); toast(row.name + " снова призван"); e.stopPropagation(); return;
    }
    if (t.hasAttribute("data-companion-mount") && row) {
      row.mounted = !row.mounted; renderCompanions(); e.stopPropagation(); return;
    }
    if (t.hasAttribute("data-comp-death") && row) {
      const kind = t.getAttribute("data-comp-death");
      const i = Number(t.getAttribute("data-i")) || 0;
      if (kind === "ok") row.deathOk = (row.deathOk >= i) ? (i - 1) : i;
      else row.deathFail = (row.deathFail >= i) ? (i - 1) : i;
      if (row.deathOk >= 3) toast(row.name + " стабилизирован");
      if (row.deathFail >= 3) toast(row.name + " погиб");
      renderCompanions(); e.stopPropagation(); return;
    }
    if (t.hasAttribute("data-comp-death-roll") && row) {
      const d20 = 1 + Math.floor(Math.random() * 20);
      let extra = "";
      if (d20 === 1) { row.deathFail = Math.min(3, (row.deathFail || 0) + 2); extra = " — крит. провал"; }
      else if (d20 === 20) { row.hp = 1; row.deathOk = 0; row.deathFail = 0; extra = " — 1 хит"; }
      else if (d20 >= 10) { row.deathOk = Math.min(3, (row.deathOk || 0) + 1); }
      else { row.deathFail = Math.min(3, (row.deathFail || 0) + 1); }
      if (row.deathOk >= 3) extra = " — стабилизирован";
      if (row.deathFail >= 3) extra = " — гибель";
      toast(row.name + " · спас от смерти: к20 (" + d20 + ")" + extra);
      renderCompanions(); e.stopPropagation(); return;
    }
    _onCompClick0(e);
  };
  function applyCompanionsForDemoChar(id) {
    const charId = id || (sheet && (sheet.id || sheet.charId)) || "kaedrin";
    sheet.comp = companionsForChar(charId);
    if (charId === "brana") {
      /* already set in companionsForChar */
    }
    if (typeof state !== "undefined") state.compMenuOpen = false;
    registerCompanionLive();
    syncCompanionsHeaderCount();
  }
  function setCompanions(opts) {
    opts = opts || {};
    ensureCompanionsState();
    const c = sheet.comp;
    if (opts.filter) c.filter = opts.filter;
    if (opts.openId) c.openId = opts.openId;
    if (opts.applyForm) {
      const pick = bestiaryBySlug(opts.applyForm);
      if (pick) {
        applySelfForm(pick, { form_source: "wild_shape", ref: "wild_shape:" + pick.slug, labelRu: "Дикий облик", sourceKind: "class", feature: "wild_shape", duration: 180 });
        if (!c.wild) c.wild = { used: 1, max: 2 };
        else c.wild.used = Math.max(c.wild.used || 0, 1);
        if (opts.openId == null) c.openId = "form-self";
      }
    }
    if (opts.openId === "") { c.openId = ""; c.openIds = {}; }
    if (opts.deathSaves) {
      c.openIds = c.openIds || {};
      (c.list || []).forEach(function (row) {
        if (!companionUsesDeathSaves(row)) return;
        row.hp = 0;
        row.deathOk = Number(row.deathOk) || 0;
        row.deathFail = Number(row.deathFail) || 0;
        c.openIds[row.id] = true;
        if (!c.openId) c.openId = row.id;
      });
    }
    if (opts.menu != null) state.compMenuOpen = !!opts.menu;
    if (opts.fork) { state.scene = "companions"; state.compMenuOpen = false; openDialog("companion-add-fork"); return; }
    if (opts.dialog) { state.scene = "companions"; state.compMenuOpen = false; openDialog(opts.dialog); return; }
    if (opts.scene) state.scene = opts.scene;
    render();
  }

  if (!window.__compListeners) {
    window.__compListeners = true;
    document.addEventListener("click", function (e) {
      if (state.compMenuOpen && !(e.target.closest && e.target.closest(".explore-head__tools"))) {
        state.compMenuOpen = false;
        renderCompanions();
      }
      if (e.target.closest && e.target.closest("[data-comp-act],[data-comp-filter],[data-comp-toggle],[data-toggle-comp-menu],[data-companion-hp-step],[data-companion-hp-open],[data-companion-hp-apply],[data-companion-roll],[data-companion-cond],[data-companion-cond-x],[data-companion-dismiss],[data-companion-summon],[data-companion-mount],[data-comp-death],[data-comp-death-roll]")) {
        onCompClick(e);
      }
    });
    document.addEventListener("input", onCompInput);
    document.addEventListener("change", onCompInput);
  }

  window.SheetCompanions = {
    renderBody: renderCompanionsBody,
    applyForDemoChar: applyCompanionsForDemoChar,
    setCompanions: setCompanions,
    syncHeader: syncCompanionsHeaderCount,
    usesDeathSaves: companionUsesDeathSaves
  };
