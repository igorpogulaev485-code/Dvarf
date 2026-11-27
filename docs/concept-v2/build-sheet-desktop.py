#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build self-contained sheet-desktop.html and CONCEPT.md §26 inventory."""
from pathlib import Path
import html as htmlmod

ROOT = Path("/workspace/dark-theme-concept")
PARCHMENT = open("/tmp/bg-parchment.txt").read().strip().strip('"')
INK = open("/tmp/bg-ink.txt").read().strip().strip('"')

# Inventory: id, group, name, does, code, in_mock
INV = []

def add(gid, name, does, code, group):
    INV.append({
        "id": gid,
        "name": name,
        "does": does,
        "code": code,
        "group": group,
    })
    return gid

# ——— A. Оболочка и состояния ———
add("back", "← К списку", "Возврат к «Мои персонажи»", "CharacterDetailPage.tsx (Link to=/characters)", "Оболочка")
add("help", "Справка", "Открывает справку листа (HelpDrawer)", "CharacterDetailPage.tsx; HelpDrawer", "Оболочка")
add("classic", "Классический лист 2014", "Печатный/классический бланк 2014", "CharacterDetailPage.tsx → /characters/:id/classic", "Оболочка")
add("lobby", "В лобби", "Диалог входа в лобби по коду", "CharacterDetailPage.tsx (lobbyOpen)", "Оболочка")
add("more", "⋯ Ещё", "Меню: классический лист, в лобби (и на узкой ширине дубли шапки)", "CharacterDetailPage.tsx moreOpen", "Оболочка")
add("state-loading", "Состояние: загрузка", "Текст «Открываем лист...»", "CharacterDetailPage.tsx loading", "Состояния")
add("state-error", "Состояние: ошибка", "Показ текста ошибки загрузки", "CharacterDetailPage.tsx error", "Состояния")
add("state-remote", "Баннер: сохранён в другой вкладке", "Позже / Обновить (vN, refreshing «Обновляем…»)", "CharacterDetailPage.tsx remoteNotice", "Состояния")
add("lobby-join", "Диалог «В лобби»", "Код приглашения, вход; конфликт «персонаж в другом лобби»; acknowledge_start_mismatch", "CharacterDetailPage.tsx", "Окна")
add("onb-ready", "Диалог «Персонаж готов»", "Мост после создания: открыть с туром или без", "CharacterReadyDialog.tsx", "Онбординг")
add("onb-welcome", "Приветствие / тур листа", "WelcomeDialog, SheetTour, «Показать подсказки снова»", "WelcomeDialog, SheetTour, onboarding", "Онбординг")
add("onb-tips", "Подсказки новичка «?»", "showValueTips рядом с КД, хитами, БМ", "PlayDeskHeader.tsx showValueTips", "Онбординг")

