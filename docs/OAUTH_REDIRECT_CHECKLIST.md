# Чеклист: redirect URI в кабинетах Яндекс / VK

После деплоя слайса OAuth пропиши **точно** эти адреса (HTTPS):

## Яндекс OAuth (https://oauth.yandex.ru/)

Callback URL:

```
https://creed20.tech/auth/oauth/yandex/callback
```

На VPS в `/opt/dvarf/.env` (или оставь пустым — подставится из `APP_PUBLIC_URL`):

```
YANDEX_REDIRECT_URI=https://creed20.tech/auth/oauth/yandex/callback
```

## VK ID

В настройках приложения VK ID — Trusted redirect URL:

```
https://creed20.tech/auth/oauth/vk/callback
```

```
VK_REDIRECT_URI=https://creed20.tech/auth/oauth/vk/callback
```

После правки `.env` — пересоздать api:

```
cd /opt/dvarf && docker compose -f docker-compose.prod.yml --env-file .env up -d --force-recreate --no-deps api
```

**Не коммить** секреты client_secret в git.
