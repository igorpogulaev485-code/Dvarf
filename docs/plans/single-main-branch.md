# Переход на единую ветку `main`

Аудит 2026-11-11. Это план. В этом PR нет мержа в продуктовую историю, нет удаления веток, нет деплоя и нет правок сервера.

Живой prod tip на момент проверки: `cursor/ux-a1-magic-resources-8b9c` @ `44abfdbf5fbf909fab757ae08a611eade773fe67`.

Как считались числа:

- **Вперёд** — коммиты ветки, которых нет в tip (`git rev-list --count tip..branch`).
- **Назад** — коммиты tip, которых нет в ветке.
- «Целиком в tip» — `git merge-base --is-ancestor` / `git branch --merged tip` (вперёд = 0).
- Для веток с вперёд > 0 дополнительно смотрелись свои файлы (`git diff --diff-filter=A`) и эквивалентность патчей (`git rev-list --cherry-pick --right-only`). Код продуктов не читался целиком.

Репозиторий на момент fetch: 279 веток `cursor/*`, плюс `main` и `gh-pages`. Открытых PR: 265, закрытых за всё время: 9.

---

## 1. Что реально выкачено

На VPS есть дерево без `.git`, поэтому SHA коммита на диске не хранится. Идентификация — по файлам, которые деплой кладёт вместе с кодом, и по бандлу.

Проверка 2026-11-11 около 08:55 UTC, только чтение по SSH (секрет `DVARF_SSH_PRIVATE_KEY` в этом окружении был, `sync-and-up` не запускался):

| Что | На сервере |
|---|---|
| Хост | `201.34.132.252` (`9274443-ex395412.twc1.net`), каталог `/opt/dvarf` |
| `deploy/prod-tip` | `cursor/ux-a1-magic-resources-8b9c` |
| `AGENTS.md` | `Prod tip (сейчас)` = та же ветка |
| `PRODUCT_STATUS.md` | «ветка линии прода» = та же ветка; свежий блок «UX A1–A4 + Stage B medium (B6–B11)», залито 2026-11-11 |
| mtime этих файлов | 2026-11-11 08:50–08:51 UTC |
| Бандл | `CharacterDetailPage-DF768UUX.js`, `CreateCharacterPage-BJOWSggL.js` — те же имена, что в `PRODUCT_STATUS` коммита `44abfdb` |
| Alembic | `l7a8b9c0d1e2 (head)` |
| Контейнеры | `dvarf-web` и `dvarf-edge` подняты за минуты до проверки, `dvarf-api` работает ~2 недели, `dvarf-db` ~4 недели. Это выкладка фронта без новой миграции |
| Здоровье | `https://creed20.tech/health` → `{"status":"ok"}` |

Коммит `44abfdb` (2026-11-11 08:51:16 UTC, «docs: prod tip → cursor/ux-a1-magic-resources-8b9c after Timeweb ship») совпадает с этим срезом. Родительский мерж `43b8947` влил предыдущий tip `cursor/amulet-devout-bonuses-9b04`.

Поверх этого коммита других веток нет: `ux-a1` — единственный указатель на `44abfdb`.

Локальный клон до `git fetch` был старее и показывал tip `magic-initiate-feat-spells-merge-1cc0` (2026-10-22). После fetch видны амулет (2026-10-28) и сегодняшний ship. Пока агенты деплоят вручную, tip может сдвинуться снова. Перед шагом «сделать main равной tip» проверку надо повторить.

Повторная проверка владельцем:

```bash
ssh root@201.34.132.252 'echo -n "prod-tip: "; cat /opt/dvarf/deploy/prod-tip; echo; grep -n "Prod tip" /opt/dvarf/AGENTS.md | head -3; ls /opt/dvarf/frontend/dist/assets/CharacterDetailPage-*.js; docker exec dvarf-api alembic current; curl -fsS http://127.0.0.1/health; echo'
```

Ожидание на 2026-11-11: ветка `cursor/ux-a1-magic-resources-8b9c`, бандл `CharacterDetailPage-DF768UUX.js`, alembic `l7a8b9c0d1e2`, тело `/health` — `{"status":"ok"}`. Если бандл или строка tip другие, в качестве tip брать тот коммит ветки, где в `PRODUCT_STATUS.md` записан новый бандл, и заново прогнать сравнение с `main`.

---

## 2. Чем prod tip отличается от `main`

Общий предок — начальный коммит `a05ac64`. Дальше истории разошлись.

| | `main` (`2fa254d`) | tip (`44abfdb`) |
|---|---|---|
| Коммитов в ветке | 5 | 958 |
| Только в этой стороне | 4 | 957 |
| Дерево | SPA на `localStorage`, справочник рас в `src/data/races`, заготовка печатного листа | Продукт: `frontend/`, `backend/`, Docker, кабинет, Play Desk, classic, лобби, сеттинг |
| Деплой в репозитории | Заметка «Pages запрещён», скриптов Timeweb нет | `deploy/sync-and-up.sh`, preflight, Caddy, `AGENTS.md`, `PRODUCT_STATUS.md` |

`git diff --shortstat main tip`: **979 файлов, +581695 / −9053**.

Четыре коммита, которые есть только на `main`:

- `082f0f4` — печатный лист 2014
- `322036e` — карточки персонажей и деплой GitHub Pages
- `97e65f1` — справочник рас в SPA
- `2fa254d` — запрет GitHub Pages

Эти файлы на tip лежат в других путях или заменены бэкендом. Терять их как историю не нужно: они останутся в теге архива `main`. Возвращать `src/` и workflow Pages в прод нельзя — именно такая «тонкая» заливка уже стирала кабинет и лист.

`gh-pages` (3 коммита, последний `f57f7ef` 2026-10-06, «deploy: races feature from main») — отдельный указатель статического сайта. К tip он не относится. Pages в GitHub должен оставаться выключенным.

---

## 3. Ветки `cursor/*`

Сводка на tip `44abfdb`:

| Категория | Веток | Что делать |
|---|---:|---|
| Целиком в tip (вперёд = 0) | 204 | Выбросить после тега и после того, как `main` указывает на этот же коммит. Одна из них — сам tip: имя удалить последним |
| Слить точечно | 2 | Cherry-pick одного коммита в короткую ветку от нового `main`. Ветку целиком не мержить |
| Проверить у владельца | 22 | Уникальный док, макет или спорный код. Ветку в прод не мержить |
| Брошены или устарели | 51 | Удалить вместе с пачкой «уже в tip», после явного ок |

Все 6 веток `restore-*` уже внутри tip (`ahead = 0`): `restore-avatar-upload-acbe`, `restore-cabinet-acbe`, `restore-consumables-grimoire-0bc3`, `restore-sheet-classic-acbe`, `restore-sheet-classic-setting-3d0d`, `restore-wave-a-desk-0ed9`.

Открытые PR: **194 из 265** указывают головой в коммит, который уже предок tip. Ещё **88** PR имеют базу `main` (старый каркас). Их нельзя мержить ни в сегодняшний `main`, ни в `main` после подмены, пока голову заново не соберут от нового `main`.

### 3.1. Уже в tip

204 ветки, вперёд = 0, назад от 0 до 956. Это бывшие слайсы, которые вошли в линию прода последующими мержами. В том числе вчерашние tip: `magic-initiate-feat-spells-merge-1cc0` (назад 14), `amulet-devout-bonuses-9b04` (назад 11) и сам `ux-a1` (назад 0).

Полный список — в приложении A. Удалять их до перевода `main` не нужно: по ним ещё открыты PR, и по ним агенты сверяют историю.

### 3.2. Слить точечно

Две ветки содержат маленький фикс, которого на tip нет. Обе далеко сзади, поэтому мерж ветки принесёт старое дерево. Нужен cherry-pick.

| Ветка | Вперёд | Назад | Коммит | Суть |
|---|---:|---:|---|---|
| `cursor/register-email-delivery-d367` | 1 | 169 | `93c3856` | Регистрация не зависает, если письмо подтверждения не отправилось |
| `cursor/lizardfolk-hungry-jaws-cf4f` | 1 | 284 | `a7af987` | Текст черты «Голодная пасть». На tip ключ `hungry_jaws` есть, этой подписи нет. Рядом миграция `w9x0y1z2a3b4` — перед переносом сверить цепочку с живой головой `l7a8b9c0d1e2` |