# ——— B. Шапка стола ———
add("identity", "Блок «Основное» (имя, аватар)", "Открывает диалог идентичности: имя, раса, мировоззрение, предыстория, классы", "PlayDeskHeader.tsx onOpenIdentity; SheetIdentityDialog.tsx; IdentityDialog.tsx", "Шапка")
add("edition-badge", "Бейдж редакции 2014/2024", "Показ rules_edition в шапке и в подвале «Редакция · vN»", "PlayDeskHeader.tsx rulesEdition; PlayDeskLayout.tsx", "Шапка")
add("class-chip", "Чип класса и уровня", "Жрец 5 / архетип; клик — настройка класса / повышение", "PlayDeskHeader.tsx classChips", "Шапка")
add("needs-setup", "«Нужно настроить»", "Список незакрытых шагов создания; выбор пункта открывает мастер", "PlayDeskTop.tsx handleNeedsSetupSelect", "Шапка")
add("xp-bar", "Полоса опыта / вехи", "Открывает панель XP (добавить опыт, история XP, вехи); готовность к уровню", "PlayDeskHeader.tsx xpPadOpen, xpHistory, progressionMode", "Шапка")
add("level-up", "Повышение уровня", "Диалог LevelUp", "LevelUpDialog.tsx", "Окна")
add("ac", "Класс защиты", "Открывает разборку КД", "PlayDeskHeader.tsx onOpenAc; AcBreakdownDialog.tsx", "Шапка")
add("shield", "Щит в руке", "Взять/убрать щит (КД ± бонус). Подсказки: «Щит в руке — нажми, чтобы убрать…» / «Взять щит в руку…»", "PlayDeskHeader.tsx", "Шапка")
add("speed", "Скорость", "Открывает разборку и список режимов скорости", "SpeedBreakdownDialog.tsx; SpeedModesMenuBody.tsx", "Шапка")
add("jump", "Прыжок", "Подсказка «Прыжок: в длину N фт, в высоту N фт»", "PlayDeskHeader.tsx", "Шапка")
add("initiative", "Инициатива (значение)", "Разборка инициативы и бонусы", "InitiativeBreakdownDialog.tsx", "Шапка")
add("init-roll", "Бросок инициативы", "Бросок из листа, source:'sheet'", "PlayDeskHeader.tsx onInitiativeRoll; sheetActions4.ts", "Броски")
add("pb", "Бонус мастерства", "Подсказка «Бонус мастерства (от уровня)»", "PlayDeskHeader.tsx", "Шапка")
add("inspiration", "Вдохновение", "Переключатель вдохновения. Подсказка: «Вдохновение — нажми, чтобы переключить»", "PlayDeskHeader.tsx onToggleInspiration", "Шапка")
add("exhaustion", "Истощение", "Показ ступени; клик — правка", "PlayDeskHeader.tsx exhaustionStage", "Шапка")
add("coins", "Кошелёк", "Панель монет (зм и размен)", "CoinPadDialog.tsx", "Шапка")
add("rest", "Отдых", "Короткий / длинный отдых", "RestDialog.tsx", "Шапка")
add("hp", "Хиты", "Панель хитов: урон, лечение, врем. хиты, спас. от смерти", "HpPadDialog.tsx", "Шапка")
add("temp-hp", "Временные хиты", "Замена временных хитов, если уже есть", "TempHpReplaceDialog.tsx", "Окна")
add("max-hp", "Макс. хиты по уровням", "Разбор max HP (в т.ч. стойкость дварфа)", "MaxHpByLevelsDialog.tsx", "Окна")
add("conditions", "Состояния", "Горячий список состояний", "HotConditionsDialog.tsx", "Шапка")
add("effects", "Активные эффекты", "Полоса эффектов / пусто «Нет активных эффектов»", "ActiveEffectsPanel.tsx", "Шапка")

# ——— C. Характеристики ———
add("abil-rail", "Колонка характеристик", "Шесть плашек, сворачивание навыков, порядок сохраняется в UI", "AbilitySkillsColumn.tsx; 21-ability-rail.css", "Характеристики")
add("abil-click", "Клик по плашке", "Свернуть/развернуть навыки этой характеристики", "AbilitySkillsColumn.tsx (§14 гибрид)", "Характеристики")
add("abil-drag", "Перенос плашки", "Гибрид: за любую область после сдвига >5px; ручка из двух полосок на hover", "AbilitySkillsColumn.tsx; sheet UI order", "Характеристики")
add("abil-score", "Число характеристики", "Открывает разборку (баз, раса, предметы, бафы)", "AbilityBreakdownDialog.tsx", "Характеристики")
add("abil-check", "Бросок проверки характеристики", "source:'sheet'", "sheetActions4.ts; deskRolls.ts", "Броски")
add("abil-save", "Спасбросок (Пр)", "Вкл. владение / бросок спаса", "AbilitySkillsColumn.tsx", "Характеристики")
add("skill-row", "Строка навыка", "Бросок навыка; владение / компетенция", "PlayDeskSkillStrip.tsx; AbilitySkillsColumn.tsx", "Характеристики")
add("abil-collapse-all", "Свернуть / развернуть все", "Все плашки сразу; по умолчанию навыки свёрнуты (UIKIT-02)", "AbilitySkillsColumn.tsx", "Характеристики")
add("abil-gear-buffs", "«С учётом предметов и бафов»", "Переключатель учёта бонусов снаряжения и эффектов", "AbilitySkillsColumn.tsx", "Характеристики")
add("abil-colors", "Цвета характеристик / моноакцент", "Режим unique (медь…слива) или theme (один акцент)", "§13; account appearance data-abil", "Характеристики")

