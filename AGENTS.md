# Правила для агентов (Dvarf) — читать первым

Этот файл — **жёсткий контракт**. Нарушение уже один раз сожгло прод (кабинет, аватар, лист P1–P6, classic).

Подробности: [`.cursor/skills/dvarf-prod-lineage/SKILL.md`](.cursor/skills/dvarf-prod-lineage/SKILL.md) · [`PRODUCT_STATUS.md`](PRODUCT_STATUS.md) · [`deploy/README.md`](deploy/README.md).

---

## 0. UI Kit — основа фронтенда (обязательно)

Любая работа в `frontend/` (UI, CSS, панели, кабинет, auth, лобби, create, print) идёт **только** по UI Kit.

| Что | Где |
|-----|-----|
| Desktop / tablet контракт (≥960) | [`docs/ui-kit/README.md`](docs/ui-kit/README.md) |
| Desktop доски | [`docs/ui-kit/boards/`](docs/ui-kit/boards/) |
| Desktop skill | [`.cursor/skills/dvarf-ui-kit/SKILL.md`](.cursor/skills/dvarf-ui-kit/SKILL.md) |
| Desktop каталог | [`docs/ui-kit/boards/dvarf-ui-kit-catalog-final.jpg`](docs/ui-kit/boards/dvarf-ui-kit-catalog-final.jpg) |
| **Mobile контракт (&lt;960)** | [`docs/ui-kit-mobile/README.md`](docs/ui-kit-mobile/README.md) |
| Mobile skill | [`.cursor/skills/dvarf-ui-kit-mobile/SKILL.md`](.cursor/skills/dvarf-ui-kit-mobile/SKILL.md) |
| Mobile план | [`docs/redesign/MOBILE_REDESIGN_PLAN.md`](docs/redesign/MOBILE_REDESIGN_PLAN.md) |

**Жёстко:**

- Тема аккаунта = только `--accent` / `--accent-soft`; дефолт **Листва** `#5a6b3d`.
- 6 тем (= цвета характеристик): медь / хвоя / охра / чернила / листва / слива.
- Характеристики по умолчанию вариант A (identity); в кабинете можно выбрать «Цвет темы».
- Нейтрали (`--panel #fbf7ec` …) и `--danger` общие.
- Display: Source Serif 4 · UI: IBM Plex Sans.
- **Desktop kit не менять под мобилку** — мобильные паттерны только в `docs/ui-kit-mobile/`.
- На телефоне: одна сцена + Bottom Scene Nav + паритет всех функций стола (см. mobile kit).
- Новый паттерн → доска/секция в нужном ките → ok Игоря → код. Атомы — из кита.

Запрещено вводить параллельную палитру «на вкус» или кодить UI в обход досок.

---

## 1. Прод = ровно то, что в твоём дереве при деплое

`./deploy/sync-and-up.sh` **полностью затирает** `/opt/dvarf` (кроме `.env`) и заливает **весь** текущий workspace.

- Деплой с «тонкой» ветки = **удаление** всего, чего в ней нет.
- «У меня в PR фича есть» ≠ «на проде она останется после чужого деплоя».

**Запрещено** деплоить с ветки, которая не содержит актуальный prod tip.

---

## 2. Одна линия прода (prod tip)

| Поле | Значение |
|------|----------|
| Prod tip (сейчас) | `cursor/forms-adapt-tip-ab5e` |
| URL | http://201.34.132.252/ |
| Статус фич | только [`PRODUCT_STATUS.md`](PRODUCT_STATUS.md) после **проверки** живого сервера |

**Источник истины для tip перед деплоем — живой сервер**, не устаревшая копия `AGENTS.md` в своей ветке.  
`deploy/preflight-live.sh` читает tip с VPS и требует: `origin/<live-tip>` — ancestor of `HEAD`.

Перед работой над продом / перед деплоем:

1. `git fetch origin`
2. Взять **prod tip** с живого `/opt/dvarf/AGENTS.md` (или из таблицы выше, если только что сверял сервер).
3. Свою ветку строить **от tip**: `git checkout -b cursor/<slice>-acbe origin/<prod-tip>`  
   или влить tip в свою ветку: `git merge origin/<prod-tip>` (без потери чужих файлов).
4. Убедиться, что маркер-файлы tip на месте (см. preflight).