### 3.3. Проверить у владельца

22 ветки. Общее правило: **не мержить ветку в tip и не в новый `main`**. Либо забрать один файл в новый PR, либо переписать срез заново.

Пачка документов (пересекаются, источником лучше взять самый поздний файл, а не все ветки):

- GTM / legal / домен / SMTP / B0: `legal-https-copy-plan-6151`, `b0-content-layer-plan-6151`, `gtm-legal-strategy-6151`, `gtm-onboarding-impact-6151`, `gtm-status-full-6151`, `strategic-plan-from-prod-3d0d`, `plan-oauth-and-catalog-stance-6151`
- Идеи и карты: `ideas-inbox-e5dc` (`IDEAS.md`), `user-flow-doc-ead6` и `dragon-pov-flight-video-f242` (`USER_FLOW.md`, видео, figma)
- Планы, код которых уже в tip: `create-bugs-system-plan-fc00`, `setting-improvement-plan-c440`, `ecosystem-plan-bacd`, `multiclass-spell-ability-plan-c9ba`
- Макеты, не продукт: `dark-theme-chrome-ef64`

Спорный код (смотреть, потом короткий PR от нового `main`, если ещё актуально):

- `admin-accounts-f21b` — админки на проде нет
- `catalog-item-dedupe-ef23` — жёсткая чистка каталога 2024 и своя миграция
- `bestiary-schema-fetch-ab5e` — пять raw json; остальной бестиарий уже на tip
- `srd-catalog-clean-4979` — скрипты `fetch_srd_2014.py` / `fetch_srd_2024.py`
- `tablet-header-hotbar-4dea` — CSS шапки, рядом уже влитая ship-ветка
- `create-pipeline-kit-244b` — скобки вокруг сброшенной кости 4d6
- `multiclass-grants-polish-2223` — `LevelUpRecapDialog`, на tip есть `LevelUpDialog`

Видео и jpg из `dragon-pov` и `dark-theme` в git продукта лучше не класть. Если они нужны, это отдельный архив, не прод.

### 3.4. Брошены или устарели

51 ветка. Типичные случаи:

- волна пикеров трат `*-4797` и старые tip (`forms-adapt`, свитки, книга волшебника, мобильный стол `2c91`, кабинет `83e8`, лист `eb8e`) — содержимое уже живёт в tip под другими коммитами, своих файлов нет;
- дубли указателей: `spa-nav-sec-fetch-2c91` и `mobile-play-desk-2c91` — один коммит `6b4cff5`; `play-desk-microflows-5cc7` — предок `dragon-pov`;
- ветки от старого `main` со SPA и иногда с workflow GitHub Pages (`dnd-2014-character-sheet-013d`, `races-compendium-f10e`, `lobby-setting-session-3333`, `fix-prod-url-afdc` и соседние);
- `legal-shell-creed20-6151` откатывает кнопку сайта с `creed20.tech` на `/legal`;
- `versatile-weapons-grip-cf4f` — патч уже в tip, актуальная ветка `versatile-weapons-grip-57bf` влита.

### 3.5. Таблица веток, которые не входят в tip