# ——— D. Сцены и панели ———
add("scene-combat", "Сцена «Бой»", "По умолчанию панель атак; split пинит магию рядом, если есть источники", "playDeskUi.ts combat; PlayDeskScenes.tsx; PlayDeskAttacksCompact.tsx", "Сцены")
add("scene-explore", "Сцена «Исследование»", "Снаряжение на всю ширину; магия по кнопке", "playDeskUi.ts explore; PlayDeskExploreCompact.tsx", "Сцены")
add("scene-social", "Сцена «Общение»", "Тексты и заметки на всю ширину; магия по кнопке", "playDeskUi.ts social; PlayDeskSocialCompact.tsx", "Сцены")
add("scene-companions", "Сцена «Напарники»", "Панель напарников", "playDeskUi.ts companions; PlayDeskCompanionsCompact.tsx", "Сцены")
add("scene-features", "Сцена «Способности»", "Классовые/расовые умения и ресурсы", "playDeskUi.ts features; PlayDeskFeaturesCompact.tsx", "Сцены")
add("scene-hint", "Подсказка сцены (MODE_HINT)", "Напр. «Сцена боя: атаки и заклинания рядом»", "playDeskUi.ts MODE_HINT; scene intros", "Сцены")
add("split-magic", "Показать / скрыть магию", "В исследовании и общении; в бою split по умолчанию. «Скрыть магию — основная панель на всю ширину»", "playDeskUi.ts deskSplit; PlayDeskSpellsCompact.tsx", "Сцены")
add("bottom-nav", "Нижняя навигация сцен", "Короткие подписи при ширине <960: Бой / Исслед. / Общение / Напарн. / Способн.", "BottomSceneNav.tsx", "Сцены")
add("turn-chips", "Чипы хода (действ. / преим. / помощь / броски)", "Трекер действий раунда + броски", "PlayDeskHotBar.tsx; PlayDeskTop.tsx", "Бой")
add("hotbar", "Горячая полоса расходников", "До 3 избранных расходников боя", "PlayDeskHotBar.tsx; ui favorites max 3", "Бой")

# ——— E. Атаки и оружие ———
add("attack-card", "Плашка оружия / атаки", "Карточка атаки: бонус, урон, свойства; контур типа оружия + слот арта", "PlayDeskAttacksCompact.tsx; AttacksPanel.tsx", "Атаки")
add("attack-roll", "Бросок атаки из плашки", "source:'sheet'; окно броска v2", "sheetActions4.ts; postSheetRollToSession.ts", "Броски")
add("damage-roll", "Бросок урона", "source:'sheet'", "sheetActions4.ts", "Броски")
add("weapon-breakdown", "Разборка атаки оружием", "Формула бонуса атаки и урона", "WeaponAttackBreakdownDialog.tsx", "Окна")
add("attack-bonus", "Разборка бонуса атаки", "Общие бонусы атаки", "AttackBonusBreakdownDialog.tsx", "Окна")
add("attacks-settings", "Настройки атак", "Список атак, ручные правки", "AttacksSettingsDialog.tsx", "Окна")
add("grapple", "Захват / толкание", "Диалог захвата и толчка", "GrappleShoveDialog.tsx", "Окна")
add("attacks-empty", "Пустые атаки", "Пустое состояние панели атак + действие добавить", "PlayDeskAttacksCompact.tsx", "Состояния")

