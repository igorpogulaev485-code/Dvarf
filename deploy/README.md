# Prod deploy (Timeweb VPS)

**URL:** http://201.34.132.252/  
**Path on server:** `/opt/dvarf`  
**Compose file:** `docker-compose.prod.yml`  
**Current prod tip branch:** `cursor/srd-catalog-clean-4979`  
(обновляй эту строку после деплоя, который становится новым tip — также в `AGENTS.md` и skill `dvarf-prod-lineage`)

---

## ⚠️ Опасность overwrite (читать всем агентам)

`sync-and-up.sh` **полностью удаляет** содержимое `/opt/dvarf` (кроме `.env`) и заливает **весь** текущий workspace.

| Деплой с… | Результат на проде |
|-----------|-------------------|
| Полный tip + твой слайс | ОКый прод + новое |
| Тонкая ветка без кабинета/листа/лобби | Эти контуры **исчезают** |

Именно так 2026-10-06 пропали аватар, кабинет, лист P1–P6 и classic.

**Правила:** [`AGENTS.md`](../AGENTS.md) · [`.cursor/skills/dvarf-prod-lineage/SKILL.md`](../.cursor/skills/dvarf-prod-lineage/SKILL.md)

Перед деплоем обязательно:

1. Ветка = merge/rebase от **prod tip** (не параллельная развилка от старого Phase A).
2. `./deploy/preflight-prod.sh` — зелёный (вызывается из `sync-and-up.sh` автоматически).
3. После деплоя — проверить живые маркеры + обновить `PRODUCT_STATUS.md`.

Обход preflight только с явного ok Игоря: `DVARF_SKIP_PREFLIGHT=1`.

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

Do **not** commit the private key to git.  
Secret must include `BEGIN OPENSSH PRIVATE KEY` … `END` (не обрезанный base64).

## Agent deploy

```bash
# from full prod tip lineage
./deploy/preflight-prod.sh   # optional; sync-and-up runs it
./deploy/sync-and-up.sh
```

What `sync-and-up.sh` does:

1. Runs **preflight** (anti-overwrite markers)
2. Packs the repo (no `.git`, no `node_modules`, no local `.env`)
3. Extracts into `/opt/dvarf` while keeping the existing server `.env`
4. Runs `docker compose -f docker-compose.prod.yml --env-file .env up -d --build`
5. Curls `http://127.0.0.1/health` on the server (retries briefly)

Override host/key if needed:

```bash
DVARF_HOST=201.34.132.252 DVARF_SSH_KEY=~/.ssh/dvarf_timeweb ./deploy/sync-and-up.sh
```

## First-time / manual on server

```bash
cd /opt/dvarf
cp .env.prod.example .env   # fill real secrets once
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Migrations run automatically when the API container starts (`alembic upgrade head`).
