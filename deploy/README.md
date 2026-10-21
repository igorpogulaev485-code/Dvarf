<!-- See docs/INCIDENT_OVERWRITE_2026-10-17.md -->
# Prod deploy (Timeweb VPS)

**Public URL:** https://creed20.tech/ (канон для браузера и друзей)  
**SSH / deploy host:** `201.34.132.252` (HTTP по IP редиректит на creed20 — не открывать как прод)  
**Path on server:** `/opt/dvarf`  
**Compose file:** `docker-compose.prod.yml`  
**Current prod tip branch:** `cursor/versatile-weapons-grip-57bf`  
**Edge:** Caddy + Let’s Encrypt (`web` only on docker network)  
(обновляй tip после деплоя, который становится новым tip — также в `AGENTS.md` и skill `dvarf-prod-lineage`)

---

## ⚠️ Опасность overwrite (читать всем агентам)

`sync-and-up.sh` **полностью удаляет** содержимое `/opt/dvarf` (кроме `.env`) и заливает **весь** текущий workspace.

| Деплой с… | Результат на проде |
|-----------|-------------------|
| Полный tip + твой слайс | ОКый прод + новое |
| Тонкая ветка без кабинета/листа/лобби | Эти контуры **исчезают** |

Именно так 2026-10-06 пропали аватар, кабинет, лист P1–P6 и classic.  
**2026-10-17:** tip сеттинга T5 с линии C4 затёр Play Desk + полный classic — см. [`docs/INCIDENT_OVERWRITE_2026-10-17.md`](../docs/INCIDENT_OVERWRITE_2026-10-17.md).  
Classic ↔ продукт: [`docs/CLASSIC_SHEET_PROD.md`](../docs/CLASSIC_SHEET_PROD.md).

**Правила:** [`AGENTS.md`](../AGENTS.md) · [`.cursor/skills/dvarf-prod-lineage/SKILL.md`](../.cursor/skills/dvarf-prod-lineage/SKILL.md)

**Сеттинг не ломает прод:** ветка слайса C5–T5 / дальше — только от live tip; preflight обязан видеть PlayDeskHotBar + ClassicPrint2024 + SettingQuickCreate вместе.

Перед деплоем обязательно:

1. Ветка = merge/rebase от **prod tip** (`deploy/prod-tip` + таблица в `AGENTS.md`).
2. `./deploy/preflight-prod.sh` — зелёный (маркеры дерева).
3. `./deploy/preflight-live.sh` — зелёный (tip на VPS ancestor of HEAD + alembic file in tree).
4. После деплоя — проверить живые маркеры + обновить `PRODUCT_STATUS.md`.

Оба preflight вызывает `sync-and-up.sh`. Обход только с явного ok Игоря:  
`DVARF_SKIP_PREFLIGHT=1` и/или `DVARF_SKIP_LIVE_PREFLIGHT=1`.

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
./deploy/preflight-prod.sh   # optional; sync-and-up runs both
./deploy/preflight-live.sh
./deploy/sync-and-up.sh
```

What `sync-and-up.sh` does:

1. Runs **preflight-prod** (anti-overwrite markers) + **preflight-live** (VPS tip/alembic)
2. Packs the repo (no `.git`, no `node_modules`, no local `.env`)
3. Extracts into `/opt/dvarf` while keeping the existing server `.env`
4. Runs `docker compose -f docker-compose.prod.yml --env-file .env up -d --build`
5. Curls `http://127.0.0.1/health` on the server (retries briefly)

Seed JSON for classes/feats/races/gear lives under `backend/data/`.  
Orphan alembic files from the old forms-adapt id-collision lineage are archived at  
`backend/alembic/archive_forms_adapt_versions/` (not loaded by alembic).

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
