  if (typeof LIVE === "undefined") { var LIVE = window.SheetLive || (window.SheetLive = {}); }
  else window.SheetLive = LIVE;

  state.dicePool = state.dicePool || { 20: 1 };
  state.journalTab = state.journalTab || "mine";
  state.tableRolls = state.tableRolls || [];
  state.diceSelfOnly = !!state.diceSelfOnly;
  state.clearArmed = false;
  state.tourIndex = (state.tourIndex == null ? -1 : state.tourIndex);
  state.helpOpenSection = state.helpOpenSection || "";
  state.sys = state.sys || {};
  state.namedFeat = state.namedFeat || "Атака по возможности";
  state.ownNumber = state.ownNumber || "";
  state.ownNumberMode = state.ownNumberMode || "total";

  function sysEnsure() {
    state.sys = state.sys || {};
    state.sys.luckyDice = state.sys.luckyDice || [4, 17, 11];
    state.sys.guidanceLabel = state.sys.guidanceLabel || "Убеждение";
    if (!sheet.sorcery && (sheet.charId === "sira" || (sheet.name || "").indexOf("Сира") >= 0)) {
      sheet.sorcery = { cur: 5, max: 5 };
    }
    return state.sys;
  }

  function footPair(primary, pact, secondary, sact) {
    return '<div class="modal-actions">' +
      '<button type="button" class="btn is-primary" data-sys="' + pact + '">' + primary + "</button>" +
      '<button type="button" class="btn" data-sys="' + sact + '">' + secondary + "</button>" +
      "</div>";
  }

  function srcChip(text) {
    return '<p class="src-chip">' + esc(text) + "</p>";
  }

  function renderNamedTarget() {
    return "<p class='cbt-kicker'>Укажите цель для умения: Страж, Убийца магов, ответный удар — с подписью умения.</p>" +
      '<label class="field">Умение<input type="text" data-named-feat value="' + esc(state.namedFeat || "Атака по возможности") + '"></label>' +
      '<label class="field">Имя существа<input type="text" data-named-who placeholder="цель" value="' + esc(state.target || "") + '"></label>' +
      footPair("Выбрать", "named-go", "Отмена", "sys-close");
  }

  function renderConflict() {
    return "<p>На сервере уже есть более новая версия (другая вкладка, устройство или гонка автосейва). «Сохранить мои правки» запишет то, что на экране. «Взять с сервера» заменит экран серверной копией — локальные правки пропадут.</p>" +
      footPair("Сохранить мои правки", "conflict-keep", "Взять с сервера", "conflict-server");
  }

  function renderHalflingLucky() {
    return "<p>На к20 выпала 1. Удача полурослика: можете перебросить — новый результат обязателен.</p>" +
      srcChip("Раса: Удача") +
      footPair("Перебросить", "lucky-reroll", "Оставить 1", "lucky-keep");
  }

  function sorceryLeft() {
    sysEnsure();
    if (sheet.sorcery) return sheet.sorcery;
    const res = (typeof classResources === "function" ? classResources() : []) || [];
    const row = res.find(function (r) { return /чар|sorcer/i.test(String(r.name || "") + " " + String(r.id || "")); });
    if (row && row.max != null) return { cur: row.cur, max: row.max };
    return { cur: 5, max: 5 };
  }

  function renderGuidance() {
    const o = sysEnsure();
    const sp = sorceryLeft();
    const label = o.guidanceLabel || "Убеждение";
    return "<p>При провале проверки «" + esc(label) + "» можно потратить 1 очко чародейства и перебросить к20 — новый результат обязателен.</p>" +
      srcChip("Умение: Магическое наставление") +
      (sp.cur <= 0 ? '<p class="pad-note">Нет очков чародейства</p>' : '<p class="pad-note">Очки чародейства: ' + sp.cur + "/" + sp.max + ".</p>") +
      footPair("Перебросить (−1 очко)", "guidance-reroll", "Не сейчас", "guidance-skip");
  }

  function renderRelentless() {
    return "<p>Хиты должны опуститься до 0. Использовать Непоколебимую стойкость и остаться с 1 хитом? (1 раз до продолжительного отдыха)</p>" +
      srcChip("Раса: Непоколебимая стойкость") +
      footPair("Остаться с 1 хитом", "relentless-stay", "Упасть", "relentless-fall");
  }

  function renderLuckyPick() {
    const dice = (sysEnsure().luckyDice || [4, 17, 11]);
    const chips = dice.map(function (d, i) {
      return '<button type="button" class="sheet-chip" data-sys="lucky-choose" data-v="' + d + '" data-i="' + i + '">' + d + "</button>";
    }).join("");
    return "<p>Выберите любую из выпавших костей.</p>" +
      srcChip("Черта: Везунчик") +
      '<div class="pad-row lucky-dice" role="group" aria-label="Кости удачи">' + chips + "</div>" +
      footPair("Закрыть", "lucky-close", "Отмена", "lucky-close");
  }

  function renderWelcome() {
    return "<p>Это лист персонажа и стол для D&amp;D: до приключения — один клик. Сначала создадим героя, потом коротко покажем, как читать лист.</p>" +
      '<p class="pad-note">Как тебе удобнее начать?</p>' +
      '<div class="onboard-choices" role="group" aria-label="Как тебе удобнее начать?">' +
      '<button type="button" class="btn is-primary onboard-choice" data-sys="welcome-dnd">Я впервые в D&amp;D</button>' +
      '<button type="button" class="btn onboard-choice" data-sys="welcome-product">Играл, но тут впервые</button>' +
      '<button type="button" class="btn onboard-choice" data-sys="welcome-skip">Пропустить подсказки</button>' +
      "</div>";
  }

  function renderReady() {
    return "<p>Ядро собрано. Дальше — цифровой лист: сверху бой и хиты, ниже — атаки и заклинания; характеристики открываются из шапки. За стол сядете в лобби.</p>" +
      footPair("Как читать лист (2 мин)", "ready-tour", "Сразу к листу", "ready-skip");
  }

  function renderEnterNumber() {
    const mode = state.ownNumberMode || "total";
    const mod = Number(state.diceMod) || 0;
    const val = state.ownNumber;
    const n = val === "" || val == null ? null : Number(val);
    const total = (mode === "d20" && n != null) ? n + mod : n;
    const field = mode === "d20" ? "Выпало на к20" : "Итог";
    const extra = mode === "d20"
      ? ('<p class="pad-note">Модификатор ' + (mod >= 0 ? "+" + mod : mod) + (n != null ? " → итог " + total : "") + "</p>")
      : "";
    return '<p class="lead">Число с живого кубика. В ленту уйдёт с пометкой «кубик на столе».</p>' +
      '<label class="field">' + field + '<input type="number" inputmode="numeric" data-own-number value="' + esc(val == null ? "" : String(val)) + '"></label>' +
      extra +
      footPair("Записать", "own-save", "Отмена", "sys-close");
  }

  LIVE["named-target"] = { title: "Цель", body: renderNamedTarget };
  LIVE["sheet-conflict"] = { title: "Конфликт версий листа", body: renderConflict };
  LIVE["halfling-lucky"] = { title: "Удача: перебросить?", body: renderHalflingLucky };
  LIVE["magical-guidance"] = { title: "Магическое наставление", body: renderGuidance };
  LIVE["relentless"] = { title: "Непоколебимая стойкость", body: renderRelentless };
  LIVE["lucky-pick"] = { title: "Везунчик: выберите к20", body: renderLuckyPick };
  LIVE["onb-welcome"] = { title: "Добро пожаловать в КриD20", body: renderWelcome };
  LIVE["onb-ready"] = { title: "Персонаж готов", body: renderReady };
  LIVE["enter-number"] = { title: "Ввести своё число", body: renderEnterNumber };

  function openConflict() { openDialog("sheet-conflict"); }
  function openLuck() { openDialog("halfling-lucky"); }
  function openGuidance(opts) {
    sysEnsure().guidanceLabel = (opts && opts.label) || "Убеждение";
    openDialog("magical-guidance");
  }
  function openEndurance() { openDialog("relentless"); }
  function openLuckyPick(dice) {
    sysEnsure().luckyDice = (dice && dice.length) ? dice.slice() : [4, 17, 11];
    openDialog("lucky-pick");
  }
  function openWelcome() { openDialog("onb-welcome"); }
  function openReady() { openDialog("onb-ready"); }
  function openNamedTarget() { openDialog("named-target"); }
  function openEnterNumber(opts) {
    const o = opts || {};
    state.ownNumber = "";
    state.ownNumberMode = o.mode || "total";
    if (o.modifier != null) state.diceMod = Number(o.modifier) || 0;
    openDialog("enter-number");
  }

  const HELP_MAP = [
    { label: "Персонажи", text: "Список героев. Отсюда создаёшь и открываешь лист." },
    { label: "Создание", text: "Пошагово: раса → черта* → предыстория → класс → характеристики → прокачка." },
    { label: "Лист", text: "Играешь: бой, проверки, каст, инвентарь. В бою — «Новый ход» и отметки действия / бонусного / реакции." },
    { label: "Лобби", text: "Общий стол с мастером и пати по коду или QR. Отсюда садишься за стол со своим героем." }
  ];
  const HELP_KNOW = [
    { id: "lobby-roles", label: "Лобби и роли", status: "soon" },
    { id: "turn-economy", label: "Экономика хода", status: "anchor", go: "terms" },
    { id: "optional-rules", label: "Опциональные правила мастера", status: "soon" },
    { id: "rest", label: "Отдых", status: "anchor", go: "panel:rest" },
    { id: "companions", label: "Напарники", status: "anchor", go: "panel:companions" },
    { id: "classic-print", label: "Классический лист и печать", status: "anchor", go: "panel:classic" },
    { id: "paper-at-table", label: "Игрок с бумажным листом за столом", status: "soon" }
  ];
  const HELP_TERMS = [
    { term: "КД", meaning: "Класс доспеха — насколько трудно по тебе попасть." },
    { term: "БМ", meaning: "Бонус мастерства — растёт с уровнем, даёт + к владениям." },
    { term: "Хиты", meaning: "Запас «жизней». 0 — спасброски от смерти (к20 без модификаторов; 10+ успех, 1 — два провала, 20 — встаёшь с 1 хитом)." },
    { term: "Инициатива", meaning: "Кто ходит раньше в бою (обычно ЛОВ + к20)." },
    { term: "Владение", meaning: "Ты умеешь это лучше — добавляешь БМ." },
    { term: "Экспертиза", meaning: "Двойной БМ к навыку (у части классов)." },
    { term: "Ячейка", meaning: "Заряд заклинания определённого круга на сегодня." },
    { term: "Концентрация", meaning: "Держишь одно заклинание; новый Conc сбрасывает старое." },
    { term: "Короткий отдых", meaning: "Час отдыха: кости хитов и часть ресурсов." },
    { term: "Продолжительный", meaning: "Ночь: почти всё восстанавливается (−1 истощение)." },
    { term: "Вдохновение", meaning: "Бонус от мастера: потрать на преимущество к одному броску атаки, проверки или спаса (не к спасброску от смерти)." },
    { term: "Аттюнмент", meaning: "До 3 «настроенных» магических предметов." },
    { term: "Ход", meaning: "«Новый ход» сбрасывает отметки. Отмечай действие, бонусное, реакцию и движение, когда их потратил." }
  ];
  const PANEL_HELP = [
    { id: "combat_header", title: "Боевая шапка", what: "КД, хиты, скорость, инициатива, вдохновение и концентрация. Рядом — «Новый ход» и отметки действий.", why: "В бою всё важное сверху — не надо искать по листу.", ifUnsure: "Смотри хиты и КД. Остальное трогай, когда мастер спросит." },
    { id: "desk_modes", title: "Сцены листа", what: "Пять вкладок: Бой, Исследование, Общение, Напарники, Способности.", why: "Одна сцена = один контекст за столом. Лишнее спрятано, чтобы не тонуть в простыне.", ifUnsure: "Начни с «Бой». Сменил сцену — сменился и набор панелей." },
    { id: "abilities", title: "Характеристики и навыки", what: "СИЛ, ЛОВ, ТЕЛ, ИНТ, МДР, ХАР — и навыки под ними (Скрытность, Убеждение…).", why: "Почти все проверки и бой считаются от них. Число → бросок.", ifUnsure: "Массив 15–14–13–12–10–8 на создании — нормальный старт." },
    { id: "skills", title: "Навыки", what: "Умения вроде Скрытности, Убеждения, Внимательности.", why: "Мастер просит проверку навыка — кидаешь к20 + модификатор.", ifUnsure: "Клик: нет → владение → экспертиза. Владения даёт класс и фон." },
    { id: "saves", title: "Спасброски", what: "Проверки «устоять» против яда, магии, ловушек.", why: "Часто решают, сработал ли эффект на тебя.", ifUnsure: "Включи владения, которые дал класс." },
    { id: "attacks", title: "Атаки", what: "Оружие и удары с бонусом к попаданию и уроном. Рядом — отметки хода и укрытие.", why: "Основной жест в бою: нажал — бросок как за столом.", ifUnsure: "Добавь оружие из снаряжения класса." },
    { id: "spells", title: "Заклинания", what: "Ячейки, подготовка, каст с усилением, концентрация.", why: "Кастуешь как за столом, без ручного подсчёта слотов.", ifUnsure: "Кнопка «От класса» для ячеек; подготовь 1–2 простых заклинания." },
    { id: "inventory", title: "Снаряжение", what: "Что несёшь: доспех, оружие, вещи и вес.", why: "Надел доспех/щит — КД пересчитается сам.", ifUnsure: "Надень стартовый доспех из пакета класса." },
    { id: "attunement", title: "Настройка предметов", what: "До трёх магических вещей, к которым «привык».", why: "Лимит из правил — не повесишь все артефакты сразу.", ifUnsure: "Пока пусто — нормально на низких уровнях." },
    { id: "identity", title: "Основное", what: "Имя, раса, классы, предыстория, мировоззрение, опыт.", why: "Кто ты за столом для мастера и пати.", ifUnsure: "Имя + раса + класс достаточно, чтобы играть." },
    { id: "passives", title: "Пассивные чувства", what: "Пассивное внимание и другие «всегда включённые» числа.", why: "Мастер кидает втайне — ты уже «готов» без броска.", ifUnsure: "Оставь авто-счёт." },
    { id: "proficiencies", title: "Владения снаряжением", what: "В каких доспехах и оружии ты умеешь. Отсюда считается, можно ли надеть доспех/щит и даёт ли оружие бонус мастерства в атаках — на карточке атаки это не переключается вручную.", why: "Без владения доспехом — помехи и сюрпризы правил.", ifUnsure: "Обычно уже стоит от класса." },
    { id: "languages_tools", title: "Языки и инструменты", what: "На каких языках говоришь и какими инструментами владеешь.", why: "Социальные сцены и проверки инструментов.", ifUnsure: "Общий + то, что дала раса или фон." },
    { id: "conditions", title: "Состояния", what: "Отравленный, схваченный, испуганный… и истощение. Отметки ручные.", why: "Состояния сами дают преимущество или помеху на броски — не забудь включить их на листе.", ifUnsure: "Пусто = всё хорошо. Укрытие рядом с атаками — тоже ручная отметка." },
    { id: "rest", title: "Отдых", what: "Короткий и продолжительный отдых.", why: "Восстанавливаешь хиты, ячейки и ресурсы.", ifUnsure: "Спроси мастера, когда партия отдыхает." },
    { id: "text_blocks", title: "Тексты и заметки", what: "Внешность, черты характера, заметки сессии.", why: "Роль и лор — чтобы не держать всё в голове.", ifUnsure: "Одного-двух предложений внешности хватит." },
    { id: "companions", title: "Напарники", what: "Спутники, фамильяры, призванные существа.", why: "Когда класс или заклинание даёт компаньона.", ifUnsure: "Не твой класс — можно не открывать." },
    { id: "features", title: "Способности", what: "Умения класса, расы, черт.", why: "Напоминание, что уникального умеет герой.", ifUnsure: "Открой, когда мастер спросит «что умеешь»." },
    { id: "classic", title: "Классический лист", what: "Тот же персонаж на бланке 2014 для печати — не второй живой лист.", why: "PDF/бумага без отдельного «печатного» героя.", ifUnsure: "Можно позже из шапки листа." }
  ];

  function renderHelp() {
    const root = $("[data-sheet='help']");
    if (!root) return;
    const h2 = root.querySelector(".sheet__head h2");
    if (h2) h2.textContent = "Как это работает";
    const box = root.querySelector("[data-help-body]") || root.querySelector(".sheet__body");
    if (!box) return;
    const open = state.helpOpenSection || "";
    const map = HELP_MAP.map(function (it) {
      return "<li><strong>" + esc(it.label) + ".</strong> " + esc(it.text) + "</li>";
    }).join("");
    const know = HELP_KNOW.map(function (it) {
      const mark = it.status === "soon" ? '<span class="help-soon">скоро</span>' : "";
      if (it.status === "soon") return '<li class="help-know is-soon"><span>' + esc(it.label) + "</span>" + mark + "</li>";
      return '<li><button type="button" class="help-know-btn" data-sys="help-go" data-go="' + esc(it.go) + '">' + esc(it.label) + "</button></li>";
    }).join("");
    const terms = HELP_TERMS.map(function (it) {
      return "<li><strong>" + esc(it.term) + ".</strong> " + esc(it.meaning) + "</li>";
    }).join("");
    const panels = PANEL_HELP.map(function (it) {
      const on = open === "panel:" + it.id;
      return '<div class="help-acc" id="help-panel-' + esc(it.id) + '">' +
        '<button type="button" class="help-acc__btn' + (on ? " is-on" : "") + '" data-sys="help-acc" data-id="panel:' + esc(it.id) + '" aria-expanded="' + (on ? "true" : "false") + '">' + esc(it.title) + "</button>" +
        (on ? ('<div class="help-acc__body"><p><b>Что это.</b> ' + esc(it.what) + "</p><p><b>Зачем.</b> " + esc(it.why) + "</p><p><b>Если не уверен.</b> " + esc(it.ifUnsure) + "</p></div>") : "") +
        "</div>";
    }).join("");
    box.innerHTML =
      '<div class="help-block">' +
      '<button type="button" class="btn is-primary help-again" data-tips-again>Показать подсказки снова</button>' +
      '<p class="pad-note">Снова пройдём короткий тур листа и, когда сядете за стол, тур лобби. Сегмент сохранится, если вы его уже выбирали.</p>' +
      "</div>" +
      '<div class="help-block" id="help-map"><h3>Карта продукта</h3><ul class="help-ul">' + map + "</ul></div>" +
      '<div class="help-block"><h3>База знаний (задел)</h3><ul class="help-ul help-know-list">' + know + "</ul></div>" +
      '<div class="help-block" id="help-terms"><h3>Короткие термины</h3><ul class="help-ul">' + terms + "</ul></div>" +
      '<div class="help-block" id="onboarding-help-panels"><h3>Панели листа</h3>' + panels + "</div>";
  }

  const TOUR_STEPS = [
    { id: "combat_header", title: "Шапка боя", sel: "[data-vitals]", body: "Хиты, КД, скорость — живые числа сверху. В бою отмечай действие / бонусное / реакцию; «Новый ход» сбрасывает отметки." },
    { id: "desk_modes", title: "Сцены", sel: "[data-scenes]", body: "Это не «ещё меню», а сцены за столом: Бой, Исследование, Общение, Напарники, Способности. Одна сцена = один контекст, лишнее спрятано. Начни с «Бой»; позже зажми вкладку — коротко напомним." },
    { id: "abilities", title: "Характеристики", sel: "[data-open-abilities], [data-abil-open], .mast [data-open='abilities']", body: "Характеристики открываются из шапки («Характеристики ▸» или «СИЛ»). Мастер просит проверку — бросок оттуда." },
    { id: "actions", title: "Атаки и каст", sel: ".turn, [data-scene-body]", body: "Жесты игры: ударить или колдовать. Рядом чипы хода — отмечай действие, бонусное и реакцию, когда потратил." },
    { id: "checklist", title: "Справка под рукой", sel: "[data-open='help'], [data-tab='help']", body: "Необязательно заполнять всё сразу. Кнопка «Справка» — карта листа и словарь, если что-то забудешь." }
  ];

  function tourRoot() {
    let el = document.querySelector("[data-tour-root]");
    if (!el) {
      el = document.createElement("div");
      el.setAttribute("data-tour-root", "");
      el.className = "tour-root";
      el.hidden = true;
      document.body.appendChild(el);
    }
    return el;
  }

  function firstSel(sel) {
    const parts = String(sel || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
      const n = document.querySelector(parts[i]);
      if (n && !n.hidden && n.getClientRects().length) return n;
    }
    return document.querySelector(parts[0] || "body");
  }

  function renderTour() {
    const root = tourRoot();
    const i = state.tourIndex;
    if (i == null || i < 0) { root.hidden = true; root.innerHTML = ""; return; }
    const steps = TOUR_STEPS;
    const step = steps[Math.min(i, steps.length - 1)];
    if (!step) { root.hidden = true; return; }
    const last = i >= steps.length - 1;
    const el = firstSel(step.sel);
    const r = el ? el.getBoundingClientRect() : { top: 80, left: 16, width: 358, height: 80 };
    const cardTop = Math.min(window.innerHeight - 220, Math.max(12, r.bottom + 10));
    root.hidden = false;
    root.innerHTML =
      '<div class="tour-dim" data-sys="tour-skip"></div>' +
      (el ? ('<div class="tour-hi" style="top:' + Math.max(0, r.top - 4) + "px;left:" + Math.max(0, r.left - 4) + "px;width:" + (r.width + 8) + "px;height:" + (r.height + 8) + 'px"></div>') : "") +
      '<div class="tour-card" style="top:' + cardTop + 'px" role="dialog" aria-labelledby="tour-title">' +
      '<p class="tour-step">Подсказка ' + (Math.min(i + 1, steps.length)) + " из " + steps.length + "</p>" +
      '<h3 id="tour-title">' + esc(step.title) + "</h3>" +
      "<p>" + esc(step.body) + "</p>" +
      '<div class="modal-actions">' +
      (last
        ? '<button type="button" class="btn is-primary" data-sys="tour-done">Готово</button>'
        : '<button type="button" class="btn is-primary" data-sys="tour-next">Далее</button>') +
      '<button type="button" class="btn" data-sys="tour-skip">Пропустить</button>' +
      "</div></div>";
  }

  function startTour(index) {
    closeDialog();
    if (typeof setScene === "function") setScene("combat");
    state.tourIndex = (index == null ? 0 : index);
    render();
  }
  function stopTour() {
    state.tourIndex = -1;
    render();
  }

  const DICE_SIDES = (typeof DICE !== "undefined" && DICE.length) ? DICE : [20, 12, 10, 8, 6, 4, 100];

  function poolCount(n) {
    return Math.max(0, Number((state.dicePool || {})[n]) || 0);
  }

  function diceFormula() {
    const parts = [];
    DICE_SIDES.forEach(function (n) {
      const c = poolCount(n);
      if (c) parts.push((c > 1 ? String(c) : "") + "к" + n);
    });
    const adv = state.adv === "adv" ? " преим." : (state.adv === "dis" ? " помеха" : "");
    const mod = Number(state.diceMod) || 0;
    const core = parts.join("+") || "к20";
    return core + (mod ? (mod > 0 ? "+" + mod : String(mod)) : "") + adv;
  }

  function renderDice() {
    const box = $("[data-dice-body]");
    if (!box) return;
    const head = document.querySelector('[data-sheet="dice"] .sheet__head h2');
    if (head) head.textContent = "Кубики";
    if (!state.dicePool || !Object.keys(state.dicePool).length) state.dicePool = { 20: 1 };
    const btns = DICE_SIDES.map(function (n) {
      const c = poolCount(n);
      return '<button type="button" class="dice-add' + (c ? " is-on" : "") + '" data-sys="dice-add" data-v="' + n + '" aria-label="добавить к' + n + '">к' + n + (c ? " ×" + c : "") + "</button>";
    }).join("");
    const tab = state.journalTab || "mine";
    const mine = (state.rolls || []).slice().reverse();
    const table = (state.tableRolls || []).slice().reverse();
    const rows = (tab === "table" ? table : mine);
    const list = rows.length
      ? rows.map(function (r) {
        return '<li class="dice-log__row"><b>' + esc(r.label || "Бросок") + "</b><span>" + esc(r.text || "") + "</span></li>";
      }).join("")
      : '<li class="dice-log__empty">Пока пусто</li>';
    const clearLab = state.clearArmed ? "Ещё раз" : "Очистить";
    box.innerHTML =
      '<div class="dice-pool" role="group" aria-label="Набор костей">' + btns + "</div>" +
      '<div class="mod-row"><span>Модификатор</span><input type="number" inputmode="numeric" data-dice-mod value="' + (Number(state.diceMod) || 0) + '"></div>' +
      '<p class="dice-formula" aria-label="Формула">' + esc(diceFormula()) + "</p>" +
      '<div class="roll-seg" role="group" aria-label="Режим броска">' +
      '<button type="button" data-adv="norm" class="' + (state.adv === "norm" || !state.adv ? "is-on" : "") + '">норм</button>' +
      '<button type="button" data-adv="adv" class="' + (state.adv === "adv" ? "is-on" : "") + '">преим.</button>' +
      '<button type="button" data-adv="dis" class="' + (state.adv === "dis" ? "is-on" : "") + '">помеха</button>' +
      "</div>" +
      '<div class="pad-row dice-flags">' +
      '<label class="dice-check' + (state.diceTable ? " is-on" : "") + '" data-dice-table><input type="checkbox" class="dice-check__input" data-dice-table ' + (state.diceTable ? "checked" : "") + '><span class="dice-check__mark" aria-hidden="true">' + (state.diceTable ? "✓" : "") + "</span><span>Кубики на столе</span></label>" +
      (state.diceTable ? ('<button type="button" class="sheet-chip' + (state.diceSelfOnly ? " is-on" : "") + '" data-sys="dice-self">Только себе</button>') : "") +
      "</div>" +
      '<div class="modal-actions">' +
      '<button type="button" class="btn is-primary" data-dice-roll>Бросить</button>' +
      '<button type="button" class="btn" data-sys="dice-reset">Сбросить</button>' +
      "</div>" +
      (state.diceResult ? '<p class="dice-result">' + esc(state.diceResult) + "</p>" : "") +
      '<div class="dice-journal">' +
      '<div class="roll-seg" role="tablist" aria-label="Журнал">' +
      '<button type="button" class="' + (tab === "mine" ? "is-on" : "") + '" data-sys="journal-tab" data-v="mine">Мои</button>' +
      '<button type="button" class="' + (tab === "table" ? "is-on" : "") + '" data-sys="journal-tab" data-v="table">Стол</button>' +
      "</div>" +
      '<ul class="dice-log">' + list + "</ul>" +
      '<div class="pad-row"><button type="button" class="btn' + (state.clearArmed ? " is-primary" : "") + '" data-sys="journal-clear">' + clearLab + "</button></div>" +
      "</div>";
  }

  function rollOne(sides) { return 1 + Math.floor(Math.random() * sides); }

  function doPoolRoll() {
    if (state.diceTable) {
      openEnterNumber({ mode: "total", modifier: Number(state.diceMod) || 0 });
      return;
    }
    const parts = [];
    let sum = 0;
    DICE_SIDES.forEach(function (n) {
      const c = poolCount(n);
      for (let i = 0; i < c; i++) {
        let v = rollOne(n);
        if (n === 20 && (state.adv === "adv" || state.adv === "dis")) {
          const b = rollOne(20);
          v = state.adv === "adv" ? Math.max(v, b) : Math.min(v, b);
          parts.push("к20 (" + v + ")");
        } else {
          parts.push("к" + n + " (" + v + ")");
        }
        sum += v;
      }
    });
    if (!parts.length) {
      const v = rollOne(20);
      parts.push("к20 (" + v + ")");
      sum = v;
    }
    const mod = Number(state.diceMod) || 0;
    const total = sum + mod;
    const text = parts.join(" + ") + (mod ? (mod > 0 ? " +" + mod : " " + mod) : "") + " = " + total;
    state.diceResult = text;
    addRoll("Бросок", text);
    toast(text);
    render();
  }

  function seedDiceDemo() {
    state.dicePool = { 20: 1, 8: 1 };
    state.diceMod = 5;
    state.adv = "norm";
    state.diceTable = false;
    state.journalTab = "mine";
    state.rolls = [
      { label: "Атака", text: "к20+5 → 17", t: 1 },
      { label: "Урон", text: "к8+4 → 9", t: 2 }
    ];
    state.tableRolls = [
      { label: "Мастер", text: "к20 → 12 · кубик на столе", t: 3 }
    ];
    state.diceResult = "";
    state.clearArmed = false;
  }

  function addDemoCustomSpell() {
    const sp = {
      id: "custom-demo-beacon",
      name: "Знак маяка",
      level: 1,
      ritual: false,
      concentration: false,
      school: "воплощение",
      range: "9 м",
      duration: "1 час",
      components: "В, С",
      kind: "utility",
      prepared: true,
      always: false,
      grant: false,
      onSheet: true,
      custom: true,
      text: "Своё заклинание для демонстрации удаления.",
      time: "action",
      timeLabel: "1 действие"
    };
    sheet.customSpells = (sheet.customSpells || []).filter(function (s) { return s.id !== sp.id; }).concat([sp]);
    if (typeof render === "function") render();
    return sp.id;
  }

  function deleteCustomSpell(id) {
    sheet.customSpells = (sheet.customSpells || []).filter(function (s) { return s.id !== id; });
    toast("Удалено");
    if (typeof render === "function") render();
  }

  function addDemoCustomBlock() {
    const a = (typeof ensureAbilState === "function") ? ensureAbilState() : (sheet.abil = sheet.abil || {});
    a.custom = a.custom || [];
    const row = { id: "custom-demo-notes", nameRu: "Заметки похода", summaryRu: "Короткий список договорённостей стола." };
    a.custom = a.custom.filter(function (x) { return x.id !== row.id; });
    a.custom.push(row);
    if (typeof render === "function") render();
    else if (typeof renderFeaturesScene === "function") renderFeaturesScene();
    return row.id;
  }

  function deleteCustomBlock(id) {
    const a = (typeof ensureAbilState === "function") ? ensureAbilState() : sheet.abil;
    if (a) a.custom = (a.custom || []).filter(function (x) { return x.id !== id; });
    if (typeof render === "function") render();
    else if (typeof renderFeaturesScene === "function") renderFeaturesScene();
  }

  function hideAttack(id) {
    const atk = (sheet.attacks || []).find(function (a) { return a.id === id; });
    if (atk) atk.hidden = true;
    if (typeof render === "function") render();
  }

  function deleteCompanionById(id) {
    const c = (typeof ensureCompanionsState === "function") ? ensureCompanionsState() : (sheet.comp || {});
    const row = (c.list || []).find(function (r) { return r.id === id; });
    c.list = (c.list || []).filter(function (r) { return r.id !== id; });
    if (c.openId === id) c.openId = "";
    if (row && typeof toast === "function") toast(row.name + " удалён");
    if (typeof renderCompanions === "function") renderCompanions();
    else if (typeof render === "function") render();
  }

  function handleSysClick(t) {
    if (!t) return false;
    if (t.matches("[data-del-custom-spell]")) {
      deleteCustomSpell(t.getAttribute("data-del-custom-spell"));
      return true;
    }
    const act = t.getAttribute("data-sys");
    if (!act) return false;
    if (act === "sys-close" || act === "guidance-skip" || act === "lucky-keep" || act === "lucky-close" || act === "relentless-fall" || act === "welcome-skip" || act === "ready-skip" || act === "conflict-keep" || act === "conflict-server") {
      if (act === "conflict-keep") toast("Сохранены локальные правки");
      if (act === "conflict-server") toast("Взято с сервера");
      if (act === "welcome-skip") toast("Подсказки пропущены");
      closeDialog();
      return true;
    }
    if (act === "named-go") {
      const who = (($("[data-named-who]") || {}).value || state.target || "").trim();
      const feat = (($("[data-named-feat]") || {}).value || state.namedFeat || "").trim();
      state.target = who;
      state.namedFeat = feat || "Атака по возможности";
      if (who) toast("Цель: " + who + (feat ? " · " + feat : ""));
      closeDialog();
      return true;
    }
    if (act === "lucky-reroll") { toast("Переброс удачи"); closeDialog(); return true; }
    if (act === "guidance-reroll") {
      const sp = sorceryLeft();
      if (!sp.cur) { toast("Нет очков чародейства"); closeDialog(); return true; }
      if (sheet.sorcery) sheet.sorcery.cur = Math.max(0, sheet.sorcery.cur - 1);
      toast("Магическое наставление: −1 очко");
      closeDialog();
      return true;
    }
    if (act === "relentless-stay") {
      sheet.hp = 1;
      state.deathOk = 0;
      state.deathFail = 0;
      toast("Непоколебимая стойкость: остаётесь с 1 хитом");
      closeDialog();
      return true;
    }
    if (act === "lucky-choose") {
      const v = t.getAttribute("data-v");
      toast("Выбрано: " + v);
      closeDialog();
      return true;
    }
    if (act === "welcome-dnd" || act === "welcome-product") {
      closeDialog();
      startTour(0);
      return true;
    }
    if (act === "ready-tour") { closeDialog(); startTour(0); return true; }
    if (act === "own-save") {
      const raw = (($("[data-own-number]") || {}).value);
      const n = Number(raw);
      if (raw === "" || isNaN(n)) { toast("Введи число"); return true; }
      const mode = state.ownNumberMode || "total";
      const mod = Number(state.diceMod) || 0;
      const total = mode === "d20" ? n + mod : n;
      const text = (mode === "d20" ? ("к20 (" + n + ")" + (mod ? (mod > 0 ? " +" + mod : " " + mod) : "") + " = " + total) : String(total)) + " · кубик на столе";
      state.diceResult = text;
      addRoll("Своё число", text);
      toast("Записано: " + text);
      closeDialog();
      openDialog("dice");
      return true;
    }
    if (act === "dice-add") {
      const n = Number(t.getAttribute("data-v"));
      state.dicePool = state.dicePool || {};
      state.dicePool[n] = poolCount(n) + 1;
      render();
      return true;
    }
    if (act === "dice-reset") {
      state.dicePool = { 20: 1 };
      state.diceMod = 0;
      state.diceResult = "";
      state.adv = "norm";
      render();
      return true;
    }
    if (act === "dice-self") { state.diceSelfOnly = !state.diceSelfOnly; render(); return true; }
    if (act === "journal-tab") { state.journalTab = t.getAttribute("data-v") || "mine"; state.clearArmed = false; render(); return true; }
    if (act === "journal-clear") {
      if (!state.clearArmed) { state.clearArmed = true; render(); return true; }
      if ((state.journalTab || "mine") === "table") state.tableRolls = [];
      else state.rolls = [];
      state.clearArmed = false;
      render();
      return true;
    }
    if (act === "help-acc") {
      const id = t.getAttribute("data-id") || "";
      state.helpOpenSection = (state.helpOpenSection === id) ? "" : id;
      renderHelp();
      return true;
    }
    if (act === "help-go") {
      const go = t.getAttribute("data-go") || "";
      if (go.indexOf("panel:") === 0) {
        state.helpOpenSection = go;
        renderHelp();
        const el = document.getElementById("help-panel-" + go.slice(6));
        if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
      } else if (go === "terms") {
        const el = document.getElementById("help-terms");
        if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
      }
      return true;
    }
    if (act === "tour-next") {
      state.tourIndex = Math.min(TOUR_STEPS.length - 1, (state.tourIndex || 0) + 1);
      render();
      return true;
    }
    if (act === "tour-skip" || act === "tour-done") { stopTour(); return true; }
    return false;
  }

  document.addEventListener("click", function (e) {
    const t = e.target.closest && e.target.closest("[data-sys],[data-del-custom-spell]");
    if (!t) return;
    if (handleSysClick(t)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  document.addEventListener("input", function (e) {
    const el = e.target;
    if (!el) return;
    if (el.matches && el.matches("[data-named-feat]")) { state.namedFeat = el.value; return; }
    if (el.matches && el.matches("[data-named-who]")) { state.target = el.value; return; }
    if (el.matches && el.matches("[data-own-number]")) { state.ownNumber = el.value; return; }
  });

  const _applyPresetSys = applyPreset;
  applyPreset = function (id) {
    _applyPresetSys(id);
    state.dicePool = { 20: 1 };
    state.journalTab = "mine";
    state.tableRolls = [];
    state.diceSelfOnly = false;
    state.clearArmed = false;
    state.tourIndex = -1;
    state.helpOpenSection = "";
    state.namedFeat = "Атака по возможности";
    state.ownNumber = "";
    state.sys = { luckyDice: [4, 17, 11], guidanceLabel: "Убеждение" };
  };