| Ветка | Дата | Вперёд | Назад | Рекомендация | Почему |
|---|---|---:|---:|---|---|
| `cursor/dragon-pov-flight-video-f242` | 2026-10-21 | 34 | 957 | проверить | Бренд: видео логина, figma-flows, USER_FLOW, PLAY_DESK_MICROFLOWS. На tip этих файлов нет. Ветку в прод не мержить — это архив дизайна, не код листа. |
| `cursor/play-desk-microflows-5cc7` | 2026-10-21 | 33 | 957 | выбросить | Предок dragon-pov-flight-video-f242 (на один коммит короче). Смотреть только ту ветку. |
| `cursor/multiclass-spell-ability-plan-c9ba` | 2026-10-21 | 7 | 957 | проверить | План MC-магии. Файл docs/MULTICLASS_SPELL_ABILITY_PLAN.md на tip уже есть, фича M1–M7 влита. Ветка выросла от main и принесёт SPA. Сравнить текст плана, ветку не мержить. |
| `cursor/create-bugs-system-plan-fc00` | 2026-10-21 | 1 | 118 | проверить | Один док docs/SLICE_CREATE_FEEDBACK_SYSTEM_PLAN.md. Срезы U/A/C/F/E уже в tip. Решить, нужен ли текст плана. |
| `cursor/spell-access-ux-plan-3aba` | 2026-10-21 | 1 | 123 | выбросить | План «гримуар = дом подготовки». Фича уже в tip (restore-consumables-grimoire и дальше). Своих файлов нет. |
| `cursor/b0-content-layer-plan-6151` | 2026-10-20 | 19 | 957 | проверить | Доки GTM, философии, домена, SMTP, B0. Кода прода нет, дерево — старый main. Пачка пересекается с gtm-legal и legal-https. |
| `cursor/gtm-onboarding-impact-6151` | 2026-10-20 | 5 | 142 | проверить | Нет на tip: docs/GTM_STATUS_FULL.md и правка PRODUCT_PHILOSOPHY. Код онбординга O0+O1 уже в tip. |
| `cursor/plan-oauth-and-catalog-stance-6151` | 2026-10-20 | 2 | 181 | проверить | Док docs/SLICE_OAUTH_YANDEX_VK_PLAN.md. Код OAuth Яндекс/VK уже в tip (oauth-yandex-vk-6151). |
| `cursor/gtm-status-full-6151` | 2026-10-20 | 1 | 164 | проверить | Тот же docs/GTM_STATUS_FULL.md, короче чем gtm-onboarding-impact. После сверки оставить один источник. |
| `cursor/register-email-delivery-d367` | 2026-10-20 | 1 | 169 | слить | Фикс регистрации, если письмо подтверждения не ушло (auth.py, mail.py, форма). Строк этого фикса на tip нет. Cherry-pick одного коммита 93c3856, ветку целиком не мержить. |
| `cursor/legal-https-copy-plan-6151` | 2026-10-19 | 19 | 957 | проверить | Самый полный набор доков линии GTM/legal/SMTP плюс docs/SLICE_HTTPS_CREED20_PLAN.md. Ветку не мержить. |
| `cursor/gtm-legal-strategy-6151` | 2026-10-19 | 18 | 957 | проверить | Ранняя пачка тех же доков, без HTTPS-плана. После сверки с legal-https можно выбросить. |
| `cursor/legal-shell-creed20-6151` | 2026-10-19 | 2 | 277 | выбросить | /legal на tip уже есть (54 строки, страница совпадает). Правка бренда на ветке уводит кнопку обратно на /legal вместо creed20.tech — это откат уже живого HTTPS. |
| `cursor/smtp-info-creed20-6151` | 2026-10-19 | 2 | 284 | выбросить | Переключение почты на info@creed20.tech. Упоминание ящика на tip уже есть, своих файлов нет. |
| `cursor/lizardfolk-hungry-jaws-cf4f` | 2026-10-19 | 1 | 284 | слить | Официальный текст «Голодная пасть» на tip отсутствует (есть только ключ hungry_jaws). Cherry-pick a7af987. Чужой alembic id не тащить вслепую: сверить с головой l7a8b9c0d1e2. |
| `cursor/versatile-weapons-grip-cf4f` | 2026-10-19 | 1 | 284 | выбросить | Patch-id коммита уже есть в tip (git cherry даёт 0). Живая ветка versatile-weapons-grip-57bf входит в tip целиком. |
| `cursor/dark-theme-chrome-ef64` | 2026-10-17 | 16 | 957 | проверить | Макеты тёмной темы и Virra (jpg/svg в docs/ui-kit). На прод это не код. Решить, хранить ли архив досок отдельно. |
| `cursor/setting-improvement-plan-c440` | 2026-10-17 | 5 | 957 | проверить | План сеттинга от main. Код C5–T5 уже в tip (ветки setting-c*/setting-t* с ahead=0). Забрать док, если он ещё нужен. |
| `cursor/strategic-plan-from-prod-3d0d` | 2026-10-17 | 4 | 284 | проверить | docs/PRODUCT_PHILOSOPHY.md на tip нет. Четыре коммита только про текст позиционирования. |
| `cursor/ideas-inbox-e5dc` | 2026-10-16 | 41 | 957 | проверить | IDEAS.md на tip нет. Остальное дерево — старый main. Забрать файл, ветку не мержить. |
| `cursor/tablet-header-hotbar-4dea` | 2026-10-16 | 1 | 369 | проверить | Один CSS-коммит шапки (длинное имя, карусель hot-bar). Рядом в tip уже есть tablet-header-hotbar-ship-4dea. Сверить, не потерялся ли этот конкретный фикс. |
| `cursor/forms-adapt-tip-ab5e` | 2026-10-15 | 33 | 369 | выбросить | Старый заявленный tip. Бестиарий и облики на текущем tip есть другими ревизиями alembic (часть старых id лежит в archive_forms_adapt_versions). Повторный мерж повторит инцидент с чужими id. |
| `cursor/spell-scrolls-levels-4-9-19c3` | 2026-10-15 | 30 | 369 | выбросить | Свитки 4–9 на tip есть (gear_spell_scrolls_4_9_v1.json, SpellScrollBindDialog). История ветки в tip не входит, содержимое переехало. |
| `cursor/bestiary-schema-fetch-ab5e` | 2026-10-15 | 27 | 707 | проверить | Основной бестиарий на tip есть. Нет пяти raw json (air_elemental, brown_bear, hawk, wolf, wildfire_spirit) и отчёта gap. Ветку не мержить: другие id миграций. |
| `cursor/wizard-spellbook-rules-19c3` | 2026-10-15 | 27 | 369 | выбросить | Правила книги волшебника и свитки вошли в линию tip другими коммитами. Своих файлов нет. |
| `cursor/forms-wild-shape-design-ab5e` | 2026-10-15 | 14 | 707 | выбросить | Дизайн-док обликов. WildShapeDialog на tip есть, своих файлов у ветки нет. |
| `cursor/session-b2-effects-bacd` | 2026-10-15 | 12 | 889 | выбросить | Каст по союзникам уже в tip (session-b2-table-effects-bacd, ahead=0). Уникален только preview-page. |
| `cursor/rogue-ranger-spend-4797` | 2026-10-15 | 10 | 369 | выбросить | Пикеры трат (плут/следопыт/изобретатель). Своих файлов нет, линия tip ушла дальше (инфузии, BM, гримуар). |
| `cursor/infusions-invocations-desk-4797` | 2026-10-15 | 7 | 448 | выбросить | Ранние пикеры инфузий и воззваний. Полный каталог инфузий уже в tip (artificer-infusions-full). |
| `cursor/ecosystem-plan-bacd` | 2026-10-15 | 6 | 957 | проверить | План экосистемы и UI kit, плюс дерево main. Код лобби/сессии уже в tip. Забрать док, если нужен. |
| `cursor/wizard-arcane-recovery-4797` | 2026-10-15 | 6 | 448 | выбросить | Волшебник: восстановление чар. Входит в ту же волну 4797, своих файлов нет. |
| `cursor/cast-ally-targets-playdesk-bacd` | 2026-10-15 | 5 | 502 | выбросить | Цели каста на союзников. Более поздняя линия session-b2-table-effects уже в tip. |
| `cursor/fighter-bm-superiority-4797` | 2026-10-15 | 4 | 448 | выбросить | Пикер костей превосходства. Мост манёвров BM уже в tip (bm-maneuvers-bridge). |
| `cursor/paladin-cd-spend-4797` | 2026-10-15 | 3 | 448 | выбросить | Пикер Божественного канала. Волна 4797, своих файлов нет. |
| `cursor/bard-inspiration-spend-4797` | 2026-10-15 | 2 | 448 | выбросить | Пикер вдохновения барда. Волна 4797, своих файлов нет. |
| `cursor/monk-ki-spend-4797` | 2026-10-15 | 1 | 448 | выбросить | Пикер ци монаха. Волна 4797, своих файлов нет. |
| `cursor/fast-docker-release-93e5` | 2026-10-13 | 10 | 511 | выбросить | Ускорение релиза (prebuild SPA) уже в deploy/sync-and-up.sh на tip. Свой файл — устаревший alembic id, он в архиве. |
| `cursor/levelup-feat-cast-exit-0cfc` | 2026-10-13 | 7 | 511 | выбросить | Старый tip прокачки. LevelUpDialog на текущем tip есть, своих файлов кроме архивного alembic нет. |
| `cursor/login-hang-timeout-e857` | 2026-10-13 | 3 | 567 | выбросить | Таймауты логина. На tip уже есть backend/app/db/session.py и обработка в main.py. Своих файлов нет. |
| `cursor/create-pipeline-kit-244b` | 2026-10-13 | 2 | 467 | проверить | Хвост после create-pipeline-kit-prod-244b (та ветка уже в tip): показ сброшенной кости 4d6. Cherry-pick только если на проде кость всё ещё без скобок. Ветку не мержить. |
| `cursor/play-desk-merge-mobile-e788` | 2026-10-12 | 25 | 612 | выбросить | Старый мобильный tip. Уникален docs/FEATURE_LOCK.md, строка FEATURE_LOCK на tip уже есть в других файлах. |
| `cursor/mobile-play-desk-2c91` | 2026-10-12 | 21 | 625 | выбросить | Мобильный стол. Тот же коммит, что spa-nav-sec-fetch-2c91 (6b4cff5). Sec-Fetch и плотность стола уже в линии tip. |
| `cursor/spa-nav-sec-fetch-2c91` | 2026-10-12 | 21 | 625 | выбросить | Дубль указателя на 6b4cff5, тот же коммит что mobile-play-desk-2c91. |
| `cursor/create-inline-detail-2c91` | 2026-10-12 | 12 | 625 | выбросить | Подмножество mobile-play-desk. Своих файлов нет. |
| `cursor/mobile-abilities-tab-2c91` | 2026-10-12 | 11 | 625 | выбросить | Подмножество mobile-play-desk. Своих файлов нет. |
| `cursor/user-flow-doc-ead6` | 2026-10-12 | 5 | 957 | проверить | USER_FLOW.md (тот же файл есть и на dragon-pov). Дерево — main. Забрать док из одного места. |
| `cursor/mobile-load-perf-2c91` | 2026-10-11 | 4 | 625 | выбросить | MTU/TCPMSS и boot splash. Оба маркера на tip уже есть (vpn-https влит). |
| `cursor/admin-accounts-f21b` | 2026-10-11 | 2 | 627 | проверить | Целый контур админки, на tip его нет: admin.py, AdminPage, RequireAdmin. Ветке больше месяца, мерж целиком разнесёт дерево. Если админка нужна — новый короткий срез от нового main. |
| `cursor/stack-duplicate-weapons-qty-45d0` | 2026-10-11 | 1 | 627 | выбросить | Стек одинакового оружия. Позже срез E weapon-attacks-merge-fc00 вошёл в tip. |
| `cursor/multiclass-grants-polish-2223` | 2026-10-09 | 22 | 644 | проверить | Старая полировка мультикласса. На tip есть LevelUpDialog, нет LevelUpRecapDialog и двух selfcheck-файлов. Скорее переименовано; мержить ветку нельзя. |
| `cursor/companions-naparniki-b378` | 2026-10-08 | 10 | 707 | выбросить | Напарники на tip есть (бестиарий, wild shape, UX B11). Своих файлов нет. |
| `cursor/mobile-sheet-compact-acbe` | 2026-10-07 | 9 | 829 | выбросить | Временные HP и мобильная полоса. tempHp на tip уже встречается. Уникальный hp.ts в это дерево не переносить. |
| `cursor/classic-sheet-from-card-013d` | 2026-10-06 | 20 | 935 | выбросить | Ранний classic поверх кабинета. ClassicPrint на tip есть, своих файлов нет. |
| `cursor/sessions-stub-cleanup-83e8` | 2026-10-06 | 19 | 935 | выбросить | Сессии и кабинет октября. Это предки линии, коммиты не совпали из-за переписывания истории, файлов сверх tip нет. |
| `cursor/characters-header-avatar-83e8` | 2026-10-06 | 15 | 935 | выбросить | Аватар в списке персонажей. Контур кабинета на tip есть. |
| `cursor/register-email-verify-83e8` | 2026-10-06 | 14 | 935 | выбросить | Подтверждение почты при регистрации. Базовый контур на tip есть; живой хвост — отдельный register-email-delivery. |
| `cursor/smtp-mailru-83e8` | 2026-10-06 | 13 | 935 | выбросить | Mail.ru SMTP. Линия ушла на Яндекс и info@. |
| `cursor/cabinet-deploy-83e8` | 2026-10-06 | 11 | 935 | выбросить | Ранний деплой кабинета. Скрипты деплоя на tip новее. |
| `cursor/sheet-race-effects-eb8e` | 2026-10-06 | 10 | 920 | выбросить | Срез листа P1–P6. Лист на tip давно другой, своих файлов нет. |
| `cursor/srd-catalog-clean-4979` | 2026-10-06 | 9 | 909 | проверить | На tip нет backend/scripts/fetch_srd_2014.py и fetch_srd_2024.py. Каталог SRD в продукте есть. Решить, нужны ли скрипты загрузки. |
| `cursor/races-compendium-f10e` | 2026-10-06 | 7 | 957 | выбросить | Справочник рас в старом SPA (src/data/races). Это содержимое нынешнего main. Сохранится тегом архива main, в прод не переносить. |
| `cursor/sheet-multiclass-eb8e` | 2026-10-06 | 6 | 920 | выбросить | Ранний мультикласс листа P1–P6. На tip мультикласс другой (M1–M7). |
| `cursor/sheet-languages-tools-eb8e` | 2026-10-06 | 5 | 920 | выбросить | Языки и инструменты раннего листа. Своих файлов нет. |
| `cursor/cabinet-profile-mvp-83e8` | 2026-10-06 | 4 | 935 | выбросить | MVP кабинета. Контур на tip есть. |
| `cursor/disable-github-pages-f10e` | 2026-10-06 | 4 | 957 | выбросить | Дубль решения «Pages не прод», уже есть коммитом main 2fa254d. Дерево — старый SPA. |
| `cursor/fix-prod-url-afdc` | 2026-10-06 | 4 | 957 | выбросить | Ранняя пометка URL прода плюс workflow Pages. На tip URL уже creed20.tech, Pages-workflow в прод не возвращать. |
| `cursor/lobby-setting-session-3333` | 2026-10-06 | 4 | 957 | выбросить | Первый макет лобби на SPA и localStorage. Боевой лобби/сеттинг на tip другой. |
| `cursor/product-status-log-acbe` | 2026-10-06 | 4 | 957 | выбросить | Первая версия PRODUCT_STATUS поверх SPA. Живой журнал — на tip. |
| `cursor/sheet-armor-ac-eb8e` | 2026-10-06 | 3 | 920 | выбросить | Ранний КД листа. Своих файлов нет. |
| `cursor/dnd-2014-character-sheet-013d` | 2026-10-06 | 2 | 957 | выбросить | Каркас печатного листа и GitHub Pages. Это история main до продукта. |
| `cursor/prod-deploy-fe27` | 2026-10-06 | 2 | 934 | выбросить | Первый вариант sync-and-up. На tip скрипт уже с preflight и prebuild. |
| `cursor/sheet-spell-slots-eb8e` | 2026-10-06 | 2 | 920 | выбросить | Ранние ячейки заклинаний. Своих файлов нет. |
| `cursor/catalog-item-dedupe-ef23` | 2026-10-06 | 1 | 899 | проверить | Миграция c3a4b5c6d7e8 и сильное вычищение catalog.json 2024 (−1120 строк). На tip этой ревизии нет. Мерж ветки опасен для каталога; смотреть глазами, нужен ли дедуп. |
| `cursor/sheet-cast-upcast-eb8e` | 2026-10-06 | 1 | 920 | выбросить | Ранний upcast. Каст на tip другой. |
| `cursor/dvarf-dev-workflow-skill-eb8e` | 2026-10-05 | 3 | 957 | выбросить | Скилл dvarf-dev-workflow на tip уже есть. Своих файлов нет. |

