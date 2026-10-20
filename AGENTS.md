# Правила для агентов (Dvarf) — читать первым

Этот файл — **жёсткий контракт**. Нарушение уже **дважды** сожгло прод:

- 2026-10-06: кабинет, аватар, лист P1–P6, classic
- **2026-10-17 ~05:33 UTC:** tip `setting-t5-journal-table` с линии C4 затёр Play Desk (шапка планшета / hot-bar, ~145→30 файлов) и полный classic (17→3), хотя сеттинг C5–T5 сам по себе был ок

Подробности: [`.cursor/skills/dvarf-prod-lineage/SKILL.md`](.cursor/skills/dvarf-prod-lineage/SKILL.md) · [`docs/INCIDENT_OVERWRITE_2026-10-17.md`](docs/INCIDENT_OVERWRITE_2026-10-17.md) · [`docs/CLASSIC_SHEET_PROD.md`](docs/CLASSIC_SHEET_PROD.md) · [`PRODUCT_STATUS.md`](PRODUCT_STATUS.md) · [`deploy/README.md`](deploy/README.md).

**Сеттинг / classic / tablet:** доработки ок, деплой **только** после `git merge origin/<live-tip>`. Сам слайс не имеет права затирать чужие контуры — см. инцидент 2026-10-17.

---

## 1. Прод = ровно то, что в твоём дереве при деплое

`./deploy/sync-and-up.sh` **полностью затирает** `/opt/dvarf` (кроме `.env`) и заливает **весь** текущий workspace.

- Деплой с «тонкой» ветки = **удаление** всего, чего в ней нет.
- «У меня в PR фича есть» ≠ «на проде она останется после чужого деплоя».

**Запрещено** деплоить с ветки, которая не содержит актуальный **живой** prod tip (читается с VPS, не из устаревшего AGENTS в своей feature-ветке).

**Запрещено** вести «вторую линию tip» (пример: сеттинг от C4, пока live tip = classic/tablet). Новые слайсы — **только** `git merge origin/<live-tip>` в свою ветку **до** любого `sync-and-up`.

**Запрещено** `DVARF_SKIP_PREFLIGHT=1` / `DVARF_SKIP_LIVE_PREFLIGHT=1` без явного ok Игоря в чате этого деплоя.

---

## 2. Одна линия прода (prod tip)

| Поле | Значение |
|------|----------|
| Prod tip (сейчас) | `cursor/create-skills-equip-fix-1dbf` |
| URL | http://201.34.132.252/ |
| Статус фич | только [`PRODUCT_STATUS.md`](PRODUCT_STATUS.md) после **проверки** живого сервера |

Перед работой над продом / перед деплоем:

1. `git fetch origin`
2. Взять **prod tip** из таблицы выше (или из `PRODUCT_STATUS` / skill, если tip обновили).
3. Свою ветку строить **от tip**: `git checkout -b cursor/<slice>-acbe origin/<prod-tip>`  
   или влить tip в свою ветку: `git merge origin/<prod-tip>` (без потери чужих файлов).
4. Убедиться, что маркер-файлы tip на месте (см. preflight).

После успешного деплоя своего слайса, который **становится новым tip**:

- обнови tip в этом файле, в skill `dvarf-prod-lineage`, в `deploy/README.md`, в `PRODUCT_STATUS.md`;
- напиши в PR: «это новый prod tip».

---

## 3. Чеклист ДО `sync-and-up.sh`

Обязательно:

```bash
./deploy/preflight-prod.sh
./deploy/preflight-live.sh   # tip на VPS — ancestor of HEAD; alembic revision есть в дереве
```

`preflight-prod` падает, если нет обязательных файлов текущего прода (lobby + cabinet + avatar + sheet + forms-adapt маркеры + classic + бой/вики).  
`preflight-live` читает tip/alembic **с сервера** и ловит orphan-ветки / missing migration files.  
`sync-and-up.sh` вызывает оба. Обход: `DVARF_SKIP_PREFLIGHT=1` и/или `DVARF_SKIP_LIVE_PREFLIGHT=1` — только с явного ok Игоря.

Единый файл tip: `deploy/prod-tip` (сейчас = ветка в таблице выше).

Дополнительно глазами:

- [ ] Ветка содержит merge/rebase **prod tip**, не параллельную «пустую» развилку от старого Phase A
- [ ] `PRODUCT_STATUS.md` актуален; не пишешь «на проде: да» заранее
- [ ] Нет удаления чужих роутов/панелей «потому что мне не нужны»
- [ ] Сиды `backend/data/` (классы/фиты/расы) на месте — иначе свежая БД не воспроизведёт каталог

