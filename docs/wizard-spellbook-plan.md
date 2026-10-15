# План фичи: книга заклинаний волшебника

**Идеи:** I-13 (зависимость от книги / level-up), I-16 (стоимость внесения)  
**Правила:** PHB 2014  
**Спека правил:** [`wizard-spellbook.md`](./wizard-spellbook.md)  
**Ветка:** `cursor/wizard-spellbook-rules-19c3` · PR #165  
**Prod tip (база):** `cursor/cleric-create-bugs-244b`

---

## 1. Цель

Волшебник в Dvarf должен жить от **физической книги**: наполнение с ценой, бесплатные слоты при уровне, бэкап, утеря/замена, ритуалы из книги — всё согласовано с кошельком и инвентарём.

**Для игрока:** понятно, что в книге, сколько стоит копия, почему нельзя подготовиться без книги, куда делись деньги.  
**Для мастера:** можно отметить утерю книги и не ломать каст уже подготовленного.

---

## 2. Границы (in / out)

| In scope (2014) | Out of scope (пока) |
|-----------------|---------------------|
| Free 6 / +2 level-up | Редакция 2024 (книга опциональна) |
| Paid foreign copy 50 зм + 2 ч / ур. | Полный I-17 (свитки как контейнеры) — только стык |
| Own backup 10 зм + 1 ч / ур. | Автоматический downtime-таймер часов |
| Lose → keep prepared; block prepare/ritual/add | Крафт/покупка пустой книги в магазине лобби |
| Replace from prepared memory | Мультиклассные краевые кейсы сверх «есть уровни wizard» |
| Savant ×½, Quill 0 зм / 2 мин | Homebrew школ без slug |
| Автосписание `inventory.coins` | Отдельная валюта «чернила» |

---

## 3. Уже сделано (срез 0) — engine + кошелёк

| Что | Где | Статус |
|-----|-----|--------|
| Тарифы copy / own / memory + Savant / Quill | `wizardSpellbook.ts` | ✅ |
| Free-cap soft, не жёсткий потолок | `freeBookCap`, Grimoire | ✅ |
| `spendGpFromPurse`, отказ с RU-сообщением | `weight.ts` | ✅ |
| `resolveSpellbookAddPayment` | `wizardSpellbook.ts` | ✅ |
| Гримуар: free vs `В книгу · N зм`, debit coins | `GrimoireDialog` + sheet | ✅ |
| Поля листа `wizard_spellbook`, `spellbook_acquisition`, `in_spellbook` | `spells.ts` | ✅ |
| Lose/replace/backup **pure** helpers | `wizardSpellbook.ts` | ✅ engine, ❌ UI |
| Selfcheck | `wizardSpellbook.selfcheck.ts` | ✅ |

**Приёмка среза 0 (ручная):** волшебник на листе, 6 free в книгу без списания; 7-е при 0 зм — toast и нет в книге; при ≥50 зм — списание и запись.

---

## 4. Дорожная карта срезов

### Срез 1 — Create + Level-up: явные free-слоты

**Зачем:** I-16 на создании; I-13 на повышении уровня.

| Задача | Детали |
|--------|--------|
| Create L1 wizard | Ровно 6 free picks 1 ур.; кнопка не показывает зм; счётчик «осталось N» |
| Level-up wizard | Диалог/шаг: «+2 в книгу» (уровни ≤ max slot); `acquisition=level_up` |
| Create + paid | Если игрок хочет > free — нужен кошелёк create-draft (`sheetDraft.inventory.coins`) или явный блок |
| Cap UX | Текст: «бесплатный объём / платные копии сверх» — не «книга полна» |

**Файлы:** `CreateCharacterPage`, `LevelingStep` / GuidedWizard, `GrimoireDialog` (уже частично).  
**Приёмка:** создать волшебника 1 → 6 в книгу, 0 зм списано; level 1→2 → предлагает 2 free; 3-е сверх free на L2 просит зм.

---

### Срез 2 — Физическая книга в инвентаре

**Зачем:** зависимость от предмета, не только флага.

| Задача | Детали |
|--------|--------|
| Стартовый gear | При выдаче «Книга заклинаний» → `primaryBookItemId = item.id` |
| Sync | Удаление/передача primary item → предупреждение или `bookLost` |
| `canAddToBook` | Без primary (и не lost-replace flow) — нельзя вносить |
| UI chip | «Книга: есть / утеряна» в панели заклинаний / гримуаре |

**Файлы:** `classGrants` / create apply, `inventory.ts`, `SpellsPanel`, sync hook.  
**Приёмка:** у волшебника после create есть item + `primaryBookItemId`; удаление книги из инвентаря → состояние «утеряна» или confirm.

---

### Срез 3 — Утеря / уничтожение + замена (UI)

**Зачем:** закрыть I-13 end-to-end.

| Задача | Детали |
|--------|--------|
| Действие «Книга утеряна / уничтожена» | Confirm → `markSpellbookLost` + `in_spellbook=false` у leveled |
| После утери | Toast: подготовленные и заговоры кастуются; подготовка/ритуал/add — нет |
| PrepareSpeellsDialog | Block + причина, если `bookLost` |
| Замена | Выбрать пустую книгу (slug `spellbook`) → `beginReplacementSpellbook` → restore prepared с оплатой own-тарифа |
| Список lost contents | Read-only для мастера/игрока («что было») |

**Файлы:** новый `SpellbookManageDialog` (или секция в SpellsSettings), `PrepareSpellsDialog`, `CastSpellDialog`.  
**Приёмка:** утеря → нельзя переподготовить; каст prepared ок; купить пустую → restore 1 prepared за 10 зм/ур. → снова prepare.

