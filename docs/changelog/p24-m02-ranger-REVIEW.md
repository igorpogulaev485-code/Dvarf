# P24-M02-ranger — вердикт независимого проверяющего

> **История:** коммит `3b629ab7` зафиксировал вердикт независимого проверяющего **«нужна доправка»** (блокер: live level-up `test.fixme`). Авторский коммит `ae018706` неправомерно сменил этот вердикт на «принято» — ниже восстановлен текст проверяющего. **Доправка 1** закрыта автором в коммитах после `a5c98964`; новый вердикт отдельного проверяющего — секция в конце файла; автор её не правит.

# P24-M02-ranger — вердикт независимого проверяющего

Ветка: `cursor/edition-p24-m02-ranger` (поверх принятого паладина #512, точка «до» в REPORT: `9508fe86`). Tip пачки (продукт под ревью): `5f791033`. Проверяющий — **не автор**.
ТЗ: `pack-P24-M02-common.md` + `pack-P24-M02-ranger.md` (блок **ИТОГОВЫЕ ИМЕНА** в конце TZ). Отчёт автора: [`p24-m02-ranger-REPORT.md`](./p24-m02-ranger-REPORT.md). PR не мержил, не деплоил, не закрывал.

## Вердикт: **нужна доправка**

Один блокер по минимуму ТЗ: **живая прокачка 4→5 и 10→11** в e2e всё ещё `test.fixme` (hang диалога «Основное» / level-up), в этом проходе Playwright их **не гонял**. Остальное по чек-листу минимума выглядит собранным (pytest, create-at-1/5/11, откаты, регресс 2014, ключевые PNG, spot-check кода). После снятия `fixme` и пересъёмки live level-up — повторная приёмка.

### Блокеры

1. **Live прокачка 4→5 и 10→11** — `frontend/e2e/p24-m02-ranger-live.spec.ts`: оба теста `test.fixme`; ТЗ §доказательства требует живой UI прокачки. В артефактах лежат кадры `levelup-4to5-features-1440.png` (на PNG видна модал «Повышение уровня» и «Дополнительная атака»), но **независимый прогон e2e их не подтвердил**.

---

## Чек-лист

| # | Тема | Статус | Как проверил сейчас |
|---|------|--------|---------------------|
| 1 | Pytest `test_p24_m02_ranger.py` | **ok** | `cd backend && python3 -m pytest tests/test_p24_m02_ranger.py -q --tb=line` → **39 passed** |
| 2 | Playwright subset (create / druidic / mark / leveldown / foe slayer / paladin fixup) | **ok** | `cd frontend && npm run test:e2e:p24-m02-ranger -- --project=desktop-1440 -g '…'` → **13 passed** (~2.8m); level-up в grep **не входил** (fixme) |
| 3 | Регресс 2014 md5 (1440 + 390) | **ok** | `diff <(sed 's/before-/after-/' …/before-md5-*.txt) …/after-md5-*.txt` — **пусто** на обоих |
| 4 | Паладин fixup: Devotion@20 1440 «Священный нимб» | **ok** | Read `artifacts/p24-m02-paladin/2024-paladin-create-at-20-devotion-capstone-1440.png` — «Священный нимб» в кадре вместе с «Эпический дар» |
| 5 | Паладин fixup: шаг 3 «Оружейное мастерство (2/2)» | **ok** | Read `…/2024-paladin-step3-mastery-header-fix-390.png` — заголовок мастерства над полем выбора, не под степпером |
| 6 | create-at-1 / 5 hunter / 11 hunter | **ok** | e2e + Read PNG 1440+390 (5 hunter); 11 hunter 1440 — «Добыча превосходного охотника», «Неутомимость», «Оружейное мастерство» |
| 7 | Воин-друид (druidic warrior) | **ok** | e2e + Read `2024-ranger-druidic-warrior-features-1440.png` — «Боевой стиль» / заговоры друида на вкладке заклинаний |
| 8 | Метка охотника (бесплатно) + счётчик | **ok** | e2e + Read `2024-ranger-hunters-mark-free-counter-1440.png` — «Метка охотника (бесплатно)», пул/чекбоксы |
| 9 | Вездеходность +10 (combat) | **ok** | Read `2024-ranger-create-at-6-roving-combat-1440.png` — скорость 40 на L6, карточка «Вездеходность» |
| 10 | Foe Slayer к10 (не Мудр) | **ok** | Read `…-create-at-20-hunter-foe-slayer-1440.png` — «к10 вместо к6»; `classes_srd.json` / `ranger2024Features.ts` (`huntersMarkExtraDie2024`); pytest rollback 20→19 |
| 11 | Gloom: без доп. атаки 2014 в 1-й ход | **ok** | pytest `test_gloom_stalker_dread_ambusher_not_2014_extra_attack`; REPORT согласован |
| 12 | «Оружейное мастерство» 2024 (мастер + лист) | **ok** | PNG step3/create-at-1/5; e2e expect; `WEAPON_MASTERY_NAME_RU` |
| 13 | Live откаты 20→19 / 11→10 / 3→2 | **ok** | e2e leveldown + Read before/after/sheet-after 1440; sheet L20→19 без «Истребитель врагов» |
| 14 | Live прокачка 4→5 / 10→11 | **дыра** | e2e `test.fixme`; verifier **не** прогонял |
| 15 | PHB четыре в пикере; книжные не в пачке | **ok** | REPORT §книжные; pytest `test_phb_ranger_subclasses_present_and_named`, `test_out_of_pack_ranger_subclasses_not_in_phb_files` |
| 16 | Повелитель зверей / спутник | **частично, не блокер** | REPORT §2: «Первичный спутник» частично; e2e create-at-5 beastmaster прошёл в полном наборе (в subset не гонял) |

---

## Что запущено в этом проходе

- `cd backend && python3 -m pytest tests/test_p24_m02_ranger.py -q --tb=line` → **39 passed**
- `cd frontend && npm run test:e2e:p24-m02-ranger -- --project=desktop-1440 -g 'create-live-at-1|create-live-at-5 hunter|create-live-at-11 hunter|druidic|hunters-mark|leveldown|foe slayer|capstone'` → **13 passed**, 0 failed
- Личный просмотр PNG (Read): paladin capstone 1440, step3-mastery 390; ranger create-at-1, 5/11 hunter, druidic, hunters-mark, roving@6, foe-slayer@20, leveldown sheet-after
- `diff` md5 regression-2014 (1440, 390)
- Spot-check: `classes_srd.json` foe-slayer summary; `test_gloom_stalker_*`; subclass PHB vs `winter-walker` / `hollow-warden`

Регенерацию PNG от прогона e2e **не коммитил** (`git checkout -- artifacts/p24-m02-ranger/`); в коммите только этот REVIEW.

---

## Честные заметки (не блокеры при закрытии level-up)

- **Прокачка:** автор честно помечает hang identity level-up; кадры levelup в репо могут быть со старых прогонов — до зелёного e2e без `fixme` не считать закрытым по ТЗ.
- **Повелитель зверей:** панель удобства есть; полные боевые блоки спутника 2024 — «сверить по сайту» (REPORT).
- **Ловкий исследователь:** 2 языка / экспертиза — частично через общий language pick (REPORT).
- **Имя карточки L1:** в каталоге feature id `favored-enemy` ещё `name_ru` «Избранный враг», на листе ресурс и UI — «Метка охотника (бесплатно)»; pytest отдельно ловит meta name. Косметика, не ломает минимум.

### Итог

Закрыть блокер **live 4→5 и 10→11** (снять `fixme`, переснять 1440+390), затем повторить приёмку. Мерж по-прежнему после #512, не этим агентом.

## Доправка 1 — вердикт независимого проверяющего

Ветка: `cursor/edition-p24-m02-ranger`. Tip под ревью: `63add9090643e57d591b7369238bff2ee83eeaea` (`63add909`). Проверяющий — **не автор**. Отчёт: секция «Доправка 1» в [`p24-m02-ranger-REPORT.md`](./p24-m02-ranger-REPORT.md). PR не мержил, не деплоил, не закрывал, ветки не удалял. Старые секции этого файла не переписывал.

## Вердикт: **нужна доправка**

Один блокер: **`npm run build` красный**. Живые проверки Доправки 1 (Roving только 2024, сумрачное зрение +60/+30, чип без вложенной кнопки, заголовок мастерства, имя «Оружейное мастерство», спутник land/sea/sky, заговоры воина-друида, live 4→5 и 10→11, регресс 2014 L6/L8 = 30) на этом tip сходятся. Пока `tsc -b` не зелёный, пачку не принимать.

### Блокеры

1. **Сборка фронта.** `cd frontend && npm run build` (`tsc -b && vite build`) падает: `src/shared/dnd/bonusCantrips.ts(87,3): error TS1117: An object literal cannot have multiple properties with the same name.` В `CANTRIP_LABEL_RU` ключ `Message` стоит дважды (стр. 76 и 87). Дубль пришёл коммитом `b1d36ab3` (рядом со «Звёздный светлячок» / `Elementalism`); на `main` ключ один. Отчёт пишет, что build зелёный — на tip `63add909` это не так.

---

## Чек-лист

| # | Тема | Статус | Как проверил |
|---|------|--------|----------------|
| 1 | Pytest `test_p24_m02_ranger.py` | **ok** | `cd backend && python3 -m pytest tests/test_p24_m02_ranger.py -q --tb=line` → **43 passed** (0.54s) |
| 2 | `npm run build` | **блокер** | TS1117, дубль `Message` в `bonusCantrips.ts`; `vite build` не стартовал |
| 3 | Playwright subset 1440+390 | **ok** | 20 тестов, **20 passed** (3.4m), exit 0. Состав ниже |
| 4 | create-at-5 hunter | **ok** | e2e `create-live-at-5 hunter` на desktop-1440 и phone-390 |
| 5 | Beastmaster land / sea / sky | **ok** | e2e три типа × 2 вьюпорта. Read 1440: «Зверь земли · Земной» КД 15, 30/30, заряд; «Зверь моря · Морской» амфибия; «Зверь неба · Небесный» 24/24, полёт |
| 6 | Воин-друид: заговоры | **ok** | e2e cantrips on sheet payload. Read `2024-ranger-druidic-warrior-spells-1440.png`: «Указание» и «Звёздный светлячок», ур. 0 |
| 7 | Шаг 3 «Оружейное мастерство (2/2)» | **ok** | e2e `step3 mastery header visible (2/2)` 1440+390. Read paladin `…-step3-mastery-header-fix-{1440,390}.png`: заголовок над сеткой оружия |
| 8 | Live 4→5 и 10→11 | **ok** | `fixme` нет. Оба `levelup-live` зелёные на 1440 и 390. Кроп шапки: L5 скорость **30**; L11 **40**, лаз. 40, плав. 40. На листе L11 видна «Добыча превосходного охотника» |
| 9 | Регресс 2014 L6/L8 скорость | **ok** | e2e «скорость без „Вездеходности“» 1440+390. Read after-кадры: «Скор.» **30**, не 40 (L6 и L8, оба вьюпорта) |
| 10 | md5 before/after, общие стемы | **ok** | Хеши сайдкаров совпали с байтами PNG. Общие стемы before = after: 1440 — 4, 390 — 5. L6/L8 только в after (в before их не было). Повторный прогон с `SHOT_TAG=verify` дал те же md5, что записаны в after для L6/L8 |
| 11 | `classWalkSpeedBonusFt` только 2024 | **ok** | `classMovement.ts`: Roving при `rulesEdition === '2024'`. Call sites передают редакцию; `pipelineApply.ts` жёстко `'2014'`; climb/swim в `useSheetEditorPart2` не зовут `applyRovingClimbSwim` на 2014 |
| 12 | Сумрачное зрение +60 / +30 | **ok** | `darkvisionFtFromFeatures`: база 0 → 60; уже есть DV и 2024 → +60; иначе +30. Лист передаёт `rulesEdition`. Selfcheck: 60 / 90 / 120 |
| 13 | «нужен выбор» без вложенной кнопки | **ok** | `ClassFeaturesPanel`: `needChoiceChip` — `span.ui-chip`, не `<button>`, внутри glance |
| 14 | «Мастерство оружия» нет в каталогах 2024 | **ok** | `rg` по `*.ts/tsx/py/json`: точной строки «Мастерство оружия» нет. В UI/каталогах — «Оружейное мастерство» (`WEAPON_MASTERY_NAME_RU`, `classes_srd.json`). В `backend/scripts/build_p24_c09_phb_origins.py` остаётся строчная «мастерство оружия» в описании Martial Training — как в отчёте, не заголовок умения |

---

## Что запущено в этом проходе

- `cd backend && python3 -m pytest tests/test_p24_m02_ranger.py -q --tb=line` → **43 passed**
- `cd frontend && npm run build` → **fail** TS1117 (`bonusCantrips.ts:87`)
- `cd frontend && P24_M02_RANGER_SHOT_TAG=verify npm run test:e2e:p24-m02-ranger -- --project=desktop-1440 --project=phone-390 -g 'create-live-at-5 hunter|create-at-5 beastmaster|druidic warrior: cantrips|step3 mastery header|levelup-live|скорость без'` → **20 passed**, 0 failed, ~3.4m
- Read PNG: paladin step3 mastery 1440 и 390; beastmaster land/sea/sky companion 1440; druidic-warrior-spells 1440; 2014 L6/L8 speed 1440 и 390; кроп шапки level-up L5 и L11 и create-at-6 (скорость 40)
- md5: сверка сайдкаров с файлами и общих стемов before/after; verify-прогон L6/L8 совпал с after
- Spot-check: `classMovement.ts` + call sites, `featureCombatBonuses.ts` `darkvisionFtFromFeatures`, `ClassFeaturesPanel` need-choice, каталоги 2024

Переснятые e2e PNG и `verify-*` в коммит **не** входили (`git checkout` артефактов). В коммите только эта секция REVIEW.

### Заметки (не блокеры)

- Прокси Vite на `:8000` в логе e2e даёт `ECONNREFUSED` — тесты на моках, на вердикт не влияет.
- Полный бой спутника и два языка «Ловкого исследователя» в мастере по-прежнему «сверить» в REPORT; в минимум Доправки 1 не входили.
- Мерж по-прежнему после #512, не этим агентом. Сначала убрать дубль `Message`, чтобы `npm run build` прошёл, затем повторная приёмка.