---

## 4. План перехода

Порядок жёсткий. Пока шаг 1 не сделан, любой `./deploy/sync-and-up.sh` с чужой ветки снова подменит прод и сдвинет tip.

### 4.1. Заморозить выкладки

1. Написать агентам: деплой на Timeweb остановлен, пока `main` не станет линией прода.
2. Повторить команду из раздела 1. Если tip уже не `44abfdb`, этот документ устарел в одной точке — пересчитать `git rev-list` от нового SHA. Таблица категорий от этого сдвинется.
3. Поставить теги, не двигая ветки:

```bash
git fetch origin
git tag archive/main-scaffold-2026-11-11 2fa254d6ee8d2eed10686d8dbf169e1ea2693741
git tag prod/2026-11-11-ux-a1 44abfdbf5fbf909fab757ae08a611eade773fe67
git push origin archive/main-scaffold-2026-11-11 prod/2026-11-11-ux-a1
```

`archive/main-scaffold-2026-11-11` хранит сегодняшний каркас (расы SPA, запрет Pages). `prod/2026-11-11-ux-a1` — точка, которую видел сервер.

### 4.2. Сделать `main` равной tip через PR

Истории нельзя склеить fast-forward напрямую: у `main` четыре своих коммита. Squash и rebase-merge запрещены: squash сожмёт ~900 коммитов продукта в один, rebase продублирует их поверх каркаса.

Нужен коммит, у которого дерево совпадает с tip, а старый `main` записан вторым родителем. Тогда GitHub может сдвинуть `main` fast-forward, и первым родителем останется продуктовая история.

```bash
git fetch origin
git checkout -b cursor/promote-prod-tip-to-main origin/cursor/ux-a1-magic-resources-8b9c
git merge -s ours origin/main -m "merge: записать старый main вторым родителем, дерево прода не трогать"
git push -u origin cursor/promote-prod-tip-to-main
```

`-s ours` здесь запускается **на ветке tip**, поэтому дерево остаётся продуктовым, а `origin/main` становится вторым родителем. Обратный порядок (ours на `main`) оставит каркас и сотрёт продукт.

PR в `main`:

- база `main`, голова `cursor/promote-prod-tip-to-main`;
- в диффе будет подмена дерева (~979 файлов) — это ожидаемо;
- метод слияния: fast-forward. Если защита ветки требует кнопки merge, только «Create a merge commit». После мержа проверить `git diff origin/main 44abfdb` (или новый tip, если он сдвинулся). Пустой diff — цель достигнута;
- squash и rebase — не нажимать.

Проверка после сдвига `main`:

```bash
git fetch origin
git diff --stat origin/main 44abfdbf5fbf909fab757ae08a611eade773fe67
curl -fsS https://creed20.tech/health
```

Этот шаг **не деплоит**. Сервер уже на этом дереве. Пустой diff и живой `/health` значат, что `main` догнал прод, а не обогнал его.

Если к моменту мержа tip уехал вперёд, ветку promote пересобрать от нового SHA той же командой `merge -s ours origin/main`.

### 4.3. Незамерженная работа

После того как `main` = tip:

1. Два cherry-pick из раздела 3.2 — отдельные короткие ветки `cursor/<slice>-…` от `main`, отдельные PR. Деплой каждого — только когда появится workflow из раздела 4.5 или по явной команде владельца.
2. Документы из раздела 3.3 — один PR «архив планов», если владелец отметит файлы. В него не входят `src/`, видео и jpg досок.
3. Админка, дедуп каталога 2024, пять json бестиария, скрипты SRD, CSS шапки, 4d6, LevelUpRecap — решения владельца. Пока решения нет, ветки не удалять и не мержить.
4. Новые задачи после этого: ветка от `main`, PR в `main`, маленький дифф. База PR больше не предыдущий tip.

### 4.4. Чистка веток и PR

Только после пустого `git diff main <tip>` и ок владельца по таблице 3.5.

1. Закрыть 194 открытых PR, голова которых уже предок нового `main`. Комментарий: «вошло в prod tip, линия переезжает на main». PR с базой `main` и головой из старого каркаса закрыть тоже: после подмены их дифф бессмыслен.
2. PR голов из раздела «слить» и «проверить» не закрывать, пока владелец не решил. Базу им потом сменить на новый `main` нельзя автоматическим retarget: дифф будет на сотни коммитов. Для принятых фиксов — новый PR с cherry-pick.
3. Удалить 203 ветки из приложения A (все, кроме имени tip). Имя `cursor/ux-a1-magic-resources-8b9c` удалить, когда `main` указывает на тот же SHA.
4. Удалить 51 ветку «выбросить» из таблицы 3.5.
5. `gh-pages` удалить отдельно, после проверки в настройках репозитория, что GitHub Pages выключен и workflow Pages не вернулся.
6. Ветки «слить» и «проверить» не удалять до решения. Удаление ветки не удаляет коммиты, пока на них есть тег или другая ветка; перед массовым удалением достаточно тегов из шага 4.1 плюс того, что `main` уже содержит влитую историю.