# ——— F. Заклинания ———
add("spell-card", "Плашка заклинания", "Имя, уровень, урон/эффект, школа (контур) / слот арта; клик — детали строки, имя — описание, dblclick — описание", "PlayDeskSpellsCompact.tsx; 18-spell-compact-cards.css", "Заклинания")
add("spell-granted", "Всегда подготовленное (грант)", "Класс is-granted: диагональный градиент акцента; вне лимита подготовки", "isGrantedSpellHighlight(); spellSourceBadge(); CSS .is-granted", "Заклинания")
add("spell-item", "Заклинание от предмета / артефакта", "id gear-spell: / item_cast, бейдж «Предмет», заряды, градиент гранта, tooltip источника", "spells.ts spellSourceBadge kind feature; itemSpellCast", "Заклинания")
add("spell-feature", "Заклинание от способности", "id feature-spell:, бейдж «Умение», tooltip «Всегда подготовлено · Умение»", "spells.ts; alwaysPreparedSpellEnrichment.ts", "Заклинания")
add("spell-source-tip", "Tooltip источника", "Тексты: «Всегда подготовлено · {Раса|Черта|Архетип|Умение|Предмет|грант} — вне лимита…»; список расы/черты — «готовь как классовое»; хомбрю — «только на этом листе»", "spells.ts spellSourceBadge().title", "Подсказки")
add("spell-detail", "Описание заклинания", "SpellDetailDialog (по имени / двойному клику)", "SpellDetailDialog.tsx", "Окна")
add("cast-spell", "Сотворить заклинание", "Ячейка / без ячейки / от предмета; концентрация", "CastSpellDialog.tsx", "Окна")
add("spell-cast-break", "Разборка сл. спас. и атаки", "Профили источников магии", "SpellCastBreakdownDialog.tsx", "Окна")
add("prepare", "Подготовить заклинания", "Сегодняшний набор, книга, гранты с градиентом prepare-row.is-granted", "PrepareSpellsDialog.tsx; 14-create-pipeline.css", "Окна")
add("spellbook", "Книга заклинаний", "Управление книгой волшебника / ритуалы", "SpellbookManageDialog.tsx; RitualBookCopyDialog.tsx", "Окна")
add("grimoire", "Гримуар / физическая книга", "Книга в инвентаре, знаток школы, перо писца", "GrimoireDialog.tsx", "Окна")
add("spells-settings", "Настройки заклинаний", "Каталог, фокус, мешочек компонентов, формулы Сл/атаки", "SpellsSettingsDialog.tsx", "Окна")
add("custom-spell", "Своё заклинание", "Хомбрю на этом листе", "CustomSpellDialog.tsx; SpellFormDialog.tsx", "Окна")
add("spell-filters", "Фильтр и поиск заклинаний", "Чипы фильтра + поле «Поиск заклинания»", "PlayDeskSpellsCompact.tsx", "Заклинания")
add("slots", "Ячейки (pips)", "Трата/возврат ячеек уровня; pact slots отдельно", "PlayDeskSpellsCompact.tsx", "Заклинания")
add("concentration", "Концентрация", "Флаг «конц.» / «держит конц.»; активное подсвечивается", "PlayDeskSpellsCompact.tsx is-conc-active", "Заклинания")
add("ritual-book", "Ритуал из книги (не подготовлено)", "Строка is-ritual-unprepared, подпись «Не подготовлено · ритуал из книги»", "PlayDeskSpellsCompact.tsx isRitualFromBook", "Заклинания")
add("book-lost", "Книга утеряна", "Подготовка и ритуалы из книги закрыты; ссылка в настройки", "PlayDeskSpellsCompact.tsx play-desk-compact__book-lost", "Состояния")
add("spells-empty", "Пустые заклинания", "Пустой блок + ссылка подготовить", "PlayDeskSpellsCompact.tsx", "Состояния")
add("spell-art-svg", "Контур школы магии", "8 школ, свои SVG в стиле подложек, справа с затуханием", "макет v2 (сейчас в продукте контуров нет)", "Заклинания")
add("spell-art-slot", "Слот под арт дизайнера", "Вариант-заглушка с растровым плейсхолдером (не чужой арт)", "макет v2", "Заклинания")

