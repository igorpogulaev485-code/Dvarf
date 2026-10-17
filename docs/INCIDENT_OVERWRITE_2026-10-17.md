# Инцидент overwrite — 2026-10-17

## Что случилось

Около **05:33–05:39 UTC** на Timeweb залили tip `cursor/setting-t5-journal-table-c440`.  
`deploy/sync-and-up.sh` **полностью заменил** `/opt/dvarf`. С прода пропали:

| Контур | Было (tip classic/tablet) | Стало (после T5) |
|--------|---------------------------|------------------|
| Интерактивный лист / Play Desk | ~145 файлов `characters/`, шапка планшета, hot-bar | ~30 файлов, нет `PlayDeskHeader` / `PlayDeskHotBar` |
| Классический лист | 17 файлов, 2014+2024/LSS, карточки, parity | 3 файла (тонкий P1–P2) |
| Сеттинг C5–T5 | не на той линии | **появился** (QuickCreate, reveal, lore…) |

Код **не удалён из git** — лежал в `cursor/classic-2014-p1-visual-8bfd`. На диске VPS его перезаписали.

## Почему так вышло

1. **Две линии tip.** Classic/tablet росли от живого tip. Сеттинг C5–T5 собирали от **устаревшего** `setting-c4-embeds`, пока в AGENTS feature-веток всё ещё писали «tip = C4».
2. Перед деплоем T5 влили «prod tip C4», а **не** живой tip classic — `classic`/`tablet` **не ancestors** of T5.
3. Preflight требовал только `ClassicPrintSheet.tsx` (тонкий файл есть и в T5) — **не ловил** потерю Play Desk / ClassicPrint2024.
4. `sync-and-up` делает full replace → любой «успешный» деплой тонкой линии = катастрофа.

## Правильные доработки (сами по себе ок)

- **Планшет / hot-bar** (`tablet-header-hotbar-ship`) — ок, должны жить на tip.
- **Classic 2014/2024** (`classic-2014-p1-visual`) — ок как бланк; обязан быть на **том же** tip, что и Play Desk, с parity к `sheet`.
- **Сеттинг C5–T5** — ок как продукт; обязан **вливаться в live tip**, а не деплоиться своей линией.

## Исправление

Ветка `cursor/restore-sheet-classic-setting-3d0d`:

- база = classic tip (Play Desk + classic + tablet header/hot)
- merge = setting T5 (C5–T5)
- новый единый tip после деплоя

## Что закрепили в tooling / docs

1. `deploy/preflight-prod.sh` — обязательны `PlayDeskHeader`, `PlayDeskHotBar`, `ClassicPrint2024`, classic layout/fonts/weapons/cards, T1–T5 мосты; **floor** counts characters≥80, classicSheet≥10.
2. `deploy/preflight-live.sh` — live disk markers для Play Desk / classic / setting; сравнение counts live vs tree (нельзя залить меньше, чем уже на диске).
3. `AGENTS.md` + skill `dvarf-prod-lineage` — запрет второй линии tip; skip preflight только с ok Игоря.
4. Этот файл — для агентов: читать перед любым деплоем сеттинга/листа.

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