Массовое удаление делать пачками и сверять `git branch -r --merged origin/main`, а не по памяти.

### 4.5. Черновик GitHub Actions

Файл workflow в этом PR **не создаётся**. Ниже текст для следующего PR, уже в тот `main`, который равен tip. До подмены `main` workflow включать нельзя: он залил бы каркас и стёр бы прод.

Секреты и переменные:

| Имя | Где | Зачем |
|---|---|---|
| `DVARF_SSH_PRIVATE_KEY` | GitHub Actions secret | Тот же PEM, что сейчас в секрете Cursor Cloud Agent. Публичная половина уже в `authorized_keys` на VPS |
| `production` environment | GitHub Environment с required reviewer | Выкладка не стартует, пока владелец не подтвердил |
| Хост | Можно не секретить | В репозитории уже зафиксирован `201.34.132.252` |

Отдельный секрет на пользователя БД и `.env` в Actions не класть. Серверный `/opt/dvarf/.env` скрипт не перезаписывает.

Пока первые выкладки ручные, триггер только `workflow_dispatch`. `push` в `main` включить после одной успешной ручной выкладки и после правки `preflight-live`: сегодня он читает **имя ветки** из `AGENTS.md` на сервере. Когда там будет написано `main`, проверка «tip — предок HEAD» станет всегда истинной для деплоя из `main`. Оставить проверки маркеров на диске и alembic. Рядом писать SHA в файл вроде `deploy/RELEASE`, чтобы следующая проверка сравнивала коммиты, а не имя ветки.

Отпечаток ключа хоста на 2026-11-11: `SHA256:4n2t+QdV0FL3a6VqHIAuxZeIAAr6xwXi2NgsJyQChHk` (ED25519). Если сервер переустановят, отпечаток сменить.

```yaml
name: Deploy production

on:
  workflow_dispatch:
  # push:
  #   branches: [main]

concurrency:
  group: deploy-production
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install SSH key
        env:
          DVARF_SSH_PRIVATE_KEY: ${{ secrets.DVARF_SSH_PRIVATE_KEY }}
        run: |
          install -d -m 700 ~/.ssh
          printf '%s\n' "$DVARF_SSH_PRIVATE_KEY" > ~/.ssh/dvarf_timeweb
          chmod 600 ~/.ssh/dvarf_timeweb
          # Отпечаток снять заново, если VPS переустанавливали.
          ssh-keyscan -t ed25519 201.34.132.252 >> ~/.ssh/known_hosts

      - name: Deploy to Timeweb
        env:
          DVARF_HOST: 201.34.132.252
          DVARF_SSH_KEY: /home/runner/.ssh/dvarf_timeweb
        run: |
          # sync-and-up сам вызывает preflight-prod и preflight-live,
          # собирает frontend и заменяет /opt/dvarf, не трогая .env.
          ./deploy/sync-and-up.sh
```

Обход `DVARF_SKIP_PREFLIGHT` / `DVARF_SKIP_LIVE_PREFLIGHT` в workflow не добавлять.

`sync-and-up.sh` по-прежнему **стирает** `/opt/dvarf` кроме `.env`. Защита — environment reviewer, preflight и то, что job запускается только с `main`.

### 4.6. Что убрать из `AGENTS.md`

Править `AGENTS.md` в этом PR нельзя: на `main` его нет, а на tip его трогать рано. Следующий PR после подмены `main` убирает ритуал «бегающего» prod tip. Смысл анти-overwrite остаётся.

Убрать или заменить:

- раздел 2 «Одна линия прода»: строка таблицы `Prod tip (сейчас) | cursor/…`, шаги «ветка от tip», «merge origin/<prod-tip>», «после деплоя обнови tip в AGENTS, skill, deploy/README, PRODUCT_STATUS», фраза «напиши в PR: это новый prod tip»;
- файл `deploy/prod-tip` как имя ветки. Вместо него SHA в `deploy/RELEASE`, который пишет выкладка;
- в `.cursor/skills/dvarf-prod-lineage/SKILL.md` блоки «Текущий prod tip» и «как начать слайс от tip»;
- в `deploy/README.md` строку `Current prod tip branch`;
- раздел 5 в части «каждый агент деплоит свою развилку». Новый текст: деплой делает только workflow `main`. Параллельные агенты открывают PR в `main` и не вызывают `sync-and-up`.

Оставить:

- описание, что `sync-and-up.sh` заменяет всё дерево на сервере, кроме `.env`, и ссылки на инцидент 2026-10-17;
- `preflight-prod.sh` и `preflight-live.sh` (маркеры Play Desk / classic / alembic);
- запрет `DVARF_SKIP_*` без явного ок;
- UI Kit LOCK и Play Desk LOCK;
- правило секретов: `.env` не коммитить, ключ только в secret;
- запрет GitHub Pages.

`PRODUCT_STATUS.md` остаётся журналом фич. Из него уходит обязанность объявлять новую ветку tip после каждого деплоя. Достаточно даты, SHA `main` и проверки `/health`.

---

## 5. Решения, которые нужны от владельца

1. Подтвердить заморозку ручных деплоев и повторить команду раздела 1. Точка этого аудита — `44abfdb`, её выкатили 2026-11-11 около 08:51 UTC.
2. Разрешить PR с `-s ours` и fast-forward `main` на дерево tip. Старый `main` останется тегом `archive/main-scaffold-2026-11-11`.
3. Cherry-pick двух фиксов (регистрация без письма, «Голодная пасть») — да или нет.
4. Какие доки забрать в архивный PR: `IDEAS.md`, GTM/legal, философия, USER_FLOW. Видео и jpg досок в репозиторий продукта не предлагаются.
5. Нужны ли ещё админка, дедуп каталога 2024, raw json бестиария, скрипты SRD, CSS шапки, фикс 4d6, `LevelUpRecapDialog`.
6. Когда включать Actions: сначала один `workflow_dispatch` с ревьюером, `push` в `main` только после него.
7. Когда закрывать 194 PR и удалять 203+51 веток. До пустого diff `main` и tip ничего не удалять.
8. Удалять ли `gh-pages` после проверки, что Pages в настройках репозитория выключен.

---

## Приложение A. 204 ветки, которые уже входят в tip

Вперёд у всех 0. «Назад» — сколько коммитов tip новее кончика ветки. Рекомендация у всех, кроме самого tip: выбросить после тега `archive/main-scaffold-2026-11-11`, тега `prod/2026-11-11-ux-a1` и перевода `main`.