# ——— G. Снаряжение, общение, напарники, способности ———
add("inventory", "Снаряжение", "Список предметов, экипировка, вес", "InventoryPanel.tsx; PlayDeskExploreCompact.tsx", "Снаряжение")
add("gear-picker", "Справочник снаряжения", "Добавить предмет из каталога", "GearPickerDialog.tsx", "Окна")
add("attunement", "Настроенные предметы", "Слоты настройки", "AttunementDialog.tsx", "Окна")
add("transfer", "Передать", "Передача предмета", "TransferDialog.tsx", "Окна")
add("scroll-bind", "Привязать свиток", "Какое заклинание на свитке", "SpellScrollBindDialog.tsx", "Окна")
add("infusions", "Активные инфузии", "Изобретатель: инфузии", "InfusionsActiveDialog.tsx", "Окна")
add("inventory-empty", "Пустое снаряжение", "Пустое состояние + добавить", "PlayDeskExploreCompact.tsx", "Состояния")
add("texts", "Тексты и заметки", "Личность, идеалы, узы, изъяны, заметки", "PlayDeskSocialCompact.tsx панель texts", "Общение")
add("companion-card", "Карточка напарника", "Хиты, атаки, переход в сцену", "PlayDeskCompanionsCompact.tsx; CompanionsPanel.tsx", "Напарники")
add("companion-pick", "Выбор существа-напарника", "Справочник существ", "CompanionCreaturePickDialog.tsx", "Окна")
add("familiar-pick", "Выбор фамильяра", "Список фамильяров", "FamiliarPickDialog.tsx", "Окна")
add("ally-ability", "Способность союзника", "UseAllyAbilityDialog", "UseAllyAbilityDialog.tsx", "Окна")
add("wild-shape", "Дикий облик", "Друид: формы", "WildShapeDialog.tsx", "Окна")
add("companions-empty", "Пустые напарники", "Пустое состояние + добавить", "PlayDeskCompanionsCompact.tsx", "Состояния")
add("features-list", "Список способностей", "Класс, раса, черты, предыстория", "PlayDeskFeaturesCompact.tsx; ClassFeaturesPanel.tsx", "Способности")
add("feature-form", "Форма умения", "Самоописание / использование", "FeatureSelfFormDialog.tsx", "Окна")
add("res-channel", "Божественный канал", "Трата канала", "ChannelDivinitySpendDialog.tsx", "Окна")
add("res-hands", "Наложение рук", "Трата пула", "LayOnHandsSpendDialog.tsx", "Окна")
add("res-ki", "Ци", "Трата ци", "KiSpendDialog.tsx", "Окна")
add("res-sorcery", "Единицы чародейства", "Трата / превращение ячеек", "SorceryPointsSpendDialog.tsx", "Окна")
add("res-bardic", "Вдохновение барда", "Трата кости", "BardicInspirationSpendDialog.tsx", "Окна")
add("res-superiority", "Кости превосходства", "Трата", "SuperiorityDiceSpendDialog.tsx", "Окна")
add("res-psionic", "Псионические кости", "Трата", "PsionicDiceSpendDialog.tsx", "Окна")
add("res-trinkets", "Безделушки душ", "Трата", "SoulTrinketsSpendDialog.tsx", "Окна")
add("res-arcanum", "Арканум колдуна", "Трата", "WarlockArcanumSpendDialog.tsx", "Окна")
add("res-arcane", "Магическое восстановление", "Трата", "ArcaneRecoverySpendDialog.tsx", "Окна")
add("invocations", "Мистические воззвания", "Список воззваний колдуна", "WarlockInvocationsDialog.tsx", "Окна")
add("ranger-favored", "Избранное следопыта", "Виды / земли", "RangerFavoredDeskDialog.tsx", "Окна")
add("wizard-feature", "Умение волшебника", "Знаток школы и др.", "WizardFeatureUseDialog.tsx", "Окна")
add("features-empty", "Пустые способности", "Пустое состояние", "PlayDeskFeaturesCompact.tsx", "Состояния")

