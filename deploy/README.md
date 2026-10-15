# Prod deploy (Timeweb VPS)

**URL:** http://201.34.132.252/  
**Path on server:** `/opt/dvarf`  
**Compose file:** `docker-compose.prod.yml`  
**Current prod tip branch:** `cursor/forms-adapt-tip-ab5e`  
(обновляй эту строку после деплоя, который становится новым tip — также в `AGENTS.md` и skill `dvarf-prod-lineage`)

---

## ⚠️ Опасность overwrite (читать всем агентам)

`sync-and-up.sh` **полностью удаляет** содержимое `/opt/dvarf` (кроме `.env`) и заливает **весь** текущий workspace.

| Деплой с… | Результат на проде |
|-----------|-------------------|
| Полный tip + твой слайс | ОКый прод + новое |
| Тонкая / orphan ветка | Контуры **исчезают** или API падает на alembic |

**Правила:** [`AGENTS.md`](../AGENTS.md) · [`.cursor/skills/dvarf-prod-lineage/SKILL.md`](../.cursor/skills/dvarf-prod-lineage/SKILL.md)

Перед деплоем:

1. Ветка = merge от **live tip** (с сервера), не cherry-pick сшивка.
2. `preflight-prod.sh` + `preflight-live.sh` зелёные (вызываются из `sync-and-up`).
3. После — живые маркеры + `PRODUCT_STATUS.md`.

Обход только с явного ok Игоря: `DVARF_SKIP_PREFLIGHT=1` / `DVARF_SKIP_LIVE_PREFLIGHT=1`.

---

## Rule (with Игорь)

1. Code slice: plan → ok → commit → push → PR.
2. Deploy to Timeweb **only** on explicit command («залей на сервер» / deploy).
3. Never commit or overwrite server `/opt/dvarf/.env`.
4. After deploy: check `/health`, **verify other contours still present**, report URL + what shipped, update tip if needed.

## Shared SSH key for all Cloud Agents

Cloud Agent VMs do **not** share `~/.ssh` between runs. Use **one** keypair:

1. Public key — permanently on the Timeweb VPS (authorized_keys).
2. Private key — Cursor Environment Secret `DVARF_SSH_PRIVATE_KEY` (full OpenSSH PEM).

`deploy/sync-and-up.sh` writes the secret to `~/.ssh/dvarf_timeweb` if the file is missing.

## Agent deploy

```bash
./deploy/sync-and-up.sh
```

Что делает:

1. `preflight-prod.sh` — контуры + fast-deploy path (`remote-up`, nginx+dist)
2. `preflight-live.sh` — live tip ancestry + alembic revision из prod DB есть в дереве
3. Prebuild SPA на агенте (`npm ci && npm run build`)
4. Pack (включая `frontend/dist`) → `/opt/dvarf` (`.env` сохраняется)
5. `remote-up.sh` на VPS: rebuild только по fingerprint, `--pull=false`, legacy builder, timeout

### Почему нельзя возвращать старый путь

Старый `docker compose up -d --build` на VPS тянул `node` + `npm ci` + Hub и зависал на 27–60+ минут.  
Orphan-ветки без tip давали пустой merge-base и час cherry-pick; отсутствие alembic-файла при живой ревизии в БД роняло API.

### Knobs

| Env | Meaning |
|-----|---------|
| `DVARF_SKIP_FRONTEND_BUILD=1` | Уже есть свежий `frontend/dist` |
| `DVARF_FRONTEND_DOCKERFILE=Dockerfile.full` | Медленный build SPA на VPS |
| `DVARF_BUILD_TIMEOUT=480` | Лимит compose build |
| `DVARF_SKIP_LIVE_PREFLIGHT=1` | Только с ok Игоря |

```bash
DVARF_HOST=201.34.132.252 DVARF_SSH_KEY=~/.ssh/dvarf_timeweb ./deploy/sync-and-up.sh
```

## First-time / manual on server

```bash
cd /opt/dvarf
cp .env.prod.example .env   # fill real secrets once
# Prefer agent sync-and-up. Manual with prebuilt dist:
bash deploy/remote-up.sh
```

Migrations run automatically when the API container starts (`alembic upgrade head`).
