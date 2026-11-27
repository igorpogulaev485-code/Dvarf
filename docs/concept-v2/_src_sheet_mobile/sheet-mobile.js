(function () {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const html = document.documentElement;

  const ABILITY = {
    str: "СИЛ", dex: "ЛОВ", con: "ТЕЛ", int: "ИНТ", wis: "МДР", cha: "ХАР"
  };
  const SCENES = [
    { id: "combat", short: "Бой", full: "Бой" },
    { id: "explore", short: "Исслед.", full: "Исследование" },
    { id: "social", short: "Общение", full: "Общение" },
    { id: "companions", short: "Напарн.", full: "Напарники" },
    { id: "features", short: "Способн.", full: "Способности" }
  ];
  const COIN_META = [
    { key: "pp", name: "Платина", short: "пм" },
    { key: "gp", name: "Золото", short: "зм" },
    { key: "ep", name: "Электрум", short: "эм" },
    { key: "sp", name: "Серебро", short: "см" },
    { key: "cp", name: "Медь", short: "мм" }
  ];
  const CONDITIONS = ["Отравленный","Испуганный","Опрокинутый","Оглушённый","Ослеплённый","Схваченный","Опутанный","Недееспособный","Окаменевший","Невидимый","Очарованный","Парализованный"];
  const DICE = [20, 12, 10, 8, 6, 4, 100];
  const HIT_DIE = { cleric: 8, barbarian: 12, wizard: 6, druid: 8, paladin: 10, fighter: 10, ranger: 10, bard: 8, rogue: 8, sorcerer: 6, warlock: 8, monk: 8 };

  function pbFromLevel(level) {
    const n = Number(level) || 1;
    return 2 + Math.ceil((n - 4) / 4);
  }
  function modOf(score) { return Math.floor(((Number(score) || 10) - 10) / 2); }
  function fmtMod(n) { const v = Number(n) || 0; return (v >= 0 ? "+" : "") + v; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c])); }
  function nb(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f"); }
  function fmtNum(n) { return nb(n); }
  function initialsOf(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "—";
    return parts.slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  const DEMO_CHARS = {
    kaedrin: {
      id: "kaedrin",
      name: "Каэдрин Солнечный Щит",
      race: "Горный дварф",
      alignment: "законопослушный добрый",
      background: "Прислужник",
      edition: "2014",
      classes: [{ id: "cleric", name: "Жрец", subclass: "Жизнь", level: 5 }],
      level: 5, nextLevel: 6, xp: 6500, xpNext: 14000,
      hp: 38, hpMax: 38,
      abilityBase: { str: 16, dex: 12, con: 15, int: 10, wis: 16, cha: 13 },
      acArmor: 16, acUsesDex: false, acDexMax: null, acUnarmoredDefense: null, shield: true, shieldAvailable: true,
      speeds: { walk: 25, climb: 0, swim: 0, fly: 0 },
      hitDice: { cleric: { die: 8, max: 5, cur: 5 } },
      slots: { 1: { cur: 4, max: 4 }, 2: { cur: 3, max: 3 }, 3: { cur: 2, max: 2 } },
      channel: { name: "Божественный канал", cur: 1, max: 1 },
      poisonResist: true,
      hpLevels: [
        { level: 1, label: "Жрец 1", die: 8, used: 8, con: 2, trait: 0, traitName: "", total: 10 },
        { level: 2, label: "Жрец 2", die: 8, used: 5, con: 2, trait: 0, traitName: "", total: 7 },
        { level: 3, label: "Жрец 3", die: 8, used: 5, con: 2, trait: 0, traitName: "", total: 7 },
        { level: 4, label: "Жрец 4", die: 8, used: 5, con: 2, trait: 0, traitName: "", total: 7 },
        { level: 5, label: "Жрец 5", die: 8, used: 5, con: 2, trait: 0, traitName: "", total: 7 }
      ],
      caster: true,
      companions: 0,
      coins: { pp: 0, gp: 12, ep: 0, sp: 0, cp: 0 },
      gender: "male"
    },
    gorn: {
      id: "gorn",
      name: "Горн Каменный Клык",
      race: "Полуорк",
      alignment: "хаотичный нейтральный",
      background: "Солдат",
      edition: "2014",
      classes: [{ id: "barbarian", name: "Варвар", subclass: "Берсерк", level: 5 }],
      level: 5, nextLevel: 6, xp: 6500, xpNext: 14000,
      hp: 50, hpMax: 50,
      abilityBase: { str: 16, dex: 14, con: 16, int: 8, wis: 12, cha: 10 },
      acArmor: 10, acUsesDex: true, acDexMax: null, acUnarmoredDefense: "con", shield: false, shieldAvailable: false,
      speeds: { walk: 30, climb: 0, swim: 0, fly: 0 },
      hitDice: { barbarian: { die: 12, max: 5, cur: 5 } },
      slots: {},
      channel: null,
      poisonResist: false,
      hpLevels: [
        { level: 1, label: "Варвар 1", die: 12, used: 12, con: 3, trait: 0, traitName: "", total: 15 },
        { level: 2, label: "Варвар 2", die: 12, used: 7, con: 3, trait: 0, traitName: "", total: 10 },
        { level: 3, label: "Варвар 3", die: 12, used: 7, con: 3, trait: 0, traitName: "", total: 10 },
        { level: 4, label: "Варвар 4", die: 12, used: 7, con: 3, trait: 0, traitName: "", total: 10 },
        { level: 5, label: "Варвар 5", die: 12, used: 7, con: 3, trait: 0, traitName: "", total: 10 }
      ],
      caster: false,
      companions: 0,
      coins: { pp: 0, gp: 8, ep: 0, sp: 4, cp: 0 },
      gender: "male"
    },
    ilis: {
      id: "ilis",
      name: "Илис Чернильный",
      race: "Высший эльф",
      alignment: "нейтральный",
      background: "Мудрец",
      edition: "2014",
      classes: [{ id: "wizard", name: "Волшебник", subclass: "Преобразование", level: 10 }],
      level: 10, nextLevel: 11, xp: 64000, xpNext: 85000,
      hp: 62, hpMax: 62,
      abilityBase: { str: 8, dex: 16, con: 14, int: 18, wis: 12, cha: 10 },
      acArmor: 10, acUsesDex: true, acDexMax: null, acUnarmoredDefense: null, shield: false, shieldAvailable: false,
      speeds: { walk: 30, climb: 0, swim: 0, fly: 0 },
      hitDice: { wizard: { die: 6, max: 10, cur: 10 } },
      slots: { 1: { cur: 4, max: 4 }, 2: { cur: 3, max: 3 }, 3: { cur: 3, max: 3 }, 4: { cur: 3, max: 3 }, 5: { cur: 2, max: 2 } },
      channel: null,
      poisonResist: false,
      hpLevels: [],
      caster: true,
      companions: 1,
      coins: { pp: 2, gp: 40, ep: 0, sp: 0, cp: 0 },
      gender: "male"
    }
  };

  DEMO_CHARS.kaedrin.skills = { religion: { p: 1 }, insight: { p: 1 }, medicine: { p: 1 }, persuasion: { p: 1 } };
  DEMO_CHARS.kaedrin.attacks = [
    { id: "warhammer", name: "Боевой молот", source: "inventory", sourceRu: "Из инвентаря", ability: "str", abilityRu: "Сила", bonus: 7, damage: "1к8+4", dtype: "дробящий", proficient: true, held: true, qty: null, hidden: false, hitMod: 0, dmgMod: 0, activation: null, icon: "wp-hammer", meta: "молот · 5 фт · универсальное", tip: "Боевой молот · дробящий 1к8+4 · воинское, универсальное", ammoName: "", fav: false },
    { id: "longbow", name: "Длинный лук", source: "inventory", sourceRu: "Из инвентаря", ability: "dex", abilityRu: "Ловкость", bonus: 6, damage: "1к8+3", dtype: "колющий", proficient: true, held: false, qty: 20, ammoName: "Стрелы", hidden: false, hitMod: 0, dmgMod: 0, activation: null, icon: "wp-bow", meta: "луки · 150/600 фт · двуручное", tip: "Длинный лук · колющий 1к8+3 · воинское, боеприпас, двуручное", fav: false },
    { id: "spear", name: "Копьё", source: "inventory", sourceRu: "Из инвентаря", ability: "str", abilityRu: "Сила", bonus: 7, damage: "1к6+4", dtype: "колющий", proficient: true, held: false, qty: null, hidden: false, hitMod: 0, dmgMod: 0, activation: null, icon: "wp-spear", meta: "копьё · 20/60 фт · метательное", tip: "Копьё · колющий 1к6+4 · простое, метательное", ammoName: "", fav: false },
    { id: "crossbow", name: "Лёгкий арбалет", source: "inventory", sourceRu: "Из инвентаря", ability: "dex", abilityRu: "Ловкость", bonus: 4, damage: "1к8+1", dtype: "колющий", proficient: true, held: false, qty: 20, ammoName: "Болты арбалета", hidden: false, hitMod: 0, dmgMod: 0, activation: null, icon: "wp-crossbow", meta: "арбалет · 80/320 фт · двуручное", tip: "Лёгкий арбалет · колющий 1к8+1 · простое, боеприпас", fav: false }
  ];
  DEMO_CHARS.kaedrin.consumables = [
    { id: "potion", name: "Зелье лечения", qty: 2, fav: true, note: "2к4+2 хитов" },
    { id: "holy", name: "Святая вода", qty: 1, fav: false, note: "2к6 излучение по нежити" },
    { id: "acid", name: "Флакон кислоты", qty: 1, fav: false, note: "2к6 кислота" }
  ];

  DEMO_CHARS.aren = {
    id: "aren",
    name: "Арен Сталеклят",
    race: "Человек",
    alignment: "законопослушный добрый",
    background: "Солдат",
    edition: "2014",
    classes: [{ id: "paladin", name: "Паладин", subclass: "Преданность", level: 5 }],
    level: 5, nextLevel: 6, xp: 6500, xpNext: 14000,
    hp: 44, hpMax: 44,
    abilityBase: { str: 16, dex: 10, con: 14, int: 8, wis: 12, cha: 16 },
    acArmor: 16, acUsesDex: false, acDexMax: null, acUnarmoredDefense: null, shield: true, shieldAvailable: true,
    speeds: { walk: 30, climb: 0, swim: 0, fly: 0 },
    hitDice: { paladin: { die: 10, max: 5, cur: 5 } },
    slots: { 1: { cur: 4, max: 4 }, 2: { cur: 2, max: 2 } },
    channel: { name: "Божественный канал", cur: 1, max: 1 },
    poisonResist: false,
    hpLevels: [],
    caster: true,
    companions: 0,
    coins: { pp: 0, gp: 15, ep: 0, sp: 0, cp: 0 },
    gender: "male",
    skills: { athletics: { p: 1 }, intimidation: { p: 1 }, persuasion: { p: 1 }, insight: { p: 1 } },
    attacks: [
      { id: "longsword", name: "Длинный меч", source: "inventory", sourceRu: "Из инвентаря", ability: "str", abilityRu: "Сила", bonus: 6, damage: "1к8+3", dtype: "рубящий", proficient: true, held: true, qty: null, hidden: false, icon: "wp-sword", meta: "меч · 5 фт · универсальное", tip: "Длинный меч · рубящий 1к8 · воинское, универсальное", ammoName: "", fav: false },
      { id: "javelin", name: "Метательные копья", source: "inventory", sourceRu: "Из инвентаря", ability: "str", abilityRu: "Сила", bonus: 6, damage: "1к6+3", dtype: "колющий", proficient: true, held: false, qty: 5, hidden: false, icon: "wp-spear", meta: "копьё · 30/120 фт · метательное", tip: "Метательные копья · колющий 1к6 · простое, метательное", ammoName: "", fav: false }
    ],
    consumables: [{ id: "potion", name: "Зелье лечения", qty: 2, fav: true, note: "2к4+2 хитов" }]
  };

  DEMO_CHARS.nilla = {
    id: "nilla",
    name: "Нилла Тихоступ",
    race: "Легконогий полурослик",
    alignment: "нейтральный",
    background: "Бродяга",
    edition: "2014",
    classes: [{ id: "rogue", name: "Плут", subclass: "Вор", level: 5 }],
    level: 5, nextLevel: 6, xp: 6500, xpNext: 14000,
    hp: 33, hpMax: 33,
    abilityBase: { str: 8, dex: 16, con: 14, int: 12, wis: 13, cha: 12 },
    acArmor: 11, acUsesDex: true, acDexMax: null, acUnarmoredDefense: null, shield: false, shieldAvailable: false,
    speeds: { walk: 25, climb: 0, swim: 0, fly: 0 },
    hitDice: { rogue: { die: 8, max: 5, cur: 5 } },
    slots: {},
    channel: null,
    poisonResist: false,
    hpLevels: [],
    caster: false,
    companions: 0,
    coins: { pp: 0, gp: 9, ep: 0, sp: 6, cp: 0 },
    gender: "female",
    skills: { stealth: { p: 2 }, sleight: { p: 2 }, perception: { p: 1 }, acrobatics: { p: 1 }, investigation: { p: 1 }, persuasion: { p: 1 } },
    attacks: [
      { id: "rapier", name: "Рапира", source: "inventory", sourceRu: "Из инвентаря", ability: "dex", abilityRu: "Ловкость", bonus: 6, damage: "1к8+3", dtype: "колющий", proficient: true, held: true, qty: null, hidden: false, icon: "wp-sword", meta: "рапира · 5 фт · фехтовальное", tip: "Рапира · колющий 1к8 · воинское, фехтовальное", ammoName: "", fav: false },
      { id: "shortbow", name: "Короткий лук", source: "inventory", sourceRu: "Из инвентаря", ability: "dex", abilityRu: "Ловкость", bonus: 6, damage: "1к6+3", dtype: "колющий", proficient: true, held: false, qty: 20, ammoName: "Стрелы", hidden: false, icon: "wp-bow", meta: "луки · 80/320 фт · двуручное", tip: "Короткий лук · колющий 1к6 · простое, боеприпас", fav: false },
      { id: "dagger", name: "Кинжалы", source: "inventory", sourceRu: "Из инвентаря", ability: "dex", abilityRu: "Ловкость", bonus: 6, damage: "1к4+3", dtype: "колющий", proficient: true, held: false, qty: 2, hidden: false, icon: "wp-dagger", meta: "кинжал · 20/60 фт · фехтовальное, метательное", tip: "Кинжалы · колющий 1к4 · простое, фехтовальное", ammoName: "", fav: false }
    ],
    consumables: [{ id: "potion", name: "Зелье лечения", qty: 2, fav: true, note: "2к4+2 хитов" }]
  };



  const state = {
    collapsed: true,
    scene: "explore",
    magicOpen: false,
    dialog: null,
    moreOpen: false,
    banner: false,
    saveStatus: "saved",
    inspiration: false,
    heroic: false,
    exhaustion: 0,
    hpTemp: 0,
    deathOk: 0,
    deathFail: 0,
    conditions: [],
    effects: [],
    padDigits: "",
    padMode: "dmg",
    restKind: "short",
    diceKind: 20,
    diceMod: 0,
    diceResult: "",
    board: null,
    walletMode: "add",
    walletDraft: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
    avatarMode: "initials",
    adv: "norm",
    luck: 0,
    rolls: [],
    diceTable: false,
    master: false,
    inSession: false,
    initSubmitted: false,
    actionTab: null,
    moreTurn: false,
    used: { action: false, bonus: false, reaction: false },
    weaponMode: {},
    customNumber: "",
    target: "",
    concentration: null,
    extraKind: null,
    extraTitle: "",
    breakId: "",
    itemId: "",
    resourceId: "",
    compMenuOpen: false,
    featMenuOpen: false,
    combatPane: "attacks",
    spellFilter: "all",
    circleFilter: "",
    spellQuery: "",
    spellOrder: {},
    circlesCollapsed: false,
    collapsedCircles: {},
    expandedSpell: "",
    prepareTab: "prepared",
    customSpellDraft: { name: "", level: 1, ritual: false, concentration: false, text: "" },
    settingsAdvanced: false,
    concPending: null,
    castSpellId: "",
    castPath: "slot",
    castSlot: 0,
    grimoireCaster: "",
    bookLost: false
  };

  let sheet = {};
  let toastTimer = 0;


  DEMO_CHARS.ilis.skills = { arcana: { p: 1 }, investigation: { p: 1 }, history: { p: 1 }, insight: { p: 1 } };

  DEMO_CHARS.sira = {
    id: "sira",
    name: "Сира Пепельная",
    race: "Человек",
    alignment: "хаотичный добрый",
    background: "Артист",
    edition: "2014",
    classes: [{ id: "sorcerer", name: "Чародей", subclass: "Дикая магия", level: 5 }],
    level: 5, nextLevel: 6, xp: 6500, xpNext: 14000,
    hp: 32, hpMax: 32,
    abilityBase: { str: 8, dex: 14, con: 14, int: 10, wis: 12, cha: 16 },
    acArmor: 10, acUsesDex: true, acDexMax: null, acUnarmoredDefense: null, shield: false, shieldAvailable: false,
    speeds: { walk: 30, climb: 0, swim: 0, fly: 0 },
    hitDice: { sorcerer: { die: 6, max: 5, cur: 5 } },
    slots: { 1: { cur: 4, max: 4 }, 2: { cur: 3, max: 3 }, 3: { cur: 2, max: 2 } },
    sorcery: { cur: 5, max: 5 },
    channel: null,
    poisonResist: false,
    hpLevels: [],
    caster: true,
    companions: 0,
    coins: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
    gender: "female",
    skills: { arcana: { p: 1 }, persuasion: { p: 1 }, deception: { p: 1 }, insight: { p: 1 } }
  };

  DEMO_CHARS.brana = {
    id: "brana",
    name: "Брана Дубощит",
    race: "Лесной эльф",
    alignment: "нейтральный добрый",
    background: "Отшельник",
    edition: "2014",
    classes: [{ id: "druid", name: "Друид", subclass: "Луна", level: 7 }],
    level: 7, nextLevel: 8, xp: 23000, xpNext: 34000,
    hp: 52, hpMax: 52,
    abilityBase: { str: 10, dex: 16, con: 14, int: 12, wis: 16, cha: 10 },
    saves: { str: false, dex: false, con: false, int: true, wis: true, cha: false },
    skills: { nature: { p: 1 }, perception: { p: 1 }, survival: { p: 1 }, animal: { p: 1 } },
    acArmor: 12, acUsesDex: true, acDexMax: 2, acUnarmoredDefense: null, shield: true, shieldAvailable: true,
    speeds: { walk: 35, climb: 0, swim: 0, fly: 0 },
    darkvision: 60,
    hitDice: { druid: { die: 8, max: 7, cur: 7 } },
    slots: { 1: { cur: 4, max: 4 }, 2: { cur: 3, max: 3 }, 3: { cur: 3, max: 3 }, 4: { cur: 1, max: 1 } },
    channel: null,
    poisonResist: false,
    hpLevels: [],
    caster: true,
    companions: 0,
    coins: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
    gender: "female"
  };

  function applyPreset(id) {
    const preset = DEMO_CHARS[id] || DEMO_CHARS.kaedrin;
    sheet = clone(preset);
    sheet.hpTemp = 0;
    sheet.deathOk = 0;
    sheet.deathFail = 0;
    state.hpTemp = 0;
    state.deathOk = 0;
    state.deathFail = 0;
    state.inspiration = false;
    state.heroic = false;
    state.exhaustion = 0;
    state.conditions = [];
    state.effects = [];
    state.padDigits = "";
    state.padMode = "dmg";
    state.diceResult = "";
    state.diceKind = 20;
    state.diceMod = 0;
    state.walletMode = "add";
    state.walletDraft = { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };
    state.avatarMode = "initials";
    if (!sheet.edition) sheet.edition = "2014";
    if (!Array.isArray(sheet.modifiers)) sheet.modifiers = [];
    if (sheet.masterFeat == null) sheet.masterFeat = "";
    if (sheet.homebrew == null) sheet.homebrew = "";
    if (sheet.avatarMode == null) sheet.avatarMode = state.avatarMode || "initials";
    if (sheet.initOverride == null) sheet.initOverride = "";
    if (!Array.isArray(sheet.xpLog)) sheet.xpLog = [];
    if (!sheet.speeds) sheet.speeds = { walk: 25, climb: 0, swim: 0, fly: 0 };
    ["climb","swim","fly"].forEach((k) => { if (sheet.speeds[k] == null) sheet.speeds[k] = 0; });
    if (sheet.speeds) delete sheet.speeds.burrow;
    sheet.skills = sheet.skills ? clone(sheet.skills) : {};
    sheet.attacks = sheet.attacks ? clone(sheet.attacks) : [];
    sheet.consumables = sheet.consumables ? clone(sheet.consumables) : [];
    state.adv = "norm";
    state.luck = Number(sheet.luckPoints) || 0;
    state.rolls = [];
    state.diceTable = false;
    state.master = false;
    state.inSession = false;
    state.initSubmitted = false;
    state.actionTab = null;
    state.moreTurn = false;
    state.used = { action: false, bonus: false, reaction: false };
    state.weaponMode = {};
    state.customNumber = "";
    state.target = "";
    state.concentration = null;
    state.extraKind = null;
    state.extraTitle = "";
    state.breakId = "";
    state.itemId = "";
    state.resourceId = "";
    resetMagicUi();
    applyMagicLoadout(sheet.id);
    state.abilOpen = false;
    state.abilOrder = ["str","dex","con","int","wis","cha"];
    state.abilCollapsed = {};
    state.ownCollapsed = true;
    state.laterOpen = false;
    state.ownMore = null;
    state.ownDraftWeapon = "";
    state.ownDraftTool = "";
    state.ownDraftLang = "";
    state.skillKey = "";
    if (typeof ensureAbilityState === "function") ensureAbilityState();
    if (typeof applyExploreForDemoChar === "function") applyExploreForDemoChar(id);
    if (typeof applyCompanionsForDemoChar === "function") applyCompanionsForDemoChar(id);
    if (typeof syncClassItemsFromSheet === "function") syncClassItemsFromSheet();
    if (typeof applyFeaturesForDemoChar === "function") applyFeaturesForDemoChar(id);
    if (window.SheetFeatures && typeof window.SheetFeatures.applyForDemoChar === "function") window.SheetFeatures.applyForDemoChar(id);
    state.compMenuOpen = false;
    state.featMenuOpen = false;
    if (window.SheetMobile) window.SheetMobile.sheet = sheet;
  }

  function baseScoreOf(key) {
    const n = Number((sheet.abilityBase || {})[key]);
    return Number.isFinite(n) ? Math.min(30, Math.max(1, Math.trunc(n))) : 10;
  }
  function baseFormulaVars() {
    const pbn = typeof pb === "function" ? pb() : 3;
    const vars = { PROF: pbn, HALF_PROF: Math.floor(pbn / 2), LVL: Math.max(1, sheet.level || 1) };
    ["str", "dex", "con", "int", "wis", "cha"].forEach((key) => {
      vars[key.toUpperCase()] = modOf(baseScoreOf(key));
    });
    return vars;
  }
  function scoreTotal(key) {
    const base = baseScoreOf(key);
    let total = base;
    if (typeof applyBonusStack === "function") {
      total = applyBonusStack(base, bonusesFor(key + "_score"), baseFormulaVars()).total;
    }
    const bonus = (typeof gearScoreBonus === "function") ? Number(gearScoreBonus(key)) || 0 : 0;
    return Math.min(30, Math.max(1, total + bonus));
  }
  function ability(key) { return modOf(scoreTotal(key)); }
  function pb() { return pbFromLevel(sheet.level); }
  function shieldOn() { return !!sheet.shield; }
  function acCore() {
    let ac;
    if (sheet.acUnarmoredDefense) {
      ac = 10 + ability("dex") + ability(sheet.acUnarmoredDefense);
    } else if (sheet.acUsesDex) {
      let d = ability("dex");
      if (sheet.acDexMax != null) d = Math.min(d, sheet.acDexMax);
      ac = (Number(sheet.acArmor) || 10) + d;
    } else {
      ac = Number(sheet.acArmor) || 10;
    }
    if (shieldOn()) ac += 2;
    if (typeof gearAcBonus === "function") ac += Number(gearAcBonus()) || 0;
    if (typeof effectAcBonus === "function") ac += effectAcBonus();
    return ac;
  }
  function acTotal() {
    if (typeof applyBonusStack === "function") return applyBonusStack(acCore(), bonusesFor("ac"), formulaVars()).total;
    return acCore();
  }
  function initAuto() { return ability("dex"); }
  function initCore() {
    if (sheet.initOverride != null && sheet.initOverride !== "") return Number(sheet.initOverride) || 0;
    return initAuto();
  }
  function initTotal() {
    if (typeof applyBonusStack === "function") return applyBonusStack(initCore(), bonusesFor("initiative"), formulaVars()).total;
    return initCore();
  }
  function walkBase() { return Number(sheet.speeds && sheet.speeds.walk) || 0; }
  function walkTotal() {
    let total = walkBase();
    if (typeof applyBonusStack === "function") total = applyBonusStack(total, bonusesFor("speed"), formulaVars()).total;
    if (typeof gearBonusSum === "function") total += Number(gearBonusSum("speed")) || 0;
    return total;
  }
  function signed(n) { return fmtMod(n); }
  const SHEET_VAR_DEFS = [
    { key: "STR", labelRu: "Сила (мод)", hintRu: "модификатор" },
    { key: "DEX", labelRu: "Ловкость (мод)", hintRu: "модификатор" },
    { key: "INT", labelRu: "Интеллект (мод)", hintRu: "модификатор" },
    { key: "WIS", labelRu: "Мудрость (мод)", hintRu: "модификатор" },
    { key: "CON", labelRu: "Телосложение (мод)", hintRu: "модификатор" },
    { key: "CHA", labelRu: "Харизма (мод)", hintRu: "модификатор" },
    { key: "PROF", labelRu: "Бонус мастерства", hintRu: "БМ" },
    { key: "HALF_PROF", labelRu: "½ БМ (вниз)", hintRu: "floor(БМ/2)" },
    { key: "LVL", labelRu: "Уровень персонажа", hintRu: "сумма классов" }
  ];
  function formulaVars() {
    const pbn = typeof pb === "function" ? pb() : 3;
    const vars = { PROF: pbn, HALF_PROF: Math.floor(pbn / 2), LVL: Math.max(1, sheet.level || 1) };
    ["str", "dex", "con", "int", "wis", "cha"].forEach((key) => {
      vars[key.toUpperCase()] = ability(key);
    });
    return vars;
  }
  function evalArithmetic(expr) {
    const cleaned = String(expr).replace(/\s+/g, "");
    if (!cleaned) return { ok: false, error: "Пустая формула" };
    if (!/^[0-9+\-*/().]+$/.test(cleaned)) return { ok: false, error: "Только числа и + − * / ( )" };
    try {
      const value = Function('"use strict"; return (' + cleaned + ");")();
      if (typeof value !== "number" || !Number.isFinite(value)) return { ok: false, error: "Нечисловой результат" };
      return { ok: true, value: Math.trunc(value) };
    } catch (err) {
      return { ok: false, error: "Не удалось посчитать" };
    }
  }
  function evalFormula(expr, vars) {
    const raw = String(expr || "").trim();
    if (!raw) return { ok: false, error: "Пустая формула" };
    if (/^[+-]?\d+$/.test(raw)) return { ok: true, value: Math.trunc(Number(raw)) };
    let out = "", last = 0;
    const re = /\[([A-Za-z_][A-Za-z0-9_]*)\]/g;
    let match;
    while ((match = re.exec(raw))) {
      const key = match[1].toUpperCase();
      out += raw.slice(last, match.index);
      if (!vars || !(key in vars) || !Number.isFinite(vars[key])) {
        return { ok: false, error: "Нет показателя [" + key + "]" };
      }
      const n = vars[key];
      out += n < 0 ? "(" + n + ")" : String(n);
      last = match.index + match[0].length;
    }
    out += raw.slice(last);
    return evalArithmetic(out);
  }
  function bonusesFor(target) {
    return (sheet.modifiers || []).filter((row) => row.target === target);
  }
  function applyBonusStack(base, lines, vars) {
    let total = Math.trunc(base);
    const applied = [];
    (lines || []).forEach((line) => {
      if (!line.enabled) return;
      const result = evalFormula(line.expr, vars);
      if (!result.ok) { applied.push({ line, value: 0, ok: false, error: result.error }); return; }
      if (line.op === "=") total = result.value;
      else if (line.op === "-") total -= result.value;
      else total += result.value;
      applied.push({ line, value: result.value, ok: true });
    });
    return { total: Math.trunc(total), applied };
  }
  function formatBonusSummary(applied) {
    return (applied || []).filter((row) => row.ok && row.line.enabled).map((row) => {
      const sign = row.line.op === "=" ? "=" : (row.line.op === "-" ? "−" : "+");
      const name = (row.line.label || "").trim() || "бонус";
      return name + " " + sign + Math.abs(row.value);
    }).join(" · ");
  }
  function createBonus(target, patch) {
    sheet._bid = (sheet._bid || 0) + 1;
    const speed = String(target).indexOf("speed") === 0;
    return Object.assign({
      id: "b" + sheet._bid,
      target: target,
      label: "Бонус",
      op: "+",
      expr: speed ? "10" : "1",
      enabled: true
    }, patch || {});
  }
  function insertToken(expr, token, caret) {
    const src = String(expr || "");
    const trimmed = src.trim();
    if (!trimmed) return token;
    const needsOpBefore = function (left, right) {
      return /[0-9)]$/.test(left) && right && !/^[+\-*/)]/.test(right);
    };
    const needsOpAfter = function (left, right) {
      return left && /[0-9([]/.test(right || "") && !/[+\-*/(]$/.test(left);
    };
    if (caret == null || caret < 0 || caret > src.length) {
      return needsOpBefore(trimmed, token) ? trimmed + "+" + token : trimmed + token;
    }
    const left = src.slice(0, caret);
    const right = src.slice(caret);
    let mid = token;
    if (needsOpBefore(left, token)) mid = "+" + mid;
    if (needsOpAfter(token, right)) mid = mid + "+";
    mid = mid.replace(/\+\+/g, "+");
    return left + mid + right;
  }
  function effectAcBonus() {
    const list = (state && state.effects) || [];
    return list.some((e) => /КД/.test((e && (e.name || e.label)) || "")) ? 1 : 0;
  }
  function renderBonusRow(line) {
    const vars = formulaVars();
    const trimmed = String(line.expr || "").trim();
    const result = trimmed ? evalFormula(trimmed, vars) : { ok: true, value: 0 };
    const hint = result.ok ? String(result.value) : result.error;
    const active = sheet.activeBonusId === line.id;
    return `<div class="bonus-row${active ? " is-active" : ""}${line.enabled ? "" : " is-off"}" data-bonus-row="${esc(line.id)}">
        <div class="bonus-ops" role="group" aria-label="Операция">${["+", "-", "="].map((op) => `<button type="button" class="${line.op === op ? "is-on" : ""}" data-sheet-act="bonus-op" data-id="${esc(line.id)}" data-v="${op}" aria-pressed="${line.op === op ? "true" : "false"}">${op === "-" ? "−" : op}</button>`).join("")}</div>
        <input type="text" value="${esc(line.label)}" placeholder="Бонус" aria-label="Название бонуса" data-bonus-label="${esc(line.id)}">
        <div class="formula-field${result.ok ? "" : " is-invalid"}" title="${result.ok ? "= " + result.value : esc(result.error || "")}">
          <span class="formula-field__mark" aria-hidden="true">ƒ</span>
          <input type="text" value="${esc(line.expr)}" spellcheck="false" autocomplete="off" aria-label="Формула бонуса" data-bonus-expr="${esc(line.id)}">
          <span class="formula-field__hint" data-formula-hint="${esc(line.id)}">${esc(hint)}</span>
        </div>
        <button type="button" class="sheet-switch${line.enabled ? " is-on" : ""}" data-sheet-act="bonus-on" data-id="${esc(line.id)}" aria-pressed="${line.enabled ? "true" : "false"}" aria-label="${line.enabled ? "Выключить бонус" : "Включить бонус"}" title="${line.enabled ? "Включён" : "Выключен"}"></button>
        <button type="button" class="bonus-row__x" data-sheet-act="bonus-del" data-id="${esc(line.id)}" aria-label="Удалить бонус">×</button>
      </div>`;
  }
  function renderBonusEditor(target) {
    const lines = bonusesFor(target);
    return `<div class="ac-break__bonuses" data-bonus-box="${esc(target)}">
        ${lines.map(renderBonusRow).join("")}
        <button type="button" class="ac-break__add" data-sheet-act="bonus-add" data-v="${esc(target)}">+ Добавить бонус</button>
      </div>`;
  }
  function renderVarPicker() {
    const open = !!sheet.pickerOpen;
    const vars = formulaVars();
    const rows = SHEET_VAR_DEFS.map((def) => {
      const raw = vars[def.key];
      const hint = def.hintRu && def.hintRu !== "модификатор" ? `<small>${esc(def.hintRu)}</small>` : "";
      return `<button type="button" class="var-picker__row" data-sheet-act="var-pick" data-v="[${def.key}]">
          <span>${esc(def.labelRu)}${hint ? " " + hint : ""}</span>
          <span class="var-picker__val">${fmtMod(raw)}<code>[${def.key}]</code></span>
        </button>`;
    }).join("");
    return `<section class="var-picker" aria-label="Вставить показатель">
      <button type="button" class="var-picker__toggle" data-sheet-act="var-toggle" aria-expanded="${open ? "true" : "false"}">
        <h4>Вставить показатель</h4>
        <span class="var-picker__chev" aria-hidden="true">${open ? "▾" : "▸"}</span>
      </button>
      ${open ? `<div class="var-picker__list" data-var-table><div class="var-picker__cap">Показатели персонажа</div>${rows}</div>` : ""}
    </section>`;
  }
  function renderBreakFoot() {
    return `<div class="ac-break__foot"><button type="button" class="btn" data-close>Закрыть</button><button type="button" class="btn primary" data-close>Готово</button></div>`;
  }
  function identityClasses() {
    if (typeof classItems !== "undefined" && classItems && classItems.length) return classItems;
    return sheet.classes || [];
  }
  function identitySetupHtml() {
    let pending = "";
    const ensure = (typeof window !== "undefined" && window.SheetFeatures && window.SheetFeatures.ensureAbilState) || (typeof ensureAbilState === "function" ? ensureAbilState : null);
    if (typeof ensure === "function") {
      const a = ensure();
      if (a && a.pendingAsi) pending += '<button type="button" class="chip" data-open="asi">Увеличение характеристик</button>';
      if (a && a.pendingSteps && a.pendingSteps.length) pending += '<button type="button" class="chip" data-open="guided">Продолжить повышение</button>';
    }
    return '<p class="section-label">Настройка</p><div class="chips" style="flex-wrap:wrap"><button type="button" class="chip" data-open="race-setup">Раса</button><button type="button" class="chip" data-open="class-setup">Класс</button><button type="button" class="chip" data-open="subclass-setup">Архетип</button><button type="button" class="chip" data-open="bg-setup">Предыстория</button>' + pending + '<button type="button" class="chip" data-open="homebrew-class">Хомбрю-класс</button><button type="button" class="chip" data-open="homebrew-race">Хомбрю-раса</button><button type="button" class="chip" data-open="homebrew-bg">Хомбрю-предыстория</button></div>';
  }
  function attackById(id) {
    return (sheet.attacks || []).find((a) => a.id === id) || null;
  }
  function attackBonus(atk) {
    return Number(atk.bonus || 0) + Number(atk.hitMod || 0);
  }
  function attackDamageLabel(atk) {
    const base = String(atk.damage || "");
    const extra = Number(atk.dmgMod || 0);
    let dmg = base;
    if (extra) {
      const m = base.match(/^(.*?)([+-]\d+)(.*)$/);
      if (m) {
        const n = Number(m[2]) + extra;
        dmg = m[1] + (n >= 0 ? "+" + n : "−" + Math.abs(n)) + m[3];
      } else dmg = base + (extra >= 0 ? "+" + extra : "−" + Math.abs(extra));
    }
    return (dmg + (atk.dtype ? " " + atk.dtype : "")).trim();
  }
  function renderWeaponBreakdown() {
    const atk = attackById(sheet.breakWeapon) || (sheet.attacks || [])[0];
    if (!atk) return "<p class='lead'>Нет атаки.</p>";
    const abilMod = ability(atk.ability || "str");
    const pbn = atk.proficient ? pb() : 0;
    const hit = attackBonus(atk);
    return "<div class='cbt-hero'><span>Бонус атаки</span><b class='num'>" + signed(hit) + "</b></div>" +
      "<ul class='breakdown'>" +
        "<li><span>Бонус мастерства</span><b class='num'>" + signed(pbn) + "</b></li>" +
        "<li><span>" + esc(atk.abilityRu || "") + "</span><b class='num'>" + signed(abilMod) + "</b></li>" +
        (atk.hitMod ? "<li><span>Ручная поправка</span><b class='num'>" + signed(atk.hitMod) + "</b></li>" : "") +
        "<li><span>Итого атака</span><b class='num'>" + signed(hit) + "</b></li>" +
        "<li><span>Урон</span><b>" + esc(attackDamageLabel(atk)) + "</b></li>" +
        (atk.dmgMod ? "<li><span>Ручная поправка урона</span><b class='num'>" + signed(atk.dmgMod) + "</b></li>" : "") +
      "</ul>" +
      "<div class='pad-row' style='margin-top:10px'><button type='button' class='btn' data-open='weapon-mods'>Модификаторы атаки и урона</button></div>";
  }
  function renderWeaponMods() {
    const atk = attackById(sheet.breakWeapon) || (sheet.attacks || [])[0];
    if (!atk) return "<p class='lead'>Нет атаки.</p>";
    if (sheet._hitModDraft == null) sheet._hitModDraft = atk.hitMod || 0;
    if (sheet._dmgModDraft == null) sheet._dmgModDraft = atk.dmgMod || 0;
    return "<div class='form'>" +
        "<label class='field'>К атаке<input type='number' inputmode='numeric' data-cbt-input='hit-mod' value='" + esc(sheet._hitModDraft) + "'></label>" +
        "<label class='field'>К урону<input type='number' inputmode='numeric' data-cbt-input='dmg-mod' value='" + esc(sheet._dmgModDraft) + "'></label>" +
      "</div>" +
      "<p class='lead'>" + signed(attackBonus(atk)) + " · " + esc(attackDamageLabel(atk)) + "</p>" +
      "<div class='modal-actions'><button type='button' class='btn primary' data-sheet-act='mods-save'>Готово</button><button type='button' class='btn' data-close>Закрыть</button></div>";
  }
  function renderAttacksSettings() {
    const cards = (sheet.attacks || []).filter((a) => !a.hidden).map((atk) => {
      return "<li class='atk-set-card' data-weapon-row='" + atk.id + "'>" +
        "<div class='atk-set-card__top'>" +
          "<button type='button' class='atk-set-card__name' data-open='weapon-breakdown' data-weapon-src='" + atk.id + "'>" + esc(atk.name) + "</button>" +
          "<span class='plaque-tag" + (atk.held ? " is-on" : "") + "'>" + (atk.held ? "в руках" : "убран") + "</span>" +
          "<span class='plaque-tag'>" + esc(atk.sourceRu || "") + "</span>" +
        "</div>" +
        "<div class='atk-set-card__stats' aria-label='Бонус атаки и урон'>" +
          "<button type='button' class='ghost' data-open='weapon-breakdown' data-weapon-src='" + atk.id + "' title='Разбор бонуса атаки'>" + signed(attackBonus(atk)) + " · " + esc(attackDamageLabel(atk)) + "</button>" +
          "<span>Характеристика: " + esc(atk.abilityRu || "") + "</span>" +
          (atk.qty != null ? "<span>Кол-во: " + atk.qty + " (боеприпас)</span>" : "") +
        "</div>" +
        "<div class='atk-set-card__tools'>" +
          "<button type='button' class='btn' data-cbt='atk-held' data-id='" + atk.id + "'>" + (atk.held ? "В руках" : "Убран") + "</button>" +
          "<button type='button' class='btn' data-cbt='atk-prof' data-id='" + atk.id + "'>" + (atk.proficient ? "Владение" : "Нет владения") + "</button>" +
          "<button type='button' class='btn' data-cbt='atk-remove' data-id='" + atk.id + "'>" + (atk.source === "inventory" ? "Убрать атаку со стола" : "Убрать атаку") + "</button>" +
        "</div>" +
        (atk.activation ? "<p class='flags'>Режим «" + esc(atk.activation.name) + "» — кнопкой на карточке.</p>" : "") +
      "</li>";
    }).join("");
    return "<ul class='atk-set-list'>" + (cards || "<li class='lead'>Нет атак. Добавьте оружие в снаряжение или настройте атаку.</li>") + "</ul>" +
      "<div class='form'>" +
        "<label class='field'>Своя атака<input data-cbt-input='new-atk-name' value='" + esc(sheet.newAtkName || "") + "'></label>" +
      "</div>" +
      "<div class='modal-actions'>" +
        "<button type='button' class='btn' data-cbt='atk-add'>Добавить атаку</button>" +
        "<button type='button' class='btn' data-close>Закрыть</button>" +
        "<button type='button' class='btn primary' data-close>Готово</button>" +
      "</div>";
  }
  function refreshOpenSheet() {
    if (typeof renderVitals === "function") renderVitals();
    if (state.dialog && typeof renderDialog === "function") renderDialog(state.dialog);
    if (typeof fitVisibleSheets === "function") fitVisibleSheets();
  }
  function bonusTargetForOpen() {
    if (state.dialog === "initiative") return "initiative";
    if (state.dialog === "abil-break") {
      const active = (sheet.modifiers || []).find((row) => row.id === sheet.activeBonusId);
      return (active && active.target) || ((sheet.abilityKey || "str") + "_score");
    }
    if (state.dialog === "speed-break") {
      const active = (sheet.modifiers || []).find((row) => row.id === sheet.activeBonusId);
      return (active && active.target) || "speed";
    }
    if (state.dialog === "ac") return "ac";
    return "ac";
  }

  function altSpeeds() {
    const s = sheet.speeds || {};
    return [
      { key: "climb", label: "лаз.", full: "Лазание", icon: "ico-climb", v: Number(s.climb) || 0 },
      { key: "swim", label: "плав.", full: "Плавание", icon: "ico-swim", v: Number(s.swim) || 0 },
      { key: "fly", label: "полёт", full: "Полёт", icon: "ico-fly", v: Number(s.fly) || 0 }
    ];
  }
  function jumpFace() {
    const str = Number((sheet.abilityBase || {}).str) || 10;
    const long = Math.floor(str / 2);
    const high = Math.floor((3 + modOf(str)) / 2);
    return { long: long, high: high };
  }
  function classSummary() {
    return (sheet.classes || []).map((c) => c.name + " " + c.level + (c.subclass ? " · " + c.subclass : "")).join(", ");
  }
  function coinsToGp(c) {
    c = c || sheet.coins;
    return Math.round((c.pp * 10 + c.gp + c.ep * 0.5 + c.sp * 0.1 + c.cp * 0.01) * 100) / 100;
  }
  function formatGp(n) {
    const v = Math.round(n * 100) / 100;
    return String(v).replace(".", ",");
  }
  function isDying() { return (Number(sheet.hp) || 0) <= 0; }
  function isCaster() { return !!sheet.caster; }
  function hasBook() { return (sheet.classes || []).some((c) => c.id === "wizard"); }

  function toast(msg) {
    const el = $("[data-toast]");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-on"), 2200);
  }

  function setMore(on) {
    state.moreOpen = !!on;
    const pop = $("[data-more-pop]");
    const btn = $("[data-toggle-more]");
    if (pop) pop.hidden = !state.moreOpen;
    if (btn) btn.setAttribute("aria-expanded", state.moreOpen ? "true" : "false");
  }

  function closeDialog() {
    state.dialog = null;
    render();
  }

  function openDialog(id) {
    if (typeof canOpenClassDialog === "function" && id && !canOpenClassDialog(id)) {
      if (typeof refuseClassDialog === "function") return refuseClassDialog();
      toast("Это умение этому персонажу недоступно");
      return;
    }
    setMore(false);
    state.dialog = id;
    state.compMenuOpen = false;
    state.featMenuOpen = false;
    render();
  }

  function closeAll() {
    closeDialog();
    setMore(false);
    if (state.abilOpen) {
      state.abilOpen = false;
      state.ownMore = null;
    }
  }

  function setTheme(theme) {
    const t = theme === "leaf-classic" ? "leaf-classic" : "light-designer3";
    html.setAttribute("data-theme", t);
    html.setAttribute("data-bg", t === "leaf-classic" ? "ink" : "parchment");
  }

  function setCollapsed(on) { state.collapsed = !!on; render(); }
  function setScene(id) {
    const found = SCENES.some((s) => s.id === id);
    state.scene = found ? id : "explore";
    state.compMenuOpen = false;
    state.featMenuOpen = false;
    if (state.scene !== "combat") { /* «Новый ход» только в бою */ }
    render();
  }
  function setBanner(on) { state.banner = !!on; render(); }
  function setDemoChar(id) { applyPreset(id); render(); }
  function setDying(opts) {
    opts = opts || {};
    sheet.hp = opts.hp != null ? opts.hp : 0;
    state.deathOk = opts.ok != null ? opts.ok : 1;
    state.deathFail = opts.fail != null ? opts.fail : 1;
    sheet.deathOk = state.deathOk;
    sheet.deathFail = state.deathFail;
    render();
  }

  function renderScenes() {
    const tabs = $("[data-scenes] .scenes__tabs");
    if (tabs) {
      tabs.innerHTML = SCENES.map((s) =>
        `<button type="button" class="scenes__tab${state.scene === s.id ? " is-on" : ""}" data-set-scene="${s.id}" role="tab" aria-selected="${state.scene === s.id ? "true" : "false"}" aria-label="${esc(s.full)}">${esc(s.short)}</button>`
      ).join("");
    }
    const mag = $("[data-chip-magic]");
    if (mag) {
      const on = !!state.magicOpen && isCaster();
      mag.hidden = !isCaster();
      mag.classList.toggle("is-on", on);
      mag.setAttribute("aria-pressed", on ? "true" : "false");
    }
    const act = $("[data-chip-actions]");
    if (act) act.classList.toggle("is-on", state.scene === "combat" && !state.magicOpen);
    const head = $("[data-scene-head]");
    const title = $("[data-scene-title]");
    const onBoard = state.board === "icon-compare";
    if (head) {
      head.hidden = !!onBoard;
      head.classList.toggle("is-combat", state.scene === "combat");
    }
    if (title) {
      if (onBoard) title.textContent = "";
      else if (state.scene === "combat") title.textContent = "Бой";
      else {
        const sc = SCENES.find((s) => s.id === state.scene) || SCENES[1];
        title.textContent = sc.full;
      }
    }
  }

  function renderIconBoard() {
    const cell = (icon, label, extra) =>
      `<div class="icon-cell">${extra || (icon ? `<svg viewBox="0 0 24 24"><use href="#${icon}"/></svg>` : "")}<span>${label}</span></div>`;
    const jump = {
      a: ["ico-jump", "Прод и десктоп: дуга и стрелка вверх"],
      b: ["ico-jump-b", "Дуга-стрелка от земли к земле"],
      c: ["ico-jump-c", "Фигурка в прыжке над дугой"]
    };
    const rest = {
      a: ["ico-rest", "Прод и десктоп: луна с искрой"],
      b: ["ico-rest-b", "Костёр"],
      c: ["ico-rest-c", "Луна и звёзды"]
    };
    const variant = (pack, key) =>
      `<div class="icon-cell var-cell"><span class="var-lab">${key.toUpperCase()}</span><svg viewBox="0 0 24 24"><use href="#${pack[key][0]}"/></svg><p>${pack[key][1]}</p></div>`;
    return `<div class="icon-board">
      <h2>Иконки шапки</h2>
      <h3>Как в проде и на принятом десктопе</h3>
      <div class="icon-grid">
        ${cell("ico-shield", "КД")}
        ${cell("ico-boot", "Скор. · ходьба")}
        ${cell("ico-fly", "Полёт")}
        ${cell("ico-swim", "Плавание")}
        ${cell("ico-climb", "Лазание")}
        ${cell("ico-jump", "Прыжок")}
        ${cell("ico-bolt", "Иниц.")}
        ${cell("ico-badge", "БМ")}
        ${cell("", "Хиты", `<span class="face">38 / 38</span>`)}
        ${cell("ico-coin", "Кошелёк")}
        ${cell("ico-rest", "Отдых")}
        ${cell("ico-spark", "Вдохн.")}
        ${cell("ico-exhaustion", "Истощ.")}
        ${cell("ico-conditions", "Состояния")}
      </div>
      <h3>Прыжок — варианты</h3>
      <div class="var-grid">${variant(jump,"a")}${variant(jump,"b")}${variant(jump,"c")}</div>
      <h3>Отдых — варианты</h3>
      <div class="var-grid">${variant(rest,"a")}${variant(rest,"b")}${variant(rest,"c")}</div>
    </div>`;
  }

  const SKILL_DEFS = {
    athletics: { abil: "str", name: "Атлетика" },
    acrobatics: { abil: "dex", name: "Акробатика" },
    stealth: { abil: "dex", name: "Скрытность" },
    perception: { abil: "wis", name: "Внимательность" },
    investigation: { abil: "int", name: "Анализ" },
    medicine: { abil: "wis", name: "Медицина" },
    sleight: { abil: "dex", name: "Ловкость рук" },
    persuasion: { abil: "cha", name: "Убеждение" },
    insight: { abil: "wis", name: "Проницательность" },
    religion: { abil: "int", name: "Религия" },
    intimidation: { abil: "cha", name: "Запугивание" },
    survival: { abil: "wis", name: "Выживание" },
    deception: { abil: "cha", name: "Обман" },
    performance: { abil: "cha", name: "Выступление" },
    arcana: { abil: "int", name: "Магия" },
    history: { abil: "int", name: "История" },
    nature: { abil: "int", name: "Природа" },
    animal: { abil: "wis", name: "Уход за животными" }
  };
  const COMBAT_SKILLS = ["athletics", "acrobatics", "stealth", "perception", "investigation", "medicine"];
  const ACTION_ITEMS = {
    action: [
      { id: "attack", label: "Атака", title: "Действие «Атака» · отметь ход и бросай оружие ниже" },
      { id: "cast", label: "Заклинание", title: "Действие «Заклинание»", caster: true },
      { id: "dash", label: "Рывок" },
      { id: "disengage", label: "Отход" },
      { id: "dodge", label: "Уклонение" },
      { id: "help", label: "Помощь" },
      { id: "grapple", label: "Захват / Толчок", open: "grapple", title: "Захват или толчок вместо одной атаки (не всё действие)" },
      { id: "telekinesis", label: "Телекинез", need: "telekinesis" },
      { id: "search", label: "Поиск" },
      { id: "ready", label: "Подготовка" }
    ],
    bonus: [],
    reaction: [
      { id: "oa", label: "Атака по возможности" }
    ]
  };
  const ACTION_EMPTY = { action: "Нет действий", bonus: "Нет бонусных действий", reaction: "Нет реакций" };
  const MORE_TURN = [
    { id: "disarm", label: "Обезоруживание" },
    { id: "mark", label: "Метка" },
    { id: "tumble", label: "Пробегание" },
    { id: "dive", label: "Кувырок" },
    { id: "climb-on", label: "Взбирание" },
    { id: "identify-spell", label: "Распознать заклинание", caster: true },
    { id: "falling", label: "Падение" },
    { id: "no-long-rest", label: "Сутки без длинного отдыха" },
    { id: "cleave", label: "Разрубание" },
    { id: "massive", label: "Массивный урон" },
    { id: "wounds", label: "Незаживающие раны" },
    { id: "morale", label: "Проверка морали" },
    { id: "hero-points", label: "Очки героя" },
    { id: "mastery-die", label: "Кость мастерства", bard: true },
    { id: "oa-more", label: "Атака по возможности" },
    { id: "counterspell", label: "Контрзаклинание", caster: true },
    { id: "target", label: "Цель" },
    { id: "help-more", label: "Помощь" },
    { id: "ready-more", label: "Подготовка" }
  ];

  function blankSkills() {
    const s = {};
    Object.keys(SKILL_DEFS).forEach((k) => { s[k] = { p: 0 }; });
    return s;
  }
  function withSkills(on) {
    const s = blankSkills();
    (on || []).forEach((k) => { if (s[k]) s[k] = { p: 1 }; });
    return s;
  }
  function skillProf(key) {
    const row = (sheet.skills || {})[key] || { p: 0 };
    return row.p >= 2 ? 2 : (row.p === 1 ? 1 : 0);
  }
  function skillTotal(key) {
    const def = SKILL_DEFS[key];
    if (!def) return 0;
    const p = skillProf(key);
    const bonus = p === 2 ? pb() * 2 : (p === 1 ? pb() : 0);
    return ability(def.abil) + bonus;
  }
  function parseDiceExpr(expr) {
    const m = String(expr || "").replace(/\s/g, "").match(/^(\d+)к(\d+)([+-]\d+)?$/i);
    if (!m) return null;
    return { n: Number(m[1]), sides: Number(m[2]), mod: Number(m[3] || 0) };
  }
  function rollExpr(expr) {
    const p = parseDiceExpr(expr);
    if (!p) return { text: expr, total: 0 };
    let sum = p.mod, parts = [];
    for (let i = 0; i < p.n; i++) {
      const r = rollDie(p.sides);
      sum += r;
      parts.push(r);
    }
    const mod = p.mod ? (p.mod > 0 ? " + " + p.mod : " − " + Math.abs(p.mod)) : "";
    return { text: p.n + "к" + p.sides + mod + " (" + parts.join(", ") + ") → " + sum, total: sum, parts };
  }
  function isVersatile(atk) {
    const blob = ((atk && (atk.meta || "")) + " " + (atk && (atk.tip || ""))).toLowerCase();
    return /универсальн/.test(blob);
  }
  function showVersatileChip(atk) {
    return isVersatile(atk) && !shieldOn();
  }
  function twoHandOn(atk) {
    return !!(atk && state.weaponMode[atk.id] && showVersatileChip(atk));
  }
  function damageFace(atk) {
    let dmg = atk.damage || "";
    if (twoHandOn(atk)) {
      if (/1к8/.test(dmg)) dmg = dmg.replace("1к8", "1к10");
      else if (/1к6/.test(dmg)) dmg = dmg.replace("1к6", "1к8");
    }
    return dmg;
  }
  function favCount() {
    const a = (sheet.attacks || []).filter((x) => x.fav).length;
    const c = (sheet.consumables || []).filter((x) => x.fav).length;
    return a + c;
  }
  function toggleFav(bucket, id) {
    const list = bucket === "atk" ? (sheet.attacks || []) : (sheet.consumables || []);
    const it = list.find((x) => x.id === id);
    if (!it) return;
    if (it.fav) { it.fav = false; render(); return; }
    if (favCount() >= 3) { toast("Избранное заполнено (3/3)"); return; }
    it.fav = true;
    render();
  }
  function addRoll(label, text) {
    state.rolls.push({ label: label, text: text, t: Date.now() });
    if (state.rolls.length > 40) state.rolls.shift();
  }
  function rollSkill(key) {
    const def = SKILL_DEFS[key];
    if (!def) return;
    const mod = skillTotal(key);
    const r = rollWithAdv();
    const total = r.pick + mod;
    const text = r.line + " " + fmtMod(mod) + " → " + total;
    addRoll(def.name, text);
    toast(def.name + ": " + text);
    render();
  }
  function rollWithAdv() {
    const a = rollDie(20);
    if (state.adv === "norm") return { pick: a, line: "к20 (" + a + ")" };
    const b = rollDie(20);
    const pick = state.adv === "adv" ? Math.max(a, b) : Math.min(a, b);
    const kind = state.adv === "adv" ? "преим." : "помеха";
    return { pick: pick, line: kind + " к20 (" + a + ", " + b + ")" };
  }
  function resetTurn() {
    state.used = { action: false, bonus: false, reaction: false };
    toast("Новый ход");
    render();
  }
  function liveAttacks() {
    return (sheet.attacks || []).filter((a) => !a.hidden);
  }
  function classResources() {
    const out = [];
    const id = sheet.id;
    if (sheet.channel && sheet.channel.max) {
      out.push({ id: "channel", name: sheet.channel.name || "Божественный канал", cur: sheet.channel.cur, max: sheet.channel.max });
    }
    if (id === "kaedrin") {
      out.push({ id: "preserve-life", name: "Пополнение жизней", note: "доступно" });
      out.push({ id: "amulet", name: "Священный символ", note: "заряды 2/3" });
    }
    if (id === "aren") {
      if (!out.some((x) => x.id === "channel")) out.unshift({ id: "channel", name: "Божественный канал", cur: 1, max: 1 });
      out.push({ id: "lay-hands", name: "Наложение рук", cur: 25, max: 25 });
    }
    return out;
  }
  function hotItems() {
    const items = [];
    if (sheet.id === "kaedrin") {
      const ch = sheet.channel || { cur: 1, max: 1, name: "Божественный канал" };
      items.push({ id: "channel", kind: "res", name: ch.name, cur: ch.cur, max: ch.max });
      items.push({ id: "preserve-life", kind: "res", name: "Пополнение жизней", note: "доступно" });
      items.push({ id: "amulet", kind: "res", name: "Священный символ" });
    }
    if (sheet.id === "aren") {
      items.push({ id: "channel", kind: "res", name: "Божественный канал", cur: 1, max: 1 });
      items.push({ id: "lay-hands", kind: "res", name: "Наложение рук", cur: 25, max: 25 });
    }
    return items;
  }
  function allowedMore(it) {
    if (it.caster && !isCaster()) return false;
    if (it.bard && !(sheet.classes || []).some((c) => c.id === "bard")) return false;
    return true;
  }
  function allowedAction(it) {
    if (it.caster && !isCaster()) return false;
    if (it.need && !sheet[it.need]) return false;
    return true;
  }
  function modeLabel(atk) {
    return "Двуручный хват: " + (twoHandOn(atk) ? "вкл" : "выкл");
  }
  function openExtra(kind, title) {
    state.extraKind = kind;
    state.extraTitle = title;
    openDialog("combat-extra");
  }
  function renderCombatExtra() {
    const title = $("[data-extra-title]");
    const box = $("[data-extra-body]");
    if (title) title.textContent = state.extraTitle || "";
    if (!box) return;
    const kind = state.extraKind;
    if (kind === "attacks-settings") {
      box.innerHTML = renderAttacksSettings();
      return;
    }
    if (kind === "weapon-breakdown") { box.innerHTML = renderWeaponBreakdown(); return; }
    if (kind === "weapon-mods") { box.innerHTML = renderWeaponMods(); return; }
    if (kind === "rolls") {
      const rows = (state.rolls || []).slice().reverse().map((r) =>
        `<div class="break-row"><span>${esc(r.label)}</span><b>${esc(r.text)}</b></div>`
      ).join("");
      box.innerHTML = rows || "<p class='lead'>История бросков пуста</p>";
      return;
    }
    if (kind === "grapple") {
      box.innerHTML = `<p class="lead">Вместо одной атаки.</p>
        <div class="extra-actions">
          <button type="button" class="btn-primary" data-grapple="grab">Захват</button>
          <button type="button" class="btn-primary" data-grapple="shove">Толчок</button>
        </div>`;
      return;
    }
    if (kind === "break") {
      const atk = (sheet.attacks || []).find((a) => a.id === state.breakId);
      if (!atk) { box.innerHTML = "<p class='lead'>Атака не найдена</p>"; return; }
      const dmg = damageFace(atk);
      box.innerHTML = `
        <p class="lead">${esc(atk.name)} · ${esc(atk.abilityRu || "")}</p>
        <div class="break-row"><span>Бонус атаки</span><b>${fmtMod(atk.bonus)}</b></div>
        <div class="break-row"><span>Урон</span><b>${esc(dmg)} ${esc(atk.dtype || "")}</b></div>
        <div class="break-row"><span>Свойства</span><b>${esc(atk.meta || "")}</b></div>`;
      return;
    }
    if (kind === "item") {
      const atk = (sheet.attacks || []).find((a) => a.id === state.itemId);
      if (!atk) { box.innerHTML = "<p class='lead'>Предмет не найден</p>"; return; }
      box.innerHTML = `<p class="lead">${esc(atk.tip || atk.name)}</p>
        <p>${atk.held ? "Сейчас в руках." : "Не в руках."} ${atk.ammoName ? "Боеприпас: " + esc(atk.ammoName) + (atk.qty != null ? " × " + atk.qty : "") + "." : ""}</p>`;
      return;
    }
    if (kind === "resource") {
      const res = classResources().concat(hotItems()).find((x) => x.id === state.resourceId);
      const name = (res && res.name) || state.extraTitle || "Ресурс";
      const pips = (res && res.max)
        ? `<p class="lead">${res.cur} из ${res.max}</p>`
        : (res && res.note ? `<p class="lead">${esc(res.note)}</p>` : "");
      box.innerHTML = `<p class="lead">${esc(name)}</p>${pips}`;
      return;
    }
    if (kind === "spell-settings") { box.innerHTML = renderSpellSettings(); return; }
    if (kind === "prepare") { box.innerHTML = renderPrepare(); return; }
    if (kind === "grimoire") { box.innerHTML = renderGrimoire(); return; }
    if (kind === "cast-spell") { box.innerHTML = renderCastSpell(); return; }
    if (kind === "spell-cast-break") { box.innerHTML = renderCastBreak(state.breakId); return; }
    if (kind === "custom-spell") { box.innerHTML = renderCustomSpell(); return; }
    box.innerHTML = "";
  }
  function renderCombatBody() {
    const inspOn = sheet.edition === "2024" ? state.heroic : state.inspiration;
    const inspLabel = sheet.edition === "2024" ? "героич." : "вдохн.";
    const adv = state.adv || "norm";
    const luck = Number(state.luck) || 0;
    const luckChip = luck > 0
      ? `<button type="button" class="combat-chip" data-spend-luck>удача <b class="num">${luck}</b></button>`
      : "";
    const sess = (state.inSession && !state.initSubmitted)
      ? `<div class="session-bar"><span>Инициатива ещё не сдана</span><button type="button" data-roll-session-init>Бросить инициативу</button></div>`
      : "";
    const master = state.diceTable && state.master ? `<span class="master-note">мастер</span>` : "";
    const used = state.used || { action: false, bonus: false, reaction: false };
    const tabBtn = (id, label) => {
      const on = state.actionTab === id;
      const isUsed = !!used[id];
      return `<button type="button" data-action-tab="${id}" class="${on ? "is-open" : ""} ${isUsed ? "is-used" : ""}" aria-selected="${on ? "true" : "false"}"><i class="mark" data-mark-used="${id}"></i>${esc(label)}</button>`;
    };
    let panel = "";
    if (state.actionTab) {
      const items = (ACTION_ITEMS[state.actionTab] || []).filter(allowedAction);
      if (!items.length) panel = `<p class="turn-empty">${esc(ACTION_EMPTY[state.actionTab] || "")}</p>`;
      else panel = `<div class="turn-panel">` + items.map((it) => {
        const open = it.open ? ` data-open-extra="${it.open}"` : "";
        const title = it.title ? ` title="${esc(it.title)}"` : "";
        return `<button type="button" class="turn-act" data-turn-act="${it.id}"${open}${title}>${esc(it.label)}</button>`;
      }).join("") + `</div>`;
    }
    const moreBtns = state.moreTurn
      ? `<div class="more-turn" data-more-turn-list><span class="more-kicker">Опциональные действия стола</span>` +
        MORE_TURN.filter(allowedMore).map((it) =>
          `<button type="button" data-more-act="${it.id}">${esc(it.label)}</button>`
        ).join("") + `</div>`
      : "";
    const hotList = hotItems();
    const hot = hotList.length ? (`<div class="hot-row" aria-label="Горячая панель">` + hotList.map((it) => {
      const pips = (it.max)
        ? (it.max > 8
          ? `<span class="hot-sub" aria-label="${it.cur} из ${it.max}">${it.cur} / ${it.max}</span>`
          : (`<span class="hot-pips" aria-label="${it.cur} из ${it.max}">` + Array.from({ length: it.max }, (_, i) => `<i class="pip${i < it.cur ? " is-on" : ""}"></i>`).join("") + `</span>`))
        : (it.note ? `<span class="hot-sub">${esc(it.note)}</span>` : "");
      const instAttr = it.instant ? ` data-res-instant="${esc(it.instant)}"` : ` data-open-resource="${it.id}"`;
      return `<button type="button" class="hot-item"${instAttr}><span>${esc(it.name)}</span>${pips}</button>`;
    }).join("") + `</div>`) : "";
    const skills = `<div class="skill-row" aria-label="Навыки боя">` + COMBAT_SKILLS.map((key) => {
      const def = SKILL_DEFS[key];
      const p = skillProf(key);
      const expert = p >= 2;
      const on = p >= 1;
      const hint = expert ? "компетентность" : on ? "владение" : "без владения";
      const ring = `<span class="skill-prof-wrap" aria-hidden="true"><span class="skill-prof${expert ? " is-expert" : ""}"></span></span>`;
      return `<button type="button" class="skill-chip${on ? " is-on" : ""}${expert ? " is-expert" : ""}" data-roll-skill="${key}" title="${esc(def.name)}: ${fmtMod(skillTotal(key))} · ${hint}"><span class="skill-name">${ring}<span class="skill-label">${esc(def.name)}</span></span><b class="num">${fmtMod(skillTotal(key))}</b></button>`;
    }).join("") + `</div>`;
    const cards = liveAttacks().map((atk) => {
      const held = !!atk.held;
      const tags = [];
      if (atk.sourceRu) tags.push(atk.sourceRu);
      if (held) tags.push("в руках");
      const tagHtml = tags.map((t) => `<span class="atk-tag">${esc(t)}</span>`).join("");
      const qty = atk.qty != null ? `${esc(atk.ammoName || "шт.")} × ${atk.qty}` : "";
      const chip = showVersatileChip(atk)
        ? `<button type="button" class="atk-mode${twoHandOn(atk) ? " is-on" : ""}" data-toggle-mode="${esc(atk.id)}">${esc(modeLabel(atk))}</button>`
        : "";
      const dmg = damageFace(atk);
      const favLab = atk.fav ? "В избранном" : `+ в избранное (${favCount()}/3)`;
      return `<article class="atk-card${held ? " is-held" : ""}" data-atk="${esc(atk.id)}" id="atk-${esc(atk.id)}">
        <div class="atk-body">
          <div class="atk-head">
            <p class="atk-name">${esc(atk.name)}</p>
            <div class="atk-tags">${tagHtml}</div>
            <p class="atk-meta">${esc(atk.meta || "")}${qty ? " · " + qty : ""}${state.target ? " · цель: " + esc(state.target) : ""}</p>
            ${chip}
          </div>
          <div class="atk-art" aria-hidden="true"><svg class="icon-ink" viewBox="0 0 96 96" width="96" height="96" preserveAspectRatio="xMidYMid meet"><use href="#${esc(atk.icon || "wp-sword")}"/></svg></div>
          <div class="atk-badges">
            <button type="button" class="atk-badge" data-roll-attack="${esc(atk.id)}"><b>${fmtMod(atk.bonus)}</b><span>атака</span></button>
            <button type="button" class="atk-badge" data-roll-damage="${esc(atk.id)}"><b>${esc(dmg)}</b><span>${esc(atk.dtype || "урон")}</span></button>
          </div>
          <div class="atk-tools">
            <button type="button" data-open-break="${esc(atk.id)}">Разборка</button>
            <button type="button" class="${held ? "is-on" : ""}" data-toggle-held="${esc(atk.id)}">${held ? "В руках" : "В руки"}</button>
            <button type="button" data-open-item="${esc(atk.id)}">Предмет</button>
            <button type="button" class="${atk.fav ? "is-on" : ""}" data-toggle-fav="atk:${esc(atk.id)}">${esc(favLab)}</button>
          </div>
        </div>
      </article>`;
    }).join("");
    const cons = (sheet.consumables || []);
    const consBlock = cons.length ? `<h3 class="block-title">Расходники <span class="fav-count">избранное ${favCount()}/3</span></h3>` + cons.map((c) => `
      <div class="cons-row">
        <div class="cons-body"><b>${esc(c.name)} × ${c.qty}</b><span>${esc(c.note || "")}</span></div>
        <button type="button" class="${c.fav ? "is-on" : ""}" data-toggle-fav="cons:${esc(c.id)}">${c.fav ? "В избранном" : "+ в избранное"}</button>
        <button type="button" data-use-cons="${esc(c.id)}">Использовать</button>
      </div>`).join("") : "";
    const res = classResources();
    const resBlock = res.length ? `<h3 class="block-title">Классовые ресурсы</h3>` + res.map((r) => `
      <div class="res-row">
        <div class="res-body"><b>${esc(r.name)}</b><span>${r.max != null ? r.cur + " из " + r.max : (r.note || "")}</span></div>
        <button type="button" ${r.instant ? `data-res-instant="${esc(r.instant)}"` : `data-open-resource="${esc(r.id)}"`}>${r.instant ? "Потратить" : "Открыть"}</button>
      </div>`).join("") : "";
    const condChips = [];
    (state.conditions || []).forEach((name, i) => {
      condChips.push(`<span class="effect-chip">${esc(name)} <button type="button" class="effect-chip__x" data-dismiss-cond="${i}" aria-label="Снять: ${esc(name)}">×</button></span>`);
    });
    (state.effects || []).forEach((e, i) => {
      const name = (e && e.name) || e;
      condChips.push(`<span class="effect-chip">${esc(name)} <button type="button" class="effect-chip__x" data-dismiss-effect="${i}" aria-label="Снять: ${esc(name)}">×</button></span>`);
    });
    if (state.concentration) {
      condChips.push(`<span class="effect-chip is-conc" title="Концентрация"><svg class="hot-ico" viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-concentration"/></svg> ${esc(state.concentration)} · конц. <button type="button" class="effect-chip__x" data-dismiss-conc aria-label="Снять концентрацию">×</button></span>`);
    }
    const condStrip = `<div class="cond-strip" aria-label="Состояния">
        <div class="cond-strip__chips">${condChips.length ? condChips.join("") : `<span class="cond-strip__empty">Нет активных состояний</span>`}</div>
        <button type="button" class="cond-strip__add" data-open="conditions">+ Состояние</button>
      </div>`;

    return `
      <div class="roll-seg" role="group" aria-label="Режим броска">
        <button type="button" data-adv="norm" class="${adv === "norm" ? "is-on" : ""}">норм</button>
        <button type="button" data-adv="adv" class="${adv === "adv" ? "is-on" : ""}">преим.</button>
        <button type="button" data-adv="dis" class="${adv === "dis" ? "is-on" : ""}">помеха</button>
      </div>
      <div class="combat-meta">
        ${luckChip}
        <button type="button" class="combat-chip${inspOn ? " is-on" : ""}" data-toggle-insp>${esc(inspLabel)}</button>
        <button type="button" class="combat-chip" data-cycle-exh aria-label="Истощение ${state.exhaustion}" title="Истощение — нажми, чтобы изменить уровень (0–6)">Истощ. <b class="num">${state.exhaustion}</b></button>
        <button type="button" class="combat-chip" data-open-rolls>броски <b class="num">${state.rolls.length}</b></button>
        <button type="button" data-next-round>Новый ход</button>
        <label class="dice-check${state.diceTable ? " is-on" : ""}" data-dice-table title="${state.diceTable ? "Кубики на столе: вкл — клик выключить" : "Кубики на столе: выкл — клик включить"}">
          <input type="checkbox" class="dice-check__input" data-dice-table ${state.diceTable ? "checked" : ""} aria-label="Кубики на столе: ${state.diceTable ? "включено" : "выключено"}">
          <span class="dice-check__mark" aria-hidden="true">${state.diceTable ? "✓" : ""}</span>
          <span>Кубики на столе</span>
        </label>
        ${master}
      </div>
      ${sess}
      ${condStrip}
      ${showMagicUi() && state.magicOpen ? "" : hot}
      ${showMagicUi() && state.magicOpen ? "" : skills}
      <div class="turn" role="tablist" aria-label="Трекер хода">
        ${tabBtn("action", "Действие")}
        ${tabBtn("bonus", "Бонусное")}
        ${tabBtn("reaction", "Реакция")}
        <button type="button" class="turn-config" data-open-turn-settings aria-label="${showMagicUi() && state.magicOpen ? "Настроить магию" : "Настроить атаки"}" title="${showMagicUi() && state.magicOpen ? "Настроить магию" : "Настроить атаки"}"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-settings"/></svg></button>
      </div>
      ${showMagicUi() && state.magicOpen ? "" : panel}
      ${showMagicUi() && state.magicOpen ? "" : `<button type="button" class="more-turn-toggle${state.moreTurn ? " is-on" : ""}" data-open-more-turn>Ещё действия хода</button>`}
      ${showMagicUi() && state.magicOpen ? "" : moreBtns}
      ${renderCombatFight()}`;
  }


  function renderSceneBody() {
    const box = $("[data-scene-body]");
    if (!box) return;
    box.classList.toggle("is-combat", state.scene === "combat" && state.board !== "icon-compare");
    box.classList.toggle("is-spells", state.scene === "combat" && state.board !== "icon-compare" && !!state.magicOpen && showMagicUi());
    if (state.board === "icon-compare") {
      box.innerHTML = renderIconBoard();
      return;
    }
    if (state.scene === "combat") {
      box.innerHTML = renderCombatBody();
      return;
    }
    if (state.scene === "explore" && typeof renderExploreBody === "function") {
      box.classList.toggle("is-explore", true);
      box.classList.toggle("is-social", false);
      box.classList.toggle("is-spells", !!state.magicOpen && typeof showMagicUi === "function" && showMagicUi());
      box.innerHTML = renderExploreBody();
      if (typeof bindExplorePointer === "function") bindExplorePointer();
      return;
    }
    if (state.scene === "social" && typeof renderSocialBody === "function") {
      box.classList.toggle("is-explore", false);
      box.classList.toggle("is-social", true);
      box.classList.toggle("is-spells", !!state.magicOpen && typeof showMagicUi === "function" && showMagicUi());
      box.innerHTML = renderSocialBody();
      if (typeof bindExplorePointer === "function") bindExplorePointer();
      return;
    }
    box.classList.toggle("is-explore", false);
    box.classList.toggle("is-social", false);
    box.classList.toggle("is-companions", state.scene === "companions");
    box.classList.toggle("is-features", state.scene === "features");
    if (state.scene === "companions") {
      if (state.magicOpen && typeof showMagicUi === "function" && showMagicUi()) {
        box.classList.toggle("is-spells", true);
        box.innerHTML = renderSpellPanel();
        return;
      }
      box.classList.toggle("is-spells", false);
      box.innerHTML = (typeof renderCompanionsBody === "function") ? renderCompanionsBody() : "";
      return;
    }
    if (state.scene === "features") {
      if (state.magicOpen && typeof showMagicUi === "function" && showMagicUi()) {
        box.classList.toggle("is-spells", true);
        box.innerHTML = renderSpellPanel();
        return;
      }
      box.classList.toggle("is-spells", false);
      const body = (window.SheetFeatures && typeof window.SheetFeatures.renderBody === "function")
        ? window.SheetFeatures.renderBody()
        : (typeof renderFeaturesBody === "function" ? renderFeaturesBody() : "");
      box.innerHTML = body;
      return;
    }
    const sc = SCENES.find((s) => s.id === state.scene) || SCENES[1];
    const magic = state.magicOpen && showMagicUi()
      ? renderSpellPanel()
      : "";
    box.innerHTML = magic;
  }


  function headerToolsHtml(opts) {
    const open = !!state.moreOpen;
    const abilBtn = (opts && opts.abil)
      ? `<button type="button" class="vitals__tool" data-open-abilities aria-label="Характеристики" title="Характеристики"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-abilities"/></svg></button>`
      : "";
    return `
      <div class="vitals__tools">
        ${abilBtn}
        <button type="button" class="vitals__tool" data-open="help" aria-label="Справка" title="Справка">
          <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-help"/></svg>
        </button>
        <div class="vitals__more">
          <button type="button" class="vitals__tool vitals__more-btn" data-toggle-more aria-haspopup="menu" aria-expanded="${open ? "true" : "false"}" aria-label="Ещё">⋯</button>
          <div class="more-pop" data-more-pop ${open ? "" : "hidden"} role="menu">
            <button type="button" role="menuitem" data-open="classic">Классический лист 2014</button>
            <button type="button" role="menuitem" data-open="lobby-join">В лобби</button>
          </div>
        </div>
      </div>`;
  }

  function renderVitals() {
    const root = $("[data-vitals]");
    if (!root) return;
    const name = sheet.name || "Без имени";
    const ac = acTotal();
    const hp = Number(sheet.hp) || 0;
    const hpMax = Number(sheet.hpMax) || 0;
    const hpLabel = (state.hpTemp > 0 && !isDying())
      ? `${hp} / ${hpMax} (+${state.hpTemp})`
      : `${hp} / ${hpMax}`;
    if (state.collapsed) {
      root.className = "vitals vitals--collapsed" + (isDying() ? " is-dying" : "");
      const death = isDying()
        ? `<span class="vitals__collapse-death">
            <svg class="vitals__collapse-skull" viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-skull"/></svg>
            <span class="num">${hp} / ${hpMax}</span>
            <span class="vitals__collapse-marks" title="Успехи ${state.deathOk} · провалы ${state.deathFail}">${state.deathOk}\u00a0/\u00a0${state.deathFail}</span>
          </span>`
        : `<span class="num">${esc(hpLabel)}</span>`;
      root.innerHTML = `
        <button type="button" class="avatar" data-open="identity" title="Основное: имя, раса, мировоззрение, предыстория" aria-label="Основное">${esc(initialsOf(name))}</button>
        <button type="button" class="vitals__collapse-who" data-open="identity" title="${esc(name)}" aria-label="Основное: ${esc(name)}"><strong>${esc(name)}</strong></button>
        <button type="button" class="vitals__collapse-hp${isDying() ? " is-danger" : ""}" data-open="hp" aria-label="${isDying() ? `Хиты ${hp} из ${hpMax}. При смерти: успехи ${state.deathOk}, провалы ${state.deathFail}` : `Хиты ${hpLabel}`}">${death}</button>
        <div class="vitals__end">
          ${headerToolsHtml({ abil: true })}
          <button type="button" class="vitals__expand" data-expand aria-label="Развернуть шапку">▾</button>
        </div>`;
      return;
    }

    root.className = "vitals";
    const jump = jumpFace();
    const alts = altSpeeds().filter((a) => a.v > 0);
    const speedBadge = alts.length ? `<span class="vital__badge">+${alts.length}</span>` : "";
    const inspLabel = sheet.edition === "2024" ? "Г.вдохн." : "Вдохн.";
    const inspOn = sheet.edition === "2024" ? state.heroic : state.inspiration;
    const meta = [sheet.race, classSummary(), sheet.alignment, "ур. " + sheet.level, sheet.edition].filter(Boolean).join(" · ");
    const xpPct = sheet.xpNext ? Math.max(0, Math.min(100, (sheet.xp / sheet.xpNext) * 100)) : 0;
    const xpNeed = Math.max(0, (sheet.xpNext || 0) - (sheet.xp || 0));
    const xpLab = `${nb(sheet.xp)} / ${nb(sheet.xpNext)} опыта · ещё ${nb(xpNeed)} до ур. ${sheet.nextLevel}`;
    const coinLab = formatGp(coinsToGp()) + " зм";
    const comps = Number(sheet.companions) || 0;
    const effects = (state.effects || []);
    const effectsHtml = effects.length
      ? effects.map((e, i) => { const nm = (e && e.name) || e; return `<span class="effect-chip">${esc(nm)} <button type="button" class="effect-chip__x" data-dismiss-effect="${i}" aria-label="Снять эффект">×</button></span>`; }).join("")
      : `<span class="effects__empty">Нет активных эффектов</span>`;
    const deathHtml = isDying() ? `
      <div class="death" aria-label="Спасброски от смерти">
        <div class="death__top">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-skull"/></svg>
          При смерти
        </div>
        <div class="death__tracks">
          ${deathTrack("Успехи", "ok", state.deathOk)}
          ${deathTrack("Провалы", "bad", state.deathFail)}
        </div>
        <button type="button" class="death__roll" data-roll-death>Спас от смерти</button>
      </div>` : "";
    const abil = ["str","dex","con","int","wis","cha"].map((k) => `<span>${ABILITY[k]} <b>${fmtMod(ability(k))}</b></span>`).join("");

    root.innerHTML = `
      <div class="vitals__head">
        <button type="button" class="vitals__name-row" data-open="identity" aria-label="Основное: ${esc(name)}">
          <span class="vitals__identity-hint">Основное</span>
          <span class="vitals__name">${esc(name)}</span>
        </button>
        ${headerToolsHtml()}
      </div>
      <div class="vitals__who">
        <button type="button" class="avatar" data-open="identity" aria-label="Основное">${esc(initialsOf(name))}</button>
        <div class="vitals__meta">${esc(meta)}</div>
        <div class="vitals__insp-exh">
          <button type="button" class="vitals__insp${inspOn ? " is-on" : ""}" data-toggle-insp aria-pressed="${inspOn ? "true" : "false"}" title="${esc(inspLabel)}"><svg class="chip-ico" viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-spark"/></svg>${esc(inspLabel)}</button>
          <button type="button" class="vitals__exh-chip" data-cycle-exh aria-label="Истощение ${state.exhaustion}" title="Истощение — нажми, чтобы изменить уровень (0–6)"><svg class="chip-ico" viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-exhaustion"/></svg>Истощ. <b class="num">${state.exhaustion}</b></button>
        </div>
      </div>
      <button type="button" class="xp" data-open="xp-pad" title="${esc(xpLab)}">
        <div class="xp__bar" aria-hidden="true"><i style="width:${xpPct}%"></i></div>
        <div class="xp__lab">${esc(xpLab)}</div>
      </button>
      <div class="vitals__row is-one" role="list">
        <div class="vital vital--ac${shieldOn() ? " is-shield-on" : ""}" role="listitem">
          <button type="button" class="vital__main" data-open="ac" aria-label="Класс доспеха ${ac}. Открыть разборку">
            <svg class="vital__ico" viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-shield"/></svg>
            <span class="v num">${ac}</span>
            <span class="k">КД</span>
          </button>
          <button type="button" class="vital__shield${shieldOn() ? " is-on" : ""}" data-toggle-shield ${(!sheet.shieldAvailable && !sheet.shield) ? "disabled" : ""} aria-label="${shieldOn() ? "Убрать щит из руки" : (sheet.shieldAvailable ? "Взять щит в руку" : "Нет щита в инвентаре")}" title="${shieldOn() ? "Щит в руке — нажми, чтобы убрать (КД −бонус щита)" : (sheet.shieldAvailable ? "Щит убран — нажми, чтобы взять (КД +бонус щита)" : "Нет щита в инвентаре")}">Щит</button>
        </div>
        <button type="button" class="vital vital--speed" data-open="speed" role="listitem" aria-label="Скорость ${walkTotal()} футов. Открыть список скоростей">
          ${speedBadge}
          <svg class="vital__ico" viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-boot"/></svg>
          <span class="v num">${walkTotal()}</span>
          <span class="k">Скор.</span>
        </button>
        <span class="vital" tabindex="0" role="listitem" title="Прыжок: в длину ${jump.long} фт, в высоту ${jump.high} фт" aria-label="Прыжок: в длину ${jump.long} фт, в высоту ${jump.high} фт">
          <svg class="vital__ico" viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-jump"/></svg>
          <span class="v num">${jump.long} / ${jump.high}</span>
          <span class="k">Прыжок</span>
        </span>
        <div class="vital vital--init" role="listitem">
          <button type="button" class="vital__main" data-open="initiative" aria-label="Инициатива ${fmtMod(initTotal())}. Открыть разборку">
            <svg class="vital__ico" viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-bolt"/></svg>
            <span class="v num">${fmtMod(initTotal())}</span>
            <span class="k">Иниц.</span>
          </button>
          <button type="button" class="vital__roll" data-roll-init title="Бросок инициативы" aria-label="Бросок инициативы">
            <svg viewBox="0 0 32 32" width="16" height="16" aria-hidden="true"><use href="#ico-dice-prod"/></svg>
          </button>
        </div>
        <span class="vital" tabindex="0" role="listitem" title="Бонус мастерства (от уровня)" aria-label="Бонус мастерства ${fmtMod(pb())}">
          <svg class="vital__ico" viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-badge"/></svg>
          <span class="v num">${fmtMod(pb())}</span>
          <span class="k">БМ</span>
        </span>
      </div>
      <div class="vitals__hp-row">
        <button type="button" class="hp-tile${isDying() ? " is-danger" : ""}" data-open="hp" aria-label="Хиты ${hpLabel}">
          <span class="v num">${esc(hpLabel)}</span>
          <span class="k">${isDying() ? "при смерти" : (state.hpTemp > 0 ? "хиты · врем. +" + state.hpTemp : "хиты")}</span>
        </button>
        <button type="button" class="vital-pill" data-open="coins" aria-label="${esc(coinLab)} — кошелёк" title="${esc(coinLab)}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-coin"/></svg>
          <span>${esc(coinLab)}</span>
        </button>
        <button type="button" class="vital-pill" data-open="rest" aria-label="Отдых" title="Отдых">
          <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-rest"/></svg>
          <span>Отдых</span>
        </button>
      </div>
      ${deathHtml}
      <div class="effects">
        ${effectsHtml}
        <button type="button" class="chip cond" data-open="conditions"><svg class="chip-ico" viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-conditions"/></svg>Состояния</button>
        <button type="button" class="companions-chip" data-goto-companions ${comps ? "" : "hidden"}>Напарники ${comps}</button>
      </div>
      <button type="button" class="abil-peek" data-open-abilities aria-label="Характеристики">${abil}</button>
      <button type="button" class="vitals__collapse-btn" data-collapse>▴ Свернуть</button>`;
  }

  function deathTrack(label, tone, value) {
    const pips = [1,2,3].map((i) =>
      `<button type="button" class="death-pip death-pip--${tone}${i <= value ? " is-filled" : ""}" data-death-set="${tone}:${i}" aria-label="${esc(label)} ${i}"></button>`
    ).join("");
    return `<div class="death-track"><span>${esc(label)}</span><div class="death-pips">${pips}</div></div>`;
  }

  function renderDialog(id) {
    if (id === "identity") renderIdentity();
    else if (id === "xp-pad") renderXp();
    else if (id === "ac") renderAc();
    else if (id === "speed") renderSpeed();
    else if (id === "speed-break") renderSpeedBreak();
    else if (id === "initiative") renderInit();
    else if (id === "coins") renderCoins();
    else if (id === "rest") renderRest();
    else if (id === "hp") renderHp();
    else if (id === "max-hp") renderMaxHp();
    else if (id === "conditions") renderCond();
    else if (id === "dice") renderDice();
    else if (id === "combat-extra") renderCombatExtra();
    else if (id === "conc-damage") renderConcDamageBody();
    if (typeof renderAbilDialog === "function") renderAbilDialog(id);
    if (typeof renderExploreDialog === "function") renderExploreDialog(id);
    if (typeof renderLiveDialog === "function") renderLiveDialog(id);
  }

  const MOBILE_OWNED_SHEETS = {
    identity: 1, "xp-pad": 1, ac: 1, speed: 1, "speed-break": 1, initiative: 1, coins: 1, rest: 1, hp: 1, "max-hp": 1,
    conditions: 1, dice: 1, "combat-extra": 1, "conc-damage": 1
  };
  function liveEntry(id) {
    if (!id) return null;
    const bag = (typeof LIVE !== "undefined" && LIVE) || window.SheetLive || {};
    return bag[id] || null;
  }
  function renderLiveDialog(id) {
    const live = liveEntry(id);
    const root = $("[data-sheet='live']");
    if (!live || !root || MOBILE_OWNED_SHEETS[id]) return false;
    const title = $("[data-live-title]");
    const body = $("[data-live-body]");
    if (title) title.textContent = typeof live.title === "function" ? live.title() : (live.title || "");
    if (body) body.innerHTML = typeof live.body === "function" ? (live.body() || "") : (live.body || "");
    root.classList.toggle("is-wide", !!live.wide);
    return true;
  }

  function renderIdentityCore() {
    const ed = html.getAttribute("data-edition") || sheet.edition || "2014";
    const raceLabel = ed === "2024" ? "Вид" : "Раса";
    const raceHint = ed === "2024"
      ? "В редакции 2024 это поле называется «Вид» (species), не «Раса». Подраса и развилки — в мастере вида; если даёт черту — мастер подскажет."
      : "Подраса и развилки — в мастере расы (в 2024 — вида); если даёт черту — мастер подскажет.";
    const classes = identityClasses().map((c) => {
      return `<div class="ident-class-row"><b>${esc(c.name)}</b> <span>ур. ${c.level}${c.subclass ? " · " + esc(c.subclass) : ""}</span>
        <button type="button" class="btn" data-sheet-act="homebrew-class">Хомбрю</button></div>`;
    }).join("");
    const photo = (sheet.avatarMode === "photo") || (state.avatarMode === "photo");
    const ava = photo
      ? `<div class="avatar-preview is-photo">фото</div>`
      : `<div class="avatar-preview">${esc(initialsOf(sheet.name))}</div>`;
    const lvlSum = identityClasses().reduce((s,c)=>s+(Number(c.level)||0),0);
    return `<div class="form">
      <p class="section-label">Персонаж</p>
      <div class="ident-avatar-row">
        ${ava}
        <div class="pad-row">
          <button type="button" class="btn" data-sheet-act="avatar-set">Сменить фото</button>
          <button type="button" class="btn" data-sheet-act="avatar-clear">Заглушка</button>
        </div>
      </div>
      <label class="field">Имя<input type="text" data-ident-name value="${esc(sheet.name)}"></label>
      <p class="section-label">Пол</p>
      <div class="pad-row" role="group" aria-label="Пол персонажа">
        <button type="button" class="sheet-chip${sheet.gender === "male" ? " is-on" : ""}" data-sheet-act="gender" data-v="male">Мужской</button>
        <button type="button" class="sheet-chip${sheet.gender === "female" ? " is-on" : ""}" data-sheet-act="gender" data-v="female">Женский</button>
      </div>
      <p class="section-label">Классы и уровни</p>
      ${classes}
      <div class="pad-row" style="margin-top:8px">
        <span class="pad-note">Сумма уровней: ${lvlSum}</span>
        <button type="button" class="btn primary" data-sheet-act="level-up">+1 уровень</button>
      </div>
      ${identitySetupHtml()}
      <div class="pad-grid pad-grid--2">
        <label class="field">${raceLabel}<input type="text" data-ident-race value="${esc(sheet.race)}"><span class="pad-note">${raceHint}</span></label>
        <label class="field">Предыстория<input type="text" data-ident-bg value="${esc(sheet.background || "")}"></label>
        <label class="field">Мировоззрение<input type="text" data-ident-align value="${esc(sheet.alignment || "")}"></label>
        <label class="field">Черта от мастера<input type="text" data-ident-feat value="${esc(sheet.masterFeat || "")}" placeholder="если мастер выдал черту"></label>
      </div>
      <p class="section-label">Лист</p>
      <div class="chips">
        <button type="button" class="chip" data-open="ownership">Владения и чувства</button>
      </div>
      <p class="section-label">Хомбрю</p>
      <label class="field">Заметка хомбрю<textarea data-ident-homebrew rows="2" placeholder="Свои правила, только для этого листа">${esc(sheet.homebrew || "")}</textarea></label>
    </div>`;
  }
  function renderIdentity() {
    const box = $("[data-identity-body]");
    if (!box) return;
    let html = renderIdentityCore();
    if (typeof extendIdentity === "function") html = extendIdentity(html);
    box.innerHTML = html;
  }

  function renderXp() {
    const box = $("[data-xp-body]");
    if (!box) return;
    const need = Math.max(0, (sheet.xpNext || 0) - (sheet.xp || 0));
    const canUp = (sheet.xp || 0) >= (sheet.xpNext || 0) && (sheet.level || 1) < 20;
    const draft = state.xpDraft != null ? state.xpDraft : "";
    const log = (sheet.xpLog || []).map((e) => `<li><span>${esc(e.date)}</span><span>${esc(e.reason || "—")}</span><span class="delta">${e.delta > 0 ? "+" : ""}${fmtNum(e.delta)}</span></li>`).join("");
    box.innerHTML = `
      <p class="break__sum">${esc(nb(sheet.xp))} / ${esc(nb(sheet.xpNext))}</p>
      <p class="lead">Уровень ${sheet.level} → ${sheet.nextLevel}. Ещё ${esc(nb(need))}.</p>
      <label class="field">Сумма <input type="number" inputmode="numeric" data-xp-add value="${esc(draft)}" min="0"></label>
      <label class="field">За что <input type="text" data-xp-reason value="${esc(sheet.xpReason || "")}" placeholder="бой, квест, награда…"></label>
      <div class="pad-row" style="margin-top:8px">
        <button type="button" class="btn primary" data-sheet-act="xp-add">Начислить</button>
        <button type="button" class="btn" data-sheet-act="xp-sub">Убавить</button>
        ${canUp ? `<button type="button" class="btn-primary" data-level-up>Повысить уровень</button>` : ""}
      </div>
      <details class="details-block" ${sheet.xpLogOpen ? "open" : ""}>
        <summary data-sheet-act="xp-log-toggle">Журнал опыта</summary>
        <ul class="xp-log">${log || "<li>Записей пока нет.</li>"}</ul>
      </details>`;
  }

  function renderAc() {
    const box = $("[data-ac-body]");
    if (!box) return;
    const lines = [];
    if (sheet.acUnarmoredDefense) {
      const ab = sheet.acUnarmoredDefense;
      lines.push(["Защита без доспехов", "10"]);
      lines.push(["Ловкость (" + ABILITY.dex + " " + (sheet.abilityBase.dex) + ")", fmtMod(ability("dex"))]);
      lines.push(["Телосложение (" + ABILITY[ab] + " " + (sheet.abilityBase[ab]) + ")", fmtMod(ability(ab))]);
    } else if (sheet.acUsesDex) {
      lines.push(["Доспех", String(sheet.acArmor)]);
      let d = ability("dex");
      const cap = sheet.acDexMax != null ? " (макс. " + sheet.acDexMax + ")" : "";
      if (sheet.acDexMax != null) d = Math.min(d, sheet.acDexMax);
      lines.push(["Ловкость" + cap, fmtMod(d)]);
    } else {
      lines.push(["Доспех", String(sheet.acArmor)]);
    }
    if (shieldOn()) lines.push(["Щит в руке", "+2"]);
    else if (sheet.shieldAvailable) lines.push(["Щит убран", "0"]);
    if (typeof gearBonusLines === "function") {
      gearBonusLines("ac").forEach((r) => lines.push([r.name, fmtMod(r.value)]));
    }
    const vars = formulaVars();
    const stacked = applyBonusStack(acCore(), bonusesFor("ac"), vars);
    const hint = formatBonusSummary(stacked.applied);
    const lis = lines.map((r) => `<li><span>${esc(r[0])}</span><b>${esc(r[1])}</b></li>`).join("");
    box.innerHTML = `
      <div class="ac-break">
        <div class="ac-break__hero">
          <p class="ac-break__sum" data-break-sum>${esc((hint ? hint + " · " : "") + "итого " + stacked.total + " КД")}</p>
          <div class="ac-break__badge" aria-label="Итого ${stacked.total} КД"><b data-break-total>${stacked.total}</b><span>КД</span></div>
        </div>
        <section class="ac-break__sec">
          <h3 class="ac-break__lab">База</h3>
          <div class="break"><ul>${lis}</ul></div>
        </section>
        <section class="ac-break__sec">
          <h3 class="ac-break__lab">Щит</h3>
          <div class="ac-break__seg" role="group" aria-label="Щит">
            <button type="button" class="${!shieldOn() ? "is-on" : ""}" data-sheet-act="ac-shield" data-v="0" aria-pressed="${!shieldOn() ? "true" : "false"}">Нет</button>
            <button type="button" class="${shieldOn() ? "is-on" : ""}" data-sheet-act="ac-shield" data-v="1" aria-pressed="${shieldOn() ? "true" : "false"}"${(!sheet.shieldAvailable && !sheet.shield) ? " disabled" : ""}>В руке (+2)</button>
          </div>
        </section>
        <section class="ac-break__sec">
          <h3 class="ac-break__lab">Бонусы</h3>
          ${renderBonusEditor("ac")}
        </section>
        ${renderVarPicker()}
        ${renderBreakFoot()}
      </div>`;
  }

    function renderSpeed() {
    const box = $("[data-speed-body]");
    if (!box) return;
    const walk = walkTotal();
    const rows = [
      { key: "walk", full: "Ходьба", icon: "ico-boot", v: walk, readonly: true },
      ...altSpeeds()
    ];
    const lis = rows.map((a) => {
      const val = a.readonly
        ? `<b class="num">${a.v} фт</b>`
        : `<input type="number" inputmode="numeric" min="0" data-alt-speed="${a.key}" value="${a.v || ""}" aria-label="${esc(a.full)}, фт">`;
      return `<li class="speed-row">
        <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#${a.icon}"/></svg>
        <span>${esc(a.full)}</span>
        ${val}
      </li>`;
    }).join("");
    box.innerHTML = `
      <p class="break__sum speed-sum"><span>${walk} фт</span><button type="button" class="linkish" data-speed-break>Разборка и бонусы</button></p>
      <ul class="speed-list">${lis}</ul>`;
  }

  function renderSpeedBreak() {
    const box = $("[data-speed-break-body]");
    if (!box) return;
    const vars = formulaVars();
    const raceHint = "вид (" + String(sheet.race || "вид").toLowerCase() + ")";
    const channels = [
      { target: "speed", label: "Ходьба", base: walkBase(), hint: raceHint },
      { target: "speed_climb", label: "Лазание", base: (sheet.speeds && sheet.speeds.climb) || 0, hint: "нет базы, если не задано" },
      { target: "speed_swim", label: "Плавание", base: (sheet.speeds && sheet.speeds.swim) || 0, hint: "нет базы, если не задано" },
      { target: "speed_fly", label: "Полёт", base: (sheet.speeds && sheet.speeds.fly) || 0, hint: "нет базы, если не задано" }
    ];
    const visible = channels.filter((ch) => ch.target === "speed" || ch.base > 0 || bonusesFor(ch.target).length > 0);
    const walk = visible.find((ch) => ch.target === "speed") || visible[0];
    const walkStack = applyBonusStack(walk.base, bonusesFor(walk.target), vars);
    const walkHint = formatBonusSummary(walkStack.applied);
    const gear = (typeof gearBonusLines === "function") ? gearBonusLines("speed") : [];
    const summaryBits = visible.map((ch) => {
      let total = applyBonusStack(ch.base, bonusesFor(ch.target), vars).total;
      if (ch.target === "speed") total = walkTotal();
      return ch.label + " " + total + " фт";
    });
    const sections = visible.map((ch) => {
      const lines = bonusesFor(ch.target);
      const stacked = applyBonusStack(ch.base, lines, vars);
      const hint = formatBonusSummary(stacked.applied);
      let shown = stacked.total;
      if (ch.target === "speed") shown = walkTotal();
      const baseText = ch.base > 0
        ? ("База " + ch.base + " фт · " + ch.hint)
        : ("База не задана · " + ch.hint);
      const totalBit = shown !== ch.base ? (" · итог " + shown + " фт") : "";
      const gearBits = (ch.target === "speed" && gear.length)
        ? gear.map((r) => `<div class="ac-break__base">${esc((r.name || "Снаряжение") + " " + ((r.value > 0 ? "+" : "") + r.value) + " фт")}</div>`).join("")
        : "";
      return `<section class="ac-break__sec">
        <h3 class="ac-break__lab">${esc(ch.label)}</h3>
        <div class="ac-break__base">${esc(baseText + totalBit + (hint ? " · " + hint : ""))}</div>
        ${gearBits}
        ${renderBonusEditor(ch.target)}
      </section>`;
    }).join("");
    box.innerHTML = `<div class="ac-break">
      <div class="ac-break__hero">
        <p class="ac-break__sum" data-break-sum>${esc(summaryBits.join(" · ") + (walkHint ? " · " + walkHint : ""))}</p>
        <div class="ac-break__badge" aria-label="Скорость ${walkTotal()} фт"><b data-break-total>${walkTotal()}</b><span>фт</span></div>
      </div>
      ${sections}
      ${renderVarPicker()}
      ${renderBreakFoot()}
    </div>`;
  }

  function renderInit() {
    const box = $("[data-init-body]");
    if (!box) return;
    const vars = formulaVars();
    const override = sheet.initOverride;
    const stacked = applyBonusStack(initCore(), bonusesFor("initiative"), vars);
    const bonusHint = formatBonusSummary(stacked.applied);
    const autoLabel = "Ловкость " + fmtMod(initAuto());
    const sum = (override != null && override !== "" ? ("Вручную " + fmtMod(override)) : autoLabel) + (bonusHint ? " · " + bonusHint : "");
    box.innerHTML = `<div class="ac-break">
      <div class="ac-break__hero">
        <div style="flex:1;min-width:0">
          <p class="ac-break__sum" data-break-sum>${esc(sum)}</p>
          <div class="pad-row" style="margin-top:6px"><button type="button" class="btn" data-roll-init>Бросок инициативы</button></div>
        </div>
        <div class="ac-break__badge" aria-label="Инициатива ${fmtMod(stacked.total)}"><b data-break-total>${fmtMod(stacked.total)}</b><span>иниц.</span></div>
      </div>
      <section class="ac-break__sec">
        <h3 class="ac-break__lab">База</h3>
        <div class="ac-break__base">${esc(autoLabel)}</div>
        <label class="field">Вручную (пусто = авто)<input type="number" step="1" min="-10" max="30" value="${override == null || override === "" ? "" : override}" placeholder="авто" data-init-override></label>
      </section>
      <section class="ac-break__sec">
        <h3 class="ac-break__lab">Бонусы</h3>
        ${renderBonusEditor("initiative")}
      </section>
      ${renderVarPicker()}
      ${renderBreakFoot()}
    </div>`;
  }

  function renderCoins() {
    const box = $("[data-coins-body]");
    if (!box) return;
    const rows = COIN_META.map((m) =>
      `<div class="coin-grid"><b>${esc(m.name)}</b><span class="num">${sheet.coins[m.key] || 0} ${esc(m.short)}</span>
       <label class="field" style="grid-column:1/-1;margin:0">${state.walletMode === "add" ? "Добавить" : "Потратить"}
         <input type="number" inputmode="numeric" min="0" data-coin-draft="${m.key}" value="${state.walletDraft[m.key] || ""}">
       </label></div>`
    ).join("");
    box.innerHTML = `
      <p class="break__sum">${formatGp(coinsToGp())} зм</p>
      <div class="pad-modes">
        <button type="button" class="seg${state.walletMode === "add" ? " is-on" : ""}" data-wallet-mode="add">Добавить</button>
        <button type="button" class="seg${state.walletMode === "spend" ? " is-on" : ""}" data-wallet-mode="spend">Потратить</button>
      </div>
      ${rows}
      <button type="button" class="btn-primary" data-wallet-apply>Применить</button>`;
  }

  function renderRest() {
    const box = $("[data-rest-body]");
    if (!box) return;
    const hd = Object.keys(sheet.hitDice || {}).map((id) => {
      const d = sheet.hitDice[id];
      const cls = (sheet.classes || []).find((c) => c.id === id);
      return `<div><span>Кости хитов · ${esc(cls ? cls.name : id)} к${d.die}</span><b>${d.cur} / ${d.max}</b></div>`;
    }).join("");
    const slots = Object.keys(sheet.slots || {}).sort((a,b)=>a-b).map((lv) => {
      const s = sheet.slots[lv];
      return `<div><span>Ячейки ${lv} круга</span><b>${s.cur} / ${s.max}</b></div>`;
    }).join("");
    const ch = sheet.channel
      ? `<div><span>${esc(sheet.channel.name)}</span><b>${sheet.channel.cur} / ${sheet.channel.max}</b></div>`
      : "";
    box.innerHTML = `
      <div class="pad-modes">
        <button type="button" class="seg${state.restKind === "short" ? " is-on" : ""}" data-rest-kind="short">Короткий</button>
        <button type="button" class="seg${state.restKind === "long" ? " is-on" : ""}" data-rest-kind="long">Продолжительный</button>
      </div>
      <p class="lead">${state.restKind === "short"
        ? "Короткий отдых: можно потратить кости хитов и сбросить ресурсы короткого отдыха."
        : "Продолжительный отдых: полные хиты, ячейки, кости хитов, ресурсы и −1 истощение."}</p>
      <div class="rest-res">
        <div><span>Хиты</span><b>${sheet.hp} / ${sheet.hpMax}</b></div>
        ${hd}${ch}${slots}
        <div><span>Истощение</span><b>${state.exhaustion}</b></div>
      </div>
      ${state.restKind === "short" ? `<button type="button" class="btn" data-spend-hd>Потратить кость хитов</button>` : ""}
      <div class="pad-actions" style="margin-top:8px">
        <button type="button" class="btn-primary" data-finish-rest>Завершить отдых</button>
      </div>`;
  }

  const DMG_TYPES = [
    { id: "acid", label: "кислота" },
    { id: "cold", label: "холод" },
    { id: "fire", label: "огонь" },
    { id: "force", label: "силовое поле" },
    { id: "lightning", label: "электричество" },
    { id: "necrotic", label: "некротическая энергия" },
    { id: "poison", label: "яд" },
    { id: "psychic", label: "психическая энергия" },
    { id: "radiant", label: "излучение" },
    { id: "thunder", label: "звук" },
    { id: "bludgeoning", label: "дробящий" },
    { id: "piercing", label: "колющий" },
    { id: "slashing", label: "рубящий" }
  ];
  function dmgLabel(id) {
    const row = DMG_TYPES.find((t) => t.id === id);
    return row ? row.label : id;
  }
  function defenseProfile() {
    const resist = [];
    if (sheet.poisonResist) resist.push({ type: "poison", label: "яд" });
    (sheet.resistances || []).forEach((id) => {
      if (!resist.some((r) => r.type === id)) resist.push({ type: id, label: dmgLabel(id) });
    });
    return { resist, immune: sheet.immunities || [] };
  }
  function adjustDamage(amount, type) {
    const amt = Math.max(0, Math.floor(Number(amount) || 0));
    if (!type || amt === 0) return { amount: amt, note: "" };
    const def = defenseProfile();
    if (def.immune.indexOf(type) >= 0) return { amount: 0, note: "Иммунитет (" + dmgLabel(type) + "): " + amt + " → 0" };
    if (def.resist.some((r) => r.type === type)) {
      const next = Math.floor(amt / 2);
      return { amount: next, note: "Сопротивление (" + dmgLabel(type) + "): " + amt + " → " + next };
    }
    return { amount: amt, note: "" };
  }
  function renderHp() {
    const box = $("[data-hp-body]");
    if (!box) return;
    const typed = state.padDigits === "" ? 0 : Number(state.padDigits);
    const modes = [
      ["dmg", "Урон"],
      ["heal", "Лечение"],
      ["set", "Задать"],
      ["temp", "Временные"]
    ].map(([k, l]) => `<button type="button" class="${state.padMode === k ? "is-on" : ""}" data-pad-mode="${k}">${l}</button>`).join("");
    const keys = ["1","2","3","4","5","6","7","8","9","⌫","0","Сброс"].map((k) =>
      `<button type="button" data-pad-key="${esc(k)}">${k}</button>`
    ).join("");
    const def = defenseProfile();
    const defBits = [];
    const resistText = def.resist.map((r) => r.label).join(", ");
    const immuneText = (def.immune || []).map(dmgLabel).join(", ");
    if (resistText) defBits.push("Сопротивления: " + resistText);
    if (immuneText) defBits.push("Иммунитеты: " + immuneText);
    const types = DMG_TYPES.map((tp) => {
      const on = sheet.dmgType === tp.id;
      const resist = def.resist.some((r) => r.type === tp.id);
      const immune = (def.immune || []).indexOf(tp.id) >= 0;
      return `<button type="button" class="sheet-chip${on ? " is-on" : ""}${resist ? " is-resist" : ""}${immune ? " is-immune" : ""}" data-sheet-act="dmg-type" data-v="${tp.id}" aria-pressed="${on ? "true" : "false"}">${esc(tp.label)}</button>`;
    }).join("");
    const classes = (typeof identityClasses === "function") ? identityClasses() : (sheet.classes || []);
    const dice = classes.map((c) => {
      const p = (sheet.hitDice && sheet.hitDice[c.id]) || { die: 8, max: c.level || 1, cur: c.level || 1 };
      return `<div class="hp-dice__row"><span>${esc(c.name)} к${p.die} <b>${p.cur}/${p.max}</b></span><button type="button" class="btn" data-spend-hd="${esc(c.id)}" ${p.cur <= 0 ? "disabled" : ""}>Потратить кость</button></div>`;
    }).join("");
    box.innerHTML = `
      <div class="pad-face">
        <div class="v num">${sheet.hp} / ${sheet.hpMax}${state.hpTemp ? " · врем. +" + state.hpTemp : ""}</div>
        <div class="sub">${state.padMode === "temp" ? "временные" : (state.padMode === "heal" ? "лечение" : (state.padMode === "set" ? "новое значение" : "урон"))}: <b class="num">${typed}</b></div>
      </div>
      <p class="hp-def">${defBits.length ? esc(defBits.join(" · ")) : "Сопротивления: нет"}</p>
      <div class="hp-types" role="group" aria-label="Тип урона">${types}</div>
      <div class="pad-modes">${modes}</div>
      <div class="pad-grid">${keys}</div>
      <div class="pad-row">
        <button type="button" class="btn-primary" data-pad-apply>Применить</button>
        <button type="button" class="btn" data-open="max-hp">Максимум…</button>
      </div>
      <div class="hp-dice">
        <p class="hp-dice__lab">Настройки хитов</p>
        ${dice}
      </div>`;
  }

  function renderMaxHp() {
    const box = $("[data-maxhp-body]");
    if (!box) return;
    const rows = (sheet.hpLevels || []);
    const body = rows.map((r) => {
      const trait = r.trait ? ` + ${r.trait} (${esc(r.traitName || "черта")})` : "";
      return `<tr><td>${esc(r.label)}</td><td>к${r.die}</td><td>${r.used} + ТЕЛ ${r.con}${trait}</td><td>${r.total}</td></tr>`;
    }).join("");
    const sum = rows.reduce((a, r) => a + r.total, 0) || sheet.hpMax;
    const note = rows.some((r) => r.traitName)
      ? ""
      : (sheet.race && /дварф/i.test(sheet.race) && /горн/i.test(sheet.race)
        ? "<p class=\"lead\">Дварфийская стойкость к этому персонажу не относится: это горный дварф, не холмовой.</p>"
        : "");
    box.innerHTML = `
      <p class="break__sum">${sum}</p>
      <table class="max-rows">
        <thead><tr><th>Уровень</th><th>Кость</th><th>Слагаемые</th><th>Итого</th></tr></thead>
        <tbody>${body || `<tr><td colspan="4">Разборка максимума для этого персонажа не задана.</td></tr>`}</tbody>
      </table>
      ${note}`;
  }

  function renderCond() {
    const box = $("[data-cond-body]");
    if (!box) return;
    const items = CONDITIONS.map((c) => {
      const on = state.conditions.indexOf(c) >= 0;
      return `<label class="dice-check cond-check${on ? " is-on" : ""}"><input type="checkbox" class="dice-check__input" data-cond="${esc(c)}" ${on ? "checked" : ""}><span class="dice-check__mark" aria-hidden="true">${on ? "✓" : ""}</span> ${esc(c)}</label>`;
    }).join("");
    box.innerHTML = `<p class="lead">Отметь активные состояния.</p><div class="cond-list">${items}</div>`;
  }

  function renderDice() {
    const box = $("[data-dice-body]");
    if (!box) return;
    const btns = DICE.map((n) =>
      `<button type="button" class="${state.diceKind === n ? "is-on" : ""}" data-dice-kind="${n}" aria-label="к${n}">к${n}</button>`
    ).join("");
    box.innerHTML = `
      <div class="dice-grid">${btns}</div>
      <div class="mod-row">
        <span>Модификатор</span>
        <input type="number" inputmode="numeric" data-dice-mod value="${state.diceMod}">
      </div>
      <button type="button" class="btn-primary" data-dice-roll style="width:100%">Бросить к${state.diceKind}</button>
      <div class="dice-result">${esc(state.diceResult)}</div>`;
  }

  function render() {
    const app = $(".app");
    if (app) {
      app.classList.toggle("is-sheet", !!state.dialog && state.dialog !== "conc-damage");
      app.classList.toggle("is-icons", state.board === "icon-compare");
      app.classList.toggle("is-abil", !!state.abilOpen);
    }
    const abilPage = $("[data-abil-page]");
    if (abilPage) {
      abilPage.hidden = !state.abilOpen;
      if (state.abilOpen && typeof renderAbilitiesPage === "function") renderAbilitiesPage();
    }
    const concBd = $("[data-conc-backdrop]");
    if (concBd) concBd.hidden = state.dialog !== "conc-damage";
    const banner = $("[data-banner]");
    if (banner) banner.hidden = !state.banner;
    renderVitals();
    renderScenes();
    renderSceneBody();
    const liveOn = !!(state.dialog && liveEntry(state.dialog) && !MOBILE_OWNED_SHEETS[state.dialog] && !$("[data-sheet='" + state.dialog + "']"));
    let sheetVisible = false;
    $$("[data-sheet]").forEach((el) => {
      const sid = el.getAttribute("data-sheet");
      if (!el.querySelector(":scope > .sheet__grab")) {
        const g = document.createElement("div");
        g.className = "sheet__grab";
        g.setAttribute("aria-hidden", "true");
        el.insertBefore(g, el.firstChild);
      }
      if (sid === "live") el.hidden = !liveOn;
      else el.hidden = !state.dialog || sid !== state.dialog;
      el.classList.remove("is-tall");
      el.style.transform = "";
      if (!el.hidden) sheetVisible = true;
    });
    const backdrop = $("[data-sheet-backdrop]");
    if (backdrop) backdrop.hidden = !sheetVisible;
    const fab = $("[data-roll-center]");
    if (fab) fab.classList.toggle("is-on", state.dialog === "dice");
    if (state.dialog) renderDialog(state.dialog);
    if (typeof renderHelp === "function") renderHelp();
    if (typeof renderTour === "function") renderTour();
    fitVisibleSheets();
    bindSpellDrag();
  }

  function fitVisibleSheets() {
    $$("[data-sheet]").forEach((el) => {
      if (el.hidden) { el.classList.remove("is-tall"); return; }
      el.classList.remove("is-tall");
      const body = el.querySelector(".sheet__body");
      if (!body) return;
      const grab = el.querySelector(".sheet__grab");
      const head = el.querySelector(".sheet__head");
      const foot = el.querySelector(".sheet__foot");
      const chrome = (grab ? grab.offsetHeight : 0) + (head ? head.offsetHeight : 0) + (foot ? foot.offsetHeight : 0);
      const content = body.scrollHeight + chrome + 12;
      const maxH = window.innerHeight - 44;
      if (content >= maxH * 0.78) el.classList.add("is-tall");
    });
  }

  function rollDie(sides) {
    return 1 + Math.floor(Math.random() * sides);
  }

  function rollInit() {
    const die = rollDie(20);
    const total = die + initTotal();
    const line = "к20 (" + die + ") " + fmtMod(initTotal()) + " = " + total;
    if (typeof addRoll === "function") addRoll("Инициатива", line);
    toast("Инициатива: " + line);
  }

  function rollDeath() {
    const die = rollDie(20);
    if (die === 20) {
      sheet.hp = 1;
      state.deathOk = 0;
      state.deathFail = 0;
      toast("Спас от смерти: 20 — встать с 1 хитом");
    } else if (die === 1) {
      state.deathFail = Math.min(3, state.deathFail + 2);
      toast("Спас от смерти: 1 — два провала");
    } else if (die >= 10) {
      state.deathOk = Math.min(3, state.deathOk + 1);
      toast("Спас от смерти: " + die + " — успех");
    } else {
      state.deathFail = Math.min(3, state.deathFail + 1);
      toast("Спас от смерти: " + die + " — провал");
    }
    if (state.deathOk >= 3) {
      state.deathOk = 3;
      toast("Стабилизирован");
    }
    if (state.deathFail >= 3) {
      state.deathFail = 3;
      toast("Персонаж погиб");
    }
    sheet.deathOk = state.deathOk;
    sheet.deathFail = state.deathFail;
    render();
  }

  function applyPad() {
    const n = state.padDigits === "" ? 0 : Number(state.padDigits);
    if (state.padMode === "dmg") {
      const adj = adjustDamage(n, sheet.dmgType);
      if (adj.note) toast(adj.note);
      let left = adj.amount;
      if (state.hpTemp > 0) {
        const use = Math.min(state.hpTemp, left);
        state.hpTemp -= use;
        left -= use;
      }
      sheet.hp = Math.max(0, (Number(sheet.hp) || 0) - left);
      if (sheet.hp === 0 && n > 0) {
        /* marks stay / start dying */
      }
      if (n > 0 && state.concentration) {
        state.concPending = { damage: n, dc: Math.max(10, Math.floor(n / 2)), spellName: state.concentration };
        state.padDigits = "";
        render();
        openDialog("conc-damage");
        return;
      }
    } else if (state.padMode === "heal") {
      sheet.hp = Math.min(sheet.hpMax, (Number(sheet.hp) || 0) + n);
      if (sheet.hp > 0) { state.deathOk = 0; state.deathFail = 0; }
    } else if (state.padMode === "set") {
      sheet.hp = Math.max(0, Math.min(sheet.hpMax, n));
      if (sheet.hp > 0) { state.deathOk = 0; state.deathFail = 0; }
    } else if (state.padMode === "temp") {
      state.hpTemp = n;
    }
    state.padDigits = "";
    render();
  }

  function finishRest() {
    if (state.restKind === "long") {
      sheet.hp = sheet.hpMax;
      state.hpTemp = 0;
      state.exhaustion = Math.max(0, state.exhaustion - 1);
      Object.keys(sheet.hitDice || {}).forEach((id) => { sheet.hitDice[id].cur = sheet.hitDice[id].max; });
      Object.keys(sheet.slots || {}).forEach((lv) => { sheet.slots[lv].cur = sheet.slots[lv].max; });
      if (sheet.channel) sheet.channel.cur = sheet.channel.max;
      if (sheet.hp > 0) { state.deathOk = 0; state.deathFail = 0; }
      toast("Продолжительный отдых завершён");
    } else {
      if (sheet.channel) sheet.channel.cur = sheet.channel.max;
      toast("Короткий отдых завершён");
    }
    render();
  }

  function spendHitDie(id) {
    id = id || Object.keys(sheet.hitDice || {})[0];
    if (!id || !sheet.hitDice || !sheet.hitDice[id] || sheet.hitDice[id].cur <= 0) { toast("Костей хитов нет"); return; }
    const d = sheet.hitDice[id];
    d.cur -= 1;
    const roll = rollDie(d.die) + ability("con");
    sheet.hp = Math.min(sheet.hpMax, (Number(sheet.hp) || 0) + Math.max(0, roll));
    if (sheet.hp > 0) { state.deathOk = 0; state.deathFail = 0; }
    toast("Кость хитов: к" + d.die + " + " + fmtMod(ability("con")) + " → +" + Math.max(0, roll) + " хитов");
    render();
  }


  function changeXp(sign) {
    const raw = state.xpDraft != null && state.xpDraft !== "" ? state.xpDraft : ($("[data-xp-add]") && $("[data-xp-add]").value);
    const d = Math.max(0, Math.trunc(Number(raw) || 0));
    if (!d) return false;
    const delta = sign > 0 ? d : -Math.min(d, sheet.xp || 0);
    if (!delta) return false;
    sheet.xp = Math.max(0, (sheet.xp || 0) + delta);
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const date = pad(now.getDate()) + "." + pad(now.getMonth() + 1) + " " + pad(now.getHours()) + ":" + pad(now.getMinutes());
    sheet.xpLog = sheet.xpLog || [];
    sheet.xpLog.unshift({ date, reason: sheet.xpReason || "", delta });
    state.xpDraft = "";
    return true;
  }
  function handleSheetOrCombatAct(t, e) {
    const act = t.getAttribute("data-sheet-act");
    const cbt = t.getAttribute("data-cbt");
    if (act === "dmg-type") {
      const v = t.getAttribute("data-v");
      sheet.dmgType = (sheet.dmgType === v) ? "" : v;
      refreshOpenSheet();
      return true;
    }
    if (act === "abil-save-prof") {
      sheet.saves = sheet.saves || {};
      const key = sheet.abilityKey || "str";
      sheet.saves[key] = t.getAttribute("data-v") === "1";
      refreshOpenSheet();
      return true;
    }
    if (act === "gender") { sheet.gender = t.getAttribute("data-v"); refreshOpenSheet(); return true; }
    if (act === "avatar-set") { sheet.avatarMode = "photo"; state.avatarMode = "photo"; refreshOpenSheet(); return true; }
    if (act === "avatar-clear") { sheet.avatarMode = "initials"; state.avatarMode = "initials"; refreshOpenSheet(); return true; }
    if (act === "level-up") { openDialog("level-up"); return true; }
    if (act === "homebrew-class") { openDialog("homebrew-class"); return true; }
    if (act === "ac-shield") {
      const wantOn = t.getAttribute("data-v") !== "0";
      if (shieldOn() !== wantOn) {
        if (!wantOn || sheet.shieldAvailable || sheet.shield) sheet.shield = wantOn;
      }
      refreshOpenSheet();
      return true;
    }
    if (act === "bonus-op") {
      const line = (sheet.modifiers || []).find((row) => row.id === t.getAttribute("data-id"));
      if (line) { line.op = t.getAttribute("data-v") || "+"; sheet.activeBonusId = line.id; refreshOpenSheet(); }
      return true;
    }
    if (act === "bonus-on") {
      const line = (sheet.modifiers || []).find((row) => row.id === t.getAttribute("data-id"));
      if (line) { line.enabled = !line.enabled; sheet.activeBonusId = line.id; refreshOpenSheet(); }
      return true;
    }
    if (act === "bonus-del") {
      const id = t.getAttribute("data-id");
      sheet.modifiers = (sheet.modifiers || []).filter((row) => row.id !== id);
      if (sheet.activeBonusId === id) sheet.activeBonusId = null;
      refreshOpenSheet();
      return true;
    }
    if (act === "bonus-add") {
      const line = createBonus(t.getAttribute("data-v") || "ac");
      sheet.modifiers = (sheet.modifiers || []).concat([line]);
      sheet.activeBonusId = line.id;
      refreshOpenSheet();
      const el = document.querySelector("[data-bonus-expr='" + line.id + "']");
      if (el && el.focus) {
        el.focus();
        try { el.setSelectionRange(el.value.length, el.value.length); } catch (err) {}
      }
      return true;
    }
    if (act === "var-toggle") { sheet.pickerOpen = !sheet.pickerOpen; refreshOpenSheet(); return true; }
    if (act === "var-pick") {
      const token = t.getAttribute("data-v") || "";
      const target = bonusTargetForOpen();
      let line = (sheet.modifiers || []).find((row) => row.id === sheet.activeBonusId);
      if (!line) line = bonusesFor(target).slice(-1)[0];
      if (!line) {
        line = createBonus(target, { expr: token });
        sheet.modifiers = (sheet.modifiers || []).concat([line]);
        sheet.activeBonusId = line.id;
        refreshOpenSheet();
        return true;
      }
      const input = document.querySelector("[data-bonus-expr='" + line.id + "']");
      const caret = input ? input.selectionStart : null;
      line.expr = insertToken(line.expr, token, caret);
      sheet.activeBonusId = line.id;
      refreshOpenSheet();
      const again = document.querySelector("[data-bonus-expr='" + line.id + "']");
      if (again && again.focus) {
        again.focus();
        const pos = (caret == null ? String(line.expr).length : Math.min(String(line.expr).length, (caret || 0) + token.length + 1));
        try { again.setSelectionRange(pos, pos); } catch (err) {}
      }
      return true;
    }
    if (act === "xp-add") { changeXp(1); refreshOpenSheet(); return true; }
    if (act === "xp-sub") { changeXp(-1); refreshOpenSheet(); return true; }
    if (act === "xp-log-toggle") { sheet.xpLogOpen = !sheet.xpLogOpen; return true; }
    if (act === "mods-save") {
      const atk = attackById(sheet.breakWeapon);
      if (atk) {
        atk.hitMod = Number(sheet._hitModDraft != null ? sheet._hitModDraft : atk.hitMod) || 0;
        atk.dmgMod = Number(sheet._dmgModDraft != null ? sheet._dmgModDraft : atk.dmgMod) || 0;
      }
      sheet._hitModDraft = null;
      sheet._dmgModDraft = null;
      if (state.dialog === "weapon-mods" || (state.dialog === "combat-extra" && state.extraKind === "weapon-mods")) {
        openDialog("weapon-breakdown");
      } else {
        refreshOpenSheet();
      }
      return true;
    }
    if (cbt === "atk-held") {
      const atk = attackById(t.getAttribute("data-id"));
      if (atk) { atk.held = !atk.held; refreshOpenSheet(); }
      return true;
    }
    if (cbt === "atk-prof") {
      const atk = attackById(t.getAttribute("data-id"));
      if (atk) {
        atk.proficient = !atk.proficient;
        atk.bonus = ability(atk.ability || "str") + (atk.proficient ? pb() : 0);
        refreshOpenSheet();
      }
      return true;
    }
    if (cbt === "atk-remove") {
      const atk = attackById(t.getAttribute("data-id"));
      if (atk) { atk.hidden = true; refreshOpenSheet(); }
      return true;
    }
    if (cbt === "atk-add") {
      const name = String(sheet.newAtkName || "").trim() || "Своя атака";
      const id = "custom-" + Date.now();
      sheet.attacks = sheet.attacks || [];
      sheet.attacks.push({ id, name, source: "custom", sourceRu: "Вручную", ability: "str", abilityRu: "Сила", bonus: ability("str") + pb(), damage: "1к8", dtype: "дробящий", proficient: true, held: false, qty: null, hidden: false, hitMod: 0, dmgMod: 0, activation: null });
      sheet.newAtkName = "";
      refreshOpenSheet();
      return true;
    }
    return false;
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-back-list],[data-open],[data-speed-break],[data-close],[data-toggle-more],[data-expand],[data-collapse],[data-set-scene],[data-chip-magic],[data-chip-actions],[data-toggle-insp],[data-toggle-shield],[data-roll-init],[data-roll-center],[data-roll-death],[data-death-set],[data-cycle-exh],[data-dismiss-effect],[data-goto-companions],[data-open-abilities],[data-banner-later],[data-banner-refresh],[data-tab],[data-tips-again],[data-help-item],[data-avatar-cycle],[data-xp-apply],[data-level-up],[data-wallet-mode],[data-wallet-apply],[data-rest-kind],[data-spend-hd],[data-finish-rest],[data-pad-mode],[data-pad-key],[data-pad-apply],[data-cond],[data-dice-kind],[data-dice-roll],[data-lobby-join],[data-next-round],[data-dice-table],[data-adv],[data-spend-luck],[data-open-rolls],[data-roll-session-init],[data-action-tab],[data-mark-used],[data-turn-act],[data-open-more-turn],[data-more-act],[data-open-attacks],[data-open-turn-settings],[data-toggle-hidden],[data-toggle-held],[data-toggle-mode],[data-roll-attack],[data-roll-damage],[data-open-break],[data-open-item],[data-toggle-fav],[data-use-cons],[data-open-resource],[data-dismiss-conc],[data-dismiss-cond],[data-apply-custom],[data-grapple],[data-open-extra],[data-roll-skill],[data-combat-pane],[data-open-spell-settings],[data-open-prepare],[data-open-grimoire],[data-toggle-focus],[data-toggle-pouch],[data-toggle-book-lost],[data-spell-filter],[data-circle-filter],[data-collapse-all],[data-expand-all],[data-reset-order],[data-toggle-circle],[data-toggle-slot],[data-spell-expand],[data-open-cast],[data-cast-path],[data-cast-slot],[data-confirm-cast],[data-open-cast-break],[data-prepare-tab],[data-prep-toggle],[data-open-custom-spell],[data-cs-ritual],[data-cs-conc],[data-cs-save],[data-settings-advanced],[data-conc-held],[data-conc-broke],[data-grim-caster],[data-wiz-prep]");
    const actEl = e.target.closest("[data-sheet-act], [data-cbt]");
    if (actEl && handleSheetOrCombatAct(actEl, e)) return;
    if (!t) {
      if (state.moreOpen && !e.target.closest("[data-more-pop],[data-toggle-more]")) setMore(false);
      return;
    }
    if (typeof handleMagicClick === "function" && handleMagicClick(t)) return;
    if (t.matches("[data-toggle-more]")) { setMore(!state.moreOpen); return; }
    if (t.matches("[data-close]")) { closeDialog(); return; }
    if (t.matches("[data-open]")) {
      const id = t.getAttribute("data-open");
      if (id === "weapon-breakdown" || id === "weapon-mods") {
        sheet.breakWeapon = t.getAttribute("data-weapon-src") || sheet.breakWeapon;
        if (id === "weapon-mods") { sheet._hitModDraft = null; sheet._dmgModDraft = null; }
      }
      openDialog(id);
      return;
    }
    if (t.matches("[data-speed-break]")) { openDialog("speed-break"); return; }
    if (t.matches("[data-expand]")) { setCollapsed(false); return; }
    if (t.matches("[data-collapse]")) { setCollapsed(true); return; }
    if (t.matches("[data-set-scene]")) { state.magicOpen = false; state.combatPane = "attacks"; setScene(t.getAttribute("data-set-scene")); return; }
    if (t.matches("[data-chip-magic]")) {
      if (!isCaster()) return;
      state.magicOpen = !state.magicOpen;
      state.combatPane = state.magicOpen ? "spells" : "attacks";
      render();
      return;
    }
    if (t.matches("[data-chip-actions]")) { state.magicOpen = false; state.combatPane = "attacks"; setScene("combat"); return; }
    if (t.matches("[data-toggle-insp]")) {
      if (sheet.edition === "2024") state.heroic = !state.heroic;
      else state.inspiration = !state.inspiration;
      render();
      return;
    }
    if (t.matches("[data-toggle-shield]")) {
      if (!sheet.shield && !sheet.shieldAvailable) return;
      sheet.shield = !sheet.shield;
      render();
      return;
    }
    if (t.matches("[data-roll-init]")) { rollInit(); return; }
    if (t.matches("[data-roll-center]")) {
      if (state.dialog === "dice") closeDialog();
      else openDialog("dice");
      return;
    }
    if (t.matches("[data-roll-death]")) { rollDeath(); return; }
    if (t.matches("[data-death-set]")) {
      const [tone, raw] = t.getAttribute("data-death-set").split(":");
      const n = Number(raw);
      if (tone === "ok") state.deathOk = state.deathOk === n ? n - 1 : n;
      else state.deathFail = state.deathFail === n ? n - 1 : n;
      render();
      return;
    }
    if (t.matches("[data-cycle-exh]")) {
      state.exhaustion = state.exhaustion >= 6 ? 0 : state.exhaustion + 1;
      render();
      return;
    }
    if (t.matches("[data-dismiss-effect]")) {
      const i = Number(t.getAttribute("data-dismiss-effect"));
      const ev = state.effects[i];
      if (ev && ((ev.slug || ev) === "rage" || ev === "Ярость" || ev.name === "Ярость")) sheet.raging = false;
      state.effects.splice(i, 1);
      render();
      return;
    }
    if (t.matches("[data-goto-companions]")) { state.magicOpen = false; setScene("companions"); closeDialog(); return; }
    if (t.matches("[data-open-abilities]")) { if (typeof openAbilities === "function") openAbilities(); return; }
    if (t.matches("[data-back-list]")) { toast("К списку персонажей"); return; }
    if (t.matches("[data-banner-later]")) { setBanner(false); return; }
    if (t.matches("[data-banner-refresh]")) { setBanner(false); toast("Лист обновлён"); return; }
    if (t.matches("[data-tab]")) {
      const tab = t.getAttribute("data-tab");
      const names = { chars: "Персонажи", lobby: "Лобби", account: "Кабинет", site: "Сайт КриD20" };
      toast(names[tab] || "");
      return;
    }
    if (t.matches("[data-tips-again]")) { closeDialog(); if (typeof startTour === "function") startTour(0); else toast("Подсказки снова включены"); return; }
    if (t.matches("[data-help-item]")) {
      const map = {
        vitals: "В свёртке — имя, хиты и разворот. При нуле хитов видны метки успехов и провалов. В развороте — КД, щит, скорости, прыжок, инициатива с отдельным броском, бонус мастерства, вдохновение, истощение, кошелёк, отдых и пад хитов.",
        scenes: "Полоса сцен под шапкой. «магия» показывает заклинания вместо атак; повторный тап возвращает к атакам. «действ.» переходит к действиям в сцене «Бой».",
        dice: "Центральная кнопка нижней панели — к20. На листе персонажа она открывает шторку броска, и бросок может попасть в журнал.",
        classic: "Классический лист — тот же персонаж на бланке 2014 для печати, это не второй живой лист."
      };
      const p = $("[data-help-detail]");
      if (p) { p.hidden = false; p.textContent = map[t.getAttribute("data-help-item")] || ""; }
      return;
    }
    if (t.matches("[data-avatar-cycle]")) { toast("Смена аватарки: инициалы или портрет"); return; }
    if (t.matches("[data-xp-apply]")) {
      const inp = $("[data-xp-add]");
      const n = Math.max(0, Number(inp && inp.value) || 0);
      sheet.xp += n;
      toast(n ? ("+" + nb(n) + " опыта") : "Укажи опыт");
      render();
      return;
    }
    if (t.matches("[data-level-up]")) {
      openDialog("level-up");
      return;
    }
    if (t.matches("[data-wallet-mode]")) { state.walletMode = t.getAttribute("data-wallet-mode"); render(); return; }
    if (t.matches("[data-wallet-apply]")) {
      COIN_META.forEach((m) => {
        const n = Number(state.walletDraft[m.key]) || 0;
        if (state.walletMode === "add") sheet.coins[m.key] += n;
        else sheet.coins[m.key] = Math.max(0, (sheet.coins[m.key] || 0) - n);
        state.walletDraft[m.key] = 0;
      });
      render();
      return;
    }
    if (t.matches("[data-rest-kind]")) { state.restKind = t.getAttribute("data-rest-kind"); render(); return; }
    if (t.matches("[data-spend-hd]")) { spendHitDie(t.getAttribute("data-spend-hd") || ""); return; }
    if (t.matches("[data-finish-rest]")) { finishRest(); return; }
    if (t.matches("[data-pad-mode]")) { state.padMode = t.getAttribute("data-pad-mode"); render(); return; }
    if (t.matches("[data-pad-key]")) {
      const k = t.getAttribute("data-pad-key");
      if (k === "⌫") state.padDigits = state.padDigits.slice(0, -1);
      else if (k === "Сброс") state.padDigits = "";
      else if (state.padDigits.length < 4) state.padDigits += k;
      render();
      return;
    }
    if (t.matches("[data-pad-apply]")) { applyPad(); return; }
    if (t.matches("[data-cond]")) {
      const c = t.getAttribute("data-cond");
      const i = state.conditions.indexOf(c);
      if (t.checked && i < 0) state.conditions.push(c);
      if (!t.checked && i >= 0) state.conditions.splice(i, 1);
      return;
    }
    if (t.matches("[data-dice-kind]")) { state.diceKind = Number(t.getAttribute("data-dice-kind")); render(); return; }
    if (t.matches("[data-dice-roll]")) {
      if (typeof doPoolRoll === "function") { doPoolRoll(); return; }
      const die = rollDie(state.diceKind);
      const total = die + (Number(state.diceMod) || 0);
      const mod = Number(state.diceMod) || 0;
      state.diceResult = "к" + state.diceKind + " (" + die + ")" + (mod ? " " + fmtMod(mod) : "") + " = " + total;
      toast(state.diceResult);
      render();
      return;
    }
    if (t.matches("[data-lobby-join]")) {
      const code = ($("[data-lobby-code]") || {}).value || "";
      toast(code.trim() ? "Код принят" : "Введи код стола");
      return;
    }
    if (t.matches("[data-next-round]")) { resetTurn(); return; }
    if (t.matches("[data-dice-table]")) {
      const box = t.matches("input") ? t : (t.querySelector && t.querySelector("input")) || t.closest("label") && t.closest("label").querySelector("input");
      if (box && box.type === "checkbox") state.diceTable = !!box.checked;
      else state.diceTable = !state.diceTable;
      render();
      return;
    }
    if (t.matches("[data-adv]")) { state.adv = t.getAttribute("data-adv") || "norm"; render(); return; }
    if (t.matches("[data-spend-luck]")) {
      if (state.luck > 0) { state.luck -= 1; toast("Удача"); render(); }
      return;
    }
    if (t.matches("[data-open-rolls]")) { openDialog("dice"); return; }
    if (t.matches("[data-roll-session-init]")) { rollInit(); state.initSubmitted = true; render(); return; }
    if (t.matches("[data-mark-used]")) {
      const k = t.getAttribute("data-mark-used");
      if (k && state.used) state.used[k] = !state.used[k];
      render();
      return;
    }
    if (t.matches("[data-action-tab]")) {
      const id = t.getAttribute("data-action-tab");
      state.actionTab = state.actionTab === id ? null : id;
      render();
      return;
    }
    if (t.matches("[data-open-extra]")) {
      const kind = t.getAttribute("data-open-extra");
      if (kind === "grapple") openExtra("grapple", "Захват / Толчок");
      return;
    }
    if (t.matches("[data-turn-act]")) {
      const id = t.getAttribute("data-turn-act");
      if (state.actionTab && state.used) state.used[state.actionTab] = true;
      if (id === "grapple" || t.getAttribute("data-open-extra") === "grapple") {
        openExtra("grapple", "Захват / Толчок");
        return;
      }
      toast((t.textContent || "").trim());
      render();
      return;
    }
    if (t.matches("[data-open-more-turn]")) { state.moreTurn = !state.moreTurn; render(); return; }
    if (t.matches("[data-more-act]")) {
      const lab = (t.textContent || "").trim();
      if (t.getAttribute("data-more-act") === "target") {
        if (typeof openNamedTarget === "function") openNamedTarget();
        else openDialog("named-target");
        return;
      }
      toast(lab);
      return;
    }
    if (t.matches("[data-open-attacks]")) { openExtra("attacks-settings", "Настроить атаки"); return; }
    if (t.matches("[data-open-turn-settings]")) {
      if (showMagicUi() && state.magicOpen) openExtra("spell-settings", "Магия");
      else openExtra("attacks-settings", "Настроить атаки");
      return;
    }
    if (t.matches("[data-toggle-hidden]")) {
      const id = t.getAttribute("data-toggle-hidden");
      const atk = (sheet.attacks || []).find((a) => a.id === id);
      if (atk) atk.hidden = !atk.hidden;
      render();
      return;
    }
    if (t.matches("[data-toggle-held]")) {
      const id = t.getAttribute("data-toggle-held");
      const atk = (sheet.attacks || []).find((a) => a.id === id);
      if (atk) atk.held = !atk.held;
      render();
      return;
    }
    if (t.matches("[data-toggle-mode]")) {
      const id = t.getAttribute("data-toggle-mode");
      state.weaponMode[id] = !state.weaponMode[id];
      render();
      return;
    }
    if (t.matches("[data-roll-attack]")) {
      const id = t.getAttribute("data-roll-attack");
      const atk = (sheet.attacks || []).find((a) => a.id === id);
      if (!atk) return;
      const r = rollWithAdv();
      const total = r.pick + (Number(atk.bonus) || 0);
      const text = r.line + " " + fmtMod(atk.bonus) + " → " + total;
      addRoll("Атака · " + atk.name, text);
      toast(atk.name + ": " + text);
      render();
      return;
    }
    if (t.matches("[data-roll-damage]")) {
      const id = t.getAttribute("data-roll-damage");
      const atk = (sheet.attacks || []).find((a) => a.id === id);
      if (!atk) return;
      const dmg = damageFace(atk);
      const r = rollExpr(dmg);
      const text = r.text + (atk.dtype ? " " + atk.dtype : "");
      addRoll("Урон · " + atk.name, text);
      toast(atk.name + ": " + text);
      render();
      return;
    }
    if (t.matches("[data-open-break]")) {
      state.breakId = t.getAttribute("data-open-break");
      openExtra("break", "Разборка атаки");
      return;
    }
    if (t.matches("[data-open-item]")) {
      state.itemId = t.getAttribute("data-open-item");
      const atk = (sheet.attacks || []).find((a) => a.id === state.itemId);
      openExtra("item", atk ? atk.name : "Предмет");
      return;
    }
    if (t.matches("[data-toggle-fav]")) {
      const raw = t.getAttribute("data-toggle-fav") || "";
      const parts = raw.split(":");
      toggleFav(parts[0], parts[1]);
      return;
    }
    if (t.matches("[data-use-cons]")) {
      const id = t.getAttribute("data-use-cons");
      const it = (sheet.consumables || []).find((c) => c.id === id);
      if (!it || it.qty <= 0) { toast("Расходник кончился"); return; }
      it.qty -= 1;
      toast(it.name + " × " + it.qty);
      render();
      return;
    }
    if (t.matches("[data-open-resource]")) {
      state.resourceId = t.getAttribute("data-open-resource");
      const res = classResources().concat(hotItems()).find((x) => x.id === state.resourceId);
      openExtra("resource", res ? res.name : "Ресурс");
      return;
    }
    if (t.matches("[data-dismiss-conc]")) { state.concentration = null; toast("Концентрация снята"); render(); return; }
    if (t.matches("[data-dismiss-cond]")) {
      const i = Number(t.getAttribute("data-dismiss-cond"));
      if (!Number.isNaN(i)) state.conditions.splice(i, 1);
      render();
      return;
    }
    if (t.matches("[data-apply-custom]")) {
      const n = String(state.customNumber || "").trim();
      if (!n) { toast("Введи число"); return; }
      addRoll("Своё число", n);
      toast("Внесено: " + n);
      render();
      return;
    }
    if (t.matches("[data-grapple]")) {
      const kind = t.getAttribute("data-grapple") === "shove" ? "Толчок" : "Захват";
      const mod = skillTotal("athletics");
      const r = rollWithAdv();
      const total = r.pick + mod;
      const text = r.line + " " + fmtMod(mod) + " → " + total;
      addRoll(kind, text);
      toast(kind + ": " + text);
      render();
      return;
    }
    if (t.matches("[data-roll-skill]")) { rollSkill(t.getAttribute("data-roll-skill")); return; }
  });

  document.addEventListener("input", (e) => {
    const el = e.target;
    if (el.matches("[data-ident]")) {
      sheet[el.getAttribute("data-ident")] = el.value;
      return;
    }
    if (el.matches("[data-ident-name]")) { sheet.name = el.value; if (typeof renderVitals === "function") renderVitals(); return; }
    if (el.matches("[data-ident-race]")) { sheet.race = el.value; return; }
    if (el.matches("[data-ident-bg]")) { sheet.background = el.value; return; }
    if (el.matches("[data-ident-align]")) { sheet.alignment = el.value; return; }
    if (el.matches("[data-ident-feat]")) { sheet.masterFeat = el.value; return; }
    if (el.matches("[data-ident-homebrew]")) { sheet.homebrew = el.value; return; }
    if (el.matches("[data-bonus-label]")) {
      const line = (sheet.modifiers || []).find((row) => row.id === el.getAttribute("data-bonus-label"));
      if (line) { line.label = el.value; sheet.activeBonusId = line.id; }
      return;
    }
    if (el.matches("[data-bonus-expr]")) {
      const line = (sheet.modifiers || []).find((row) => row.id === el.getAttribute("data-bonus-expr"));
      if (line) {
        line.expr = el.value;
        sheet.activeBonusId = line.id;
        const wrap = el.closest(".formula-field");
        const hint = wrap && wrap.querySelector("[data-formula-hint]");
        const result = evalFormula(line.expr, formulaVars());
        if (hint) hint.textContent = result.ok ? String(result.value) : (result.error || "");
        if (wrap) wrap.classList.toggle("is-invalid", !result.ok && !!String(line.expr).trim());
      }
      return;
    }
    if (el.matches("[data-init-override]")) {
      const v = el.value;
      sheet.initOverride = (v === "" ? "" : Number(v));
      return;
    }
    if (el.matches("[data-xp-add]")) { state.xpDraft = el.value; return; }
    if (el.matches("[data-xp-reason]")) { sheet.xpReason = el.value; return; }
    if (el.matches("[data-cbt-input]")) {
      const key = el.getAttribute("data-cbt-input");
      if (key === "new-atk-name") sheet.newAtkName = el.value;
      if (key === "hit-mod") sheet._hitModDraft = el.value;
      if (key === "dmg-mod") sheet._dmgModDraft = el.value;
      return;
    }
    if (el.matches("[data-alt-speed]")) {
      const key = el.getAttribute("data-alt-speed");
      sheet.speeds[key] = Math.max(0, Number(el.value) || 0);
      return;
    }
    if (el.matches("[data-coin-draft]")) {
      state.walletDraft[el.getAttribute("data-coin-draft")] = Math.max(0, Number(el.value) || 0);
      return;
    }
    if (el.matches("[data-dice-mod]")) {
      state.diceMod = Number(el.value) || 0;
      return;
    }
    if (el.matches("[data-spell-search]")) {
      state.spellQuery = el.value;
      render();
      const again = $("[data-spell-search]");
      if (again) {
        again.focus();
        const len = again.value.length;
        try { again.setSelectionRange(len, len); } catch (err) {}
      }
      return;
    }
    if (el.matches("[data-cs-name]")) { state.customSpellDraft.name = el.value; return; }
    if (el.matches("[data-cs-level]")) { state.customSpellDraft.level = Math.max(0, Math.min(9, Number(el.value) || 0)); return; }
    if (el.matches("[data-cs-text]")) { state.customSpellDraft.text = el.value; return; }
    if (el.matches("[data-slot-max]")) {
      const lv = Number(el.getAttribute("data-slot-max"));
      if (sheet.slots && sheet.slots[lv]) {
        sheet.slots[lv].max = Math.max(0, Math.min(9, Number(el.value) || 0));
        if (sheet.slots[lv].cur > sheet.slots[lv].max) sheet.slots[lv].cur = sheet.slots[lv].max;
      }
      return;
    }
  });

  function bindSheetChrome() {
    if (window.__sheetChrome) return;
    window.__sheetChrome = true;
    let startY = 0, dragging = false, sheetEl = null, lastDy = 0;
    document.addEventListener("pointerdown", (e) => {
      const sh = e.target.closest && e.target.closest(".sheet:not([hidden])");
      if (!sh) return;
      if (e.target.closest("[data-sheet-backdrop]")) return;
      if (!e.target.closest(".sheet__grab, .sheet__head")) return;
      if (e.target.closest(".sheet__close, .sheet__back, button, input, select, textarea, a")) return;
      sheetEl = sh;
      startY = e.clientY;
      lastDy = 0;
      dragging = true;
      sh.style.transition = "none";
      try { sh.setPointerCapture(e.pointerId); } catch (err) {}
    });
    document.addEventListener("pointermove", (e) => {
      if (!dragging || !sheetEl) return;
      lastDy = Math.max(0, e.clientY - startY);
      sheetEl.style.transform = "translateY(" + lastDy + "px)";
    });
    function endDrag() {
      if (!dragging || !sheetEl) { dragging = false; sheetEl = null; return; }
      const el = sheetEl;
      const dy = lastDy;
      dragging = false;
      sheetEl = null;
      el.style.transition = "transform 0.2s ease";
      if (dy > 88) {
        el.style.transform = "translateY(110%)";
        setTimeout(() => { el.style.transform = ""; el.style.transition = ""; closeDialog(); }, 200);
      } else {
        el.style.transform = "";
        setTimeout(() => { el.style.transition = ""; }, 200);
      }
    }
    document.addEventListener("pointerup", endDrag);
    document.addEventListener("pointercancel", endDrag);
    document.addEventListener("click", (e) => {
      if (e.target && e.target.closest && e.target.closest("[data-sheet-backdrop]")) closeDialog();
    });
  }
  bindSheetChrome();

  applyPreset("kaedrin");
  (function registerCombatLive() {
    const bag = (typeof LIVE !== "undefined" && LIVE) || (window.SheetLive = window.SheetLive || {});
    bag["weapon-breakdown"] = { title: "Разборка бонуса атаки", body: renderWeaponBreakdown };
    bag["weapon-mods"] = { title: "Модификаторы атаки и урона", body: renderWeaponMods };
  })();

  setTheme("light-designer3");
  render();

  const api = {
    setTheme, setDemoChar, setCollapsed, setDying, setScene, setBanner,
    openDialog, closeDialog, closeAll,
    openDice() { openDialog("dice"); },
    setInspiration(on) { state.inspiration = !!on; render(); },
    setHeroic(on) { state.heroic = !!on; render(); },
    setExhaustion(n) { state.exhaustion = Math.max(0, Math.min(6, Number(n) || 0)); render(); },
    setSpeeds(map) {
      const next = Object.assign({ walk: 25, climb: 0, swim: 0, fly: 0 }, sheet.speeds || {}, map || {});
      delete next.burrow;
      sheet.speeds = next;
      render();
    },
    setBoard(id) { state.board = id || null; if (id) { state.dialog = null; state.moreOpen = false; } render(); },
    setEffects(list) { state.effects = list || []; render(); },
    setMagic(on) {
      state.magicOpen = !!on && isCaster();
      state.combatPane = state.magicOpen ? "spells" : "attacks";
      render();
    },
    setCombat(opts) {
      opts = opts || {};
      if ("adv" in opts) state.adv = opts.adv || "norm";
      if ("luck" in opts) state.luck = Math.max(0, Number(opts.luck) || 0);
      if ("rolls" in opts) {
        if (typeof opts.rolls === "number") {
          const n = Math.max(0, opts.rolls);
          state.rolls = Array.from({ length: n }, (_, i) => ({ label: "Бросок", text: "к20", t: i }));
        } else state.rolls = opts.rolls || [];
      }
      if ("diceTable" in opts) state.diceTable = !!opts.diceTable;
      if ("master" in opts) state.master = !!opts.master;
      if ("inSession" in opts) state.inSession = !!opts.inSession;
      if ("initSubmitted" in opts) state.initSubmitted = !!opts.initSubmitted;
      if ("actionTab" in opts) state.actionTab = opts.actionTab || null;
      if ("moreTurn" in opts) state.moreTurn = !!opts.moreTurn;
      if ("used" in opts) state.used = Object.assign({ action: false, bonus: false, reaction: false }, opts.used || {});
      if ("weaponMode" in opts) state.weaponMode = Object.assign({}, opts.weaponMode || {});
      if ("shield" in opts) {
        if (opts.shield || sheet.shieldAvailable) sheet.shield = !!opts.shield;
      }
      if ("concentration" in opts) state.concentration = opts.concentration || null;
      if ("target" in opts) state.target = opts.target || "";
      if ("inspiration" in opts) state.inspiration = !!opts.inspiration;
      if ("heroic" in opts) state.heroic = !!opts.heroic;
      if ("exhaustion" in opts) state.exhaustion = Math.max(0, Math.min(6, Number(opts.exhaustion) || 0));
      if ("conditions" in opts) state.conditions = (opts.conditions || []).slice();
      if ("combatPane" in opts) {
        state.combatPane = opts.combatPane || "attacks";
        if (state.combatPane === "spells") state.magicOpen = isCaster();
        else if (opts.combatPane === "attacks") state.magicOpen = false;
      }
      if ("spellFilter" in opts) state.spellFilter = opts.spellFilter || "all";
      if ("circleFilter" in opts) state.circleFilter = opts.circleFilter == null ? "" : opts.circleFilter;
      if ("expandedSpell" in opts) state.expandedSpell = opts.expandedSpell || "";
      if ("circlesCollapsed" in opts) state.circlesCollapsed = !!opts.circlesCollapsed;
      if ("collapsedCircles" in opts) {
        state.collapsedCircles = Object.assign({}, opts.collapsedCircles || {});
        if (!("circlesCollapsed" in opts)) state.circlesCollapsed = false;
      }
      render();
    },
    openPrepare() { state.prepareTab = "prepared"; openExtra("prepare", "Подготовить"); },
    openGrimoire() { openExtra("grimoire", "Гримуар"); },
    openSpellSettings() { openExtra("spell-settings", "Магия"); },
    openCast(id) {
      state.castSpellId = id;
      const sp = typeof spellById === "function" ? spellById(id) : null;
      state.castPath = "";
      state.castSlot = sp ? (sp.level || 0) : 0;
      openExtra("cast-spell", "Каст" + (sp ? ": " + sp.name : ""));
    },
    openConcSave,
    toast, render, sheet, state,
    openExtra,
    DEMO_CHARS,
    openAbilities, closeAbilities, setAbil,
    setExplore,
    setCompanions(opts) {
      if (typeof setCompanions === "function") return setCompanions(opts);
    },
    setFeatures(opts) {
      if (window.SheetFeatures && typeof window.SheetFeatures.setFeatures === "function") return window.SheetFeatures.setFeatures(opts);
      if (typeof setFeatures === "function") return setFeatures(opts);
    },
    openConflict, openLuck, openGuidance, openEndurance, openLuckyPick,
    openWelcome, openReady, startTour, stopTour, openNamedTarget, openEnterNumber,
    seedDiceDemo, addDemoCustomSpell, deleteCustomSpell, addDemoCustomBlock, deleteCustomBlock,
    hideAttack, deleteCompanionById,
    deleteInvItem: typeof deleteInvItem === "function" ? deleteInvItem : function () {}
  };
  if (window.SheetMobile && window.SheetMobile.openResource) api.openResource = window.SheetMobile.openResource;
  if (window.SheetMobile && window.SheetMobile.syncResourceFields) api.syncResourceFields = window.SheetMobile.syncResourceFields;
  if (window.SheetMobile && window.SheetMobile.spendRage) api.spendRage = window.SheetMobile.spendRage;
  if (window.SheetMobile && window.SheetMobile.applyRageFromFeature) api.applyRageFromFeature = window.SheetMobile.applyRageFromFeature;
  window.SheetMobile = api;
  window.SheetProto = Object.assign({}, window.SheetProto || {}, api);
})();
