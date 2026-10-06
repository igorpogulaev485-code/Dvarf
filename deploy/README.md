# Prod deploy (Timeweb VPS)

**URL:** http://201.34.132.252/  
**Path on server:** `/opt/dvarf`  
**Compose file:** `docker-compose.prod.yml`

## Product note (cabinet)

Cabinet MVP is live except Yandex/VK link-unlink. Prod mail uses Mail.ru SMTP from `/opt/dvarf/.env` (`AUTH_EMAIL_STUB=false`). Timeweb may re-block outbound 465/587 after a server config change.

## Rule (with Игорь)

1. Code slice: plan → ok → commit → push → PR.
2. Deploy to Timeweb **only** on explicit command («залей на сервер» / deploy).
3. Never commit or overwrite server `/opt/dvarf/.env`.
4. After deploy: check `/health`, report URL + what shipped.

## Shared SSH key for all Cloud Agents

Cloud Agent VMs do **not** share `~/.ssh` between runs. Use **one** keypair:

1. Public key — permanently on the Timeweb VPS (authorized_keys).
2. Private key — Cursor Environment Secret `DVARF_SSH_PRIVATE_KEY` (full OpenSSH PEM).

`deploy/sync-and-up.sh` writes the secret to `~/.ssh/dvarf_timeweb` if the file is missing.

Do **not** commit the private key to git.

## Agent deploy

```bash
./deploy/sync-and-up.sh
```

What it does:

1. Packs the repo (no `.git`, no `node_modules`, no local `.env`)
2. Extracts into `/opt/dvarf` while keeping the existing server `.env`
3. Runs `docker compose -f docker-compose.prod.yml --env-file .env up -d --build`
4. Curls `http://127.0.0.1/health` on the server (retries briefly)

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
