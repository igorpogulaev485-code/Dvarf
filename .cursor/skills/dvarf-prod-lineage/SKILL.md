---
name: dvarf-prod-lineage
description: Prevent prod overwrite regressions on Dvarf Timeweb. Use before any deploy, when branching for prod work, when another agent may have shipped, or when updating PRODUCT_STATUS about live features.
---

# Dvarf — prod lineage (анти-overwrite)

## Почему это существует

`deploy/sync-and-up.sh` **заменяет всё дерево** на VPS (`/opt/dvarf`, кроме `.env`).  
Деплой с ветки без кабинета/листа/лобби = эти фичи **исчезают с прода**, даже если код жив в другом PR.

Инциденты 2026-10-06: аватар, кабинет, лист P1–P6, classic — затирались деплоями с параллельных развилок. Код в git оставался; прод терял UI.

## Hard rules

1. **Никогда не деплой** с ветки, у которой `HEAD` не является потомком текущего **prod tip**  
   (`git merge-base --is-ancestor <tip> HEAD`). Preflight это проверяет жёстко.
2. **Перед деплоем** всегда: `./deploy/preflight-prod.sh` (его же вызывает `sync-and-up.sh`).  
   Падает и без tip-ancestry, и без маркеров mobile/desktop/lobby/cabinet/sheet.
3. **Один tip** — одна линия накопления. Новый успешный деплой-слайс обновляет tip в:
   - `deploy/prod-tip` ← источник для скриптов
   - `AGENTS.md`
   - этот skill
   - `deploy/README.md`
   - `PRODUCT_STATUS.md` (история + «Сейчас в продукте»)
4. **PRODUCT_STATUS** писать только после проверки живого сервера (бандл/диск/API). Не копировать «на проде: да» из другой ветки вслепую.
5. Параллельные агенты: ветки от tip; на сервер — только после merge tip (или merge друг в друга), **один** деплой.
6. **Опоздавший слайс** (mobile после desktop или наоборот): сначала `git merge origin/<prod-tip>` в свою ветку, сохранить оба контура, и только потом деплой. Деплой «моей старой tip-линии» поверх новой = wipe (инцидент 2026-10-12: desktop catch-up затёр mobile tip).

## Текущий prod tip

```text
cursor/play-desk-merge-mobile-e788
```

Дублируется в [`deploy/prod-tip`](../../../deploy/prod-tip).  
Реестр маркеров: [`docs/FEATURE_LOCK.md`](../../../docs/FEATURE_LOCK.md) — preflight парсит «Machine locks».  
URL: http://201.34.132.252/

Обновляй **все** tip-строки (включая `deploy/prod-tip`), когда tip сменился после твоего деплоя.  
Новый неубиваемый контур на проде → строка в FEATURE_LOCK в том же PR.

## Как начать слайс, который может попасть на прод

```bash
git fetch origin
git checkout -b cursor/<descriptive>-acbe origin/cursor/play-desk-merge-mobile-e788
# если tip уже другой — подставь актуальный из deploy/prod-tip / AGENTS.md
```

Если ветка уже есть и отстала:

```bash
git fetch origin
git merge origin/cursor/play-desk-merge-mobile-e788
# разрешить конфликты, НЕ выкидывать чужие фичи
./deploy/preflight-prod.sh
```
## Обязательные маркеры (preflight)

Скрипт `deploy/preflight-prod.sh` проверяет:

1. **Tip ancestry** — `HEAD` содержит tip из `deploy/prod-tip`.
2. **Machine locks** из [`docs/FEATURE_LOCK.md`](../../../docs/FEATURE_LOCK.md) (exists/grep строки таблицы).

Если добавляешь новый «неубиваемый» контур на прод — **добавь строку в FEATURE_LOCK** в том же PR (не только в PRODUCT_STATUS).

## После деплоя (обязательно)

```bash
curl -fsS http://201.34.132.252/health
# бандл: есть строки твоего слайса И чужих контуров (Лобби, Опасная зона, Концентрация:, Классический лист, …)
# на диске VPS: маркеры preflight = YES
```

Потом обнови `PRODUCT_STATUS.md`. Если tip сменился — обнови tip-строки во всех четырёх местах выше.

## Что делать, если уже затёрли

1. Не деплоить «починку» с ещё одной тонкой ветки.
2. Взять последний хороший tip + недостающие коммиты/файлы (как `restore-*-acbe`).
3. Preflight → деплой → проверка маркеров → PRODUCT_STATUS.

## Связанные файлы

- [`AGENTS.md`](../../../AGENTS.md) — короткий контракт
- [`deploy/README.md`](../../../deploy/README.md) — как деплоить
- [`deploy/preflight-prod.sh`](../../../deploy/preflight-prod.sh) — гарды
- [`PRODUCT_STATUS.md`](../../../PRODUCT_STATUS.md) — что реально в продукте
- [`dvarf-dev-workflow`](../dvarf-dev-workflow/SKILL.md) — plan → ok → code
