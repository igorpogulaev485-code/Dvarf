  /* Шаг 8: диалоги траты классовых ресурсов — как на проде, не немой счётчик. */
  (function bootClassResourcesMobile() {
    function mainCls() {
      return (typeof mainClass === "function") ? mainClass() : ((sheet.classes || [])[0] || {});
    }
    function slugOf() {
      return String((mainCls().id || "")).toLowerCase();
    }
    function charLevel() {
      return Number(sheet.level || mainCls().level || 1) || 1;
    }
    function clsLevel(id) {
      const row = (sheet.classes || []).find(function (c) { return c.id === id; });
      return row ? (Number(row.level) || 0) : 0;
    }
    function hasClass(id) { return clsLevel(id) > 0; }
    function pbOf() {
      const lv = charLevel();
      return lv >= 17 ? 6 : lv >= 13 ? 5 : lv >= 9 ? 4 : lv >= 5 ? 3 : 2;
    }
    function tceOn() {
      return typeof tceFeaturesOn === "function" ? tceFeaturesOn() : true;
    }
    function itemById(id) {
      if (typeof ensureExploreState === "function") {
        try { ensureExploreState(); } catch (err) {}
      }
      const bags = [];
      if (sheet.inv && Array.isArray(sheet.inv.items)) bags.push(sheet.inv.items);
      if (sheet.inventory && Array.isArray(sheet.inventory.items)) bags.push(sheet.inventory.items);
      if (Array.isArray(sheet.items)) bags.push(sheet.items);
      for (let i = 0; i < bags.length; i++) {
        const found = bags[i].find(function (it) { return it && it.id === id; });
        if (found) return found;
      }
      return null;
    }

    function rageMaxFor(level) {
      const lv = level || 1;
      if (lv >= 17) return 6;
      if (lv >= 12) return 5;
      if (lv >= 6) return 4;
      if (lv >= 3) return 3;
      return 2;
    }
    function rageDmgFor(level) {
      const lv = level || 1;
      return lv >= 16 ? 4 : lv >= 9 ? 3 : 2;
    }
    function channelMaxFor(level, kind) {
      if (kind === "paladin") return 1;
      const lv = level || 1;
      if (lv >= 18) return 3;
      if (lv >= 6) return 2;
      return 1;
    }
    function harnessDaily(level) {
      const lv = level || 1;
      if (lv >= 18) return 3;
      if (lv >= 6) return 2;
      return lv >= 2 ? 1 : 0;
    }

    function syncResourceFields() {
      const sl = slugOf();
      const lv = mainCls().level || charLevel();
      if (hasClass("cleric") || hasClass("paladin")) {
        const kind = hasClass("cleric") ? "cleric" : "paladin";
        const cLv = hasClass("cleric") ? clsLevel("cleric") : clsLevel("paladin");
        const max = channelMaxFor(cLv, kind);
        if (!sheet.channel) sheet.channel = { name: "Божественный канал", cur: max, max: max };
        if (sheet.channel.max == null) sheet.channel.max = max;
        if (sheet.channel.cur == null) sheet.channel.cur = sheet.channel.max;
        if (sheet.channelCur == null) sheet.channelCur = sheet.channel.cur;
        else sheet.channel.cur = sheet.channelCur;
        if (sheet.channelMax == null) sheet.channelMax = sheet.channel.max;
        else sheet.channel.max = sheet.channelMax;
        sheet.channel.cur = Math.max(0, Math.min(sheet.channel.max, sheet.channel.cur));
        sheet.channelCur = sheet.channel.cur;
        sheet.channelMax = sheet.channel.max;
        if (!sheet.channel.name) sheet.channel.name = "Божественный канал";
      }
      if (hasClass("paladin")) {
        const max = 5 * clsLevel("paladin");
        if (sheet.handsMax == null) sheet.handsMax = max;
        if (sheet.handsCur == null) sheet.handsCur = sheet.handsMax;
        sheet.handsCur = Math.max(0, Math.min(sheet.handsMax, sheet.handsCur));
      }
      if (hasClass("sorcerer")) {
        const max = clsLevel("sorcerer");
        if (!sheet.sorcery) sheet.sorcery = { cur: max, max: max };
        if (sheet.sorcery.max == null) sheet.sorcery.max = max;
        if (sheet.sorcery.cur == null) sheet.sorcery.cur = sheet.sorcery.max;
        sheet.sorcery.cur = Math.max(0, Math.min(sheet.sorcery.max, sheet.sorcery.cur));
      }
      if (hasClass("barbarian")) {
        const max = rageMaxFor(clsLevel("barbarian"));
        if (!sheet.rage) sheet.rage = { cur: max, max: max };
        if (sheet.rage.max == null) sheet.rage.max = max;
        if (sheet.rage.cur == null) sheet.rage.cur = sheet.rage.max;
        sheet.rage.cur = Math.max(0, Math.min(sheet.rage.max, sheet.rage.cur));
      }
      if (hasClass("druid") && typeof ensureCompanionsState === "function") {
        const c = ensureCompanionsState();
        c.wild = c.wild || {};
        if (c.wild.max == null) c.wild.max = 2;
        if (c.wild.used == null) c.wild.used = 0;
      }
      if (typeof ensureRules === "function" && typeof syncHarnessPool === "function") {
        try { syncHarnessPool(); } catch (err) {}
      } else if (tceOn() && (hasClass("cleric") || hasClass("paladin"))) {
        sheet.rules = sheet.rules || {};
        sheet.rules.harness = sheet.rules.harness || { cur: harnessDaily(lv), max: harnessDaily(lv) };
      }
    }

    function channelLeft() {
      syncResourceFields();
      return sheet.channel ? sheet.channel.cur : 0;
    }
    function channelMax() {
      syncResourceFields();
      return sheet.channel ? sheet.channel.max : 0;
    }
    function spendChannel(label) {
      syncResourceFields();
      if (!sheet.channel || sheet.channel.cur <= 0) {
        toast("Нет использований Божественного канала");
        return false;
      }
      sheet.channel.cur -= 1;
      sheet.channelCur = sheet.channel.cur;
      toast(label + " · канал " + sheet.channel.cur + "/" + sheet.channel.max);
      return true;
    }

    function knownMetamagic() {
      const picks = (sheet.metamagic || sheet.sorceryPicks || (sheet.rules && sheet.rules.metamagic) || []);
      return Array.isArray(picks) ? picks.filter(Boolean) : [];
    }

    function amuletItem() {
      return itemById("amulet") || itemById("amulet-symbol");
    }

    function wildPool() {
      if (typeof ensureCompanionsState !== "function") return { cur: 0, max: 0 };
      const c = ensureCompanionsState();
      c.wild = c.wild || { max: 2, used: 0 };
      const max = c.wild.max || 2;
      const cur = Math.max(0, max - (c.wild.used || 0));
      return { cur: cur, max: max, used: c.wild.used || 0 };
    }

    hotItems = function () {
      syncResourceFields();
      const items = [];
      if (sheet.channel && sheet.channel.max) {
        items.push({ id: "channel", kind: "res", name: sheet.channel.name || "Божественный канал", cur: sheet.channel.cur, max: sheet.channel.max, open: "res-channel" });
      }
      if (sheet.id === "kaedrin" || (hasClass("cleric") && /жизн/i.test(mainCls().subclass || ""))) {
        items.push({ id: "preserve-life", kind: "res", name: "Сохранение жизни", note: "канал", open: "preserve-life" });
      }
      const am = amuletItem();
      if (am && (am.chargesMax || am.charges)) {
        items.push({ id: "amulet", kind: "res", name: am.name || "Священный символ", cur: am.charges != null ? am.charges : am.chargesMax, max: am.chargesMax || am.charges || 0, open: "res-amulet" });
      } else if (sheet.id === "kaedrin") {
        items.push({ id: "amulet", kind: "res", name: "Амулет неувядающей молитвы", cur: 2, max: 3, open: "res-amulet" });
      }
      if (hasClass("paladin")) {
        items.push({ id: "lay-hands", kind: "res", name: "Возложение рук", cur: sheet.handsCur, max: sheet.handsMax, open: "res-hands" });
      }
      if (hasClass("sorcerer") && sheet.sorcery) {
        items.push({ id: "sorcery", kind: "res", name: "Очки чародейства", cur: sheet.sorcery.cur, max: sheet.sorcery.max, open: "res-sorcery" });
      }
      if (hasClass("druid") && (clsLevel("druid") >= 2)) {
        const w = wildPool();
        items.push({ id: "wild-shape", kind: "res", name: "Дикий облик", cur: w.cur, max: w.max, open: "wild-shape" });
      }
      if (hasClass("barbarian") && sheet.rage) {
        items.push({ id: "rage", kind: "res", name: "Ярость", cur: sheet.rage.cur, max: sheet.rage.max, instant: "rage-spend" });
      }
      if (hasClass("monk") && sheet.rules && sheet.rules.ki && sheet.rules.ki.max) {
        items.push({ id: "ki", kind: "res", name: "Ци", cur: sheet.rules.ki.cur, max: sheet.rules.ki.max, open: "res-ki" });
      }
      if (hasClass("bard") && sheet.rules && sheet.rules.bardic && sheet.rules.bardic.max) {
        items.push({ id: "bardic", kind: "res", name: "Бардовское вдохновение", cur: sheet.rules.bardic.cur, max: sheet.rules.bardic.max, open: "res-bardic" });
      }
      if (sheet.rules && sheet.rules.superiority && sheet.rules.superiority.max) {
        items.push({ id: "superiority", kind: "res", name: "Кости превосходства", cur: sheet.rules.superiority.cur, max: sheet.rules.superiority.max, open: "res-superiority" });
      }
      if (sheet.rules && sheet.rules.psionic && sheet.rules.psionic.max) {
        items.push({ id: "psionic", kind: "res", name: "Пси-кости", cur: sheet.rules.psionic.cur, max: sheet.rules.psionic.max, open: "res-psionic" });
      }
      return items;
    };
    classResources = function () { return hotItems(); };

    const RESOURCE_OPEN = {
      channel: "res-channel",
      "res-channel": "res-channel",
      "preserve-life": "preserve-life",
      "lay-hands": "res-hands",
      "res-hands": "res-hands",
      sorcery: "res-sorcery",
      "res-sorcery": "res-sorcery",
      "wild-shape": "wild-shape",
      ki: "res-ki",
      bardic: "res-bardic",
      superiority: "res-superiority",
      psionic: "res-psionic",
      trinkets: "res-trinkets",
      arcanum: "res-arcanum",
      arcane: "res-arcane",
      amulet: "res-amulet",
      "res-amulet": "res-amulet"
    };

    function rageEffectOn() {
      return (state.effects || []).some(function (e) {
        return (e && (e.slug || e) === "rage") || e === "Ярость" || (e && e.name === "Ярость");
      });
    }
    function clearRageEffect() {
      sheet.raging = false;
      state.effects = (state.effects || []).filter(function (e) {
        return !((e && (e.slug || e) === "rage") || e === "Ярость" || (e && e.name === "Ярость"));
      });
    }
    function spendRageMute() {
      syncResourceFields();
      if (!hasClass("barbarian") || !sheet.rage || sheet.rage.cur <= 0) {
        toast("Нет использований ярости");
        return false;
      }
      sheet.rage.cur -= 1;
      if (typeof closeDialog === "function") closeDialog();
      render();
      return true;
    }
    function applyRageFromFeature() {
      syncResourceFields();
      if (!hasClass("barbarian") || !sheet.rage) {
        toast("Ярость — умение варвара. У этого персонажа его нет.");
        return false;
      }
      const heavy = !!(sheet.heavyArmor || (sheet.acUsesDex === false && sheet.acArmor >= 16 && /латы|кольчуг|полулат/i.test(sheet.armorName || "")));
      if (heavy) {
        toast("Ярость: сними тяжёлый доспех — иначе бонусы ярости не действуют");
        return false;
      }
      if (sheet.rage.cur <= 0) { toast("Нет использований ярости"); return false; }
      sheet.rage.cur -= 1;
      sheet.raging = true;
      state.effects = state.effects || [];
      if (!rageEffectOn()) state.effects.push({ slug: "rage", name: "Ярость" });
      if (state.concentration) state.concentration = null;
      toast("В ярости");
      if (typeof closeDialog === "function") closeDialog();
      render();
      return true;
    }

    function openResource(id) {
      // На проде ярость из хот-бара — немой spend, без шторки.
      if (id === "rage" || id === "res-rage") { spendRageMute(); return; }
      const openId = RESOURCE_OPEN[id] || id;
      if (openId === "wild-shape" && typeof ensureCompanionsState === "function") {
        const c = ensureCompanionsState();
        c.wild = c.wild || {};
        c.wild.step = "fork";
      }
      if (typeof openDialog === "function") openDialog(openId);
    }

    const FLEX_COST = { 1: 2, 2: 3, 3: 5, 4: 6, 5: 7 };
    const META_ALL = [
      { id: "careful", name_ru: "Осторожное заклинание", cost: 1, cost_ru: "1", summary_ru: "До модификатора Харизмы существ (мин. 1) автоматически преуспевают в спасе твоего заклинания." },
      { id: "distant", name_ru: "Далёкое заклинание", cost: 1, cost_ru: "1", summary_ru: "Дальность удваивается; касание становится 30 фт." },
      { id: "empowered", name_ru: "Усиленное заклинание", cost: 1, cost_ru: "1", summary_ru: "Перебрось до модификатора Харизмы костей урона (мин. 1)." },
      { id: "extended", name_ru: "Продлённое заклинание", cost: 1, cost_ru: "1", summary_ru: "Длительность удваивается, максимум 24 часа." },
      { id: "heightened", name_ru: "Возвышенное заклинание", cost: 3, cost_ru: "3", summary_ru: "Одно существо с помехой на первый спас этого заклинания." },
      { id: "quickened", name_ru: "Ускоренное заклинание", cost: 2, cost_ru: "2", summary_ru: "Время каста «1 действие» становится бонусным действием." },
      { id: "subtle", name_ru: "Скрытное заклинание", cost: 1, cost_ru: "1", summary_ru: "Без соматических и вербальных компонентов." },
      { id: "twinned", name_ru: "Удвоенное заклинание", cost: 0, cost_ru: "уровень ячейки (мин. 1)", summary_ru: "Заклинание с одной целью действует на второе существо в дистанции. Стоимость равна кругу ячейки." }
    ];

    function spendRow(title, text, btnLabel, act, v, disabled) {
      return '<div class="res-spend-row">' +
        '<div class="res-spend-row__text"><b>' + esc(title) + "</b><span>" + esc(text) + "</span></div>" +
        '<button type="button" class="btn" data-res-spend="' + esc(act) + '"' + (v != null ? ' data-v="' + esc(v) + '"' : "") + (disabled ? " disabled" : "") + ">" + esc(btnLabel) + "</button>" +
        "</div>";
    }
    function sheetFoot() {
      return '<div class="pad-row res-spend-foot"><button type="button" class="btn" data-close>Отмена</button><button type="button" class="btn-primary" data-close>Закрыть</button></div>';
    }

    function channelOptions() {
      const sl = slugOf();
      const lv = mainCls().level || charLevel();
      const out = [];
      if (sl === "cleric") {
        out.push({
          id: "turn_undead",
          name: "Изгнание нежити",
          text: "Действием предъяви священный символ — нежить в 30 фт., которая тебя видит и слышит, делает спас Мудрости или изгнана на 1 минуту."
        });
        if (/жизн/i.test(mainCls().subclass || "")) {
          out.push({
            id: "cd_preserve_life",
            name: "Канал: Сохранение жизни",
            text: "Действием раздай " + (5 * lv) + " хитов (5 × уровень жреца) существам в 30 фт. Никто не получает больше половины своего максимума."
          });
        }
      }
      if (sl === "paladin" && lv >= 3) {
        if (/предан/i.test(mainCls().subclass || "")) {
          out.push({
            id: "cd_sacred_weapon",
            name: "Канал: Священное оружие",
            text: "Действием оружие на 1 мин. светится; атаки Харизмой; +мод. Хар. к броскам атаки; магическое."
          });
          out.push({
            id: "cd_turn_the_unholy",
            name: "Канал: Изгнание нечисти",
            text: "Действием фиенды и нежить в 30 фт. делают спас Мудрости или изгнаны на 1 минуту."
          });
        }
      }
      if (tceOn() && (sl === "cleric" || sl === "paladin") && lv >= 2) {
        out.push({ id: "cd_harness_divine_power", name: "Праведное восстановление", tce: true });
      }
      return out;
    }

    function renderChannelSpend() {
      syncResourceFields();
      const cur = channelLeft();
      const max = channelMax();
      const cap = Math.ceil(pbOf() / 2);
      const r = (typeof ensureRules === "function") ? ensureRules() : (sheet.rules || { harness: { cur: 0, max: 0 } });
      if (!r.harness) r.harness = { cur: 0, max: 0 };
      const options = channelOptions();
      const rows = options.map(function (opt) {
        if (opt.id === "cd_harness_divine_power") {
          const dailyLeft = r.harness.cur || 0;
          const dailyMax = r.harness.max || 0;
          const slotOpts = [];
          for (let lv = 1; lv <= cap; lv++) {
            const s = (sheet.slots || {})[lv];
            if (!s || !s.max) continue;
            const spent = Math.max(0, s.max - s.cur);
            const on = Number((state && state.harnessSlot) || cap) === lv;
            slotOpts.push('<button type="button" class="sheet-chip' + (on ? " is-on" : "") + (spent ? "" : " is-blocked") + '" data-res-spend="harness-slot" data-v="' + lv + '"' + (spent ? "" : " disabled") + ">" + lv + " круг · потрачено " + spent + "</button>");
          }
          const picked = Number((state && state.harnessSlot) || 0);
          const slot = (sheet.slots || {})[picked] || (sheet.slots || {})[cap];
          const can = cur > 0 && dailyLeft > 0 && slot && slot.cur < slot.max;
          return '<div class="res-spend-row">' +
            '<div class="res-spend-row__text"><b>Праведное восстановление</b>' +
            "<span>Бонусное · дневных " + dailyLeft + "/" + dailyMax + " · потолок круга " + cap + ". Бонусным действием потратить 1 Божественный канал и 1 дневное применение. Вернуть одну потраченную ячейку не выше половины бонуса мастерства (вверх).</span>" +
            (slotOpts.length ? ('<div class="pad-row" style="flex-wrap:wrap;margin-top:6px">' + slotOpts.join("") + "</div>") : "<span>Нет потраченных ячеек круга 1–" + cap + ".</span>") +
            "</div>" +
            '<button type="button" class="btn" data-res-spend="harness-go"' + (can ? "" : " disabled") + ">Вернуть ячейку</button></div>";
        }
        return spendRow(opt.name, opt.text, "−1", "channel-opt", opt.id, cur <= 0);
      }).join("");
      const empty = options.length ? "" : "<p class=\"lead\">Нет доступных опций — нужен домен жреца (Изгнание нежити) или клятва паладина (с 3 ур.).</p>";
      return '<div class="form res-spend">' +
        "<p class=\"lead\">Сейчас " + cur + "/" + max + ". Выбери опцию канала.</p>" +
        (rows ? '<div class="res-spend-list">' + rows + "</div>" : empty) +
        spendRow("Просто −1 использование", "Списать применение без выбора опции.", "−1", "channel-plain", "", cur <= 0) +
        sheetFoot() + "</div>";
    }

    function renderPreserveLifeSpend() {
      syncResourceFields();
      const cur = channelLeft();
      const max = channelMax();
      const pool = 5 * (clsLevel("cleric") || mainCls().level || 5);
      return '<div class="form res-spend"><p class="lead">Канал: Сохранение жизни. Действием (тратит канал) раздай ' + pool + " хитов существам в 30 фт. Каждое существо — не выше половины своего максимума.</p>" +
        "<p class=\"pad-note\">Канал: " + cur + "/" + max + "</p>" +
        '<div class="res-spend-list">' + spendRow("Сохранение жизни", "Раздай " + pool + " хитов в 30 фт.", "−1", "channel-opt", "cd_preserve_life", cur <= 0) + "</div>" +
        sheetFoot() + "</div>";
    }

    function renderHandsSpend() {
      syncResourceFields();
      if (!hasClass("paladin")) {
        return '<div class="form"><p class="lead">Возложение рук — умение паладина. У этого персонажа его нет.</p>' + sheetFoot() + "</div>";
      }
      const cur = sheet.handsCur;
      const max = sheet.handsMax;
      const spend = Math.max(1, Math.min(cur || 1, Number((state && state.handsSpend) || Math.min(5, cur || 1))));
      if (state) state.handsSpend = spend;
      return '<div class="form res-spend"><p class="lead">Сейчас ' + cur + "/" + max + " хитов в пуле (5 × уровень паладина).</p>" +
        '<div class="res-spend-list">' +
        '<div class="res-spend-row"><div class="res-spend-row__text"><b>Исцелить хиты</b><span>Действием коснись существа — восстанови хиты из пула.</span>' +
        '<label class="field">Сколько хитов<input type="number" min="1" max="' + Math.max(1, cur) + '" value="' + spend + '" data-res-hands-amt></label></div>' +
        '<button type="button" class="btn" data-res-spend="hands-heal"' + (cur <= 0 ? " disabled" : "") + ">−" + spend + "</button></div>" +
        spendRow("Снять болезнь или яд", "Потрать 5 из пула — нейтрализовать одну болезнь или яд (вместо исцеления хитов).", "−5", "hands-cure", "", cur < 5) +
        "</div>" + sheetFoot() + "</div>";
    }

    function renderSorcerySpend() {
      if (!hasClass("sorcerer")) {
        return '<div class="form"><p class="lead">Очки чародейства — умение чародея. У этого персонажа его нет.</p>' + sheetFoot() + "</div>";
      }
      syncResourceFields();
      const left = sheet.sorcery.cur;
      const max = sheet.sorcery.max;
      const known = knownMetamagic();
      const twin = Number((state && state.twinLevel) || 1);
      let metaHtml;
      if (!known.length) {
        metaHtml = "<p class=\"pad-note\">Нет выбранных вариантов — возьми метамагию в способностях (с 3 ур. чародея).</p>";
      } else {
        metaHtml = '<div class="res-spend-list">' + known.map(function (id) {
          const o = META_ALL.find(function (m) { return m.id === id; });
          if (!o) return "";
          const cost = o.id === "twinned" ? Math.max(1, twin) : (o.cost || 1);
          let extra = "";
          if (o.id === "twinned") {
            extra = '<div class="pad-row" style="flex-wrap:wrap;margin-top:6px">' + [1, 2, 3, 4, 5].map(function (lv) {
              return '<button type="button" class="sheet-chip' + (twin === lv ? " is-on" : "") + '" data-res-spend="twin-lv" data-v="' + lv + '">' + lv + " круг</button>";
            }).join("") + "</div>";
          }
          return '<div class="res-spend-row"><div class="res-spend-row__text"><b>' + esc(o.name_ru) + "</b><span>" + esc(o.cost_ru) + " очк. " + esc(o.summary_ru) + "</span>" + extra + "</div>" +
            '<button type="button" class="btn" data-res-spend="sorc-meta" data-v="' + o.id + '"' + (left < cost ? " disabled" : "") + ">−" + cost + "</button></div>";
        }).join("") + "</div>";
      }
      const make = [1, 2, 3, 4, 5].map(function (lv) {
        const cost = FLEX_COST[lv];
        return '<button type="button" class="btn" data-res-spend="sorc-make" data-v="' + lv + '"' + (left < cost ? " disabled" : "") + ">Ячейка " + lv + " (−" + cost + ")</button>";
      }).join("");
      const eat = [1, 2, 3, 4, 5].map(function (lv) {
        const s = (sheet.slots || {})[lv];
        const free = s ? s.cur : 0;
        return '<button type="button" class="btn" data-res-spend="sorc-eat" data-v="' + lv + '"' + (free <= 0 ? " disabled" : "") + ">" + lv + " ур. → +" + lv + " очк.</button>";
      }).join("");
      return '<div class="form res-spend"><p class="lead">Сейчас ' + left + "/" + max + ". Выбери метамагию или гибкое колдовство.</p>" +
        '<p class="section-label">Метамагия</p>' + metaHtml +
        '<p class="section-label">Гибкое колдовство</p>' +
        "<p class=\"pad-note\">Очки создают новую ячейку до 5 круга, даже если круг полон. Она исчезает после продолжительного отдыха. Ячейка → очки (= уровень ячейки).</p>" +
        '<div class="pad-row" style="flex-wrap:wrap">' + make + "</div>" +
        '<div class="pad-row" style="flex-wrap:wrap;margin-top:8px">' + eat + "</div>" +
        sheetFoot() + "</div>";
    }

    function renderAmuletSpend() {
      const am = amuletItem();
      const cur = am && am.charges != null ? am.charges : 2;
      const max = am && am.chargesMax ? am.chargesMax : 3;
      const name = (am && am.name) || "Амулет неувядающей молитвы";
      const notes = (am && am.notes) || "Пока настроен, можно потратить заряд как бонусное, чтобы восстановить 2к6 хитов.";
      return '<div class="form res-spend"><p class="lead">' + esc(name) + ": " + cur + "/" + max + " зарядов.</p>" +
        "<p>" + esc(notes) + "</p>" +
        '<div class="res-spend-list">' + spendRow("Потратить заряд", "Бонусным действием восстановить 2к6 хитов.", "−1", "amulet-charge", "", cur <= 0) + "</div>" +
        sheetFoot() + "</div>";
    }

    function recoverList(kind) {
      const rows = [];
      if (kind === "short") {
        if (sheet.channel) rows.push("Божественный канал (" + sheet.channel.cur + "/" + sheet.channel.max + " → " + sheet.channel.max + "/" + sheet.channel.max + ")");
        if (hasClass("druid") && clsLevel("druid") >= 2) {
          const w = wildPool();
          rows.push("Дикий облик (" + w.cur + "/" + w.max + " → " + w.max + "/" + w.max + ")");
        }
        if (sheet.rules && sheet.rules.ki && sheet.rules.ki.max) rows.push("Ци");
        if (sheet.rules && sheet.rules.bardic && sheet.rules.bardic.max) rows.push("Бардовское вдохновение");
        if (sheet.rules && sheet.rules.superiority && sheet.rules.superiority.max) rows.push("Кости превосходства");
        if (sheet.rules && sheet.rules.psionic && sheet.rules.psionic.max) rows.push("Пси-кости");
        if (sheet.pactSlots && sheet.pactSlots.max > 0) rows.push("Ячейки договора");
        rows.push("Прочие умения короткого отдыха");
      } else {
        rows.push("Полные хиты (" + sheet.hpMax + ")");
        if (sheet.slots && Object.keys(sheet.slots).length) rows.push("Все ячейки заклинаний");
        if (sheet.pactSlots && sheet.pactSlots.max > 0) rows.push("Ячейки договора");
        rows.push("Половина костей хитов (⌊всего/2⌋, минимум 1)");
        if (sheet.channel) rows.push("Божественный канал");
        if (hasClass("paladin")) rows.push("Возложение рук");
        if (hasClass("sorcerer")) rows.push("Очки чародейства");
        if (hasClass("barbarian")) rows.push("Ярость");
        if (hasClass("druid") && clsLevel("druid") >= 2) rows.push("Дикий облик");
        if (tceOn() && (hasClass("cleric") || hasClass("paladin"))) rows.push("Праведное восстановление (дневные)");
        const am = amuletItem();
        if (am) rows.push((am.name || "Амулет") + " — заряды");
        rows.push("Снятие 1 уровня истощения (сейчас " + (state.exhaustion || 0) + ")");
      }
      return rows;
    }

    const _renderRest = renderRest;
    renderRest = function () {
      syncResourceFields();
      const box = document.querySelector("[data-rest-body]");
      if (!box) return _renderRest.apply(this, arguments);
      const short = state.restKind !== "long";
      let chipShort = "Короткий отдых";
      let chipLong = "Продолжительный отдых";
      if (typeof restLabels === "function") {
        const lab = restLabels();
        if (lab && lab.chipShort) chipShort = lab.chipShort;
        if (lab && lab.chipLong) chipLong = lab.chipLong;
      }
      const hd = Object.keys(sheet.hitDice || {}).map(function (id) {
        const d = sheet.hitDice[id];
        const cls = (sheet.classes || []).find(function (c) { return c.id === id; });
        return '<div class="hp-dice__row"><span>Кости хитов · ' + esc(cls ? cls.name : id) + " к" + d.die + " <b>" + d.cur + "/" + d.max + "</b></span>" +
          (short ? '<button type="button" class="btn" data-spend-hd="' + esc(id) + '"' + (d.cur <= 0 ? " disabled" : "") + ">Потратить кость</button>" : "") +
          "</div>";
      }).join("");
      const recover = recoverList(short ? "short" : "long");
      const note = short
        ? "Хиты сами не восстанавливаются — потрать кости выше (1кN + модификатор Тел)."
        : "Продолжительный отдых: полные хиты, ячейки, половина костей, ресурсы и −1 истощение.";
      box.innerHTML =
        '<div class="pad-modes">' +
          '<button type="button" class="seg' + (short ? " is-on" : "") + '" data-rest-kind="short">' + esc(chipShort) + "</button>" +
          '<button type="button" class="seg' + (!short ? " is-on" : "") + '" data-rest-kind="long">' + esc(chipLong) + "</button>" +
        "</div>" +
        "<p class=\"lead\">" + esc(note) + "</p>" +
        (short && hd ? '<p class="section-label">Кости хитов</p><div class="hp-dice">' + hd + "</div>" : "") +
        '<p class="section-label">Что восстановится</p>' +
        '<div class="rest-res">' + recover.map(function (line) { return "<div><span>" + esc(line) + "</span></div>"; }).join("") + "</div>" +
        '<div class="pad-row res-spend-foot" style="margin-top:8px"><button type="button" class="btn" data-close>Закрыть</button><button type="button" class="btn-primary" data-finish-rest>Применить отдых</button></div>';
    };

    const _finishRest = finishRest;
    finishRest = function () {
      syncResourceFields();
      if (state.restKind === "long") {
        sheet.hp = sheet.hpMax;
        state.hpTemp = 0;
        state.exhaustion = Math.max(0, (state.exhaustion || 0) - 1);
        Object.keys(sheet.hitDice || {}).forEach(function (id) {
          const d = sheet.hitDice[id];
          const regain = Math.min(Math.max(0, d.max - d.cur), Math.max(1, Math.floor(d.max / 2)));
          d.cur = Math.min(d.max, d.cur + regain);
        });
        Object.keys(sheet.slots || {}).forEach(function (lv) {
          const s = sheet.slots[lv];
          const flex = s.flexible || 0;
          s.max = Math.max(0, (s.max || 0) - flex);
          s.cur = s.max;
          delete s.flexible;
        });
        if (sheet.channel) { sheet.channel.cur = sheet.channel.max; sheet.channelCur = sheet.channel.cur; }
        if (hasClass("paladin") && sheet.handsMax != null) sheet.handsCur = sheet.handsMax;
        if (sheet.sorcery) sheet.sorcery.cur = sheet.sorcery.max;
        if (sheet.rage) sheet.rage.cur = sheet.rage.max;
        sheet.raging = false;
        if (state.effects) state.effects = (state.effects || []).filter(function (e) { return (e.slug || e) !== "rage" && e !== "Ярость"; });
        if (sheet.rules && sheet.rules.harness) sheet.rules.harness.cur = sheet.rules.harness.max;
        if (sheet.rules && sheet.rules.ki) sheet.rules.ki.cur = sheet.rules.ki.max;
        if (sheet.rules && sheet.rules.bardic) sheet.rules.bardic.cur = sheet.rules.bardic.max;
        if (sheet.rules && sheet.rules.superiority) sheet.rules.superiority.cur = sheet.rules.superiority.max;
        if (sheet.rules && sheet.rules.psionic) sheet.rules.psionic.cur = sheet.rules.psionic.max;
        if (typeof ensureCompanionsState === "function") {
          const c = ensureCompanionsState();
          if (c.wild) c.wild.used = 0;
        }
        const am = amuletItem();
        if (am && am.chargesMax) am.charges = am.chargesMax;
        if (sheet.hp > 0) { state.deathOk = 0; state.deathFail = 0; }
        toast("Продолжительный отдых завершён");
      } else {
        if (sheet.channel) { sheet.channel.cur = sheet.channel.max; sheet.channelCur = sheet.channel.cur; }
        if (typeof ensureCompanionsState === "function") {
          const c = ensureCompanionsState();
          if (c.wild) c.wild.used = 0;
        }
        if (sheet.rules && sheet.rules.ki) sheet.rules.ki.cur = sheet.rules.ki.max;
        if (sheet.rules && sheet.rules.bardic) sheet.rules.bardic.cur = sheet.rules.bardic.max;
        if (sheet.rules && sheet.rules.superiority) sheet.rules.superiority.cur = sheet.rules.superiority.max;
        if (sheet.rules && sheet.rules.psionic) sheet.rules.psionic.cur = sheet.rules.psionic.max;
        if (sheet.pactSlots && sheet.pactSlots.max > 0) {
          sheet.pactSlots.cur = sheet.pactSlots.max;
        }
        if (hasClass("sorcerer") && sheet.sorcery && clsLevel("sorcerer") >= 20) {
          sheet.sorcery.cur = Math.min(sheet.sorcery.max, sheet.sorcery.cur + 4);
        }
        toast("Короткий отдых завершён");
      }
      render();
    };

    function spendSorcery(cost, label) {
      syncResourceFields();
      if (!sheet.sorcery || cost > sheet.sorcery.cur) {
        toast("Не хватает очков (нужно " + cost + ", есть " + (sheet.sorcery ? sheet.sorcery.cur : 0) + ")");
        return false;
      }
      sheet.sorcery.cur -= cost;
      toast(label + ": −" + cost + " очк. чародейства");
      return true;
    }

    function handleResSpend(act, v, el) {
      if (act === "channel-opt" || act === "channel-plain") {
        const opt = channelOptions().find(function (o) { return o.id === v; });
        const label = act === "channel-plain" ? "Божественный канал" : ((opt && opt.name) || "Божественный канал");
        if (spendChannel(label)) {
          closeDialog();
          render();
        }
        return;
      }
      if (act === "harness-slot") {
        state.harnessSlot = Number(v);
        if (typeof refreshLive === "function") refreshLive();
        else if (typeof refreshOpenSheet === "function") refreshOpenSheet();
        return;
      }
      if (act === "harness-go") {
        syncResourceFields();
        const r = (typeof ensureRules === "function") ? ensureRules() : sheet.rules;
        const cap = Math.ceil(pbOf() / 2);
        const lv = Number((state && state.harnessSlot) || cap);
        const slot = (sheet.slots || {})[lv];
        if (channelLeft() <= 0) { toast("Нет применений Божественного канала."); return; }
        if (!r || !r.harness || r.harness.cur <= 0) { toast("Нет дневных применений Праведного восстановления."); return; }
        if (!slot || slot.cur >= slot.max) { toast("Нет потраченной ячейки " + lv + " круга."); return; }
        if (lv > cap) { toast("Круг выше потолка (половина БМ вверх)."); return; }
        slot.cur += 1;
        spendChannel("Праведное восстановление");
        r.harness.cur -= 1;
        toast("Праведное восстановление: возвращена ячейка " + lv + " круга.");
        closeDialog();
        render();
        return;
      }
      if (act === "hands-heal" || act === "hands-cure") {
        syncResourceFields();
        const cost = act === "hands-cure" ? 5 : Math.max(1, Math.floor(Number((state && state.handsSpend) || 1)));
        if (sheet.handsCur < cost) { toast("Не хватает пула (нужно " + cost + ", есть " + sheet.handsCur + ")"); return; }
        sheet.handsCur -= cost;
        if (act === "hands-heal") {
          sheet.hp = Math.min(sheet.hpMax, (Number(sheet.hp) || 0) + cost);
          toast("Исцеление " + cost + " хитов · пул " + sheet.handsCur + "/" + sheet.handsMax);
        } else {
          toast("Снять болезнь / яд · пул " + sheet.handsCur + "/" + sheet.handsMax);
        }
        closeDialog();
        render();
        return;
      }
      if (act === "twin-lv") {
        state.twinLevel = Number(v) || 1;
        if (typeof refreshLive === "function") refreshLive();
        else if (typeof refreshOpenSheet === "function") refreshOpenSheet();
        return;
      }
      if (act === "sorc-meta") {
        const id = v;
        const o = META_ALL.find(function (m) { return m.id === id; });
        const cost = o && o.id === "twinned" ? Math.max(1, Number(state.twinLevel || 1)) : ((o && o.cost) || 1);
        if (spendSorcery(cost, (o && o.name_ru) || "Метамагия")) {
          closeDialog();
          render();
        }
        return;
      }
      if (act === "sorc-make") {
        const lv = Number(v);
        const cost = FLEX_COST[lv];
        if (!spendSorcery(cost, "Гибкое колдовство: ячейка " + lv + " ур.")) return;
        sheet.slots = sheet.slots || {};
        const s = sheet.slots[lv] || { cur: 0, max: 0, flexible: 0 };
        s.cur += 1;
        s.max += 1;
        s.flexible = (s.flexible || 0) + 1;
        sheet.slots[lv] = s;
        toast("Гибкое колдовство: новая ячейка " + lv + " ур. (−" + cost + " очк.)");
        closeDialog();
        render();
        return;
      }
      if (act === "sorc-eat") {
        const lv = Number(v);
        const s = (sheet.slots || {})[lv];
        if (!s || s.cur <= 0) { toast("Нет свободной ячейки " + lv + " ур."); return; }
        s.cur -= 1;
        syncResourceFields();
        sheet.sorcery.cur = Math.min(sheet.sorcery.max, sheet.sorcery.cur + lv);
        toast("Гибкое колдовство: ячейка " + lv + " → +" + lv + " очк.");
        closeDialog();
        render();
        return;
      }
      if (act === "amulet-charge") {
        const am = amuletItem();
        const cur = am && am.charges != null ? am.charges : 0;
        if (cur <= 0) { toast("Нет зарядов"); return; }
        if (am) am.charges = cur - 1;
        const roll = (typeof rollDie === "function" ? rollDie(6) : 4) + (typeof rollDie === "function" ? rollDie(6) : 3);
        sheet.hp = Math.min(sheet.hpMax, (Number(sheet.hp) || 0) + roll);
        toast((am && am.name ? am.name : "Амулет") + ": +" + roll + " хитов · заряды " + (am ? am.charges : 0));
        closeDialog();
        render();
        return;
      }
    }

    const bag = (typeof LIVE !== "undefined" && LIVE) || (window.SheetLive = window.SheetLive || {});
    bag["res-channel"] = { title: "Божественный канал", wide: true, body: renderChannelSpend };
    bag.channel = { title: "Божественный канал", wide: true, body: renderChannelSpend };
    bag["preserve-life"] = { title: "Сохранение жизни", body: renderPreserveLifeSpend };
    bag["res-hands"] = { title: "Возложение рук", body: renderHandsSpend };
    bag["res-sorcery"] = { title: "Очки чародейства", wide: true, body: renderSorcerySpend };
    bag["res-amulet"] = { title: "Амулет неувядающей молитвы", body: renderAmuletSpend };

    const _can = typeof canOpenClassDialog === "function" ? canOpenClassDialog : function () { return true; };
    canOpenClassDialog = function (id, kind) {
      if (id === "res-amulet") return true;
      if (id === "res-sorcery") return hasClass("sorcerer");
      if (id === "res-hands") return hasClass("paladin");
      if (id === "res-channel" || id === "channel" || id === "preserve-life") return hasClass("cleric") || hasClass("paladin");
      if (id === "wild-shape") return hasClass("druid");
      return _can(id, kind);
    };

    const _apply = applyPreset;
    applyPreset = function (id) {
      const out = _apply.apply(this, arguments);
      syncResourceFields();
      if (sheet.id === "kaedrin" && !amuletItem()) {
        /* charges live on the explore inventory after applyPreset; sync if already present */
      }
      if (hasClass("sorcerer") && sheet.sorcery && sheet.sorcery.max == null) sheet.sorcery.max = clsLevel("sorcerer");
      return out;
    };

    document.addEventListener("click", function (e) {
      const inst = e.target.closest && e.target.closest("[data-res-instant]");
      if (inst) {
        const kind = inst.getAttribute("data-res-instant");
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (kind === "rage-apply") applyRageFromFeature();
        else if (kind === "rage-spend" || kind === "rage" || kind === "res-rage") spendRageMute();
        return;
      }
      const res = e.target.closest && e.target.closest("[data-open-resource]");
      if (res) {
        const id = res.getAttribute("data-open-resource");
        if (id === "rage" || id === "res-rage") {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          spendRageMute();
          return;
        }
        if (RESOURCE_OPEN[id] || id === "wild-shape") {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          openResource(id);
          return;
        }
      }
      const btn = e.target.closest && e.target.closest("[data-res-spend]");
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        handleResSpend(btn.getAttribute("data-res-spend"), btn.getAttribute("data-v"), btn);
      }
    }, true);

    document.addEventListener("input", function (e) {
      const el = e.target;
      if (!el || !el.getAttribute) return;
      if (el.hasAttribute("data-res-hands-amt")) {
        state.handsSpend = Math.max(1, Math.floor(Number(el.value) || 1));
        if (typeof refreshLive === "function") refreshLive();
      }
    });

    if (typeof window !== "undefined") {
      window.SheetMobile = window.SheetMobile || {};
      window.SheetMobile.openResource = openResource;
      window.SheetMobile.syncResourceFields = syncResourceFields;
      window.SheetMobile.spendRage = spendRageMute;
      window.SheetMobile.applyRageFromFeature = applyRageFromFeature;
    }
  })();
