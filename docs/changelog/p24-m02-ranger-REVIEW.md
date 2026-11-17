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