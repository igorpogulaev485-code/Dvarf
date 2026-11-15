# COMP-01 — сцена «Напарники»

Ветка: `cursor/ux-COMP01-companions-51af` · база `main` (`55e2b887`) · **не мержить** без Игоря.

Старт после влитых #403 MAG-01, #405 EXP-01, #404 SOC-01. Их файлы не переписывали (узкие исключения только в `CastSpellDialog` / `PlayDeskScenes`).

## Статус

Сделано: взгляд карточки → «Изменить» (на 390 — `Dialog`), пустое состояние по классу, «Отпустить» / «Призвать снова», 0 хитов (призыв исчезает, архетип «повержен»), фамильяр со статами/`speed_fly`, галка «Компонент есть» (`ToggleChip`), атаки зверя/скакуна в «Бою», фамильяр в «Бою» без атаки.

## MAG-01 пункты (не делали)

На свежем `main` @ `55e2b887` (уже с #403): ложный тост «Существо не выбрано», ошибка «Архетип не записан», счётчик «изв. 0/3» после «Заполню на листе» — **в COMP-01 не трогали**; при съёмке каста фамильяра и боя эти симптомы **не воспроизводились** как блокеры сцены «Напарники».

## Ключевые файлы

- `frontend/src/features/characters/CompanionsPanel.tsx` — UI сцены
- `frontend/src/features/characters/companionBackfill.ts` — «повержен», vanish, prune
- `frontend/src/features/characters/familiarForms.ts` — `speed_fly` / статы формы
- `frontend/src/features/characters/CastSpellDialog.tsx` — только `ToggleChip` «Компонент есть»
- `frontend/src/features/characters/companionAttacks.ts` / `bestiaryCompanionStats.ts` / `companionTemplates.ts` — атаки в «Бою»
- `frontend/src/features/characters/companionsEmptyHint.ts` + узкий проп в `PlayDeskScenes.tsx`
- `frontend/src/styles/06-companions-features.css` — под `.companions-panel` / `.companion-card`
- `frontend/src/features/characters/companionsComp01.selfcheck.ts`
- `frontend/scripts/comp01-capture.mjs`, `backend/scripts/seed_comp01_chars.py`

## Таблица кадров

| Пункт | Кадр | Что видно |
|-------|------|-----------|
| Пустое · волшебник | `comp-empty-wizard-{1440,390}` | «Нет фамильяра», кнопка «Поиск фамильяра», без фильтров/lede |
| Пустое · друид / generic | `comp-empty-druid-*`, `comp-empty-generic-*` | фраза под класс / «+ Добавить» |
| Карточка взглядом | `comp-card-view-{ranger,fam,druid,steed}-{1440,390}` | хиты x/макс, КД, скорость, атака, команда |
| Правка | `comp-card-edit-1440`, `comp-card-edit-dialog-390` | поля; на 390 — окно |
| Отпустить / снова | `comp-dismiss-*`, `comp-resummon-*` | «не призван», «Призвать снова» |
| 0 хитов | `comp-0hp-summon-{fam,steed}-*`, `comp-0hp-beast-ranger-*` | призыв исчез / зверь «повержен» |
| Фамильяр каст | `comp-fam-cast-block-before`, `comp-fam-component-check-1440` | «Нет компонента…» + `ToggleChip` «Компонент есть» → Каст |
| Фамильяр создан | `comp-fam-created-{1440,390}` | карточка с хитами/КД/полётом |
| Бой | `comp-combat-{steed,ranger,fam}-{1440,390}` | «Копыта»; «Укус» зверя; у фамильяра атаки нет |
| Шапка / сцены | `hdr-pair-{1440,390}`, `scene-block-pair-1440` | контроль; шапку не трогали → **0 px** |

md5 ключевых кадров — в `/opt/cursor/artifacts/comp01-md5s.txt` (переснять при необходимости через `comp01-capture.mjs`).

## Миграции

нет

## Что не сломалось

- Шапка: не меняли (док спутника на месте)
- Хот-панель, сцены, левая панель, кара / действия хода — не трогали
- «Исследование» / «Общение» / MAG-блоки — без правок их файлов
- Кнопка D&D 2024 не вернулась
- Selfcheck: `companionsC01/C02/C03`, `familiarForms`, `mag01Magic`, `comp01-companions` — ок
- `npm run build` — ок

## Вопросы (правила 2014)

1. **Гомункул** (инфузия изобретателя) при 0 хитов: оставили как архетипный слот («повержен»), не как призыв. Ок?
2. **Дикий спутник** при «Призвать снова» открывает вилку Дикого облика (не `restoreCompanion`). Ок ли, что это тратит использование Дикого облика заново?

## Проверки

- `npm run build` — ок
- `selfcheck:comp01-companions` + C01/C02/C03 + familiarForms + mag01 — ок
- Локальный pytest в этой среде — collection errors из‑за неполной схемы БД стенда (миграции каталога), к слайсу не относится
