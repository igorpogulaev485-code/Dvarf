# Prod deploy (Timeweb VPS)

**URL:** http://201.34.132.252/  
**Path on server:** `/opt/dvarf`  
**Compose file:** `docker-compose.prod.yml`  
**Current prod tip branch:** `cursor/fast-docker-release-93e5`  
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
2. **Prebuilds** the SPA on the agent (`npm ci && npm run build` → `frontend/dist`)
3. Packs the repo **including `frontend/dist`** (no `.git`, no `node_modules`, no local `.env`)
4. Extracts into `/opt/dvarf` while keeping the existing server `.env`
5. Runs `deploy/remote-up.sh` on the VPS:
   - rebuilds **only** `api` / `web` when fingerprints change
   - `docker compose build --pull=false` (no Docker Hub refresh every release)
   - BuildKit with **480s timeout**, then legacy builder fallback
   - `up -d --pull never` + `/health` check

Fingerprints live in `/var/lib/dvarf/deploy-fingerprints` (outside the wiped tree).

### Why releases used to take ~1h

Old path: every deploy ran full `docker compose up -d --build` on the VPS (pull `node` + `npm ci` + `tsc` + `pip`, refresh Hub). BuildKit on this host often flakes (`only one connection allowed`); Hub timeouts stacked into hour-long hangs. Agents already worked around it by injecting `dist` by hand.

### Knobs

| Env | Meaning |
|-----|---------|
| `DVARF_SKIP_FRONTEND_BUILD=1` | Reuse existing `frontend/dist` (must contain `index.html`) |
| `DVARF_FRONTEND_DOCKERFILE=Dockerfile.full` | Build SPA inside Docker on the VPS (slow path) |
| `DVARF_BUILD_TIMEOUT=480` | Max seconds per compose build attempt |

Override host/key if needed:

```bash
DVARF_HOST=201.34.132.252 DVARF_SSH_KEY=~/.ssh/dvarf_timeweb ./deploy/sync-and-up.sh
```

## First-time / manual on server

```bash
cd /opt/dvarf
cp .env.prod.example .env   # fill real secrets once
# Prefer agent sync-and-up. Manual:
# 1) copy a prebuilt frontend/dist here, then:
bash deploy/remote-up.sh
```

Migrations run automatically when the API container starts (`alembic upgrade head`).
