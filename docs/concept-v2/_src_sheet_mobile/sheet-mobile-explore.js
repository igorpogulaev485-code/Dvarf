
  const EXPLORE_SKILLS = ["perception", "investigation", "stealth", "survival", "athletics"];
  const SOCIAL_SKILLS = ["persuasion", "deception", "insight", "intimidation", "performance"];
  const TEXT_ORDER = ["personality", "ideals", "bonds", "flaws", "allies", "background"];
  const TEXT_TITLES = {
    personality: "Черты характера",
    ideals: "Идеалы",
    bonds: "Привязанности",
    flaws: "Слабости",
    allies: "Союзники и организации",
    background: "Предыстория"
  };
  const KAEDRIN_TEXTS = {
    personality: {
      preview: "Спокоен в храме и прям в совете. Слово держит.",
      body: "Спокоен в храме и прям в совете. Слово держит. Говорит коротко, но не сухо — так, чтобы служили и больные, и совет."
    },
    ideals: {
      preview: "Милосердие. Облегчать страдания — долг, а не милость.",
      body: "Милосердие. Облегчать страдания — долг, а не милость. Закон храма стоит на этом, и Каэдрин не делает из помощи сделки."
    },
    bonds: {
      preview: "Орден Солнечного щита. Братья по клятве ждут вестей из похода.",
      body: "Орден Солнечного щита. Братья по клятве ждут вестей из похода. Каэдрин носит их знак на амулете и не снимает его даже в совете."
    },
    flaws: {
      preview: "Не умеет оставлять раненых, даже когда отряд должен отступить.",
      body: "Не умеет оставлять раненых, даже когда отряд должен отступить. Из-за этого уже опаздывал к воротам и однажды чуть не остался один в поле."
    },
    allies: {
      preview: "Храм Морадина в Цитадели; староста селения Камень-на-Броде.",
      body: "Храм Морадина в Цитадели принимает его как своего. Староста придорожного селения Камень-на-Броде должен ордену кров, еду и тишину на ночь для раненых."
    },
    background: {
      preview: "Прислужник. Годы в храме научили обряду, уходу за ранеными и тишине библиотеки.",
      body: "Прислужник. Годы в храме научили обряду, уходу за ранеными и тишине в библиотеке. Умение «Убежище верных» открывается в сцене «Способности»."
    }
  };
  const KAEDRIN_NOTES = [{
    id: "note-1",
    name: "Свои заметки",
    preview: "Не забыть отдать отчёт капитулу после переговоров с советом.",
    body: "Не забыть отдать отчёт капитулу после переговоров с советом. В отчёте — кто принял помощь храма и сколько осталось зелий."
  }];
  const KAEDRIN_APPEARANCE = "Горный дварф крепкого сложения, рыжая борода кольцами, на шее амулет ордена Солнечного щита. На латных наручах — потёртости от щита.";

  function kaedrinAttacksSnapshot() { return []; }
  function mkAtk(o) {
    o = o || {};
    return {
      id: o.id, name: o.name, source: "inventory", sourceRu: "Из инвентаря",
      ability: o.ability, bonus: 0, damage: o.die, dtype: o.dtype,
      proficient: true, held: !!o.held, qty: o.qty == null ? null : o.qty,
      hidden: false, icon: o.icon || "", meta: o.meta || "", tip: o.tip || "", fav: false, ammoName: ""
    };
  }

