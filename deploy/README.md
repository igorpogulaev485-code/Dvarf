# Prod deploy (Timeweb VPS)

```bash
# on the server, in /opt/dvarf
cp .env.prod.example .env   # fill secrets
docker compose -f docker-compose.prod.yml up -d --build
```

App URL without domain: `http://<server-ip>/`