| Ветка | Дата | Вперёд | Назад | Рекомендация |
|---|---|---:|---:|---|
| `cursor/users-auth-schema-eb8e` | 2026-10-05 | 0 | 956 | выбросить после тега и перевода main |
| `cursor/race-human-marks-f10e` | 2026-10-06 | 0 | 873 | выбросить после тега и перевода main |
| `cursor/race-setup-grants-f10e` | 2026-10-06 | 0 | 887 | выбросить после тега и перевода main |
| `cursor/subclass-catalog-spec-ef23` | 2026-10-06 | 0 | 891 | выбросить после тега и перевода main |
| `cursor/catalog-class-edition-dedupe-ef23` | 2026-10-06 | 0 | 894 | выбросить после тега и перевода main |
| `cursor/sheet-multiclass-rules-ef23` | 2026-10-06 | 0 | 899 | выбросить после тега и перевода main |
| `cursor/prod-lineage-rules-acbe` | 2026-10-06 | 0 | 909 | выбросить после тега и перевода main |
| `cursor/restore-sheet-classic-acbe` | 2026-10-06 | 0 | 911 | выбросить после тега и перевода main |
| `cursor/restore-cabinet-acbe` | 2026-10-06 | 0 | 912 | выбросить после тега и перевода main |
| `cursor/restore-avatar-upload-acbe` | 2026-10-06 | 0 | 913 | выбросить после тега и перевода main |
| `cursor/lobby-join-table-3333` | 2026-10-06 | 0 | 914 | выбросить после тега и перевода main |
| `cursor/auth-rest-components-eb8e` | 2026-10-06 | 0 | 920 | выбросить после тега и перевода main |
| `cursor/feats-pickers-592a` | 2026-10-07 | 0 | 728 | выбросить после тега и перевода main |
| `cursor/feats-backgrounds-phb-592a` | 2026-10-07 | 0 | 744 | выбросить после тега и перевода main |
| `cursor/feats-spell-grants-592a` | 2026-10-07 | 0 | 747 | выбросить после тега и перевода main |
| `cursor/feats-assemble-592a` | 2026-10-07 | 0 | 753 | выбросить после тега и перевода main |
| `cursor/feats-bmt-wave-592a` | 2026-10-07 | 0 | 756 | выбросить после тега и перевода main |
| `cursor/feats-pam-wave-592a` | 2026-10-07 | 0 | 759 | выбросить после тега и перевода main |
| `cursor/feats-prereq-engine-592a` | 2026-10-07 | 0 | 761 | выбросить после тега и перевода main |
| `cursor/feats-bpgg-wave-ef23` | 2026-10-07 | 0 | 764 | выбросить после тега и перевода main |
| `cursor/feats-dsotdq-wave-ef23` | 2026-10-07 | 0 | 766 | выбросить после тега и перевода main |
| `cursor/feats-scc-wave-ef23` | 2026-10-07 | 0 | 768 | выбросить после тега и перевода main |
| `cursor/feats-erlw-wave-ef23` | 2026-10-07 | 0 | 770 | выбросить после тега и перевода main |
| `cursor/feats-ftd-wave-ef23` | 2026-10-07 | 0 | 772 | выбросить после тега и перевода main |
| `cursor/feats-xge-wave-ef23` | 2026-10-07 | 0 | 774 | выбросить после тега и перевода main |
| `cursor/background-grants-ef23` | 2026-10-07 | 0 | 776 | выбросить после тега и перевода main |
| `cursor/feats-tce-wave-ef23` | 2026-10-07 | 0 | 776 | выбросить после тега и перевода main |
| `cursor/feats-phb-wave1-ef23` | 2026-10-07 | 0 | 778 | выбросить после тега и перевода main |
| `cursor/class-asi-hitdice-mc-ef23` | 2026-10-07 | 0 | 780 | выбросить после тега и перевода main |
| `cursor/spell-pact-rest-ef23` | 2026-10-07 | 0 | 780 | выбросить после тега и перевода main |
| `cursor/spell-cast-scaling-ef23` | 2026-10-07 | 0 | 782 | выбросить после тега и перевода main |
| `cursor/spell-srd-backfill-ef23` | 2026-10-07 | 0 | 783 | выбросить после тега и перевода main |
| `cursor/spell-schema-ef23` | 2026-10-07 | 0 | 784 | выбросить после тега и перевода main |
| `cursor/class-race-join-ef23` | 2026-10-07 | 0 | 785 | выбросить после тега и перевода main |
| `cursor/race-level-unlocks-f10e` | 2026-10-07 | 0 | 829 | выбросить после тега и перевода main |
| `cursor/race-mpmm-subrace-forks-f10e` | 2026-10-07 | 0 | 832 | выбросить после тега и перевода main |
| `cursor/race-custom-lineage-f10e` | 2026-10-07 | 0 | 834 | выбросить после тега и перевода main |
| `cursor/race-racial-spells-f10e` | 2026-10-07 | 0 | 837 | выбросить после тега и перевода main |
| `cursor/race-movement-speeds-f10e` | 2026-10-07 | 0 | 839 | выбросить после тега и перевода main |
| `cursor/race-size-choice-f10e` | 2026-10-07 | 0 | 842 | выбросить после тега и перевода main |
| `cursor/race-natural-weapons-f10e` | 2026-10-07 | 0 | 844 | выбросить после тега и перевода main |
| `cursor/race-natural-armor-f10e` | 2026-10-07 | 0 | 849 | выбросить после тега и перевода main |
| `cursor/race-asi-flexible-f10e` | 2026-10-07 | 0 | 851 | выбросить после тега и перевода main |
| `cursor/race-setting-wave-f10e` | 2026-10-07 | 0 | 853 | выбросить после тега и перевода main |
| `cursor/race-mpmm-wave-f10e` | 2026-10-07 | 0 | 860 | выбросить после тега и перевода main |
| `cursor/subclass-wave-a-ef23` | 2026-10-07 | 0 | 860 | выбросить после тега и перевода main |
| `cursor/race-elf-halfling-gaps-f10e` | 2026-10-07 | 0 | 863 | выбросить после тега и перевода main |
| `cursor/race-dragonborn-ftd-f10e` | 2026-10-07 | 0 | 866 | выбросить после тега и перевода main |
| `cursor/gear-dmg-polish-db96` | 2026-10-08 | 0 | 662 | выбросить после тега и перевода main |
| `cursor/gear-settings-items-db96` | 2026-10-08 | 0 | 666 | выбросить после тега и перевода main |
| `cursor/gear-xge-tce-items-db96` | 2026-10-08 | 0 | 668 | выбросить после тега и перевода main |
| `cursor/gear-wondrous-srd-db96` | 2026-10-08 | 0 | 670 | выбросить после тега и перевода main |
| `cursor/gear-magic-enrich-db96` | 2026-10-08 | 0 | 672 | выбросить после тега и перевода main |
| `cursor/gear-tools-mounts-db96` | 2026-10-08 | 0 | 674 | выбросить после тега и перевода main |
| `cursor/gear-race-nw-effects-db96` | 2026-10-08 | 0 | 677 | выбросить после тега и перевода main |
| `cursor/gear-proficiency-effects-db96` | 2026-10-08 | 0 | 679 | выбросить после тега и перевода main |
| `cursor/gear-effects-mvp-db96` | 2026-10-08 | 0 | 682 | выбросить после тега и перевода main |
| `cursor/gear-wear-slots-db96` | 2026-10-08 | 0 | 685 | выбросить после тега и перевода main |
| `cursor/gear-spell-focus-db96` | 2026-10-08 | 0 | 687 | выбросить после тега и перевода main |
| `cursor/gear-held-slots-db96` | 2026-10-08 | 0 | 691 | выбросить после тега и перевода main |
| `cursor/gear-picker-db96` | 2026-10-08 | 0 | 694 | выбросить после тега и перевода main |
| `cursor/gear-packs-expand-db96` | 2026-10-08 | 0 | 696 | выбросить после тега и перевода main |
| `cursor/gear-sheet-weapons-db96` | 2026-10-08 | 0 | 699 | выбросить после тега и перевода main |
| `cursor/gear-backfill-2014-db96` | 2026-10-08 | 0 | 702 | выбросить после тега и перевода main |
| `cursor/gear-schema-2014-db96` | 2026-10-08 | 0 | 705 | выбросить после тега и перевода main |
| `cursor/spell-cast-grant-picker-7737` | 2026-10-08 | 0 | 707 | выбросить после тега и перевода main |
| `cursor/guided-onboarding-wizard-ef23` | 2026-10-08 | 0 | 764 | выбросить после тега и перевода main |
| `cursor/spell-cast-ui-polish-7737` | 2026-10-08 | 0 | 771 | выбросить после тега и перевода main |
| `cursor/spell-known-prepare-polish-ef23` | 2026-10-08 | 0 | 774 | выбросить после тега и перевода main |
| `cursor/spell-rest-books-wave-ef23` | 2026-10-08 | 0 | 775 | выбросить после тега и перевода main |
| `cursor/spell-xge-wave-ef23` | 2026-10-08 | 0 | 776 | выбросить после тега и перевода main |
| `cursor/spell-phb-wave-ef23` | 2026-10-08 | 0 | 778 | выбросить после тега и перевода main |
| `cursor/spell-locked-prepare-ef23` | 2026-10-08 | 0 | 779 | выбросить после тега и перевода main |
| `cursor/create-pipeline-page-2223` | 2026-10-09 | 0 | 644 | выбросить после тега и перевода main |
| `cursor/archetype-forks-setup-form-45d0` | 2026-10-11 | 0 | 627 | выбросить после тега и перевода main |
| `cursor/archetype-level-forks-45d0` | 2026-10-11 | 0 | 630 | выбросить после тега и перевода main |
| `cursor/ui-kit-contract-a73e` | 2026-10-12 | 0 | 558 | выбросить после тега и перевода main |
| `cursor/social-texts-a73e` | 2026-10-12 | 0 | 560 | выбросить после тега и перевода main |
| `cursor/explore-inventory-a73e` | 2026-10-12 | 0 | 562 | выбросить после тега и перевода main |
| `cursor/desk-vitals-wave-a73e` | 2026-10-12 | 0 | 567 | выбросить после тега и перевода main |
| `cursor/desk-scenes-no-select-a73e` | 2026-10-12 | 0 | 593 | выбросить после тега и перевода main |
| `cursor/sheet-conflict-fix-a73e` | 2026-10-12 | 0 | 598 | выбросить после тега и перевода main |
| `cursor/delete-character-list-a73e` | 2026-10-12 | 0 | 600 | выбросить после тега и перевода main |
| `cursor/play-desk-polish-layer2-a73e` | 2026-10-12 | 0 | 602 | выбросить после тега и перевода main |
| `cursor/create-bugs-layer1-a73e` | 2026-10-12 | 0 | 604 | выбросить после тега и перевода main |
| `cursor/play-desk-layout-e788` | 2026-10-12 | 0 | 612 | выбросить после тега и перевода main |
| `cursor/restore-wave-a-desk-0ed9` | 2026-10-13 | 0 | 453 | выбросить после тега и перевода main |
| `cursor/cabinet-theme-a73e` | 2026-10-13 | 0 | 464 | выбросить после тега и перевода main |
| `cursor/characters-list-kit-a73e` | 2026-10-13 | 0 | 467 | выбросить после тега и перевода main |
| `cursor/hotbar-icons-bug019-a73e` | 2026-10-13 | 0 | 469 | выбросить после тега и перевода main |
| `cursor/identity-avatar-dialog-a73e` | 2026-10-13 | 0 | 470 | выбросить после тега и перевода main |
| `cursor/more-play-drop-a73e` | 2026-10-13 | 0 | 471 | выбросить после тега и перевода main |
| `cursor/attunement-inventory-only-a73e` | 2026-10-13 | 0 | 472 | выбросить после тега и перевода main |
| `cursor/ownership-drawer-a73e` | 2026-10-13 | 0 | 474 | выбросить после тега и перевода main |
| `cursor/companions-unify-a73e` | 2026-10-13 | 0 | 477 | выбросить после тега и перевода main |
| `cursor/features-unify-a73e` | 2026-10-13 | 0 | 480 | выбросить после тега и перевода main |
| `cursor/social-unify-a73e` | 2026-10-13 | 0 | 483 | выбросить после тега и перевода main |
| `cursor/explore-inventory-unify-a73e` | 2026-10-13 | 0 | 487 | выбросить после тега и перевода main |
| `cursor/hot-conditions-dialog-a73e` | 2026-10-13 | 0 | 494 | выбросить после тега и перевода main |
| `cursor/hot-bar-audit-a73e` | 2026-10-13 | 0 | 498 | выбросить после тега и перевода main |
| `cursor/attacks-settings-dialog-a73e` | 2026-10-13 | 0 | 499 | выбросить после тега и перевода main |
| `cursor/combat-stage-kit-a73e` | 2026-10-13 | 0 | 502 | выбросить после тега и перевода main |
| `cursor/spells-settings-dialog-a73e` | 2026-10-13 | 0 | 504 | выбросить после тега и перевода main |
| `cursor/wave-a-listva-a73e` | 2026-10-13 | 0 | 509 | выбросить после тега и перевода main |
| `cursor/deploy-guardrails-93e5` | 2026-10-13 | 0 | 560 | выбросить после тега и перевода main |
| `cursor/create-pipeline-kit-prod-244b` | 2026-10-13 | 0 | 563 | выбросить после тега и перевода main |
| `cursor/mobile-desk-sync-code-0ed9` | 2026-10-14 | 0 | 369 | выбросить после тега и перевода main |
| `cursor/mobile-create-race-gate-0ed9` | 2026-10-14 | 0 | 370 | выбросить после тега и перевода main |
| `cursor/mobile-passives-0ed9` | 2026-10-14 | 0 | 372 | выбросить после тега и перевода main |
| `cursor/mobile-overflow-fix-0ed9` | 2026-10-14 | 0 | 374 | выбросить после тега и перевода main |
| `cursor/prod-safari-blank-0ed9` | 2026-10-14 | 0 | 415 | выбросить после тега и перевода main |
| `cursor/prod-mobile-html-cache-0ed9` | 2026-10-14 | 0 | 417 | выбросить после тега и перевода main |
| `cursor/buffs-ac-slice-244b` | 2026-10-14 | 0 | 421 | выбросить после тега и перевода main |
| `cursor/mobile-plan-desk-sync-0ed9` | 2026-10-14 | 0 | 430 | выбросить после тега и перевода main |
| `cursor/mobile-spells-m11-0ed9` | 2026-10-14 | 0 | 431 | выбросить после тега и перевода main |
| `cursor/prod-ship-desk-ux-244b` | 2026-10-14 | 0 | 431 | выбросить после тега и перевода main |
| `cursor/mobile-ui-kit-0ed9` | 2026-10-14 | 0 | 432 | выбросить после тега и перевода main |
| `cursor/jump-vital-ui-244b` | 2026-10-14 | 0 | 441 | выбросить после тега и перевода main |
| `cursor/cabinet-theme-save-244b` | 2026-10-14 | 0 | 443 | выбросить после тега и перевода main |
| `cursor/desk-rolls-ux-244b` | 2026-10-14 | 0 | 443 | выбросить после тега и перевода main |
| `cursor/lizardfolk-catalog-sync-244b` | 2026-10-14 | 0 | 443 | выбросить после тега и перевода main |
| `cursor/shield-quick-toggle-244b` | 2026-10-14 | 0 | 443 | выбросить после тега и перевода main |
| `cursor/lizardfolk-barb-feedback-244b` | 2026-10-14 | 0 | 444 | выбросить после тега и перевода main |
| `cursor/cleric-equip-cd-spells-244b` | 2026-10-14 | 0 | 448 | выбросить после тега и перевода main |
| `cursor/cleric-create-bugs-244b` | 2026-10-14 | 0 | 449 | выбросить после тега и перевода main |
| `cursor/reunify-levelup-feat-gift-244b` | 2026-10-14 | 0 | 451 | выбросить после тега и перевода main |
| `cursor/session-b7-encounters-bacd` | 2026-10-15 | 0 | 865 | выбросить после тега и перевода main |
| `cursor/session-b6-transfer-bacd` | 2026-10-15 | 0 | 866 | выбросить после тега и перевода main |
| `cursor/session-b6-loot-bacd` | 2026-10-15 | 0 | 867 | выбросить после тега и перевода main |
| `cursor/session-b5-xp-bacd` | 2026-10-15 | 0 | 868 | выбросить после тега и перевода main |
| `cursor/session-b4-initiative-bacd` | 2026-10-15 | 0 | 873 | выбросить после тега и перевода main |
| `cursor/session-b3-enemies-bacd` | 2026-10-15 | 0 | 876 | выбросить после тега и перевода main |
| `cursor/session-b2-table-effects-bacd` | 2026-10-15 | 0 | 884 | выбросить после тега и перевода main |
| `cursor/lobby-hub-a1-bacd` | 2026-10-15 | 0 | 887 | выбросить после тега и перевода main |
| `cursor/tablet-header-hotbar-ship-4dea` | 2026-10-16 | 0 | 815 | выбросить после тега и перевода main |
| `cursor/appearance-persist-f3ee` | 2026-10-16 | 0 | 818 | выбросить после тега и перевода main |
| `cursor/characters-load-perf-f3ee` | 2026-10-16 | 0 | 820 | выбросить после тега и перевода main |
| `cursor/setting-artifacts-d1-bacd` | 2026-10-16 | 0 | 823 | выбросить после тега и перевода main |
| `cursor/lobby-join-code-only-bacd` | 2026-10-16 | 0 | 826 | выбросить после тега и перевода main |
| `cursor/cast-ally-shield-faith-bacd` | 2026-10-16 | 0 | 827 | выбросить после тега и перевода main |
| `cursor/setting-c4-embeds-bacd` | 2026-10-16 | 0 | 844 | выбросить после тега и перевода main |
| `cursor/setting-c3-reveal-bacd` | 2026-10-16 | 0 | 850 | выбросить после тега и перевода main |
| `cursor/setting-c2-links-bacd` | 2026-10-16 | 0 | 852 | выбросить после тега и перевода main |
| `cursor/setting-c1-pages-bacd` | 2026-10-16 | 0 | 854 | выбросить после тега и перевода main |
| `cursor/session-b8-generator-bacd` | 2026-10-16 | 0 | 856 | выбросить после тега и перевода main |
| `cursor/name-generation-plan-de51` | 2026-10-17 | 0 | 284 | выбросить после тега и перевода main |
| `cursor/fix-list-create-fixes-6dc8` | 2026-10-17 | 0 | 292 | выбросить после тега и перевода main |
| `cursor/restore-sheet-classic-setting-3d0d` | 2026-10-17 | 0 | 296 | выбросить после тега и перевода main |
| `cursor/classic-2014-p1-visual-8bfd` | 2026-10-17 | 0 | 327 | выбросить после тега и перевода main |
| `cursor/setting-t5-journal-table-c440` | 2026-10-17 | 0 | 824 | выбросить после тега и перевода main |
| `cursor/setting-t4-quest-journal-c440` | 2026-10-17 | 0 | 828 | выбросить после тега и перевода main |
| `cursor/setting-t3-lore-panel-c440` | 2026-10-17 | 0 | 830 | выбросить после тега и перевода main |
| `cursor/setting-t2-reveal-c440` | 2026-10-17 | 0 | 832 | выбросить после тега и перевода main |
| `cursor/setting-t1-handoff-c440` | 2026-10-17 | 0 | 834 | выбросить после тега и перевода main |
| `cursor/setting-c9-tags-c440` | 2026-10-17 | 0 | 836 | выбросить после тега и перевода main |
| `cursor/setting-c8-links-v2-c440` | 2026-10-17 | 0 | 838 | выбросить после тега и перевода main |
| `cursor/setting-c7-gm-blocks-c440` | 2026-10-17 | 0 | 839 | выбросить после тега и перевода main |
| `cursor/setting-c6-mentions-c440` | 2026-10-17 | 0 | 840 | выбросить после тега и перевода main |
| `cursor/setting-c5-types-templates-c440` | 2026-10-17 | 0 | 841 | выбросить после тега и перевода main |
| `cursor/grimoire-custom-spell-b33f` | 2026-10-18 | 0 | 277 | выбросить после тега и перевода main |
| `cursor/legal-shell-prod-6151` | 2026-10-19 | 0 | 183 | выбросить после тега и перевода main |
| `cursor/human-race-apply-stuck-9502` | 2026-10-19 | 0 | 188 | выбросить после тега и перевода main |
| `cursor/feat-stealthy-3565` | 2026-10-20 | 0 | 126 | выбросить после тега и перевода main |
| `cursor/create-skills-equip-fix-1dbf` | 2026-10-20 | 0 | 130 | выбросить после тега и перевода main |
| `cursor/magic-initiate-spell-lists-10d6` | 2026-10-20 | 0 | 134 | выбросить после тега и перевода main |
| `cursor/monk-l20-automation-10d6` | 2026-10-20 | 0 | 136 | выбросить после тега и перевода main |
| `cursor/resource-pips-compact-10d6` | 2026-10-20 | 0 | 139 | выбросить после тега и перевода main |
| `cursor/onboarding-plan-37ff` | 2026-10-20 | 0 | 142 | выбросить после тега и перевода main |
| `cursor/sirocco-ranger-sync-e6f4` | 2026-10-20 | 0 | 155 | выбросить после тега и перевода main |
| `cursor/b2-anti-mirror-6151` | 2026-10-20 | 0 | 164 | выбросить после тега и перевода main |
| `cursor/b2-anti-mirror-plan-6151` | 2026-10-20 | 0 | 166 | выбросить после тега и перевода main |
| `cursor/defer-google-tg-oauth-6151` | 2026-10-20 | 0 | 167 | выбросить после тега и перевода main |
| `cursor/oauth-yandex-vk-6151` | 2026-10-20 | 0 | 169 | выбросить после тега и перевода main |
| `cursor/ragnar-sheet-bugs-ba21` | 2026-10-20 | 0 | 169 | выбросить после тега и перевода main |
| `cursor/b0-content-layer-6151` | 2026-10-20 | 0 | 181 | выбросить после тега и перевода main |
| `cursor/spells-feats-infusions-ab30` | 2026-10-21 | 0 | 57 | выбросить после тега и перевода main |
| `cursor/multiclass-spell-m1-c9ba` | 2026-10-21 | 0 | 60 | выбросить после тега и перевода main |
| `cursor/tiefling-hellish-rebuke-2-6682` | 2026-10-21 | 0 | 74 | выбросить после тега и перевода main |
| `cursor/bm-maneuvers-bridge-6682` | 2026-10-21 | 0 | 76 | выбросить после тега и перевода main |
| `cursor/satyr-rogue-init-speed-d602` | 2026-10-21 | 0 | 78 | выбросить после тега и перевода main |
| `cursor/versatile-weapons-grip-57bf` | 2026-10-21 | 0 | 81 | выбросить после тега и перевода main |
| `cursor/pack-qty-persist-2683` | 2026-10-21 | 0 | 86 | выбросить после тега и перевода main |
| `cursor/optional-class-features-8215` | 2026-10-21 | 0 | 90 | выбросить после тега и перевода main |
| `cursor/restore-consumables-grimoire-0bc3` | 2026-10-21 | 0 | 95 | выбросить после тега и перевода main |
| `cursor/create-feedback-ship-fc00` | 2026-10-21 | 0 | 107 | выбросить после тега и перевода main |
| `cursor/grimoire-prepare-home-3aba` | 2026-10-21 | 0 | 108 | выбросить после тега и перевода main |
| `cursor/consumables-tap-guard-plan-3b91` | 2026-10-21 | 0 | 111 | выбросить после тега и перевода main |
| `cursor/create-draft-inventory-fc00` | 2026-10-21 | 0 | 117 | выбросить после тега и перевода main |
| `cursor/create-setup-validation-fc00` | 2026-10-21 | 0 | 117 | выбросить после тега и перевода main |
| `cursor/pact-tome-grants-fc00` | 2026-10-21 | 0 | 117 | выбросить после тега и перевода main |
| `cursor/race-effects-contract-fc00` | 2026-10-21 | 0 | 117 | выбросить после тега и перевода main |
| `cursor/weapon-attacks-merge-fc00` | 2026-10-21 | 0 | 117 | выбросить после тега и перевода main |
| `cursor/vpn-https-stable-fab2` | 2026-10-21 | 0 | 118 | выбросить после тега и перевода main |
| `cursor/prepare-class-list-available-3aba` | 2026-10-21 | 0 | 123 | выбросить после тега и перевода main |
| `cursor/magic-initiate-feat-spells-merge-1cc0` | 2026-10-22 | 0 | 14 | выбросить после тега и перевода main |
| `cursor/magic-qa-fix-7fb8` | 2026-10-22 | 0 | 17 | выбросить после тега и перевода main |
| `cursor/teodor-spell-ship-7a4a` | 2026-10-22 | 0 | 37 | выбросить после тега и перевода main |
| `cursor/multiclass-chips-one-row-7a4a` | 2026-10-22 | 0 | 48 | выбросить после тега и перевода main |
| `cursor/spells-show-all-default-7a4a` | 2026-10-22 | 0 | 48 | выбросить после тега и перевода main |
| `cursor/teodor-spell-audit-ux-7a4a` | 2026-10-22 | 0 | 48 | выбросить после тега и перевода main |
| `cursor/wildfire-cast-druid-7a4a` | 2026-10-22 | 0 | 48 | выбросить после тега и перевода main |
| `cursor/artificer-infusions-full-ab30` | 2026-10-22 | 0 | 49 | выбросить после тега и перевода main |
| `cursor/amulet-devout-bonuses-9b04` | 2026-10-28 | 0 | 11 | выбросить после тега и перевода main |
| `cursor/ux-a1-magic-resources-8b9c` | 2026-11-11 | 0 | 0 | оставить, пока main не указывает на 44abfdb; имя ветки удалить после этого |