# ——— H. Настройка персонажа ———
add("race-setup", "Настройка расы", "Раса / хомбрю-раса / черта расы", "RaceSetupDialog.tsx", "Окна")
add("class-setup", "Настройка класса", "Класс / хомбрю-класс", "ClassSetupDialog.tsx", "Окна")
add("subclass-setup", "Настройка архетипа", "Выбор подкласса", "SubclassSetupDialog.tsx", "Окна")
add("subclass-change", "Сменить архетип?", "Подтверждение смены", "SubclassChangeConfirmDialog.tsx", "Окна")
add("bg-setup", "Настройка предыстории", "Предыстория / хомбрю", "BackgroundSetupDialog.tsx", "Окна")
add("feat-setup", "Настройка черты", "Черта", "FeatSetupDialog.tsx", "Окна")
add("asi", "Увеличение характеристик (ASI)", "ASI / черта на уровне", "ClassAsiDialog.tsx", "Окна")
add("guided", "Пошаговый мастер", "GuidedWizard", "GuidedWizardDialog.tsx", "Окна")
add("tags", "Теги персонажа", "Теги листа / списка", "CharacterTagsDialog.tsx", "Окна")
add("telekinetic", "Толчок (Телекинез)", "Диалог толчка", "TelekineticShoveDialog.tsx", "Окна")
add("enter-number", "Ввести своё число", "Ручной ввод", "EnterOwnNumberDialog.tsx", "Окна")
add("consumable-pad", "Расходник: трата", "Панель траты расходника", "ConsumableSpendPadDialog.tsx", "Окна")
add("carry-2024", "Поле carry (бланк 2024)", "Заметка для бланка 2024; вес инвентаря считается отдельно на столе", "SheetIdentityDialog.tsx hint", "2014/2024")

# ——— I. Броски и журнал ———
add("dice-fab", "Кнопка d20 (ПК справа внизу)", "Открывает окно броска v2; на листе доступна всегда вошедшему", "DiceRollerHost.tsx; §22", "Броски")
add("dice-window", "Окно броска v2", "Формула, результат, преимущество; переехало в лист в оформлении v2", "DiceRollerHost; концепт §22", "Броски")
add("dice-sheet-source", "Бросок из листа source:'sheet'", "Атака, урон, проверка, спас, инициатива, заклинание — попадают в журнал и (если в лобби) в сессию", "sheetActions4.ts; deskRolls.ts; postSheetRollToSession.ts", "Броски")
add("journal", "Журнал бросков стола", "ui.roll_history на листе; одноразово сливается в журнал кубика", "playDeskUi.ts rollHistory; DiceRollerHost.tsx «Sheet history for one-time journal merge»", "Броски")
add("dice-on-table", "Настройка «Кубики на столе»", "Личное предпочтение T-01, diceOnTablePref", "playDeskUi.ts diceOnTablePref", "Броски")
add("xp-history", "История опыта", "ui.xp_history на листе", "playDeskUi.ts xpHistory; PlayDeskHeader.tsx", "Шапка")

# ——— J. 2014 vs 2024 ———
add("diff-2014", "Отличия 2014 на листе", "Подписи «раса/подраса», классический бланк «Классический лист 2014», создание 2024 в продукте скрыто (FIX-hide2024)", "rules_edition; CharacterDetailPage classic link; P24-01", "2014/2024")
add("diff-2024", "Отличия 2024 на листе", "Поле carry в «Основном»; справочники/формулы берут edition; создание 2024 пока закрыто для всех (без allowlist). Живых веток UI «вид вместо расы» / мастерств оружия на столе в origin/main мало — формулы завязаны на rulesEdition", "SheetIdentityDialog.tsx; SheetDialogsResources/Rolls/Setup; spellReadyToCast(..., edition)", "2014/2024")

assert len({x['id'] for x in INV}) == len(INV), "duplicate ids"
print("inventory items:", len(INV))

# write inventory json for tests / md
import json
(ROOT / "sheet-inventory.json").write_text(json.dumps(INV, ensure_ascii=False, indent=2), encoding="utf-8")
print("wrote sheet-inventory.json")