---

### Срез 4 — Бэкап своей книги (UI)

**Зачем:** функция «создать копию своей книги».

| Задача | Детали |
|--------|--------|
| Действие «Сделать запасную книгу» | Нужны primary + blank spellbook item |
| Калькулятор | `totalCopyCost(..., 'own')` + preview gp/hours |
| Оплата | `spendGpFromPurse`; fail → message |
| Результат | `registerBackupBook`; spells в backup не обязаны дублировать sheet rows — достаточно registry + optional note |
| Activate backup | После утери: «Взять запасную» → `activateBackupAsPrimary` |

**Приёмка:** бэкап за правильную сумму; утеря → activate backup → prepare снова доступна без restore memory.

---

### Срез 5 — Ритуал из книги + гейты каста

**Зачем:** PHB ritual casting без prepare.

| Задача | Детали |
|--------|--------|
| Cast ritual | Wizard + ritual in book (`in_spellbook`) + !prepared → allow without slot if `hasBook` |
| Без книги | Ritual-from-book запрещён; prepared ritual — как обычный prepared |
| Wire catalog flag | `ritual_cast_without_prepare` или wizard-only rule |

**Файлы:** `CastSpellDialog`, play-desk cast path, `SpellsPanel`.  
**Приёмка:** Detect Magic в книге, не prepared, книга есть → ritual cast; книга lost → нельзя.

---

### Срез 6 — Savant / Quill из подкласса

**Зачем:** цены в UI совпадают с традицией.

| Задача | Детали |
|--------|--------|
| Detect savant school | Из `wizard_2014` feature id / subclass slug |
| Detect Quill | Order of Scribes feature unlocked |
| Pass `mods` | В `resolveSpellbookAddPayment` / Grimoire preview |

**Приёмка:** Evocation wizard — Fireball копия ×½; Scribes — 0 зм + минуты в toast.

---

### Срез 7 (стык) — Свитки I-17

Минимальный стык: «внести из свитка» = foreign copy + consume scroll item. Полный каталог свитков — отдельная фича.

---

## 5. Модель данных (целевая)

```
spells.wizard_spellbook
  primaryBookItemId: string | null
  bookLost: boolean
  lostBookContents?: { catalog_id, name, level }[]
  backupBookItemIds?: string[]

SheetSpell (leveled, wizard)
  spellbook_acquisition?: starting | level_up | copied | restored | backup_copy
  in_spellbook?: boolean
```

Инвариант: заговоры без `in_spellbook`; prepared переживает утерю; add/prepare/ritual-from-book требуют активную книгу.

---

## 6. UX-контракт (сообщения)

| Событие | Сообщение (смысл) |
|---------|-------------------|
| Free add | «В книгу · Бесплатно (стартовая / исследование)» |
| Paid ok | «В книгу за N зм · H ч · −N зм · осталось ≈ M зм» |
| No gold | «Недостаточно золота: нужно X зм, есть Y зм» |
| No purse wiring | «Нужно N зм в кошельке персонажа…» |
| Book lost + add | «Книга утеряна — нельзя вносить…» |
| Book lost + prepare | «Нужна книга заклинаний для подготовки» |
| Ritual no book | «Ритуал из книги недоступен без книги» |

Тема/кнопки — UI Kit (Листва / chips), без новых палитр.

---

## 7. Порядок внедрения и зависимости

```
Срез 0 (done) ──► 1 Create/Level-up
                │
                ├──► 2 Inventory bind ──► 3 Lose/Replace UI ──► 4 Backup UI
                │
                └──► 5 Ritual gates
                         │
                         └──► 6 Savant/Quill
                                  └──► 7 Scrolls stitch (I-17)
```

Рекомендация: **1 → 2 → 3** подряд (закрывают I-13/I-16 для игрока); 4 и 5 можно параллелить после 2–3; 6 — полировка; 7 — отдельный PR.

Деплой только с ветки, содержащей live prod tip + merge tip перед релизом.

---

## 8. Тесты / проверки

| Уровень | Что |
|---------|-----|
| Selfcheck | Тарифы, free/paid payment, spend/insufficient, lose/replace (уже) |
| Selfcheck+ | remaining free after mixed acquisition; ritual access matrix |
| Ручной smoke | Create wizard → 6 free; paid copy; empty purse; header coins update |
| После среза 3 | Lose → prepare blocked → replace → prepare ok |

---

## 9. Критерии «фича готова» (Definition of Done)

1. Волшебник не может бесплатно бесконечно наполнять книгу (I-16).  
2. Level-up даёт ровно +2 free в книгу при наличии книги (I-13).  
3. Платные копии списывают кошелёк; при нехватке — информирование, без записи.  
4. Утеря книги ломает prepare/ritual-from-book/add, не ломает cast prepared + cantrips.  
5. Есть путь замены (restore prepared и/или activate backup).  
6. Спека и PRODUCT_STATUS обновлены; selfcheck зелёный; на проде только после tip-merge + preflight.

---

## 10. Открытые вопросы к Игорю

1. При удалении книги из инвентаря — сразу `bookLost` или confirm «Утеряна»?  
2. Бэкап хранит полный дубликат заклинаний или только факт «есть запасная книга» + restore с primary? (сейчас engine — registry id)  
3. На create сверх 6 free — разрешать paid сразу или только после появления на листе с монетами?  
4. Показывать время копии (часы) только в toast или ещё трекать downtime?
