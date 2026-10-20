# Чеклист: OAuth Яндекс / VK на creed20.tech

**Статус (прод):** код + redirect URI залиты · tip `cursor/oauth-yandex-vk-6151`  
**Блокер:** `YANDEX_CLIENT_ID/SECRET` и `VK_CLIENT_ID/SECRET` в `/opt/dvarf/.env` сейчас **пустые** → `/auth/oauth/*/start` отдаёт `configured:false`.

---

## 1. Callback URL в кабинетах (уже прописаны на VPS)

### Яндекс OAuth (https://oauth.yandex.ru/)

```
https://creed20.tech/auth/oauth/yandex/callback
```

### VK ID — Trusted redirect URL

```
https://creed20.tech/auth/oauth/vk/callback
```

---

## 2. Секреты на VPS

В `/opt/dvarf/.env` нужны четыре значения из кабинетов:

```
YANDEX_CLIENT_ID=…
YANDEX_CLIENT_SECRET=…
VK_CLIENT_ID=…
VK_CLIENT_SECRET=…
```

Redirect уже стоят:

```
YANDEX_REDIRECT_URI=https://creed20.tech/auth/oauth/yandex/callback
VK_REDIRECT_URI=https://creed20.tech/auth/oauth/vk/callback
```

После вставки — пересоздать api:

```
cd /opt/dvarf && docker compose -f docker-compose.prod.yml --env-file .env up -d --force-recreate --no-deps api
```

Проверка:

```
curl -sS https://creed20.tech/auth/oauth/yandex/start   # configured:true
curl -sS https://creed20.tech/auth/oauth/vk/start
```

**Не коммить** client_secret в git.

---

## 3. Как передать агенту

Пришли в чат четыре строки (как с SMTP-паролем) — агент сам пропишет `.env` и пересоздаст api.
