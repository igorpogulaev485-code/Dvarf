(function () {
  var C = window.CreationStep1;
  if (!C || !C.registerView) return;

  var STEPS5 = ["race", "background", "class", "abilities", "leveling"];
  var ORDER = ["str", "dex", "con", "int", "wis", "cha"];
  var LABELS = {
    str: "Сила",
    dex: "Ловкость",
    con: "Телосложение",
    int: "Интеллект",
    wis: "Мудрость",
    cha: "Харизма"
  };
  var STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
  var POINT_BUY_BUDGET = 27;
  var POINT_BUY_MIN = 8;
  var POINT_BUY_MAX = 15;
  var POINT_BUY_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
  var PRIORITIES = {
    artificer: ["int", "con", "dex", "wis", "cha", "str"],
    barbarian: ["str", "con", "dex", "wis", "cha", "int"],
    bard: ["cha", "dex", "con", "wis", "int", "str"],
    cleric: ["wis", "con", "str", "dex", "cha", "int"],
    druid: ["wis", "con", "dex", "int", "cha", "str"],
    fighter: ["str", "con", "dex", "wis", "cha", "int"],
    monk: ["dex", "wis", "con", "str", "cha", "int"],
    paladin: ["str", "cha", "con", "wis", "dex", "int"],
    ranger: ["dex", "wis", "con", "str", "cha", "int"],
    rogue: ["dex", "con", "cha", "wis", "int", "str"],
    sorcerer: ["cha", "con", "dex", "wis", "int", "str"],
    warlock: ["cha", "con", "dex", "wis", "int", "str"],
    wizard: ["int", "con", "dex", "wis", "cha", "str"]
  };
  var METHOD_CARDS = [
    { id: "standard_array", title: "Массив", subtitle: "15, 14, 13, 12, 10, 8" },
    { id: "point_buy", title: "Покупка очков", subtitle: "27 очков, 8–15" },
    { id: "roll", title: "Бросок", subtitle: "4к6, отбросить младший" },
    { id: "manual", title: "Вручную", subtitle: "1–30" }
  ];

  /* Default context: mountain dwarf + fighter, no feat step. */
  var CONTEXT = {
    classSlug: "fighter",
    bonuses: { str: 2, con: 2 },
    bonusLabel: "раса",
    allowedMethods: null,
    lobby: false
  };

  var state = emptyState();

  function emptyScores(fill) {
    var o = {};
    ORDER.forEach(function (k) { o[k] = fill; });
    return o;
  }

  function emptyState() {
    return {
      method: "standard_array",
      base: emptyScores(0),
      rolls: null
    };
  }

  function cloneScores(src) {
    var o = {};
    ORDER.forEach(function (k) { o[k] = src[k]; });
    return o;
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

  function modOf(score) {
    return Math.floor((score - 10) / 2);
  }

  function formatMod(n) {
    return n >= 0 ? "+" + n : String(n);
  }

  function bonusOf(key) {
    var n = CONTEXT.bonuses && CONTEXT.bonuses[key];
    return typeof n === "number" && n ? n : 0;
  }

  function isAssigned(v) {
    return typeof v === "number" && v > 0;
  }

  function finalOf(key) {
    var base = state.base[key];
    if (!isAssigned(base)) return null;
    return base + bonusOf(key);
  }

  function pointCost(v) {
    return Object.prototype.hasOwnProperty.call(POINT_BUY_COST, v) ? POINT_BUY_COST[v] : null;
  }

  function pointBuyRemaining(scores) {
    var used = 0;
    for (var i = 0; i < ORDER.length; i++) {
      var c = pointCost(scores[ORDER[i]]);
      if (c == null) return null;
      used += c;
    }
    return POINT_BUY_BUDGET - used;
  }

  function isStandardArrayComplete(scores) {
    var values = ORDER.map(function (k) { return scores[k]; }).slice().sort(function (a, b) { return b - a; });
    if (values.length !== 6) return false;
    for (var i = 0; i < 6; i++) if (values[i] !== STANDARD_ARRAY[i]) return false;
    return true;
  }

  function isPointBuyValid(scores) {
    return pointBuyRemaining(scores) === 0;
  }

  function isRollScoresValid(scores) {
    return ORDER.every(function (k) {
      var v = scores[k];
      return typeof v === "number" && v >= 3 && v <= 18;
    });
  }

  function isManualScoresValid(scores) {
    return ORDER.every(function (k) {
      var v = scores[k];
      return typeof v === "number" && v >= 1 && v <= 30;
    });
  }

  function isReady() {
    if (state.method === "standard_array") return isStandardArrayComplete(state.base);
    if (state.method === "point_buy") return isPointBuyValid(state.base);
    if (state.method === "roll") return isRollScoresValid(state.base);
    if (state.method === "manual") return isManualScoresValid(state.base);
    return false;
  }

  function blockingReason() {
    if (isReady()) return "";
    if (state.method === "standard_array") {
      return "Распределите стандартный массив: каждое значение один раз.";
    }
    if (state.method === "point_buy") {
      var left = pointBuyRemaining(state.base);
      if (left == null) return "Значения покупки очков — от 8 до 15.";
      if (left > 0) return ""; /* live remainder sits under the method block */
      if (left < 0) return "Потрачено больше 27 очков.";
      return "";
    }
    if (state.method === "roll") return "У каждой характеристики должно быть значение от 3 до 18.";
    if (state.method === "manual") return "Значения вручную — от 1 до 30.";
    return "";
  }

  function allowedMethods() {
    if (CONTEXT.allowedMethods && CONTEXT.allowedMethods.length) return CONTEXT.allowedMethods.slice();
    return METHOD_CARDS.map(function (c) { return c.id; });
  }

  function applyPriority() {
    var slug = (CONTEXT.classSlug || "").toLowerCase();
    var prio = PRIORITIES[slug] || ORDER;
    var next = emptyScores(8);
    STANDARD_ARRAY.forEach(function (score, i) {
      var key = prio[i] || ORDER[i];
      next[key] = score;
    });
    state.base = next;
    if (state.method === "roll") state.rolls = null;
  }

  function rollOne() {
    var dice = [
      1 + Math.floor(Math.random() * 6),
      1 + Math.floor(Math.random() * 6),
      1 + Math.floor(Math.random() * 6),
      1 + Math.floor(Math.random() * 6)
    ];
    var dropIndex = 0;
    for (var i = 1; i < 4; i++) if (dice[i] < dice[dropIndex]) dropIndex = i;
    var dropped = dice[dropIndex];
    var total = 0;
    for (var j = 0; j < 4; j++) if (j !== dropIndex) total += dice[j];
    return { dice: dice, dropIndex: dropIndex, dropped: dropped, total: total };
  }

  function rollAll() {
    var scores = emptyScores(0);
    var details = {};
    ORDER.forEach(function (k) {
      var d = rollOne();
      details[k] = d;
      scores[k] = d.total;
    });
    state.rolls = details;
    state.base = scores;
  }

  function formatDice(detail) {
    if (!detail || !detail.dice) return "";
    return detail.dice.map(function (n, i) {
      return i === detail.dropIndex ? "[" + n + "]" : String(n);
    }).join(" · ");
  }

  function setMethod(id) {
    var allowed = allowedMethods();
    if (allowed.indexOf(id) < 0) return;
    if (state.method === id) return;
    state.method = id;
    if (id === "standard_array") {
      state.base = emptyScores(0);
      state.rolls = null;
    } else if (id === "point_buy") {
      state.base = emptyScores(8);
      state.rolls = null;
    } else if (id === "manual") {
      state.base = emptyScores(10);
      state.rolls = null;
    } else if (id === "roll") {
      rollAll();
    }
  }

  function usedArrayValues(exceptKey) {
    var used = [];
    ORDER.forEach(function (k) {
      if (k === exceptKey) return;
      if (isAssigned(state.base[k])) used.push(state.base[k]);
    });
    return used;
  }

  function assignArray(key, value) {
    state.base[key] = value;
  }

  function bump(key, delta, min, max, buyMode) {
    var cur = state.base[key];
    var next = cur + delta;
    if (next < min || next > max) return;
    if (buyMode) {
      var curCost = pointCost(cur);
      var nextCost = pointCost(next);
      if (curCost == null || nextCost == null) return;
      var left = pointBuyRemaining(state.base);
      if (left == null) return;
      if (nextCost - curCost > left) return;
    }
    state.base[key] = next;
  }

  function summaryHtml() {
    var rows = ORDER.map(function (k) {
      var fin = finalOf(k);
      var bonus = bonusOf(k);
      var bonusTxt = (fin != null && bonus) ? " (" + (bonus > 0 ? "+" : "") + bonus + " " + esc(CONTEXT.bonusLabel) + ")" : "";
      var val = fin == null ? "—" : String(fin);
      var mod = fin == null ? "" : " <span class=\"abil-mod\">(" + formatMod(modOf(fin)) + ")</span>";
      return "<li><span class=\"abil-sum__name\">" + esc(LABELS[k]) + "</span>" +
        "<span class=\"abil-sum__val\">" + val + mod + bonusTxt + "</span></li>";
    }).join("");
    return "<div class=\"abil-summary\">" +
      "<h2>Итог с расовыми бонусами</h2>" +
      "<ul class=\"abil-sum-list\">" + rows + "</ul></div>";
  }

  function methodCardsHtml() {
    var allowed = allowedMethods();
    var cards = METHOD_CARDS.filter(function (c) { return allowed.indexOf(c.id) >= 0; });
    var html = '<div class="abil-toolbar">';
    html += '<div class="abil-methods" role="list">';
    cards.forEach(function (c) {
      var on = state.method === c.id ? " is-on" : "";
      html += '<button class="abil-method' + on + '" type="button" data-ab-method="' + c.id + '">' +
        '<span class="abil-method__title">' + esc(c.title) + "</span>" +
        '<span class="abil-method__sub">' + esc(c.subtitle) + "</span></button>";
    });
    html += "</div>";
    if (state.method === "point_buy") {
      var left = pointBuyRemaining(state.base);
      if (left != null) {
        html += '<p class="t-muted abil-hint">Осталось очков: ' + left + ".</p>";
      }
    }
    if (state.method !== "roll") {
      html += '<div class="race-chip-row abil-actions">' +
        '<button class="seg" type="button" data-ab-priority>Разложить по приоритету класса</button>' +
        "</div>";
    } else {
      html += '<div class="race-chip-row abil-actions">' +
        '<button class="seg" type="button" data-ab-reroll-all>Перебросить все</button>' +
        "</div>";
    }
    html += "</div>";
    return html;
  }

  function stepperHtml(key, min, max, buyMode) {
    var v = state.base[key];
    var minusOff = v <= min ? " disabled" : "";
    var plusOff = "";
    if (v >= max) plusOff = " disabled";
    if (buyMode) {
      var left = pointBuyRemaining(state.base) || 0;
      var curCost = pointCost(v);
      var nextCost = pointCost(v + 1);
      if (nextCost == null || (curCost != null && nextCost - curCost > left)) plusOff = " disabled";
    }
    return '<div class="abil-stepper">' +
      '<button class="seg" type="button" data-ab-bump="' + key + ':-1"' + minusOff + ">−</button>" +
      '<span class="abil-stepper__val">' + v + "</span>" +
      '<button class="seg" type="button" data-ab-bump="' + key + ':1"' + plusOff + ">+</button>" +
      "</div>";
  }

  function arrayChipsHtml(key) {
    var used = usedArrayValues(key);
    var cur = state.base[key];
    var html = '<div class="race-chip-row abil-array">';
    STANDARD_ARRAY.forEach(function (v) {
      var taken = used.indexOf(v) >= 0;
      var on = cur === v;
      var attrs = ' data-ab-array="' + key + ":" + v + '"';
      if (taken && !on) attrs += " disabled";
      var cls = "seg" + (on ? " is-on" : "") + (taken && !on ? " is-blocked" : "");
      html += '<button class="' + cls + '" type="button"' + attrs + ">" + v + "</button>";
    });
    html += "</div>";
    return html;
  }

  function rollCellHtml(key) {
    var d = state.rolls && state.rolls[key];
    var dice = d ? formatDice(d) : (isAssigned(state.base[key]) ? String(state.base[key]) : "—");
    return '<div class="abil-roll">' +
      '<span class="abil-roll__dice">' + esc(dice) + "</span>" +
      '<span class="abil-roll__total">' + (isAssigned(state.base[key]) ? state.base[key] : "—") + "</span>" +
      '<button class="seg" type="button" data-ab-reroll="' + key + '">Ещё раз</button>' +
      "</div>";
  }

  function controlsHtml(key) {
    if (state.method === "standard_array") return arrayChipsHtml(key);
    if (state.method === "point_buy") return stepperHtml(key, POINT_BUY_MIN, POINT_BUY_MAX, true);
    if (state.method === "manual") return stepperHtml(key, 1, 30, false);
    if (state.method === "roll") return rollCellHtml(key);
    return "";
  }

  function rowsHtml() {
    var html = '<div class="abil-grid">';
    ORDER.forEach(function (k) {
      var bonus = bonusOf(k);
      var fin = finalOf(k);
      var bonusHtml = bonus
        ? '<span class="abil-bonus">+' + bonus + " " + esc(CONTEXT.bonusLabel) + "</span>"
        : '<span class="abil-bonus abil-bonus--empty"></span>';
      var totalHtml = fin == null
        ? '<span class="abil-total">—</span>'
        : '<span class="abil-total">= ' + fin + ' <span class="abil-mod">(' + formatMod(modOf(fin)) + ")</span></span>";
      html += '<div class="abil-row">' +
        '<div class="abil-row__name">' + esc(LABELS[k]) + "</div>" +
        '<div class="abil-row__controls">' + controlsHtml(k) + "</div>" +
        bonusHtml +
        totalHtml +
        "</div>";
    });
    html += "</div>";
    var reason = blockingReason();
    if (reason) html += '<p class="t-muted abil-hint">' + esc(reason) + "</p>";
    return html;
  }

  function detailHtml() {
    var html = '<div class="abil-setup">';
    html += '<div class="abil-setup__head"><h2>Характеристики</h2></div>';
    html += '<p class="t-muted abil-intro">База без бонусов (раса). Итог уже с бонусом. Покупка очков — 27 очков, до бонуса максимум 15.</p>';
    html += methodCardsHtml();
    html += rowsHtml();
    html += "</div>";
    return html;
  }

  function footerHtml() {
    return '<button class="btn btn-accent" type="button"' + (isReady() ? "" : " disabled") + ">Далее · Прокачка</button>";
  }

  function paint() {
    var cards = document.querySelector("[data-create-cards]");
    if (cards) cards.innerHTML = summaryHtml();
    var detail = document.querySelector("[data-create-detail]");
    if (detail) detail.innerHTML = detailHtml();
    var right = document.querySelector("[data-create-footer-right]");
    if (right) right.innerHTML = footerHtml();
    bind();
  }

  function bind() {
    document.querySelectorAll("[data-ab-method]").forEach(function (el) {
      el.addEventListener("click", function () {
        setMethod(el.getAttribute("data-ab-method"));
        paint();
      });
    });
    var prio = document.querySelector("[data-ab-priority]");
    if (prio) prio.addEventListener("click", function () { applyPriority(); paint(); });
    var all = document.querySelector("[data-ab-reroll-all]");
    if (all) all.addEventListener("click", function () { rollAll(); paint(); });
    document.querySelectorAll("[data-ab-array]").forEach(function (el) {
      el.addEventListener("click", function () {
        var parts = el.getAttribute("data-ab-array").split(":");
        assignArray(parts[0], Number(parts[1]));
        paint();
      });
    });
    document.querySelectorAll("[data-ab-bump]").forEach(function (el) {
      el.addEventListener("click", function () {
        var parts = el.getAttribute("data-ab-bump").split(":");
        var key = parts[0];
        var delta = Number(parts[1]);
        if (state.method === "point_buy") bump(key, delta, POINT_BUY_MIN, POINT_BUY_MAX, true);
        else bump(key, delta, 1, 30, false);
        paint();
      });
    });
    document.querySelectorAll("[data-ab-reroll]").forEach(function (el) {
      el.addEventListener("click", function () {
        var key = el.getAttribute("data-ab-reroll");
        var d = rollOne();
        if (!state.rolls) state.rolls = {};
        state.rolls[key] = d;
        state.base[key] = d.total;
        paint();
      });
    });
  }

  var FIXED_ROLLS = {
    str: { dice: [6, 5, 4, 2], dropIndex: 3, dropped: 2, total: 15 },
    dex: { dice: [5, 5, 3, 2], dropIndex: 3, dropped: 2, total: 13 },
    con: { dice: [6, 5, 3, 1], dropIndex: 3, dropped: 1, total: 14 },
    int: { dice: [4, 3, 1, 1], dropIndex: 2, dropped: 1, total: 8 },
    wis: { dice: [5, 4, 3, 2], dropIndex: 3, dropped: 2, total: 12 },
    cha: { dice: [4, 4, 2, 2], dropIndex: 2, dropped: 2, total: 10 }
  };

  function applyFixedRolls() {
    state.method = "roll";
    state.rolls = {};
    state.base = emptyScores(0);
    ORDER.forEach(function (k) {
      var d = FIXED_ROLLS[k];
      state.rolls[k] = {
        dice: d.dice.slice(),
        dropIndex: d.dropIndex,
        dropped: d.dropped,
        total: d.total
      };
      state.base[k] = d.total;
    });
  }

  var PRESETS = {
    "abil-array": function () {
      state = emptyState();
    },
    "abil-array-partial": function () {
      state = emptyState();
      state.base.str = 15;
      state.base.con = 14;
      state.base.dex = 13;
    },
    "abil-array-ready": function () {
      state = emptyState();
      applyPriority();
    },
    "abil-buy": function () {
      state = emptyState();
      state.method = "point_buy";
      state.base = emptyScores(8);
    },
    "abil-buy-ready": function () {
      state = emptyState();
      state.method = "point_buy";
      applyPriority();
    },
    "abil-roll": function () {
      state = emptyState();
      applyFixedRolls();
    },
    "abil-manual": function () {
      state = emptyState();
      state.method = "manual";
      state.base = emptyScores(10);
    },
    "abil-lobby-buy": function () {
      state = emptyState();
      state.method = "point_buy";
      state.base = emptyScores(8);
    }
  };

  function contextFor(name) {
    var lobby = name === "abil-lobby-buy";
    return {
      classSlug: "fighter",
      bonuses: { str: 2, con: 2 },
      bonusLabel: "раса",
      allowedMethods: lobby ? ["point_buy"] : null,
      lobby: lobby
    };
  }

  function renderAbilityView(name) {
    CONTEXT = contextFor(name);
    var prep = PRESETS[name];
    if (prep) prep();
    C.renderPipeline({ step: "abilities", steps: STEPS5, lobby: CONTEXT.lobby });
    paint();
  }

  Object.keys(PRESETS).forEach(function (name) {
    C.registerView(name, function () { renderAbilityView(name); });
  });

  var origSetWidth = C.setWidth;
  C.setWidth = function (width) {
    origSetWidth(width);
    var v = document.documentElement.getAttribute("data-view") || "";
    if (PRESETS[v]) renderAbilityView(v);
  };

  var q = new URLSearchParams(location.search);
  var bootView = q.get("view") || document.documentElement.getAttribute("data-view");
  if (bootView && PRESETS[bootView]) C.applyView(bootView);
})();