// extracted from sheet-desktop.html — do not invent items
  const INV_FILTERS = [
    { id: "all", label: "Все" },
    { id: "equipped", label: "Надето" },
    { id: "weapon", label: "Оружие" },
    { id: "armor", label: "Доспех" },
    { id: "pack", label: "Наборы" },
    { id: "other", label: "Прочее" },
    { id: "needs_base", label: "Нужно настроить" }
  ];
  const GEAR_KIND_TABS = [
    { id: "all", label: "Всё" },
    { id: "weapon", label: "Оружие" },
    { id: "armor", label: "Доспехи" },
    { id: "item", label: "Вещи" }
  ];
  const GEAR_ITEM_CATS = [
    { id: "all", label: "Все вещи" },
    { id: "tool", label: "Инструменты" },
    { id: "pack", label: "Наборы" },
    { id: "wondrous", label: "Чудесные" },
    { id: "consumable", label: "Зелья" },
    { id: "focus", label: "Фокусы" },
    { id: "other", label: "Прочее" }
  ];
  const GEAR_RARITY = [
    { id: "all", label: "Любая" },
    { id: "mundane", label: "обыденный" },
    { id: "common", label: "обычный" },
    { id: "uncommon", label: "необычный" },
    { id: "rare", label: "редкий" },
    { id: "very_rare", label: "очень редкий" }
  ];
  const GEAR_BOOKS = [
    { id: "all", label: "Все книги" },
    { id: "PHB", label: "PHB" },
    { id: "DMG", label: "DMG" }
  ];
  const TRANSFER_PEERS = [
    { lobby_id: "lobby-1", lobby_name: "Стол Каэдрина", character_id: "elara", character_name: "Элара" }
  ];
  const SCROLL_NOT_ON_LIST = "Заклинания нет в списке вашего класса — свиток не прочесть (DMG, Свиток заклинания)";
  const SCHOOL_RU = { evocation: "воплощение", abjuration: "ограждение", conjuration: "вызов", divination: "прорицание", enchantment: "очарование", illusion: "иллюзия", necromancy: "некромантия", transmutation: "преобразование" };
  const BINDABLE_SPELLS = [
    { id: "bless", name: "Благословение", level: 1, school: "enchantment", classes: ["cleric", "paladin"], ritual: false, concentration: true },
    { id: "cure-wounds", name: "Лечение ран", level: 1, school: "evocation", classes: ["cleric", "paladin", "druid", "bard", "ranger"], ritual: false, concentration: false },
    { id: "shield-of-faith", name: "Щит веры", level: 1, school: "abjuration", classes: ["cleric", "paladin"], ritual: false, concentration: true },
    { id: "detect-magic", name: "Обнаружение магии", level: 1, school: "divination", classes: ["cleric", "wizard", "bard", "druid", "paladin", "sorcerer"], ritual: true, concentration: true },
    { id: "guiding-bolt", name: "Направляющий снаряд", level: 1, school: "evocation", classes: ["cleric"], ritual: false, concentration: false },
    { id: "healing-word", name: "Лечащее слово", level: 1, school: "evocation", classes: ["cleric", "bard", "druid"], ritual: false, concentration: false },
    { id: "shield-spell", name: "Щит", level: 1, school: "abjuration", classes: ["wizard", "sorcerer"], ritual: false, concentration: false },
    { id: "magic-missile", name: "Волшебная стрела", level: 1, school: "evocation", classes: ["wizard", "sorcerer"], ritual: false, concentration: false },
    { id: "fireball", name: "Огненный шар", level: 3, school: "evocation", classes: ["wizard", "sorcerer"], ritual: false, concentration: false },
    { id: "revivify", name: "Оживление", level: 3, school: "necromancy", classes: ["cleric", "paladin"], ritual: false, concentration: false },
    { id: "guardian-of-faith", name: "Страж веры", level: 4, school: "conjuration", classes: ["cleric"], ritual: false, concentration: false }
  ];
  const GEAR_CATALOG = [
    { id: "warhammer", name: "Боевой молот", kind: "weapon", rarity: "mundane", book: "PHB", meta: "воинское · 1к8 дробящий · универсальное · 2 фнт", weight: 2, bucket: "weapon" },
    { id: "spear", name: "Копьё", kind: "weapon", rarity: "mundane", book: "PHB", meta: "простое · 1к6 колющий · метательное · 3 фнт", weight: 3, bucket: "weapon" },
    { id: "mace", name: "Булава", kind: "weapon", rarity: "mundane", book: "PHB", meta: "простое · 1к6 дробящий · 4 фнт", weight: 4, bucket: "weapon" },
    { id: "longbow", name: "Длинный лук", kind: "weapon", rarity: "mundane", book: "PHB", meta: "воинское · 1к8 колющий · двуручное · 2 фнт", weight: 2, bucket: "weapon" },
    { id: "light-crossbow", name: "Лёгкий арбалет", kind: "weapon", rarity: "mundane", book: "PHB", meta: "простое · 1к8 колющий · 5 фнт", weight: 5, bucket: "weapon" },
    { id: "arrows", name: "Стрелы", kind: "item", category: "other", rarity: "mundane", book: "PHB", meta: "боеприпас · связка 20 · 1 фнт", weight: 0.05, bucket: "other", packQty: 20 },
    { id: "bolts", name: "Арбалетные болты", kind: "item", category: "other", rarity: "mundane", book: "PHB", meta: "боеприпас · связка 20 · 1½ фнт", weight: 0.075, bucket: "other", packQty: 20 },
    { id: "shield", name: "Щит", kind: "armor", rarity: "mundane", book: "PHB", meta: "щит · +2 КД · 6 фнт", weight: 6, bucket: "armor", armor_kind: "shield", base_ac: 2 },
    { id: "leather", name: "Кожаный доспех", kind: "armor", rarity: "mundane", book: "PHB", meta: "лёгкий · КД 11+Лов · 10 фнт", weight: 10, bucket: "armor", armor_kind: "light", base_ac: 11 },
    { id: "hide", name: "Шкурный доспех", kind: "armor", rarity: "mundane", book: "PHB", meta: "средний · КД 12+Лов (макс. 2) · 12 фнт", weight: 12, bucket: "armor", armor_kind: "medium", base_ac: 12 },
    { id: "chain-shirt", name: "Кольчужная рубаха", kind: "armor", rarity: "mundane", book: "PHB", meta: "средний · КД 13+Лов (макс. 2) · 20 фнт", weight: 20, bucket: "armor", armor_kind: "medium", base_ac: 13 },
    { id: "scale", name: "Чешуйчатый доспех", kind: "armor", rarity: "mundane", book: "PHB", meta: "средний · КД 14+Лов (макс. 2) · 45 фнт", weight: 45, bucket: "armor", armor_kind: "medium", base_ac: 14, stealth: true },
    { id: "chainmail", name: "Кольчуга", kind: "armor", rarity: "mundane", book: "PHB", meta: "тяжёлый · КД 16 · Сила 13 · 55 фнт", weight: 55, bucket: "armor", armor_kind: "heavy", base_ac: 16, stealth: true, str_req: 13 },
    { id: "splint", name: "Наборный доспех", kind: "armor", rarity: "mundane", book: "PHB", meta: "тяжёлый · КД 17 · Сила 15 · 60 фнт", weight: 60, bucket: "armor", armor_kind: "heavy", base_ac: 17, stealth: true, str_req: 15, family: "heavy-plate", familyLabel: "Тяжёлые доспехи" },
    { id: "plate", name: "Латы", kind: "armor", rarity: "mundane", book: "PHB", meta: "тяжёлый · КД 18 · Сила 15 · 65 фнт", weight: 65, bucket: "armor", armor_kind: "heavy", base_ac: 18, stealth: true, str_req: 15, family: "heavy-plate", familyLabel: "Тяжёлые доспехи" },
    { id: "potion-healing", name: "Зелье лечения", kind: "item", category: "consumable", rarity: "common", book: "PHB", meta: "расходник · 2к4+2 хитов · 0,5 фнт", weight: 0.5, bucket: "other", family: "potions", familyLabel: "Зелья лечения", heal: "2к4+2" },
    { id: "potion-greater", name: "Зелье большего лечения", kind: "item", category: "consumable", rarity: "uncommon", book: "DMG", meta: "расходник · 4к4+4 хитов · 0,5 фнт", weight: 0.5, bucket: "other", family: "potions", familyLabel: "Зелья лечения", heal: "4к4+4" },
    { id: "potion-superior", name: "Зелье превосходного лечения", kind: "item", category: "consumable", rarity: "rare", book: "DMG", meta: "расходник · 8к4+8 хитов · 0,5 фнт", weight: 0.5, bucket: "other", family: "potions", familyLabel: "Зелья лечения", heal: "8к4+8" },
    { id: "scroll-1", name: "Свиток заклинания (1 круг)", kind: "item", category: "wondrous", rarity: "common", book: "DMG", meta: "свиток 1 круга · укажи заклинание", weight: 0, bucket: "other", isScroll: true, scrollLevel: 1, family: "scrolls", familyLabel: "Свитки заклинаний" },
    { id: "scroll-2", name: "Свиток заклинания (2 круг)", kind: "item", category: "wondrous", rarity: "uncommon", book: "DMG", meta: "свиток 2 круга · укажи заклинание", weight: 0, bucket: "other", isScroll: true, scrollLevel: 2, family: "scrolls", familyLabel: "Свитки заклинаний" },
    { id: "scroll-4", name: "Свиток заклинания (4 круг)", kind: "item", category: "wondrous", rarity: "rare", book: "DMG", meta: "свиток 4 круга · укажи заклинание", weight: 0, bucket: "other", isScroll: true, scrollLevel: 4, family: "scrolls", familyLabel: "Свитки заклинаний" },
    { id: "holy-symbol", name: "Священный символ", kind: "item", category: "focus", rarity: "mundane", book: "PHB", meta: "фокус заклинаний жреца · 1 фнт", weight: 1, bucket: "other", family: "symbols", familyLabel: "Священные символы" },
    { id: "amulet-symbol", name: "Амулет (священный символ)", kind: "item", category: "focus", rarity: "mundane", book: "PHB", meta: "фокус · амулет · 1 фнт", weight: 1, bucket: "other", family: "symbols", familyLabel: "Священные символы" },
    { id: "emblem", name: "Эмблема (священный символ)", kind: "item", category: "focus", rarity: "mundane", book: "PHB", meta: "фокус · эмблема", weight: 0, bucket: "other", family: "symbols", familyLabel: "Священные символы" },
    { id: "explorers-pack", name: "Набор путешественника", kind: "item", category: "pack", rarity: "mundane", book: "PHB", meta: "рюкзак и содержимое · 39 фнт", weight: 39, bucket: "pack", isPack: true },
    { id: "priests-pack", name: "Набор священника", kind: "item", category: "pack", rarity: "mundane", book: "PHB", meta: "набор · 19 фнт", weight: 19, bucket: "pack", isPack: true },
    { id: "mason-tools", name: "Инструменты каменщика", kind: "item", category: "tool", rarity: "mundane", book: "PHB", meta: "инструмент · 8 фнт", weight: 8, bucket: "other" },
    { id: "thieves-tools", name: "Воровские инструменты", kind: "item", category: "tool", rarity: "mundane", book: "PHB", meta: "инструмент · 1 фнт", weight: 1, bucket: "other" },
    { id: "ring-protection", name: "Кольцо защиты", kind: "item", category: "wondrous", rarity: "rare", book: "DMG", meta: "настройка · КД +1 · спасы +1", weight: 0, bucket: "other", requires_attunement: true, bonuses: { ac: 1, save_all: 1 } },
    { id: "ioun-strength", name: "Камень Йоун: сила", kind: "item", category: "wondrous", rarity: "very_rare", book: "DMG", meta: "настройка · Сила +2", weight: 0, bucket: "other", requires_attunement: true, bonuses: { str_score: 2 } },
    { id: "cloak-protection", name: "Плащ защиты", kind: "item", category: "wondrous", rarity: "uncommon", book: "DMG", meta: "настройка · КД +1 · спасы +1", weight: 1, bucket: "other", requires_attunement: true, bonuses: { ac: 1, save_all: 1 } },
    { id: "torch", name: "Факел", kind: "item", category: "other", rarity: "mundane", book: "PHB", meta: "1 фнт", weight: 1, bucket: "other" },
    { id: "rope", name: "Верёвка 50 фт", kind: "item", category: "other", rarity: "mundane", book: "PHB", meta: "10 фнт", weight: 10, bucket: "other" }
  ];

  const PACK_CONTENTS = [
    { id: "pack-backpack", name: "Рюкзак", weight: 5, bucket: "other" },
    { id: "pack-bedroll", name: "Спальник", weight: 7, bucket: "other" },
    { id: "pack-mess", name: "Столовый набор", weight: 1, bucket: "other" },
    { id: "pack-tinder", name: "Огниво", weight: 1, bucket: "other" },
    { id: "pack-torches", name: "Факелы", weight: 1, qty: 10, bucket: "other" },
    { id: "pack-rations", name: "Паёк на 10 дней", weight: 10, bucket: "other" },
    { id: "pack-skin", name: "Бурдюк", weight: 5, bucket: "other" },
    { id: "pack-rope", name: "Верёвка 50 фт", weight: 0, bucket: "other" }
  ];
  /* Содержимое набора учёного — prod, backend/data/srd/2014/gear_backfill_v1.json (scholars_pack.contents). Имена и веса оттуда же. */
  const SCHOLAR_PACK_CONTENTS = [
    { id: "sch-backpack", name: "Рюкзак", weight: 5, bucket: "other" },
    { id: "sch-book", name: "Книга", weight: 5, bucket: "other" },
    { id: "sch-ink", name: "Чернила (бутылочка 30 г)", weight: 0, bucket: "other" },
    { id: "sch-pen", name: "Писчее перо", weight: 0, bucket: "other" },
    { id: "sch-parchment", name: "Пергамент (лист)", weight: 0, qty: 10, bucket: "other" },
    { id: "sch-sand", name: "Маленький мешочек с песком", weight: 0, bucket: "other" },
    { id: "sch-knife", name: "Небольшой нож", weight: 0, bucket: "other" }
  ];
  function packContentsOf(it) {
    if (!it || !it.isPack) return [];
    if (it.id === "scholars-pack") return SCHOLAR_PACK_CONTENTS;
    if (it.id === "explorers-pack") return PACK_CONTENTS;
    return [];
  }
  function packIsExpanded(it) {
    if (!it || !sheet.inv.packExpanded) return false;
    return (sheet.inv.packId || "explorers-pack") === it.id;
  }
  function packNoteOf(id) {
    return id === "scholars-pack" ? "Из набора учёного." : "Из набора путешественника.";
  }

  function defaultInventoryItems() {
    return [
      { id: "chainmail", name: "Кольчуга", bucket: "armor", armor_kind: "heavy", base_ac: 16, equipped: true, held: false, weight: 55, qty: 1, notes: "Тяжёлый доспех. КД 16, помеха на Скрытность. Сила 13 — есть.", stealth: true, str_req: 13, role: "доспех" },
      { id: "shield", name: "Щит", bucket: "armor", armor_kind: "shield", base_ac: 2, equipped: true, held: true, weight: 6, qty: 1, notes: "Щит в руке даёт +2 КД.", role: "щит" },
      { id: "warhammer", name: "Боевой молот", bucket: "weapon", equipped: false, held: true, weight: 2, qty: 1, notes: "Воинское оружие, универсальное. В одной руке 1к8, в двух — 1к10.", meta: "оружие · 1к8+4 дробящий · универсальное", role: "оружие" },
      { id: "spear", name: "Копьё", bucket: "weapon", equipped: false, held: false, weight: 3, qty: 1, notes: "Простое оружие, метательное, универсальное. В одной руке 1к6, в двух — 1к8.", meta: "оружие · 1к6+4 колющий · метательное, универсальное", role: "оружие" },
      { id: "longbow", name: "Длинный лук", bucket: "weapon", equipped: false, held: false, weight: 2, qty: 1, notes: "Воинское оружие, боеприпас, двуручное, тяжёлое. Урон 1к8 колющий.", meta: "оружие · 1к8+3 колющий · боеприпас, двуручное", role: "оружие" },
      { id: "crossbow", name: "Лёгкий арбалет", bucket: "weapon", equipped: false, held: false, weight: 5, qty: 1, notes: "Простое оружие, боеприпас, двуручное, перезарядка. Урон 1к8 колющий.", meta: "оружие · 1к8+1 колющий · боеприпас, перезарядка", role: "оружие" },
      { id: "arrows", name: "Стрелы", bucket: "other", equipped: false, held: false, weight: 0.05, qty: 20, notes: "Боеприпас для лука. Связка: 20 стрел весят 1 фнт.", meta: "боеприпас · связка 20", role: "боеприпас" },
      { id: "bolts", name: "Арбалетные болты", bucket: "other", equipped: false, held: false, weight: 0.075, qty: 20, notes: "Боеприпас для арбалета. Связка: 20 болтов весят 1½ фнт.", meta: "боеприпас · связка 20", role: "боеприпас" },
      { id: "amulet", name: "Амулет неувядающей молитвы", bucket: "other", equipped: false, held: false, weight: 1, qty: 1, requires_attunement: true, charges: 2, chargesMax: 3, notes: "Священный амулет. Пока настроен, можно потратить заряд как бонусное, чтобы восстановить 2к6 хитов.", role: "настройка" },
      { id: "ring-protection", name: "Кольцо защиты", bucket: "other", equipped: true, held: false, weight: 0, qty: 1, requires_attunement: true, bonuses: { ac: 1, save_all: 1 }, notes: "Пока кольцо надето и настроено, ты получаешь +1 к КД и спасброскам.", meta: "настройка · КД +1 · спасы +1", role: "настройка" },
      { id: "ioun-strength", name: "Камень Йоун: сила", bucket: "other", equipped: true, held: false, weight: 0, qty: 1, requires_attunement: true, bonuses: { str_score: 2 }, notes: "Пока камень настроен, Сила увеличивается на 2 (не выше 20).", meta: "настройка · Сила +2", role: "настройка" },
      { id: "potion-healing", name: "Зелье лечения", bucket: "other", equipped: false, weight: 0.5, qty: 2, favorite: true, heal: "2к4+2", notes: "Действием выпить: восстанавливает 2к4+2 хитов.", role: "расходник" },
      { id: "holy-symbol", name: "Священный символ", bucket: "other", equipped: false, weight: 1, qty: 1, notes: "Можно использовать как фокус заклинаний жреца вместо набора материальных компонентов без стоимости.", role: "фокус" },
      { id: "explorers-pack", name: "Набор путешественника", bucket: "pack", equipped: false, weight: 39, qty: 1, isPack: true, notes: "Развернуть набор — содержимое становится отдельными предметами; свернуть — снова одним свёртком.", role: "набор" },
      { id: "scroll-bless", name: "Свиток «Благословение»", bucket: "other", equipped: false, weight: 0, qty: 1, isScroll: true, scrollLevel: 1, scroll_spell: { id: "bless", name: "Благословение", level: 1, school: "enchantment", classes: ["cleric", "paladin"], ritual: false, concentration: true }, notes: "Свиток уже привязан к заклинанию «Благословение». Каст тратит свиток и не тратит ячейку.", role: "свиток" },
      { id: "scroll-blank", name: "Свиток заклинания", bucket: "other", equipped: false, weight: 0, qty: 1, isScroll: true, scrollLevel: 1, scroll_spell: null, needs: true, notes: "Свиток без подписи: сначала укажи, какое заклинание на нём, затем можно кастовать.", role: "свиток" },
      { id: "mason-tools", name: "Инструменты каменщика", bucket: "other", equipped: false, weight: 8, qty: 1, notes: "Набор для тёски и кладки. Владение — от дварфийской тренировки.", role: "инструмент" }
    ];
  }

    function kaedrinAttune() {
      return [
        { id: "slot-1", item_id: "amulet", name: "Амулет неувядающей молитвы", notes: "заряды 2/3" },
        { id: "slot-2", item_id: "ring-protection", name: "Кольцо защиты", notes: "" },
        { id: "slot-3", item_id: "ioun-strength", name: "Камень Йоун: сила", notes: "Сила +2" }
      ];
    }
    function emptyAttune() {
      return [
        { id: "slot-1", item_id: "", name: "", notes: "" },
        { id: "slot-2", item_id: "", name: "", notes: "" },
        { id: "slot-3", item_id: "", name: "", notes: "" }
      ];
    }
    function potionCons(qty) {
      return [{ id: "potion", name: "Зелье лечения", qty: qty == null ? 2 : qty, fav: true, note: "2к4+2 хитов" }];
    }
    function potionItem(qty) {
      return { id: "potion-healing", name: "Зелье лечения", bucket: "other", equipped: false, weight: 0.5, qty: qty == null ? 2 : qty, favorite: true, heal: "2к4+2", notes: "Действием выпить: восстанавливает 2к4+2 хитов.", role: "расходник" };
    }
    function packItem(id, name) {
      return { id: id, name: name, bucket: "pack", equipped: false, weight: 39, qty: 1, isPack: true, notes: "Набор снаряжения. Разверни, чтобы увидеть содержимое.", role: "набор" };
    }

    function inventoryLoadoutFor(id) {
      var charId = id || (sheet && sheet.charId) || "kaedrin";
      if (charId === "kaedrin") {
        return {
          items: (typeof defaultInventoryItems === "function") ? defaultInventoryItems() : [],
          attunements: kaedrinAttune(),
          attacks: kaedrinAttacksSnapshot(),
          consumables: [
            { id: "potion", name: "Зелье лечения", qty: 2, fav: true, note: "2к4+2 хитов" },
            { id: "holy", name: "Святая вода", qty: 1, fav: false, note: "2к6 излучение по нежити" },
            { id: "acid", name: "Флакон кислоты", qty: 1, fav: false, note: "2к6 кислота" }
          ]
        };
      }
      if (charId === "brana") {
        return {
          items: [
            { id: "hide", name: "Шкурный доспех", bucket: "armor", armor_kind: "medium", base_ac: 12, equipped: true, held: false, weight: 12, qty: 1, notes: "Средний доспех. КД 12 + Ловкость (макс. 2).", role: "доспех" },
            { id: "shield", name: "Деревянный щит", bucket: "armor", armor_kind: "shield", base_ac: 2, equipped: true, held: true, weight: 6, qty: 1, notes: "Деревянный щит друида. +2 КД.", role: "щит" },
            { id: "scimitar", name: "Симитар", bucket: "weapon", equipped: false, held: true, weight: 3, qty: 1, notes: "Воинское оружие, фехтовальное, лёгкое. Урон 1к6 рубящий.", role: "оружие" },
            { id: "quarterstaff", name: "Боевой посох", bucket: "weapon", equipped: false, held: false, weight: 4, qty: 1, notes: "Простое оружие, универсальное. В одной руке 1к6, в двух — 1к8 дробящий.", role: "оружие" },
            { id: "druidic-focus", name: "Друидическая фокусировка", bucket: "other", equipped: false, weight: 1, qty: 1, notes: "Омела или тотем: фокус заклинаний друида.", role: "фокус" },
            { id: "herbalism-kit", name: "Набор травника", bucket: "other", equipped: false, weight: 3, qty: 1, notes: "Инструменты для сбора трав и приготовления снадобий.", role: "инструмент" },
            packItem("explorers-pack", "Набор путешественника"),
            potionItem(2)
          ],
          attunements: emptyAttune(),
          attacks: [
            mkAtk({ id: "scimitar", name: "Симитар", ability: "dex", die: "1к6", dtype: "рубящий", held: true, icon: "wp-sword", meta: "симитар · 5 фт · фехтовальное, лёгкое", tip: "Симитар · рубящий 1к6 · воинское, фехтовальное" }),
            mkAtk({ id: "quarterstaff", name: "Боевой посох", ability: "str", die: "1к6", dtype: "дробящий", held: false, icon: "wp-staff", meta: "посох · 5 фт · универсальное", tip: "Боевой посох · дробящий 1к6 · простое, универсальное" })
          ],
          consumables: potionCons(2)
        };
      }
      if (charId === "ilis") {
        return {
          items: [
            { id: "quarterstaff", name: "Боевой посох", bucket: "weapon", equipped: false, held: true, weight: 4, qty: 1, notes: "Простое оружие, универсальное. В одной руке 1к6, в двух — 1к8 дробящий.", role: "оружие" },
            { id: "dagger", name: "Кинжал", bucket: "weapon", equipped: false, held: false, weight: 1, qty: 1, notes: "Простое оружие, фехтовальное, лёгкое, метательное. Урон 1к4 колющий.", role: "оружие" },
            { id: "arcane-focus", name: "Магическая фокусировка", bucket: "other", equipped: false, weight: 1, qty: 1, notes: "Кристалл или жезл: фокус заклинаний волшебника.", role: "фокус" },
            { id: "spellbook", name: "Книга заклинаний", bucket: "other", equipped: false, weight: 3, qty: 1, notes: "Гримуар Илиса. Без книги подготовка новых заклинаний закрыта.", role: "книга" },
            { id: "ink", name: "Чернила и перо", bucket: "other", equipped: false, weight: 0, qty: 1, notes: "Для переписи заклинаний в книгу.", role: "инструмент" },
            packItem("scholars-pack", "Набор учёного"),
            potionItem(2)
          ],
          attunements: emptyAttune(),
          attacks: [
            mkAtk({ id: "quarterstaff", name: "Боевой посох", ability: "str", die: "1к6", dtype: "дробящий", held: true, icon: "wp-staff", meta: "посох · 5 фт · универсальное", tip: "Боевой посох · дробящий 1к6 · простое, универсальное" }),
            mkAtk({ id: "dagger", name: "Кинжал", ability: "dex", die: "1к4", dtype: "колющий", held: false, icon: "wp-dagger", meta: "кинжал · 20/60 фт · фехтовальное, метательное", tip: "Кинжал · колющий 1к4 · простое, фехтовальное" })
          ],
          consumables: potionCons(2)
        };
      }
      if (charId === "aren") {
        return {
          items: [
            { id: "chainmail", name: "Кольчуга", bucket: "armor", armor_kind: "heavy", base_ac: 16, equipped: true, held: false, weight: 55, qty: 1, notes: "Тяжёлый доспех. КД 16, помеха на Скрытность. Сила 13 — есть.", stealth: true, str_req: 13, role: "доспех" },
            { id: "shield", name: "Щит", bucket: "armor", armor_kind: "shield", base_ac: 2, equipped: true, held: true, weight: 6, qty: 1, notes: "Щит в руке даёт +2 КД.", role: "щит" },
            { id: "longsword", name: "Длинный меч", bucket: "weapon", equipped: false, held: true, weight: 3, qty: 1, notes: "Воинское оружие, универсальное. В одной руке 1к8, в двух — 1к10 рубящий.", role: "оружие" },
            { id: "javelin", name: "Метательные копья", bucket: "weapon", equipped: false, held: false, weight: 2, qty: 5, notes: "Простое оружие, метательное. Урон 1к6 колющий. 5 штук.", role: "оружие" },
            { id: "holy-symbol", name: "Священный символ", bucket: "other", equipped: false, weight: 1, qty: 1, notes: "Фокус заклинаний паладина.", role: "фокус" },
            packItem("explorers-pack", "Набор путешественника"),
            potionItem(2)
          ],
          attunements: emptyAttune(),
          attacks: [
            mkAtk({ id: "longsword", name: "Длинный меч", ability: "str", die: "1к8", dtype: "рубящий", held: true, icon: "wp-sword", meta: "меч · 5 фт · универсальное", tip: "Длинный меч · рубящий 1к8 · воинское, универсальное" }),
            mkAtk({ id: "javelin", name: "Метательные копья", ability: "str", die: "1к6", dtype: "колющий", held: false, qty: 5, icon: "wp-spear", meta: "копьё · 30/120 фт · метательное", tip: "Метательные копья · колющий 1к6 · простое, метательное" })
          ],
          consumables: potionCons(2)
        };
      }
      if (charId === "nilla") {
        return {
          items: [
            { id: "leather", name: "Кожаный доспех", bucket: "armor", armor_kind: "light", base_ac: 11, equipped: true, held: false, weight: 10, qty: 1, notes: "Лёгкий доспех. КД 11 + модификатор Ловкости.", role: "доспех" },
            { id: "rapier", name: "Рапира", bucket: "weapon", equipped: false, held: true, weight: 2, qty: 1, notes: "Воинское оружие, фехтовальное. Урон 1к8 колющий.", role: "оружие" },
            { id: "shortbow", name: "Короткий лук", bucket: "weapon", equipped: false, held: false, weight: 2, qty: 1, notes: "Простое оружие, боеприпас, двуручное. Урон 1к6 колющий.", role: "оружие" },
            { id: "arrows", name: "Стрелы", bucket: "other", equipped: false, held: false, weight: 0.05, qty: 20, notes: "Боеприпас для лука. Связка: 20 стрел.", role: "боеприпас" },
            { id: "dagger", name: "Кинжалы", bucket: "weapon", equipped: false, held: false, weight: 1, qty: 2, notes: "Два кинжала. Простое фехтовальное метательное оружие, 1к4 колющий.", role: "оружие" },
            { id: "thieves-tools", name: "Воровские инструменты", bucket: "other", equipped: false, weight: 1, qty: 1, notes: "Отмычки и инструменты взломщика. Владение — от класса плута.", role: "инструмент" },
            packItem("burglars-pack", "Набор взломщика"),
            potionItem(2)
          ],
          attunements: emptyAttune(),
          attacks: [
            mkAtk({ id: "rapier", name: "Рапира", ability: "dex", die: "1к8", dtype: "колющий", held: true, icon: "wp-sword", meta: "рапира · 5 фт · фехтовальное", tip: "Рапира · колющий 1к8 · воинское, фехтовальное" }),
            mkAtk({ id: "shortbow", name: "Короткий лук", ability: "dex", die: "1к6", dtype: "колющий", held: false, qty: 20, ammoName: "Стрелы", icon: "wp-bow", meta: "луки · 80/320 фт · двуручное", tip: "Короткий лук · колющий 1к6 · простое, боеприпас" }),
            mkAtk({ id: "dagger", name: "Кинжалы", ability: "dex", die: "1к4", dtype: "колющий", held: false, qty: 2, icon: "wp-dagger", meta: "кинжал · 20/60 фт · фехтовальное, метательное", tip: "Кинжалы · колющий 1к4 · простое, фехтовальное" })
          ],
          consumables: potionCons(2)
        };
      }
      if (charId === "gorn") {
        return {
          items: [
            { id: "greataxe", name: "Секира", bucket: "weapon", equipped: false, held: true, weight: 7, qty: 1, notes: "Воинское оружие, двуручное, тяжёлое. Урон 1к12 рубящий.", role: "оружие" },
            { id: "handaxe", name: "Ручные топоры", bucket: "weapon", equipped: false, held: false, weight: 2, qty: 2, notes: "Простое оружие, лёгкое, метательное. Урон 1к6 рубящий. Два топора.", role: "оружие" },
            { id: "javelin", name: "Метательные копья", bucket: "weapon", equipped: false, held: false, weight: 2, qty: 4, notes: "Простое оружие, метательное. Урон 1к6 колющий. 4 штуки.", role: "оружие" },
            packItem("explorers-pack", "Набор путешественника"),
            potionItem(2)
          ],
          attunements: emptyAttune(),
          attacks: [
            mkAtk({ id: "greataxe", name: "Секира", ability: "str", die: "1к12", dtype: "рубящий", held: true, icon: "wp-axe", meta: "секира · 5 фт · двуручное, тяжёлое", tip: "Секира · рубящий 1к12 · воинское, двуручное" }),
            mkAtk({ id: "handaxe", name: "Ручные топоры", ability: "str", die: "1к6", dtype: "рубящий", held: false, qty: 2, icon: "wp-axe", meta: "топор · 20/60 фт · лёгкое, метательное", tip: "Ручные топоры · рубящий 1к6 · простое, метательное" }),
            mkAtk({ id: "javelin", name: "Метательные копья", ability: "str", die: "1к6", dtype: "колющий", held: false, qty: 4, icon: "wp-spear", meta: "копьё · 30/120 фт · метательное", tip: "Метательные копья · колющий 1к6 · простое, метательное" })
          ],
          consumables: potionCons(2)
        };
      }
      if (charId === "sira") {
        return {
          items: [
            { id: "crossbow", name: "Лёгкий арбалет", bucket: "weapon", equipped: false, held: true, weight: 5, qty: 1, notes: "Простое оружие, боеприпас, двуручное, перезарядка. Урон 1к8 колющий.", role: "оружие" },
            { id: "bolts", name: "Арбалетные болты", bucket: "other", equipped: false, held: false, weight: 0.075, qty: 20, notes: "Боеприпас для арбалета. Связка: 20 болтов.", role: "боеприпас" },
            { id: "dagger", name: "Кинжалы", bucket: "weapon", equipped: false, held: false, weight: 1, qty: 2, notes: "Два кинжала из стартового снаряжения чародея.", role: "оружие" },
            { id: "arcane-focus", name: "Магическая фокусировка", bucket: "other", equipped: false, weight: 1, qty: 1, notes: "Фокус заклинаний чародея.", role: "фокус" },
            packItem("dungeoneers-pack", "Набор исследователя подземелий"),
            potionItem(2)
          ],
          attunements: emptyAttune(),
          attacks: [
            mkAtk({ id: "crossbow", name: "Лёгкий арбалет", ability: "dex", die: "1к8", dtype: "колющий", held: true, qty: 20, ammoName: "Болты арбалета", icon: "wp-crossbow", meta: "арбалет · 80/320 фт · двуручное, перезарядка", tip: "Лёгкий арбалет · колющий 1к8 · простое, боеприпас" }),
            mkAtk({ id: "dagger", name: "Кинжалы", ability: "dex", die: "1к4", dtype: "колющий", held: false, qty: 2, icon: "wp-dagger", meta: "кинжал · 20/60 фт · фехтовальное, метательное", tip: "Кинжалы · колющий 1к4 · простое, фехтовальное" })
          ],
          consumables: potionCons(2)
        };
      }
      return inventoryLoadoutFor("kaedrin");
    }

  function classSlug() {
    const c = (sheet.classes && sheet.classes[0]) || {};
    return c.id || "";
  }
  function classLevel() {
    const c = (sheet.classes && sheet.classes[0]) || {};
    return c.level || sheet.level || 1;
  }

  function applyExploreForDemoChar(id) {
    const charId = id || (sheet && (sheet.charId || sheet.id)) || "kaedrin";
    const load = inventoryLoadoutFor(charId);
    if (!sheet.inv) sheet.inv = {};
    sheet.inv.items = clone(load.items || []);
    sheet.inv.attunements = clone(load.attunements || emptyAttune());
    sheet.inv.favorites = (sheet.inv.items || []).filter((it) => it.favorite).map((it) => it.id);
    sheet.inv.openId = "";
    sheet.inv.editingId = "";
    sheet.inv.deleteId = "";
    sheet.inv.filter = "all";
    sheet.inv.query = "";
    sheet.inv.packExpanded = false;
    sheet.inv.packId = "";
    sheet.inv.attuneLimit = sheet.inv.attuneLimit || 3;
    sheet.inv._nid = 1;
    sheet.inv.menuOpen = false;
    sheet.inv.picker = { kind: "all", category: "all", rarity: "all", book: "all", query: "", selected: "", family: "", custom: "", qty: 1 };
    sheet.inv.transferPeer = (TRANSFER_PEERS[0] && TRANSFER_PEERS[0].character_id) || "";
    sheet.inv.transferItem = "";
    sheet.inv.transferCoins = false;
    if (charId === "kaedrin") {
      sheet.texts = clone(KAEDRIN_TEXTS);
      sheet.notes = clone(KAEDRIN_NOTES);
      sheet.appearance = KAEDRIN_APPEARANCE;
    } else {
      sheet.texts = {};
      TEXT_ORDER.forEach((k) => { sheet.texts[k] = { preview: "", body: "" }; });
      sheet.notes = [];
      sheet.appearance = sheet.appearance || "";
    }
    if (state.explore) {
      state.explore.textOpen = "";
      state.explore.menuOpen = false;
      state.explore.editText = "";
    }
    if (typeof ensureExploreState === "function") ensureExploreState();
  }

  function ensureExploreState() {
    if (!sheet.inv) sheet.inv = {};
    if (!Array.isArray(sheet.inv.items)) {
      const id = sheet.charId || sheet.id || "kaedrin";
      applyExploreForDemoChar(id);
      return;
    }
    if (!Array.isArray(sheet.inv.attunements)) sheet.inv.attunements = emptyAttune();
    if (sheet.inv.filter == null) sheet.inv.filter = "all";
    if (sheet.inv.query == null) sheet.inv.query = "";
    if (sheet.inv.openId == null) sheet.inv.openId = "";
    if (sheet.inv.editingId == null) sheet.inv.editingId = "";
    if (sheet.inv.packExpanded == null) sheet.inv.packExpanded = false;
    if (!sheet.inv.picker) sheet.inv.picker = { kind: "all", category: "all", rarity: "all", book: "all", query: "", selected: "", family: "", custom: "", qty: 1 };
    if (sheet.inv.attuneLimit == null) sheet.inv.attuneLimit = 3;
    if (typeof sheet.inv._nid !== "number") sheet.inv._nid = 1;
    if (sheet.inv.favorites == null) sheet.inv.favorites = (sheet.inv.items || []).filter((it) => it.favorite).map((it) => it.id);
    if (!sheet.texts) sheet.texts = {};
    TEXT_ORDER.forEach((k) => { if (!sheet.texts[k]) sheet.texts[k] = { preview: "", body: "" }; });
    if (!Array.isArray(sheet.notes)) sheet.notes = [];
    if (sheet.appearance == null) sheet.appearance = "";
    if (!state.explore) state.explore = {};
    if (state.explore.textOpen == null) state.explore.textOpen = "";
    if (state.explore.menuOpen == null) state.explore.menuOpen = false;
    if (state.explore.editText == null) state.explore.editText = "";
  }

  function invItem(id) {
    ensureExploreState();
    return (sheet.inv.items || []).find((it) => it.id === id) || null;
  }
  function itemLineWeight(it) {
    if (!it) return 0;
    if (it.isPack && packIsExpanded(it)) {
      return (sheet.inv.items || []).filter((row) => row.parent_id === it.id).reduce((s, row) => s + itemLineWeight(row), 0);
    }
    const w = it.weight == null ? 0 : Number(it.weight);
    const q = it.qty == null ? 1 : Number(it.qty);
    return (Number.isFinite(w) ? w : 0) * (Number.isFinite(q) && q > 0 ? (it.isPack ? 1 : q) : 0);
  }
  function inventoryWeightLb() {
    ensureExploreState();
    const items = (sheet.inv.items || []).filter((it) => {
      if (it.parent_id) return packIsExpanded({ id: it.parent_id, isPack: true });
      if (it.isPack && packIsExpanded(it)) return false;
      return true;
    });
    const goods = items.reduce((s, it) => s + itemLineWeight(it), 0);
    const coins = sheet.coins || {};
    const coinLb = ((coins.pp || 0) + (coins.gp || 0) + (coins.ep || 0) + (coins.sp || 0) + (coins.cp || 0)) / 50;
    return Math.round(goods + coinLb);
  }
  function goodsWeightLb() {
    ensureExploreState();
    const items = (sheet.inv.items || []).filter((it) => {
      if (it.parent_id) return packIsExpanded({ id: it.parent_id, isPack: true });
      if (it.isPack && packIsExpanded(it)) return false;
      return true;
    });
    return items.reduce((s, it) => s + itemLineWeight(it), 0);
  }
  function coinsWeightLb() {
    const coins = sheet.coins || {};
    return ((coins.pp || 0) + (coins.gp || 0) + (coins.ep || 0) + (coins.sp || 0) + (coins.cp || 0)) / 50;
  }
  function carryCapLb() {
    const score = (typeof scoreTotal === "function") ? scoreTotal("str") : ((sheet.abilityBase && sheet.abilityBase.str) || 10);
    return 15 * Math.max(1, score);
  }
  function gearItemActive(it) {
    if (!it) return false;
    const attune = attunedIds();
    if (it.requires_attunement) return !!attune[it.id] && (it.equipped || it.bucket === "other");
    if (it.bucket === "armor" || it.bucket === "weapon") return !!it.equipped || (it.bucket === "weapon" && !!it.held);
    if (it.bonuses && (it.equipped || it.held)) return true;
    return !!it.equipped;
  }
  function gearBonusEntries() {
    const out = [];
    ((sheet.inv && sheet.inv.items) || []).forEach((it) => {
      if (!it.bonuses || !gearItemActive(it)) return;
      const name = it.name || "Предмет";
      const add = (target, value) => {
        const n = Number(value);
        if (!n) return;
        out.push({ target: target, name: name, value: n, id: it.id });
      };
      if (it.bonuses.str_score) add("str_score", it.bonuses.str_score);
      if (it.bonuses.dex_score) add("dex_score", it.bonuses.dex_score);
      if (it.bonuses.con_score) add("con_score", it.bonuses.con_score);
      if (it.bonuses.int_score) add("int_score", it.bonuses.int_score);
      if (it.bonuses.wis_score) add("wis_score", it.bonuses.wis_score);
      if (it.bonuses.cha_score) add("cha_score", it.bonuses.cha_score);
      if (it.bonuses.ac) add("ac", it.bonuses.ac);
      if (it.bonuses.save_all) {
        ["str", "dex", "con", "int", "wis", "cha"].forEach((k) => add(k + "_save", it.bonuses.save_all));
      }
    });
    return out;
  }
  function gearBonusLines(target) {
    return gearBonusEntries().filter((row) => row.target === target);
  }
  function gearBonusSum(target) {
    return gearBonusLines(target).reduce((s, row) => s + row.value, 0);
  }
  function gearScoreBonus(key) { return gearBonusSum(key + "_score"); }
  function gearSaveBonus(key) { return gearBonusSum(key + "_save"); }
  function gearAcBonus() { return gearBonusSum("ac"); }
  function attunedIds() {
    ensureExploreState();
    const set = {};
    (sheet.inv.attunements || []).forEach((s) => { if (s.item_id) set[s.item_id] = true; });
    return set;
  }
  function filledAttune() {
    ensureExploreState();
    return (sheet.inv.attunements || []).filter((s) => s.item_id).length;
  }
  function itemNeedsSetup(it) {
    if (!it) return false;
    if (it.isScroll && !(it.scroll_spell && it.scroll_spell.name)) return true;
    if (it.needsBase && !it.baseSlug) return true;
    return !!it.needs;
  }
  function itemMatchesFilter(it, filter, q) {
    if (it.parent_id && !packIsExpanded({ id: it.parent_id, isPack: true })) return false;
    const bucket = it.bucket || "other";
    const equipped = !!it.equipped;
    const needs = itemNeedsSetup(it);
    let on = filter === "all" || (filter === "equipped" && equipped) || (filter === "needs_base" && needs) || bucket === filter;
    if (q) {
      const hay = ((it.name || "") + " " + (it.notes || "") + " " + (it.meta || "") + " " + (it.scroll_spell && it.scroll_spell.name || "")).toLowerCase();
      if (hay.indexOf(q) < 0) on = false;
    }
    return on;
  }
  function roleLabelOf(it) {
    if (it.role) return it.role;
    if (it.isScroll) return "свиток";
    if (it.isPack) return "набор";
    if (it.bucket === "weapon") return "оружие";
    if (it.armor_kind === "shield") return "щит";
    if (it.bucket === "armor") return "доспех";
    if (it.requires_attunement) return "настройка";
    return "вещь";
  }
  function formatLb(n) {
    const v = Math.round(Number(n) * 10) / 10;
    return Number.isInteger(v) ? String(v) : String(v).replace(".", ",");
  }
  function itemMetaLine(it) {
    if (it.meta) return it.meta + (it.weight != null ? (it.meta.indexOf("фнт") >= 0 ? "" : " · " + formatLb(itemLineWeight(it)) + " фнт") : "");
    const bits = [roleLabelOf(it)];
    if (it.base_ac != null) bits.push(it.armor_kind === "shield" ? ("+" + it.base_ac + " КД") : ("КД " + it.base_ac));
    if (it.chargesMax) bits.push("заряды " + (it.charges || 0) + "/" + it.chargesMax);
    if (it.isScroll && it.scroll_spell && it.scroll_spell.name) bits.push("свиток " + it.scroll_spell.level + " круга · привязан");
    if (it.isScroll && !(it.scroll_spell && it.scroll_spell.name)) bits.push("не привязан");
    if (it.weight != null) bits.push(formatLb(itemLineWeight(it)) + " фнт");
    else bits.push("вес неизвестен");
    return bits.join(" · ");
  }
  function hasHeavyProf() {
    return !!(sheet.ownership && sheet.ownership.armor && sheet.ownership.armor.heavy);
  }
  function armorBlocked(it) {
    if (!it || it.bucket !== "armor") return false;
    if (it.armor_kind === "heavy" && !hasHeavyProf()) return true;
    return false;
  }
  function armorBlockHint(it) {
    if (it && it.armor_kind === "heavy") return "Нет владения тяжёлыми доспехами — надеть нельзя";
    return "Нет владения этим доспехом";
  }
  function itemTagsHtml(it) {
    const tags = [];
    if (it.parent_id) tags.push('<span class="plaque-tag">в наборе</span>');
    if (it.equipped) tags.push('<span class="plaque-tag is-on">надето</span>');
    if (it.held) tags.push('<span class="plaque-tag is-on">в руках</span>');
    if (it.requires_attunement && attunedIds()[it.id]) tags.push('<span class="plaque-tag is-on">настроено</span>');
    if (itemNeedsSetup(it)) tags.push('<span class="plaque-tag">нужно настроить</span>');
    if (it.isPack) tags.push('<span class="plaque-tag">набор</span>');
    if ((it.qty || 1) > 1) tags.push('<span class="plaque-tag">×' + it.qty + "</span>");
    return tags.join(" ");
  }
  function chargesHtml(it) {
    if (!it.chargesMax) return "";
    let pips = "";
    for (let i = 0; i < it.chargesMax; i++) {
      pips += '<button type="button" class="pip' + (i < (it.charges || 0) ? " is-on" : "") + '" data-sheet-act="inv-charge" data-id="' + esc(it.id) + '" data-n="' + i + '" aria-label="Заряд ' + (i + 1) + '"></button>';
    }
    return 'заряды <span class="charges" title="Заряды: нажми, чтобы потратить или вернуть">' + pips + "</span> · " + (it.charges || 0) + "/" + it.chargesMax;
  }

  function scrollCasterInfo() {
    const slug = classSlug();
    const level = classLevel();
    const maxSpellLevel = level >= 9 ? 5 : (level >= 7 ? 4 : (level >= 5 ? 3 : (level >= 3 ? 2 : 1)));
    const ability = ({ cleric: "wis", druid: "wis", wizard: "int", sorcerer: "cha", bard: "cha", paladin: "cha", ranger: "wis", warlock: "cha" })[slug] || "wis";
    if (!slug) return [];
    return [{ listSlug: slug, maxSpellLevel: maxSpellLevel, ability: ability }];
  }
  function scrollReadGate(spell) {
    if (!spell) return { status: "blocked", reason: "На свитке нет заклинания" };
    const classes = (spell.classes || []).map((s) => String(s).toLowerCase());
    const holders = scrollCasterInfo().filter((row) => classes.indexOf(row.listSlug) >= 0);
    const level = Math.max(0, spell.level || 0);
    if (holders.length === 0) return { status: "blocked", reason: SCROLL_NOT_ON_LIST };
    if (level <= 0) return { status: "cast" };
    const holderMax = holders.reduce((m, row) => Math.max(m, row.maxSpellLevel), 0);
    if (holderMax >= level) return { status: "cast" };
    return { status: "check", ability: holders[0].ability || "wis", dc: 10 + level };
  }
  function scrollCastBlock(it) {
    if (!it || !it.scroll_spell || !it.scroll_spell.name) return "Сначала укажи заклинание на свитке";
    if ((it.qty || 0) <= 0) return "Свиток уже потрачен";
    const gate = scrollReadGate(it.scroll_spell);
    return gate.status === "blocked" ? gate.reason : null;
  }
  function scrollStatusOf(it) {
    if (!it || !it.isScroll) return "";
    if (!(it.scroll_spell && it.scroll_spell.name)) return "bind";
    const gate = scrollReadGate(it.scroll_spell);
    return gate.status;
  }

  function invActions(it) {
    const btns = [];
    if (it.bucket === "armor" || (it.wear_slot && it.wear_slot !== "none") || it.equipped || (it.bucket === "other" && it.requires_attunement)) {
      const blocked = armorBlocked(it) && !it.equipped;
      const label = it.equipped ? "Снять" : "Надеть";
      btns.push('<button type="button" class="inv-act' + (it.equipped ? " is-on" : "") + (blocked ? " is-disabled" : "") + '" data-toggle-equip data-item-id="' + esc(it.id) + '"' + (blocked ? ' disabled title="' + esc(armorBlockHint(it)) + '"' : "") + ">" + label + "</button>");
    }
    if (it.bucket === "weapon" || it.armor_kind === "shield" || it.held) {
      btns.push('<button type="button" class="inv-act' + (it.held ? " is-on" : "") + '" data-toggle-held-item data-item-id="' + esc(it.id) + '">' + (it.held ? "В инвентарь" : "В руки") + "</button>");
    }
    if (it.requires_attunement) {
      btns.push('<button type="button" class="inv-act" data-open="attunement">Настройка</button>');
    }
    if (it.chargesMax) {
      btns.push('<button type="button" class="inv-act" data-sheet-act="inv-spend-charge" data-id="' + esc(it.id) + '">Потратить заряд</button>');
    }
    if (it.heal) {
      btns.push('<button type="button" class="inv-act is-primary" data-open="consumable-pad" data-spend-id="' + esc(it.id) + '">Выпить</button>');
    }
    if (it.isScroll) {
      if (it.scroll_spell && it.scroll_spell.name) {
        const gate = scrollReadGate(it.scroll_spell);
        if (gate.status === "blocked") {
          btns.push('<button type="button" class="inv-act" data-open="scroll-gate-fail" data-item-id="' + esc(it.id) + '">Свиток не прочесть</button>');
        } else if (gate.status === "check") {
          btns.push('<button type="button" class="inv-act is-primary" data-sheet-act="cast-scroll" data-id="' + esc(it.id) + '">Проверка свитка</button>');
        } else {
          const block = scrollCastBlock(it);
          btns.push('<button type="button" class="inv-act is-primary" data-sheet-act="cast-scroll" data-id="' + esc(it.id) + '"' + (block ? " disabled title=\"" + esc(block) + "\"" : "") + ">Кастовать свиток</button>");
        }
      } else {
        btns.push('<button type="button" class="inv-act is-primary" data-open="scroll-bind" data-item-id="' + esc(it.id) + '">Указать заклинание</button>');
      }
    }
    if (it.isPack && !it.parent_id && packContentsOf(it).length) {
      btns.push('<button type="button" class="inv-act is-primary" data-toggle-pack data-item-id="' + esc(it.id) + '">' + (packIsExpanded(it) ? "Свернуть набор" : "Развернуть набор") + "</button>");
    }
    if (!it.parent_id && (it.qty || 0) > 0) {
      btns.push('<button type="button" class="inv-act" data-open="transfer" data-item-id="' + esc(it.id) + '">Передать</button>');
    }
    btns.push('<button type="button" class="inv-act" data-sheet-act="inv-edit" data-id="' + esc(it.id) + '">' + (sheet.inv.editingId === it.id ? "Готово" : "Изменить") + "</button>");
    btns.push('<button type="button" class="inv-act is-danger" data-sheet-act="inv-delete" data-id="' + esc(it.id) + '">Удалить</button>');
    return btns.join("");
  }
  function invEditFields(it) {
    if (sheet.inv.editingId !== it.id) return "";
    return '<div class="inv-edit">' +
      '<label>Название<input type="text" value="' + esc(it.name || "") + '" data-inv-field="name" data-id="' + esc(it.id) + '"></label>' +
      '<label>Количество<input type="number" min="0" value="' + (it.qty || 0) + '" data-inv-field="qty" data-id="' + esc(it.id) + '"></label>' +
      '<label>Вес, фнт<input type="number" min="0" step="0.5" value="' + (it.weight == null ? "" : it.weight) + '" data-inv-field="weight" data-id="' + esc(it.id) + '" placeholder="неизвестно"></label>' +
      '<label>Заметка<textarea data-inv-field="notes" data-id="' + esc(it.id) + '">' + esc(it.notes || "") + "</textarea></label>" +
      "</div>";
  }

  function renderInvCard(it) {
    const open = sheet.inv.openId === it.id;
    const nest = it.parent_id ? " is-nested" : "";
    const favOn = !!(sheet.inv.favorites || []).includes(it.id) || it.favorite;
    const charges = chargesHtml(it);
    const contents = packContentsOf(it);
    const packHint = (it.isPack && contents.length && !packIsExpanded(it))
      ? '<ul class="pack-contents">' + contents.map((row) => "<li>" + esc(row.name) + (row.qty && row.qty > 1 ? " ×" + row.qty : "") + "</li>").join("") + "</ul>"
      : "";
    return '<article class="inv-card' + (open ? " is-open" : "") + nest + (it.equipped ? " is-equipped" : "") + '" data-item="' + esc(it.id) + '">' +
      '<div class="inv-card__hit">' +
        '<button type="button" class="drag-handle" tabindex="-1" aria-hidden="true" title="Зажми и перетащи"><svg class="drag-handle-icon" viewBox="0 0 16 14" width="16" height="14" aria-hidden="true" focusable="false" fill="none"><line class="drag-line" x1="1" y1="2.5" x2="15" y2="2.5"/><line class="drag-line" x1="1" y1="6.7" x2="15" y2="6.7"/><line class="drag-line" x1="1" y1="11" x2="15" y2="11"/></svg></button>' +
        '<button type="button" class="inv-card__open" data-toggle-card data-item-id="' + esc(it.id) + '">' +
          '<span class="inv-card__name">' + esc(it.name || "Без названия") + " " + itemTagsHtml(it) + "</span>" +
          '<span class="inv-card__meta">' + esc(itemMetaLine(it)) + (charges ? " · " + charges : "") + "</span>" +
        "</button>" +
        '<button type="button" class="inv-fav' + (favOn ? " is-on" : "") + '" data-toggle-fav-item data-item-id="' + esc(it.id) + '" aria-label="В избранное" aria-pressed="' + (favOn ? "true" : "false") + '">★</button>' +
      "</div>" +
      (open ? ('<div class="inv-card__body">' +
        (it.notes ? "<p class=\"inv-card__notes\">" + esc(it.notes) + "</p>" : "") +
        packHint +
        '<div class="inv-card__acts">' + invActions(it) + "</div>" +
        invEditFields(it) +
      "</div>") : (packHint ? '<div class="inv-card__pack-peek">' + packHint + "</div>" : "")) +
    "</article>";
  }

  function renderSkillStrip(keys, label) {
    return '<div class="skill-row is-scene" aria-label="' + esc(label) + '">' + keys.map((key) => {
      const def = SKILL_DEFS[key];
      if (!def) return "";
      const p = skillProf(key);
      const expert = p >= 2;
      const on = p >= 1;
      const hint = expert ? "компетентность" : on ? "владение" : "без владения";
      const ring = '<span class="skill-prof-wrap" aria-hidden="true"><span class="skill-prof' + (expert ? " is-expert" : "") + '"></span></span>';
      return '<button type="button" class="skill-chip' + (on ? " is-on" : "") + (expert ? " is-expert" : "") + '" data-roll-skill="' + key + '" title="' + esc(def.name) + ": " + fmtMod(skillTotal(key)) + " · " + hint + '"><span class="skill-name">' + ring + '<span class="skill-label">' + esc(def.name) + "</span></span><b class=\"num\">" + fmtMod(skillTotal(key)) + "</b></button>";
    }).join("") + "</div>";
  }
  function renderRollChips() {
    const inspOn = sheet.edition === "2024" ? state.heroic : state.inspiration;
    const inspLabel = sheet.edition === "2024" ? "героич." : "вдохн.";
    const adv = state.adv || "norm";
    const luck = Number(state.luck) || 0;
    const luckChip = luck > 0
      ? '<button type="button" class="combat-chip" data-spend-luck>удача <b class="num">' + luck + "</b></button>"
      : "";
    return '<div class="explore-rolls">' +
      '<div class="roll-seg" role="group" aria-label="Режим броска">' +
        '<button type="button" data-adv="norm" class="' + (adv === "norm" ? "is-on" : "") + '">норм</button>' +
        '<button type="button" data-adv="adv" class="' + (adv === "adv" ? "is-on" : "") + '">преим.</button>' +
        '<button type="button" data-adv="dis" class="' + (adv === "dis" ? "is-on" : "") + '">помеха</button>' +
      "</div>" +
      '<div class="combat-meta">' +
        luckChip +
        '<button type="button" class="combat-chip' + (inspOn ? " is-on" : "") + '" data-toggle-insp>' + esc(inspLabel) + "</button>" +
        '<button type="button" class="combat-chip" data-open-rolls>броски <b class="num">' + (state.rolls || []).length + "</b></button>" +
      "</div></div>";
  }

  function renderInvToolbar() {
    const used = inventoryWeightLb();
    const cap = carryCapLb();
    const goods = goodsWeightLb();
    const coinsLb = coinsWeightLb();
    const pct = Math.max(0, Math.min(100, Math.round((used / Math.max(1, cap)) * 100)));
    const filled = filledAttune();
    const limit = sheet.inv.attuneLimit || 3;
    const names = (sheet.inv.attunements || []).map((s) => {
      const it = s.item_id && invItem(s.item_id);
      return it ? it.name : s.name;
    }).filter(Boolean).map((n) => n.replace(/^Амулет.*/, "амулет").replace(/^Кольцо.*/, "кольцо").replace(/^Камень.*/, "камень"));
    const gp = coinsToGp(sheet.coins);
    const gpLabel = formatGp(gp) + " зм";
    const ac = (typeof acTotal === "function") ? acTotal() : "";
    const over = used > cap;
    return '<div class="inv-summary' + (over ? " is-over" : "") + '">' +
      '<div class="inv-summary__load" title="Вещи ' + formatLb(goods) + " фнт · монеты " + formatLb(coinsLb) + " фнт · всего " + formatLb(used) + " / " + cap + ' фнт">' +
        '<span class="inv-summary__lab">Нагрузка</span>' +
        '<p class="inv-summary__weights">вещи ' + formatLb(goods) + " фнт · монеты " + formatLb(coinsLb) + " фнт · <strong>" + formatLb(used) + " / " + cap + " фнт</strong></p>" +
        '<span class="carry-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span>' +
      "</div>" +
      '<div class="inv-summary__chips">' +
        (ac !== "" ? '<span class="inv-stat" title="Класс доспеха">КД ' + ac + "</span>" : "") +
        '<div class="inv-purse">' +
          '<button type="button" class="inv-stat is-action" data-open="coins" data-inv-wallet title="' + esc(gpLabel) + '"><span class="inv-stat__lab">Кошелёк</span> <b>' + esc(gpLabel) + "</b></button>" +
          '<button type="button" class="chip inv-transfer-chip" data-open="transfer" data-inv="transfer-coins">Передать монеты</button>' +
        "</div>" +
        '<button type="button" class="inv-stat is-action" data-open="attunement" data-inv-attune title="Настроенные предметы: ' + filled + " из " + limit + '"><span class="inv-stat__lab">Настроенные</span> <b>' + filled + "/" + limit + "</b>" +
          (names.length ? '<span class="inv-stat__meta">' + esc(names.slice(0, 3).join(" · ")) + "</span>" : "") +
        "</button>" +
      "</div></div>";
  }

  function renderExploreBody() {
    ensureExploreState();
    if (state.magicOpen && typeof showMagicUi === "function" && showMagicUi() && typeof renderSpellPanel === "function") {
      return '<div class="explore">' +
        renderSkillStrip(EXPLORE_SKILLS, "Навыки исследования") +
        renderRollChips() +
        renderSpellPanel() +
      "</div>";
    }
    const filter = sheet.inv.filter || "all";
    const q = (sheet.inv.query || "").toLowerCase();
    const items = (sheet.inv.items || []).filter((it) => itemMatchesFilter(it, filter, q));
    const list = items.length
      ? items.map(renderInvCard).join("")
      : '<div class="inv-empty">Сумка пуста. Добавь предмет из справочника или свою строку.</div>';
    const menu = state.explore.menuOpen
      ? '<div class="inv-menu" data-inv-menu>' +
          '<button type="button" data-open="gear-picker">Из справочника</button>' +
          '<button type="button" data-sheet-act="inv-custom">Своя строка</button>' +
        "</div>"
      : "";
    const filters = INV_FILTERS.map((f) =>
      '<button type="button" class="chip' + (filter === f.id ? " is-on" : "") + '" data-inv-filter="' + f.id + '" aria-selected="' + (filter === f.id ? "true" : "false") + '">' + esc(f.label) + "</button>"
    ).join("");
    return '<div class="explore">' +
      renderSkillStrip(EXPLORE_SKILLS, "Навыки исследования") +
      renderRollChips() +
      '<div class="explore-head">' +
        "<h2>Снаряжение</h2>" +
        '<div class="explore-head__tools">' +
          '<button type="button" class="turn-config" data-toggle-inv-menu aria-label="Настроить снаряжение" title="Настроить снаряжение" aria-expanded="' + (state.explore.menuOpen ? "true" : "false") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-settings"/></svg></button>' +
          menu +
        "</div>" +
      "</div>" +
      renderInvToolbar() +
      '<label class="sr-only" for="inv-search-m">Поиск предмета</label>' +
      '<input id="inv-search-m" class="scene-search" type="search" placeholder="Поиск по названию" value="' + esc(sheet.inv.query || "") + '" data-inv-search>' +
      '<div class="filters inv-filters" role="tablist" aria-label="Фильтр инвентаря">' + filters + "</div>" +
      '<div class="inv-list" data-inv-list>' + list + "</div>" +
    "</div>";
  }

  function textPreview(block) {
    if (!block) return "";
    if (block.preview) return block.preview;
    const body = (block.body || "").trim();
    if (!body) return "";
    const cut = body.split(/(?<=[.!?])\s/)[0] || body;
    return cut.length > 90 ? cut.slice(0, 87) + "…" : cut;
  }
  function renderTextCard(id, block, isNote) {
    const open = state.explore.textOpen === id;
    const title = isNote ? (block.name || "Свои заметки") : (TEXT_TITLES[id] || id);
    const preview = textPreview(block);
    const body = block.body || "";
    return '<article class="soc-card' + (open ? " is-open" : "") + (isNote ? " is-note" : "") + '" data-text="' + esc(id) + '">' +
      '<div class="soc-card__hit">' +
        '<button type="button" class="drag-handle" tabindex="-1" aria-hidden="true" title="Зажми и перетащи"><svg class="drag-handle-icon" viewBox="0 0 16 14" width="16" height="14" aria-hidden="true" focusable="false" fill="none"><line class="drag-line" x1="1" y1="2.5" x2="15" y2="2.5"/><line class="drag-line" x1="1" y1="6.7" x2="15" y2="6.7"/><line class="drag-line" x1="1" y1="11" x2="15" y2="11"/></svg></button>' +
        '<button type="button" class="soc-card__open" data-toggle-text="' + esc(id) + '">' +
          '<span class="soc-card__name">' + esc(title) + (isNote ? ' <span class="plaque-tag">заметка</span>' : "") + "</span>" +
          (preview ? '<span class="soc-card__meta">' + esc(preview) + "</span>" : '<span class="soc-card__meta is-empty">Пока пусто</span>') +
        "</button>" +
      "</div>" +
      (open ? ('<div class="soc-card__body">' +
        (body ? "<p>" + esc(body) + "</p>" : "<p class=\"soc-card__empty\">Пока пусто.</p>") +
        '<div class="inv-card__acts">' +
          '<button type="button" class="inv-act" data-open="edit-text" data-edit-text="' + esc(id) + '">Править</button>' +
          (isNote ? '<button type="button" class="inv-act is-danger" data-sheet-act="note-remove" data-id="' + esc(id) + '">Удалить</button>' : "") +
          (id === "background" ? '<button type="button" class="inv-act" data-goto-features>К способностям</button>' : "") +
        "</div></div>") : "") +
    "</article>";
  }

  function renderSocialBody() {
    ensureExploreState();
    if (state.magicOpen && typeof showMagicUi === "function" && showMagicUi() && typeof renderSpellPanel === "function") {
      return '<div class="explore social">' +
        renderSkillStrip(SOCIAL_SKILLS, "Навыки общения") +
        renderRollChips() +
        renderSpellPanel() +
      "</div>";
    }
    const menu = state.explore.menuOpen
      ? '<div class="inv-menu" data-inv-menu>' +
          '<button type="button" data-open="appearance">Внешность</button>' +
          '<button type="button" data-sheet-act="add-note">Добавить заметку</button>' +
          '<button type="button" data-goto-features>К способностям</button>' +
        "</div>"
      : "";
    const texts = TEXT_ORDER.map((id) => renderTextCard(id, sheet.texts[id] || { preview: "", body: "" }, false)).join("");
    const notes = (sheet.notes || []).map((n) => renderTextCard(n.id, n, true)).join("");
    return '<div class="explore social">' +
      renderSkillStrip(SOCIAL_SKILLS, "Навыки общения") +
      renderRollChips() +
      '<div class="explore-head">' +
        "<h2>Тексты и заметки</h2>" +
        '<div class="explore-head__tools">' +
          '<button type="button" class="inv-link" data-open="appearance">Внешность</button>' +
          '<button type="button" class="turn-config" data-toggle-inv-menu aria-label="Настроить тексты" title="Настроить тексты" aria-expanded="' + (state.explore.menuOpen ? "true" : "false") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-settings"/></svg></button>' +
          menu +
        "</div>" +
      "</div>" +
      '<div class="soc-list">' + texts + notes + "</div>" +
    "</div>";
  }

  function renderGearPicker() {
    ensureExploreState();
    const p = sheet.inv.picker;
    const q = (p.query || "").trim().toLowerCase();
    const rows = GEAR_CATALOG.filter((e) => {
      if (p.kind && p.kind !== "all" && e.kind !== p.kind && !(p.kind === "item" && e.kind !== "weapon" && e.kind !== "armor")) return false;
      if (p.kind === "item" && p.category && p.category !== "all") {
        const cat = e.category || e.role || "";
        if (cat !== p.category && e.bucket !== p.category) return false;
      }
      if (p.rarity && p.rarity !== "all" && e.rarity !== p.rarity) return false;
      if (p.book && p.book !== "all" && e.book !== p.book) return false;
      if (q && ((e.name || "") + " " + (e.meta || "")).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    function chips(list, key) {
      return list.map((c) => '<button type="button" class="chip' + (p[key] === c.id ? " is-on" : "") + '" data-sheet-act="gear-filter" data-key="' + key + '" data-val="' + c.id + '">' + esc(c.label) + "</button>").join("");
    }
    const list = rows.map((e) => {
      const on = p.selected === e.id;
      return '<button type="button" class="gear-picker-row' + (on ? " is-selected" : "") + '" data-sheet-act="gear-pick" data-id="' + esc(e.id) + '">' +
        '<span class="gear-picker-row__name">' + esc(e.name) + ' <span class="gear-rarity">' + esc((GEAR_RARITY.find((r) => r.id === e.rarity) || {}).label || "") + "</span></span>" +
        '<span class="gear-picker-row__meta">' + esc(e.meta || "") + (e.requires_attunement ? " · нужна настройка" : "") + "</span></button>";
    }).join("") || '<p class="flags">Ничего не найдено.</p>';
    return '<div class="gear-picker">' +
      '<input class="scene-search" type="search" placeholder="Найти предмет" value="' + esc(p.query || "") + '" data-gear-query>' +
      '<div class="chip-row gear-picker__chips">' + chips(GEAR_KIND_TABS, "kind") + "</div>" +
      (p.kind === "item" ? '<div class="chip-row gear-picker__chips">' + chips(GEAR_ITEM_CATS, "category") + "</div>" : "") +
      '<div class="chip-row gear-picker__chips">' + chips(GEAR_BOOKS, "book") + "</div>" +
      '<div class="chip-row gear-picker__chips">' + chips(GEAR_RARITY, "rarity") + "</div>" +
      '<div class="gear-picker-list">' + list + "</div>" +
      '<div class="modal-actions"><button type="button" class="btn primary" data-sheet-act="gear-add"' + (p.selected ? "" : " disabled") + ">Добавить</button><button type=\"button\" class=\"btn\" data-close>Отмена</button></div>" +
    "</div>";
  }

  function renderAttuneDialog() {
    ensureExploreState();
    const limit = sheet.inv.attuneLimit || 3;
    const options = (sheet.inv.items || []).filter((it) => it.requires_attunement).map((it) =>
      '<option value="' + esc(it.id) + '">' + esc(it.name) + "</option>"
    ).join("");
    const slots = (sheet.inv.attunements || []).map((s, i) => {
      return '<div class="attune-card">' +
        '<div class="attune-card__head"><strong>Слот ' + (i + 1) + "</strong>" +
          '<button type="button" class="attune-card__remove" data-sheet-act="attune-clear" data-id="' + esc(s.id) + '">Очистить</button></div>' +
        '<label>Предмет<select data-attune-item="' + esc(s.id) + '"><option value="">— нет —</option>' +
          options.replace('value="' + esc(s.item_id) + '"', 'value="' + esc(s.item_id) + '" selected') +
        "</select></label>" +
        '<label>Заметка<input type="text" value="' + esc(s.notes || "") + '" data-attune-notes="' + esc(s.id) + '"></label>' +
      "</div>";
    }).join("");
    return "<p>Настроенные предметы: " + filledAttune() + " из " + limit + ".</p>" +
      '<div class="attune-slots">' + slots + "</div>" +
      '<div class="modal-actions"><button type="button" class="btn primary" data-close>Готово</button></div>';
  }

  function renderTransferDialog() {
    ensureExploreState();
    const itemId = sheet.inv.transferItem;
    const it = itemId ? invItem(itemId) : null;
    const peers = TRANSFER_PEERS.map((p) =>
      '<option value="' + esc(p.character_id) + '"' + (sheet.inv.transferPeer === p.character_id ? " selected" : "") + ">" + esc(p.character_name) + " · " + esc(p.lobby_name) + "</option>"
    ).join("");
    const coinsMode = !!sheet.inv.transferCoins || !it;
    const gp = formatGp(coinsToGp(sheet.coins)) + " зм";
    return "<p>" + (it && !coinsMode ? ("Передать «" + esc(it.name) + "».") : "Передать монеты с кошелька (" + esc(gp) + ").") + " Получатель из лобби.</p>" +
      '<label>Кому<select data-transfer-peer>' + peers + "</select></label>" +
      (it && !coinsMode ? "" : '<p class="flags">Сумма берётся из кошелька: ' + esc(gp) + ".</p>") +
      '<div class="modal-actions"><button type="button" class="btn primary" data-sheet-act="transfer-send">Передать</button><button type="button" class="btn" data-close>Отмена</button></div>';
  }

  function renderScrollBind() {
    const id = sheet.inv.bindItemId;
    const it = invItem(id);
    const list = BINDABLE_SPELLS.map((s) =>
      '<button type="button" class="gear-picker-row" data-sheet-act="scroll-bind-pick" data-spell="' + esc(s.id) + '">' +
        '<span class="gear-picker-row__name">' + esc(s.name) + " · " + s.level + " круг</span>" +
        '<span class="gear-picker-row__meta">' + esc(SCHOOL_RU[s.school] || s.school) + (s.ritual ? " · ритуал" : "") + (s.concentration ? " · концентрация" : "") + "</span></button>"
    ).join("");
    return "<p>" + (it ? "Свиток без подписи. Выбери заклинание — его и будет нести свиток." : "Свиток не найден.") + "</p>" +
      '<div class="gear-picker-list">' + list + "</div>";
  }
  function renderScrollFail() {
    const it = invItem(sheet.inv.scrollFailId);
    const reason = it && it.scroll_spell ? scrollCastBlock(it) : SCROLL_NOT_ON_LIST;
    return "<p>" + esc(reason || SCROLL_NOT_ON_LIST) + "</p><div class=\"modal-actions\"><button type=\"button\" class=\"btn primary\" data-close>Понятно</button></div>";
  }
  function renderScrollCheck() {
    const info = (sheet.inv && sheet.inv.scrollCheck) || {};
    const abilName = ({ str: "Сила", dex: "Ловкость", con: "Телосложение", int: "Интеллект", wis: "Мудрость", cha: "Харизма" })[info.ability] || "Мудрость";
    return "<p>Чтобы прочесть свиток, нужна проверка " + esc(abilName) + " (Сл " + (info.dc || 11) + ").</p>" +
      '<div class="modal-actions">' +
        '<button type="button" class="btn primary" data-sheet-act="scroll-check-roll">Бросить к20</button>' +
        '<button type="button" class="btn" data-close>Отмена</button>' +
      "</div>";
  }
  function renderAppearanceDialog() {
    ensureExploreState();
    return '<label class="inv-edit">Описание<textarea data-appearance-field rows="6">' + esc(sheet.appearance || "") + "</textarea></label>" +
      '<div class="modal-actions"><button type="button" class="btn primary" data-close>Готово</button></div>';
  }
  function renderEditTextDialog() {
    ensureExploreState();
    const id = state.explore.editText;
    let title = TEXT_TITLES[id] || "Заметка";
    let block = sheet.texts[id];
    let isNote = false;
    if (!block) {
      const note = (sheet.notes || []).find((n) => n.id === id);
      if (note) { block = note; title = note.name || "Свои заметки"; isNote = true; }
    }
    block = block || { body: "", name: "" };
    return (isNote ? '<label>Название<input type="text" value="' + esc(block.name || "") + '" data-text-field="name"></label>' : "") +
      '<label>Текст<textarea data-text-field="body" rows="7">' + esc(block.body || "") + "</textarea></label>" +
      '<div class="modal-actions"><button type="button" class="btn primary" data-close>Готово</button></div>';
  }
  function renderConsumablePad() {
    const it = invItem(sheet.inv.spendId);
    if (!it) return "<p>Предмет не найден.</p>";
    return "<p>Выпить «" + esc(it.name) + "»: " + esc(it.heal || "") + " хитов. Останется " + Math.max(0, (it.qty || 1) - 1) + ".</p>" +
      '<div class="modal-actions"><button type="button" class="btn primary" data-sheet-act="inv-drink" data-id="' + esc(it.id) + '">Выпить</button><button type="button" class="btn" data-close>Отмена</button></div>';
  }

  function renderExploreDialog(id) {
    const titles = {
      attunement: "Настроенные предметы",
      transfer: "Передать",
      "gear-picker": "Справочник снаряжения",
      appearance: "Внешность",
      "edit-text": (TEXT_TITLES[state.explore && state.explore.editText] || "Править"),
      "scroll-bind": "Указать заклинание",
      "scroll-gate-fail": "Свиток не прочесть",
      "scroll-gate-check": "Проверка свитка",
      "scroll-gate": "Свиток заклинания",
      "consumable-pad": "Расходник"
    };
    if (!titles[id]) return;
    let box = document.querySelector("[data-sheet='" + id + "'] [data-explore-body]");
    const head = document.querySelector("[data-sheet='" + id + "'] [data-explore-title]");
    if (head) head.textContent = titles[id];
    if (!box) return;
    if (id === "attunement") box.innerHTML = renderAttuneDialog();
    else if (id === "transfer") box.innerHTML = renderTransferDialog();
    else if (id === "gear-picker") box.innerHTML = renderGearPicker();
    else if (id === "appearance") box.innerHTML = renderAppearanceDialog();
    else if (id === "edit-text") {
      if (head) {
        const tid = state.explore.editText;
        head.textContent = TEXT_TITLES[tid] || ((sheet.notes || []).find((n) => n.id === tid) || {}).name || "Править";
      }
      box.innerHTML = renderEditTextDialog();
    }
    else if (id === "scroll-bind") box.innerHTML = renderScrollBind();
    else if (id === "scroll-gate-fail") box.innerHTML = renderScrollFail();
    else if (id === "scroll-gate-check") box.innerHTML = renderScrollCheck();
    else if (id === "scroll-gate") box.innerHTML = "<p>Этот свиток можно прочесть.</p><div class=\"modal-actions\"><button type=\"button\" class=\"btn primary\" data-close>Понятно</button></div>";
    else if (id === "consumable-pad") box.innerHTML = renderConsumablePad();
  }

  function expandPack(open, packId) {
    ensureExploreState();
    const id = packId || sheet.inv.packId || "explorers-pack";
    const pack = invItem(id);
    if (!pack) return;
    const contents = packContentsOf(pack);
    if (!contents.length) return;
    if (open && !packIsExpanded(pack)) {
      if (sheet.inv.packExpanded && sheet.inv.packId && sheet.inv.packId !== id) {
        const prev = sheet.inv.packId;
        sheet.inv.items = (sheet.inv.items || []).filter((it) => it.parent_id !== prev);
      }
      contents.forEach((row) => {
        if (!invItem(row.id)) {
          sheet.inv.items.push({
            id: row.id,
            name: row.name,
            bucket: row.bucket || "other",
            weight: row.weight,
            qty: row.qty || 1,
            parent_id: id,
            notes: packNoteOf(id)
          });
        }
      });
      sheet.inv.packExpanded = true;
      sheet.inv.packId = id;
      sheet.inv.openId = pack.id;
    } else if (!open && packIsExpanded(pack)) {
      sheet.inv.items = (sheet.inv.items || []).filter((it) => it.parent_id !== id);
      sheet.inv.packExpanded = false;
      sheet.inv.packId = "";
    }
    render();
  }
  function toggleInvEquip(id) {
    const it = invItem(id);
    if (!it) return;
    if (!it.equipped && armorBlocked(it)) { toast(armorBlockHint(it)); return; }
    it.equipped = !it.equipped;
    if (it.armor_kind === "shield") {
      it.held = it.equipped;
      sheet.shield = it.equipped;
    }
    if (it.requires_attunement && it.equipped && !attunedIds()[it.id]) {
      toast("Чтобы свойства работали: настройте предмет.");
    }
    render();
  }
  function toggleInvHeld(id) {
    const it = invItem(id);
    if (!it) return;
    it.held = !it.held;
    if (it.armor_kind === "shield") {
      it.equipped = it.held;
      sheet.shield = it.held;
    }
    if (it.bucket === "weapon") {
      const atk = (sheet.attacks || []).find((a) => a.name === it.name || a.id === it.id);
      if (atk) atk.held = it.held;
    }
    render();
  }
  function deleteInvItem(id) {
    ensureExploreState();
    sheet.inv.items = (sheet.inv.items || []).filter((it) => it.id !== id && it.parent_id !== id);
    sheet.inv.attunements.forEach((s) => { if (s.item_id === id) { s.item_id = ""; s.name = ""; } });
    if (sheet.inv.openId === id) sheet.inv.openId = "";
    if (sheet.inv.editingId === id) sheet.inv.editingId = "";
    render();
  }
  function addCustomItem() {
    ensureExploreState();
    const id = "custom-" + (sheet.inv._nid++);
    sheet.inv.items.push({ id, name: "", bucket: "other", equipped: false, weight: null, qty: 1, notes: "", role: "вещь" });
    sheet.inv.filter = "all";
    sheet.inv.query = "";
    sheet.inv.openId = id;
    sheet.inv.editingId = id;
    state.explore.menuOpen = false;
    render();
  }
  function addFromCatalog(cid) {
    const e = GEAR_CATALOG.find((row) => row.id === cid);
    if (!e) return;
    const id = e.id + "-" + (sheet.inv._nid++);
    sheet.inv.items.push({
      id, name: e.name, bucket: e.bucket || (e.kind === "weapon" ? "weapon" : e.kind === "armor" ? "armor" : "other"),
      equipped: false, weight: e.weight == null ? null : e.weight, qty: 1,
      notes: e.meta || "", role: e.role || roleLabelOf({ bucket: e.bucket, isScroll: !!e.isScroll, requires_attunement: !!e.requires_attunement }),
      requires_attunement: !!e.requires_attunement, meta: e.meta || "", isPack: !!e.isPack, isScroll: !!e.isScroll
    });
    sheet.inv.openId = id;
    closeDialog();
    render();
  }
  function beginScrollCast(itemId) {
    const it = invItem(itemId);
    if (!it || !it.scroll_spell) { toast("Сначала укажи заклинание на свитке"); return; }
    const block = scrollCastBlock(it);
    if (block) { openDialog("scroll-gate-fail"); sheet.inv.scrollFailId = it.id; render(); return; }
    const gate = scrollReadGate(it.scroll_spell);
    if (gate.status === "check" && !sheet.inv.scrollCheckOk) {
      sheet.inv.scrollCheck = { itemId: it.id, ability: gate.ability || "wis", dc: gate.dc };
      openDialog("scroll-gate-check");
      render();
      return;
    }
    sheet.inv.scrollCheckOk = false;
    const spName = it.scroll_spell.name;
    toast("Каст со свитка «" + spName + "», без ячейки · свиток будет потрачен");
    it.qty = Math.max(0, (it.qty || 1) - 1);
    if (it.qty <= 0) toast("Свиток «" + spName + "» потрачен");
    closeDialog();
    render();
  }

  function bindExplorePointer() {
    const root = document.querySelector("[data-scene-body]");
    if (!root || root._exploreDrag) return;
    root._exploreDrag = true;
    let holdTimer = null, holding = null;
    root.addEventListener("pointerdown", (e) => {
      const card = e.target.closest(".inv-card, .soc-card");
      if (!card || e.target.closest("input, textarea, select, .inv-act, .inv-fav")) return;
      holding = card;
      holdTimer = setTimeout(() => {
        if (holding) {
          holding.classList.add("is-dragging");
        }
      }, 300);
    });
    const clear = () => {
      if (holdTimer) clearTimeout(holdTimer);
      holdTimer = null;
      if (holding) holding.classList.remove("is-dragging");
      holding = null;
    };
    root.addEventListener("pointerup", clear);
    root.addEventListener("pointercancel", clear);
    root.addEventListener("pointermove", (e) => {
      if (!holding || !holding.classList.contains("is-dragging")) return;
      // no scale; positions of icons stay; we don't live-reorder until drop for density
    });
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest(
      "[data-toggle-inv-menu],[data-inv-filter],[data-toggle-card],[data-toggle-equip],[data-toggle-held-item],[data-toggle-pack],[data-toggle-fav-item],[data-sheet-act],[data-toggle-text],[data-edit-text],[data-spend-id],[data-item-id],[data-goto-features],[data-add-note]"
    );
    if (!t) {
      if (state.explore && state.explore.menuOpen && !e.target.closest(".explore-head__tools")) {
        state.explore.menuOpen = false;
        const menu = document.querySelector("[data-inv-menu]");
        if (menu) {
          // re-render to close
          render();
        }
      }
      return;
    }
    if (t.matches("[data-toggle-inv-menu]")) {
      ensureExploreState();
      state.explore.menuOpen = !state.explore.menuOpen;
      render();
      return;
    }
    if (t.matches("[data-inv-filter]")) {
      sheet.inv.filter = t.getAttribute("data-inv-filter");
      render();
      return;
    }
    if (t.matches("[data-toggle-card]")) {
      const id = t.getAttribute("data-item-id");
      sheet.inv.openId = sheet.inv.openId === id ? "" : id;
      if (sheet.inv.openId !== id) sheet.inv.editingId = "";
      render();
      return;
    }
    if (t.matches("[data-toggle-equip]")) { toggleInvEquip(t.getAttribute("data-item-id")); return; }
    if (t.matches("[data-toggle-held-item]")) { toggleInvHeld(t.getAttribute("data-item-id")); return; }
    if (t.matches("[data-toggle-pack]")) {
      const pid = t.getAttribute("data-item-id");
      const pack = invItem(pid);
      expandPack(!packIsExpanded(pack), pid);
      return;
    }
    if (t.matches("[data-toggle-fav-item]")) {
      const id = t.getAttribute("data-item-id");
      const it = invItem(id);
      if (it) it.favorite = !it.favorite;
      const favs = new Set(sheet.inv.favorites || []);
      if (favs.has(id)) favs.delete(id); else favs.add(id);
      sheet.inv.favorites = Array.from(favs);
      render();
      return;
    }
    if (t.matches("[data-toggle-text]")) {
      const id = t.getAttribute("data-toggle-text");
      state.explore.textOpen = state.explore.textOpen === id ? "" : id;
      render();
      return;
    }
    if (t.matches("[data-edit-text]")) {
      state.explore.editText = t.getAttribute("data-edit-text");
      return; // data-open also fires
    }
    if (t.matches("[data-spend-id]")) {
      sheet.inv.spendId = t.getAttribute("data-spend-id");
      return;
    }
    if (t.matches("[data-open='transfer']") || t.hasAttribute("data-item-id") && t.matches("[data-open='transfer'],[data-open=\"transfer\"]")) {
      /* handled below via data-open + item-id */
    }
    if (t.getAttribute("data-open") === "transfer" || t.matches("[data-open='transfer']")) {
      const itemId = t.getAttribute("data-item-id");
      sheet.inv.transferItem = itemId || "";
      sheet.inv.transferCoins = t.hasAttribute("data-inv") && t.getAttribute("data-inv") === "transfer-coins";
    }
    if (t.getAttribute("data-open") === "scroll-bind") {
      sheet.inv.bindItemId = t.getAttribute("data-item-id");
    }
    if (t.getAttribute("data-open") === "scroll-gate-fail") {
      sheet.inv.scrollFailId = t.getAttribute("data-item-id");
    }
    if (t.matches("[data-goto-features]")) {
      state.magicOpen = false;
      setScene("features");
      closeDialog();
      return;
    }
    if (t.matches("[data-sheet-act]")) {
      const act = t.getAttribute("data-sheet-act");
      const id = t.getAttribute("data-id");
      if (act === "inv-custom") addCustomItem();
      else if (act === "inv-edit") {
        sheet.inv.editingId = sheet.inv.editingId === id ? "" : id;
        sheet.inv.openId = id;
        render();
      } else if (act === "inv-delete") { deleteInvItem(id); }
      else if (act === "inv-spend-charge" || act === "inv-charge") {
        const it = invItem(id);
        if (!it) return;
        if (act === "inv-spend-charge") it.charges = Math.max(0, (it.charges || 0) - 1);
        else {
          const n = Number(t.getAttribute("data-n"));
          if (n < (it.charges || 0)) it.charges = n;
          else it.charges = n + 1;
        }
        render();
      } else if (act === "inv-drink") {
        const it = invItem(id);
        if (it) {
          it.qty = Math.max(0, (it.qty || 1) - 1);
          toast("Выпит «" + it.name + "»: " + (it.heal || ""));
        }
        closeDialog();
        render();
      } else if (act === "cast-scroll") beginScrollCast(id);
      else if (act === "gear-filter") {
        sheet.inv.picker[t.getAttribute("data-key")] = t.getAttribute("data-val");
        renderExploreDialog("gear-picker");
      } else if (act === "gear-pick") {
        sheet.inv.picker.selected = t.getAttribute("data-id");
        renderExploreDialog("gear-picker");
      } else if (act === "gear-add") {
        addFromCatalog(sheet.inv.picker.selected);
      } else if (act === "attune-clear") {
        const slot = (sheet.inv.attunements || []).find((s) => s.id === id);
        if (slot) { slot.item_id = ""; slot.name = ""; slot.notes = ""; }
        renderExploreDialog("attunement");
      } else if (act === "transfer-send") {
        const peer = TRANSFER_PEERS.find((p) => p.character_id === sheet.inv.transferPeer) || TRANSFER_PEERS[0];
        if (sheet.inv.transferCoins || !sheet.inv.transferItem) {
          toast("Монеты переданы " + (peer ? peer.character_name : ""));
        } else {
          const it = invItem(sheet.inv.transferItem);
          if (it) {
            toast("«" + it.name + "» передан " + (peer ? peer.character_name : ""));
            deleteInvItem(it.id);
          }
        }
        closeDialog();
        render();
      } else if (act === "scroll-bind-pick") {
        const sp = BINDABLE_SPELLS.find((s) => s.id === t.getAttribute("data-spell"));
        const it = invItem(sheet.inv.bindItemId);
        if (it && sp) {
          it.scroll_spell = clone(sp);
          it.needs = false;
          it.name = "Свиток «" + sp.name + "»";
          toast("На свитке теперь «" + sp.name + "»");
        }
        closeDialog();
        render();
      } else if (act === "scroll-check-roll") {
        const info = sheet.inv.scrollCheck || {};
        const mod = (typeof ability === "function") ? ability(info.ability || "wis") : 0;
        const roll = 1 + Math.floor(Math.random() * 20);
        const total = roll + (Number(mod) || 0);
        const ok = total >= (info.dc || 11);
        toast("к20 " + (mod >= 0 ? "+" : "") + mod + " = " + total + (ok ? " — проверка пройдена" : " — не хватило"));
        if (ok) {
          sheet.inv.scrollCheckOk = true;
          closeDialog();
          beginScrollCast(info.itemId);
        }
      } else if (act === "note-remove") {
        sheet.notes = (sheet.notes || []).filter((n) => n.id !== id);
        if (state.explore.textOpen === id) state.explore.textOpen = "";
        render();
      } else if (act === "add-note") {
        const nid = "note-" + Date.now();
        sheet.notes = sheet.notes || [];
        sheet.notes.push({ id: nid, name: "Свои заметки", preview: "", body: "" });
        state.explore.textOpen = nid;
        state.explore.editText = nid;
        state.explore.menuOpen = false;
        openDialog("edit-text");
        render();
      }
      return;
    }
  });

  document.addEventListener("input", (e) => {
    const el = e.target;
    if (!el || !el.matches) return;
    if (el.matches("[data-inv-search]")) {
      sheet.inv.query = el.value;
      const list = document.querySelector("[data-inv-list]");
      if (list) {
        const filter = sheet.inv.filter || "all";
        const q = (sheet.inv.query || "").toLowerCase();
        const items = (sheet.inv.items || []).filter((it) => itemMatchesFilter(it, filter, q));
        list.innerHTML = items.length ? items.map(renderInvCard).join("") : '<div class="inv-empty">Сумка пуста. Добавь предмет из справочника или свою строку.</div>';
      }
      return;
    }
    if (el.matches("[data-gear-query]")) {
      sheet.inv.picker.query = el.value;
      renderExploreDialog("gear-picker");
      const again = document.querySelector("[data-gear-query]");
      if (again) { again.focus(); try { again.setSelectionRange(el.value.length, el.value.length); } catch (err) {} }
      return;
    }
    if (el.matches("[data-inv-field]")) {
      const it = invItem(el.getAttribute("data-id"));
      if (!it) return;
      const field = el.getAttribute("data-inv-field");
      if (field === "qty") it.qty = Math.max(0, Number(el.value) || 0);
      else if (field === "weight") it.weight = el.value === "" ? null : Number(el.value);
      else if (field === "notes") it.notes = el.value;
      else if (field === "name") it.name = el.value;
      return;
    }
    if (el.matches("[data-attune-notes]")) {
      const slot = (sheet.inv.attunements || []).find((s) => s.id === el.getAttribute("data-attune-notes"));
      if (slot) slot.notes = el.value;
      return;
    }
    if (el.matches("[data-appearance-field]")) {
      sheet.appearance = el.value;
      return;
    }
    if (el.matches("[data-text-field]")) {
      const id = state.explore.editText;
      const field = el.getAttribute("data-text-field");
      if (sheet.texts[id]) {
        sheet.texts[id][field] = el.value;
        if (field === "body") {
          const cut = (el.value || "").trim().split(/(?<=[.!?])\s/)[0] || "";
          sheet.texts[id].preview = cut.length > 90 ? cut.slice(0, 87) + "…" : cut;
        }
      } else {
        const note = (sheet.notes || []).find((n) => n.id === id);
        if (note) {
          note[field] = el.value;
          if (field === "body") {
            const cut = (el.value || "").trim().split(/(?<=[.!?])\s/)[0] || "";
            note.preview = cut.length > 90 ? cut.slice(0, 87) + "…" : cut;
          }
        }
      }
    }
  });
  document.addEventListener("change", (e) => {
    const el = e.target;
    if (!el || !el.matches) return;
    if (el.matches("[data-attune-item]")) {
      const slot = (sheet.inv.attunements || []).find((s) => s.id === el.getAttribute("data-attune-item"));
      if (!slot) return;
      slot.item_id = el.value || "";
      const it = slot.item_id ? invItem(slot.item_id) : null;
      slot.name = it ? it.name : "";
      if (it) it.equipped = true;
      renderExploreDialog("attunement");
      return;
    }
    if (el.matches("[data-transfer-peer]")) {
      sheet.inv.transferPeer = el.value;
    }
  });

  function setExplore(opts) {
    opts = opts || {};
    ensureExploreState();
    if (opts.scene) setScene(opts.scene);
    if ("magic" in opts) state.magicOpen = !!opts.magic && (typeof isCaster === "function" ? isCaster() : true);
    if ("openItem" in opts) sheet.inv.openId = opts.openItem || "";
    if ("editingId" in opts) sheet.inv.editingId = opts.editingId || "";
    if ("filter" in opts) sheet.inv.filter = opts.filter || "all";
    if ("query" in opts) sheet.inv.query = opts.query || "";
    if ("packExpanded" in opts) {
      const pid = opts.packId || sheet.inv.packId || "explorers-pack";
      if (opts.packExpanded) expandPack(true, pid);
      else expandPack(false, pid);
    }
    if (opts.attunement) { state.dialog = "attunement"; }
    if (opts.transfer) {
      sheet.inv.transferItem = opts.transferItem || "";
      sheet.inv.transferCoins = !!opts.transferCoins;
      state.dialog = "transfer";
    }
    if (opts.appearance) state.dialog = "appearance";
    if (opts.editText) { state.explore.editText = opts.editText; state.explore.textOpen = opts.editText; state.dialog = "edit-text"; }
    if (opts.scrollBind) { sheet.inv.bindItemId = opts.scrollBind; state.dialog = "scroll-bind"; }
    if (opts.scrollFail) { sheet.inv.scrollFailId = opts.scrollFail; state.dialog = "scroll-gate-fail"; }
    if (opts.scrollCheck) {
      const it = invItem(opts.scrollCheck);
      const gate = it && it.scroll_spell ? scrollReadGate(it.scroll_spell) : { ability: "wis", dc: 11 };
      sheet.inv.scrollCheck = { itemId: opts.scrollCheck, ability: gate.ability || "wis", dc: gate.dc || 11 };
      state.dialog = "scroll-gate-check";
    }
    if (opts.textOpen) state.explore.textOpen = opts.textOpen;
    if ("menuOpen" in opts) state.explore.menuOpen = !!opts.menuOpen;
    render();
    bindExplorePointer();
  }

  // bind drag after first paint of scene body
  const _renderExploreBody = renderExploreBody;
  // already called from renderSceneBody after hook