После успешного деплоя своего слайса, который **становится новым tip**:

- обнови tip в этом файле, в skill `dvarf-prod-lineage`, в `deploy/README.md`, в `PRODUCT_STATUS.md`;
- напиши в PR: «это новый prod tip».

### Запрещённые антипаттерны (уже жгли часы релизов)

| Нельзя | Почему | Что делать |
|--------|--------|------------|
| Деплой с orphan / пустым `merge-base` vs tip | Час cherry-pick, потеря 30+ коммитов прода | `git merge origin/<live-tip>` или ветка заново от tip |
| Заливать дерево без миграции, которая уже в prod DB | API падает на `alembic upgrade` | Подтянуть файл ревизии с tip до деплоя |
| Вернуть `docker compose up -d --build` / node Dockerfile на VPS | Hub/BuildKit висят 27–60+ мин | Оставить `remote-up.sh` + nginx+dist prebuild |
| Считать tip = то, что написано в своей старой ветке | Tip уже сменился на сервере | Сверить live AGENTS / `preflight-live` |
| Две параллельные «я tip» ветки без merge | 2026-10-13: `cabinet-theme` (без ЕЩЁ) затёрт линией `create-pipeline`→`deploy-guardrails` | Перед деплоем `git merge` **всех** линий, которые уже писали «на проде: да» / LOCK |
| Писать tip только в `AGENTS.md` своей ветки | Другой агент деплоит от устаревшего tip | Единый `deploy/prod-tip` + live disk markers в `preflight-live` |
| Документы UI Kit LOCK без кода в tip | На проде «Сцена ЕЩЁ \| нет», а в бандле кнопка ЕЩЁ | Preflight требует `IdentityDialog.tsx` и запрещает `label: 'ЕЩЁ'` |

---

## 3. Чеклист ДО `sync-and-up.sh`

Обязательно (вызывается из `sync-and-up` само):

```bash
./deploy/preflight-prod.sh   # файлы + fast-deploy path
./deploy/preflight-live.sh   # live tip ancestry + alembic vs DB (нужен SSH)
```

Падает, если: нет контуров прода; нет `remote-up`; frontend снова на node; **live tip не ancestor**; **в БД alembic-ревизия, которой нет в дереве**.  
Обход только с явного ok Игоря: `DVARF_SKIP_PREFLIGHT=1` и/или `DVARF_SKIP_LIVE_PREFLIGHT=1`.

Дополнительно глазами:

- [ ] Ветка = merge/rebase **live tip**, не cherry-pick сшивка
- [ ] `PRODUCT_STATUS.md` актуален; не пишешь «на проде: да» заранее
- [ ] Нет удаления чужих роутов/панелей / `deploy/remote-up.sh`

---

## 4. Чеклист ПОСЛЕ деплоя

1. `curl -fsS http://201.34.132.252/health`
2. Проверь **живые маркеры** в бандле/на диске (не только свой слайс):
   - кабинет / аватар / лобби / лист (мультикласс, концентрация, classic)
   - Wave A: **нет** кнопки «ЕЩЁ» в `.play-desk__mode`; есть `IdentityDialog` / клик по аватару → Основное
   - Create pipeline + `deploy/remote-up.sh` на диске
3. Обнови `PRODUCT_STATUS.md` **и** `deploy/prod-tip` **по факту проверки** (да/нет, ветка, дата).
4. Если что-то пропало — **стоп**, восстанавливай до tip+твой слайс, не пиши что «всё ок».

**Запрещено** писать в `PRODUCT_STATUS` «на проде: да», если на сервере файла/строки UI нет.  
**Запрещено** объявлять «новый prod tip» в ветке, которая не содержит merge предыдущего live tip **и** параллельных Wave A LOCK-линий.

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

## 6b. Сообщение для друзей

Если Игорь просит **«сообщение для друзей»** / пост / анонс в стандартном формате — пиши готовый текст по skill:

→ [`.cursor/skills/dvarf-friends-announce/SKILL.md`](.cursor/skills/dvarf-friends-announce/SKILL.md)

Не подменяй changelog’ом. Цифры и tip — после проверки прода (или явно пометь черновик).

---

## 7. Секреты

Не коммитить `.env`. Cloud Agent: secret `DVARF_SSH_PRIVATE_KEY` = полный OpenSSH PEM (`BEGIN`…`END`).
