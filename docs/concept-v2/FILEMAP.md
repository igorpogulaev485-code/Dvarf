# Карта файлов пакета и исходников на диске

Архив для показа Игорю: `/workspace/dark-theme-concept/production-package.zip`.  
Каталог документов: `/workspace/dark-theme-concept/production-package/`.

В Dvarf из этого хода ничего не пушилось. Полные эталонные PNG (~1.1 ГБ) в zip не дублировались целиком: в архиве — документы, каталог all-html, контакт-листы, CSS/SVG/шрифты концепта, ключевые кадры к20 и подложек, копии журналов. Остальные эталоны остаются на диске по путям ниже и должны копироваться в `docs/concept-v2/` при запуске проекта (этап 0).

## Что внутри `production-package/` и архива

| Путь в пакете | Содержание |
|---|---|
| `README.md` | вход, порядок чтения |
| `RULES.md` | жёсткие правила, включая главное правило 10:01 и правило к20/подложек 10:02 |
| `CHECKLIST-FUNCTIONS.md` | шаблон чек-листа этапа |
| `SCREENS.md` | полный реестр экранов |
| `DICE.md` | кубик C, исходники, кадры состояний, общий файл-эталон |
| `BACKGROUNDS.md` | подложки, тайлы, кадры, общий файл-эталон |
| `UIKIT.md` | токены, шапка, панель, кнопки, шрифты |
| `ETALONS.md` | md5 и папки эталонов |
| `PROJECT-BRIEF.md` | текст задания проекту |
| `FILEMAP.md` | этот файл |
| `catalog/` | оглавление 145 страниц `kried20-concept-all.html` (без встроенного HTML) |
| `contact-sheets/` | три страницы обзора утверждённых экранов |
| `assets/` | копии CSS, SVG подложек, шрифтов концепта, `DICE-ICON.md`, ключевые PNG, журналы |

`css/shared-approved.css` уже есть в корне концепта (22.11.2026, около 10:09, Екатеринбург, UTC+5) и скопирован в `assets/css/shared-approved.css`. Подключать после CSS темы и `css/mobile-chars-nav.css`. В `docs/concept-v2/` класть этот файл. Не плодить вторую копию «почти такого же» кубика или фона.

## Полные эталоны на диске (не все скопированы в zip)

База: `/workspace/dark-theme-concept/`.

- HTML: `sheet-desktop.html`, `sheet-mobile.html`, `kried20-concept-all.html`, `creation.html`, `classic.html`, `proto-mobile-nav.html`, `onboarding-appearance.html`, `html/`, `_src_classic/`, `_src_creation/`, `_src_sheet_mobile/`
- CSS/SVG/шрифты: `css/`, `svg/bg-*.svg`, `fonts/`
- Журналы: `CONCEPT.md`, `DECISIONS.md`, `PRODUCTION-PLAN.md`, `MOBILE-FINAL.md`, `creation-plan.md`, `classic-plan.md`, `classic-handoff.md`, `lobby-plan.md`, `bpmn/`, `notes/`
- ПК-лист: `png/step1-header` … `png/step9-system`, `png/scenes-v2`
- Мобильный лист: `png/sheet-mobile/` (включая `mobile-final-contact.png`)
- Создание: `png/creation/`
- Классика, текущие эталоны: `png/classic/etalon-p1-step1e/`, `etalon-2014-step8/`, `etalon-2014-step3b/` (история), `etalon-2024-step4c/`, `etalon-companions-step5/`, `etalon-notes-step6/`, `etalon-pdf-step7/`
- Оболочка и оформление: `png/desktop-*`, `png/mobile-*`, `png/onboard-appear-*`, `png/bg-*`, `png/font-*`

## Не считать эталоном и не класть в репо как принятое

- `lobby.html`, `css/lobby-step1.css`, `js/lobby-step1.js`, `lobby/`, `png/lobby/` — шаг 1 в работе, не принят. Папку `lobby/` этот пакет не менял.
- `css/mobile-chars-nav.css` правила `.fab-dice` 56×56 / 28px — антиэталон кубика.
- `png/creation/dice-fix/before/`, `before-dice/`
- `node_modules/`, архивные промежуточные шаги классики (кроме папок `etalon-*`), секреты, мир Who.

## Три замороженных md5

См. `ETALONS.md`. Файлы эталонов этим пакетом не перезаписывались.