---

## 4. Чеклист ПОСЛЕ деплоя

1. `curl -fsS http://201.34.132.252/health`
2. Проверь **живые маркеры** в бандле/на диске (не только свой слайс):
   - кабинет / аватар / лобби
   - **Play Desk:** `PlayDeskHeader`, `PlayDeskHotBar`, прыжки, spend-пикеры
   - **Classic:** `ClassicPrint2024`, переключатель 2014/2024
   - бой на сессии / вики C5–T5 (QuickCreate, handoff, lore panel)
3. Счётчики: `characters/*.tsx` ≫ 80, `classicSheet/*` ≫ 10 — иначе снова тонкая заливка
4. Обнови `PRODUCT_STATUS.md` **по факту проверки** (да/нет, ветка, дата).
5. Если что-то пропало — **стоп**, восстанавливай до tip+твой слайс, не пиши что «всё ок».

**Запрещено** писать в `PRODUCT_STATUS` «на проде: да», если на сервере файла/строки UI нет.

---

## 5. Параллельные агенты

| Можно параллельно | Нельзя |
|-------------------|--------|
| Разные PR/ветки от **одного tip** | Каждый деплоит свою развилку на Timeweb |
| Merge tip → своя ветка перед деплоем | Деплой «только моих файлов» скриптом, который трёт дерево |
| Один агент — один деплой после интеграции | Два агента деплоят подряд с разных base |

Если твой слайс и чужой оба готовы — **слить в одну ветку от tip**, потом один деплой.

---

## 6. План → ok → код

Как раньше: короткий план → явное ok Игоря → код / commit / push / PR.  
Skill: [`.cursor/skills/dvarf-dev-workflow/SKILL.md`](.cursor/skills/dvarf-dev-workflow/SKILL.md).

Деплой на Timeweb — **только** по явной просьбе («залей на сервер»).

---

## 7. Секреты

Не коммитить `.env`. Cloud Agent: secret `DVARF_SSH_PRIVATE_KEY` = полный OpenSSH PEM (`BEGIN`…`END`).

---

## 8. UI Kit LOCK — нельзя ломать визуал прода

Контракт: [`docs/ui-kit/README.md`](docs/ui-kit/README.md) + skill [`dvarf-ui-kit`](.cursor/skills/dvarf-ui-kit/SKILL.md).

**Жёстко запрещено** без явного ok Игоря:

1. Заменять / «откатывать» `frontend/src/index.css` целиком с другой ветки (forms-adapt, orphan kit, «чистый» CSS).
2. Удалять блок с маркером `UI KIT LOCK — Lobby Hub` (хаб лобби A1, стол сессии, дневник/чаты/заметки, вики, артефакты).
3. Менять LOCK-паттерны Wave A стола (шапка, спеллы, атаки, hot-bar, identity, companions…) вразрез с §2b–2l.
4. Деплоить дерево, где preflight не находит CSS-маркеры лобби/вики (см. `deploy/preflight-prod.sh`).

Если нужен CSS с другой ветки — **мержить классы**, не checkout файла. После любого restyle `index.css`:  
`rg 'lobby-member-grid|lobby-hub-tab\.is-active|setting-wiki|UI KIT LOCK — Lobby Hub' frontend/src/index.css`  
должно быть зелёным, иначе визуал лобби снова «поедет».

---

## 8a. Play Desk / лист персонажа — единственный вид (LOCK)

Канон: [`docs/PLAY_DESK_SOURCE_OF_TRUTH.md`](docs/PLAY_DESK_SOURCE_OF_TRUTH.md) + доски `desk-header-lock` / `desk-chrome` / `spells` + **живой прод** http://201.34.132.252/

**Эталон листа = полный Play Desk** (`PlayDeskHeader` + сцены + rail + hot-bar + `MinimalSheetEditor`).  
Не эталон: `main`-SPA, classic-бланк как digital, ЛСС-скрин как layout, самодельные `/dev` «столы».

**Запрещено всем агентам** без явного ok Игоря:

1. Рисовать / коммитить **альтернативный вид** листа или «упрощённый стол персонажа».
2. Делать mock/preview-страницы с фальшивой шапкой персонажа и выдавать их за путь на проде.
3. Класть в ответ Игорю скрины такого фейка. Допустимы только: **prod** · **полный tip Play Desk** · **dialog-only** · **ui-kit board** (подпись обязательна).
4. Копировать визуал листа из ЛСС / других приложений.

Нарушение = регрессия прода (уже было). При сомнении — открой прод и доску, не выдумывай layout.
