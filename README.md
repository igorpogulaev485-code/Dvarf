# Dvarf (ветка main — не прод)

⚠️ **Настоящий прод — Timeweb VPS:** http://201.34.132.252/  
Деплой только через `./deploy/sync-and-up.sh` с **prod tip** ветки (см. `AGENTS.md` / `deploy/README.md` в продуктовой линии).

**Запрещено** заливать на GitHub Pages (`gh-pages`, `*.github.io/Dvarf/`) — это не прод. Workflow Pages удалён специально.

Эта `main` сейчас — упрощённый SPA-каркас (localStorage). Продуктовый код (auth, кабинет, лист P1–P6, Docker) живёт в feature-ветках от prod tip, не здесь.

**User flow продукта:** [`USER_FLOW.md`](USER_FLOW.md) — роли, маршруты, сценарии (аккаунт → персонажи → create → лист/play desk → лобби).  
См. также открытые PR и `PRODUCT_STATUS.md` в tip-ветках (напр. `cursor/play-desk-layout-e788`, `cursor/mobile-play-desk-2c91`).
