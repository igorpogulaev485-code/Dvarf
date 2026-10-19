# Инцидент overwrite — 2026-10-17

**Читать перед любым деплоем сеттинга, листа, classic или tablet.**  
Связанные правила: [`AGENTS.md`](../AGENTS.md) · skill [`dvarf-prod-lineage`](../.cursor/skills/dvarf-prod-lineage/SKILL.md) · [`CLASSIC_SHEET_PROD.md`](CLASSIC_SHEET_PROD.md) · [`deploy/README.md`](../deploy/README.md).

---

## Что случилось

Около **05:33–05:39 UTC** на Timeweb залили tip `cursor/setting-t5-journal-table-c440`.  
`deploy/sync-and-up.sh` **полностью заменил** `/opt/dvarf`. С прода пропали:

| Контур | Было (tip classic/tablet) | Стало (после T5) |
|--------|---------------------------|------------------|
| Интерактивный лист / Play Desk | ~145 файлов `characters/`, шапка планшета, hot-bar | ~30 файлов, нет `PlayDeskHeader` / `PlayDeskHotBar` |
| Классический лист | 17 файлов, 2014+2024/LSS, карточки, parity | 3 файла (тонкий P1–P2) |
| Сеттинг C5–T5 | не на той линии | **появился** (QuickCreate, reveal, lore…) |

Код **не удалён из git** — лежал в `cursor/classic-2014-p1-visual-8bfd`. На диске VPS его перезаписали.

---

## Почему так вышло (корневые причины)

1. **Две линии tip.** Classic/tablet росли от живого tip. Сеттинг C5–T5 собирали от **устаревшего** `setting-c4-embeds`, пока в feature-ветках всё ещё писали «tip = C4».
2. Перед деплоем T5 влили «prod tip C4», а **не** живой tip classic — `classic`/`tablet` **не ancestors** of T5.
3. Preflight требовал только `ClassicPrintSheet.tsx` (тонкий файл есть и в T5) — **не ловил** потерю Play Desk / ClassicPrint2024.
4. `sync-and-up` делает full replace → любой «успешный» деплой тонкой линии = катастрофа.
5. Сами доработки сеттинга были **хорошие** — сломал не код C5–T5, а **способ деплоя** мимо live tip.

---

## Правильные доработки (сами по себе ок)

| Слайс | Вердикт | Условие |
|-------|---------|---------|
| Планшет / hot-bar (`tablet-header-hotbar-ship`) | ок | жить на **том же** tip, что Play Desk |
| Classic 2014/2024 (`classic-2014-p1-visual`) | ок как бланк | тот же tip + parity к `sheet` / Play Desk |
| Сеттинг C5–T5 | ок как продукт | **вливаться в live tip**, никогда не деплоиться своей параллельной линией |

**Правило Игоря:** доработки сеттинга/classic можно и нужно делать — **но они не имеют права ломать прод**. Деплой = merge в live tip → preflight → один sync.

---

## Исправление (факт)

Ветка `cursor/restore-sheet-classic-setting-3d0d`:

- база = classic tip (Play Desk + classic + tablet header/hot)
- merge = setting T5 (C5–T5)
- alembic: убрана коллизия `n5o6` (D1 vs C5), idempotent `u7v8w9x0y1z2`, `b7c8` → `a6b7`
- новый единый tip после деплоя

**Проверено на VPS (после restore):**

| Проверка | Результат |
|----------|-----------|
| `/health` | `{"status":"ok"}` |
| Prod tip на диске | `cursor/restore-sheet-classic-setting-3d0d` |
| `characters/*.tsx` | 90 |
| `classicSheet/*` | 17 |
| Маркеры | PlayDeskHeader, PlayDeskHotBar, ClassicPrint2024, SettingQuickCreate |
| Маршрут classic | `/characters/:characterId/classic` в `App.tsx` |
| Ссылка с карточки | `CharacterDetailPage` → `/classic` |
| Alembic | `u7v8w9x0y1z2 (head)` |

---

## Что закрепили в tooling / docs

1. `deploy/preflight-prod.sh` — обязательны `PlayDeskHeader`, `PlayDeskHotBar`, `ClassicPrint2024`, classic layout/fonts/weapons/cards, T1–T5 мосты; **floor** counts characters≥80, classicSheet≥10.
2. `deploy/preflight-live.sh` — live disk markers для Play Desk / classic / setting; сравнение counts live vs tree (нельзя залить меньше, чем уже на диске).
3. `AGENTS.md` + skill `dvarf-prod-lineage` — запрет второй линии tip; skip preflight только с ok Игоря.
4. Этот файл + [`CLASSIC_SHEET_PROD.md`](CLASSIC_SHEET_PROD.md) — контракт classic↔прод и чеклист агента.

---

## Запреты (чтобы ошибок больше не было)

| # | Запрет | Почему |
|---|--------|--------|
| 1 | Деплоить сеттинг/classic/tablet с ветки, где live tip **не** ancestor | overwrite чужих контуров |
| 2 | Верить tip из своей устаревшей копии AGENTS | tip читается **с VPS** |
| 3 | Считать «есть ClassicPrintSheet.tsx» = полный classic | нужен ClassicPrint2024 + ≥10 файлов |
| 4 | `DVARF_SKIP_PREFLIGHT` / `SKIP_LIVE` без ok Игоря | обход защиты |
| 5 | Писать в PRODUCT_STATUS «на проде: да» до проверки маркеров на диске | ложный статус |
| 6 | Два агента деплоят разные tip подряд | гонка overwrite |

---

## Чеклист агента перед деплоем (коротко)

```bash
git fetch origin
# LIVE tip с VPS / AGENTS на сервере — не из своей устаревшей копии
git merge origin/<LIVE_TIP>   # без потери чужих файлов
./deploy/preflight-prod.sh
./deploy/preflight-live.sh
# characters/*.tsx ≥ 80 · classicSheet ≥ 10 · PlayDeskHotBar · ClassicPrint2024 · SettingQuickCreate
./deploy/sync-and-up.sh
curl -fsS http://201.34.132.252/health
# проверить на диске PlayDeskHeader + ClassicPrint2024 + SettingQuickCreate
```

### Если слайс = только сеттинг

1. Ветка **от live tip** (сейчас `cursor/restore-sheet-classic-setting-3d0d`).
2. Не откатывать `characters/` / `classicSheet/` «потому что сеттингу не нужны».
3. Preflight должен зелёным пройти **Play Desk + classic + setting** вместе.
4. После деплоя — три маркера на диске, не только SettingQuickCreate.

### Если слайс = classic

См. полный контракт связи с продуктом: [`CLASSIC_SHEET_PROD.md`](CLASSIC_SHEET_PROD.md).
