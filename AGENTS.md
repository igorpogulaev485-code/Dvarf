# Правила для агентов (Dvarf) — читать первым

Этот файл — **жёсткий контракт**. Нарушение уже один раз сожгло прод (кабинет, аватар, лист P1–P6, classic).

Подробности: [`.cursor/skills/dvarf-prod-lineage/SKILL.md`](.cursor/skills/dvarf-prod-lineage/SKILL.md) · [`PRODUCT_STATUS.md`](PRODUCT_STATUS.md) · [`deploy/README.md`](deploy/README.md).

---

## 1. Прод = ровно то, что в твоём дереве при деплое

`./deploy/sync-and-up.sh` **полностью затирает** `/opt/dvarf` (кроме `.env`) и заливает **весь** текущий workspace.

- Деплой с «тонкой» ветки = **удаление** всего, чего в ней нет.
- «У меня в PR фича есть» ≠ «на проде она останется после чужого деплоя».
- «Моя ветка новее по дате» ≠ «в ней есть tip» — опоздавший слайс без merge tip **сожжёт** то, что уже на проде (так 2026-10-12 mobile tip затёрли деплоем старого desktop catch-up).

**Запрещено** деплоить с ветки, которая не является потомком актуального prod tip (`git merge-base --is-ancestor`).

---

## 2. Одна линия прода (prod tip)

| Поле | Значение |
|------|----------|
| Prod tip (сейчас) | `cursor/play-desk-merge-mobile-e788` |
| Файл tip для скриптов | [`deploy/prod-tip`](deploy/prod-tip) |
| Реестр неубиваемых фич | [`docs/FEATURE_LOCK.md`](docs/FEATURE_LOCK.md) (preflight парсит Machine locks) |
| URL | http://201.34.132.252/ |
| Статус фич | только [`PRODUCT_STATUS.md`](PRODUCT_STATUS.md) после **проверки** живого сервера |

Перед работой над продом / перед деплоем:

1. `git fetch origin`
2. Взять **prod tip** из `deploy/prod-tip` (дублируется в таблице выше / `PRODUCT_STATUS` / skill).
3. Свою ветку строить **от tip**: `git checkout -b cursor/<slice>-acbe origin/<prod-tip>`  
   или влить tip в свою ветку: `git merge origin/<prod-tip>` (без потери чужих файлов).
4. Убедиться, что `./deploy/preflight-prod.sh` зелёный: **ancestry tip + маркеры** (mobile density, desktop catch-up, lobby, cabinet, sheet, classic).

После успешного деплоя своего слайса, который **становится новым tip**:

- обнови tip в `deploy/prod-tip`, в этом файле, в skill `dvarf-prod-lineage`, в `deploy/README.md`, в `PRODUCT_STATUS.md`;
- напиши в PR: «это новый prod tip».

---

## 3. Чеклист ДО `sync-and-up.sh` (обязательный)

Обязательно:

```bash
./deploy/preflight-prod.sh
```

Скрипт **падает**, если:

1. `HEAD` **не содержит** объявленный tip из `deploy/prod-tip` (не потомок tip);
2. нет строк из [`docs/FEATURE_LOCK.md`](docs/FEATURE_LOCK.md) (Machine locks: lobby, cabinet, sheet, classic, mobile, desktop…).

`sync-and-up.sh` вызывает preflight сам. Обход только так: `DVARF_SKIP_PREFLIGHT=1` — и только с явного ok Игоря.  
Новый неубиваемый контур → **строка в FEATURE_LOCK** в том же PR.

Дополнительно глазами:

- [ ] Ветка = merge/rebase **prod tip**, не параллельная «пустая» развилка и не старый tip без поздних mobile/desktop коммитов
- [ ] Конфликты решены с сохранением **и** телефона, **и** стола ≥960px — не «взять нашу сторону целиком»
- [ ] `PRODUCT_STATUS.md` актуален; не пишешь «на проде: да» заранее
- [ ] Нет удаления чужих роутов/панелей «потому что мне не нужны»

---

## 4. Чеклист ПОСЛЕ деплоя

1. `curl -fsS http://201.34.132.252/health`
2. Проверь **живые маркеры** в бандле/на диске (не только свой слайс):
   - кабинет / аватар / лобби / лист (мультикласс, концентрация, classic)
3. Обнови `PRODUCT_STATUS.md` **по факту проверки** (да/нет, ветка, дата).
4. Если что-то пропало — **стоп**, восстанавливай до tip+твой слайс, не пиши что «всё ок».

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

## 6b. Сообщение для друзей

Если Игорь просит **«сообщение для друзей»** / пост / анонс в стандартном формате — пиши готовый текст по skill:

→ [`.cursor/skills/dvarf-friends-announce/SKILL.md`](.cursor/skills/dvarf-friends-announce/SKILL.md)

Не подменяй changelog’ом. Цифры и tip — после проверки прода (или явно пометь черновик).

---

## 7. Секреты

Не коммитить `.env`. Cloud Agent: secret `DVARF_SSH_PRIVATE_KEY` = полный OpenSSH PEM (`BEGIN`…`END`).
