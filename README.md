# Dvarf

Свой тулинг для DnD (не форк и не обёртка над Long Story Short).

**North star MVP:** лист персонажа → фрейм пачки → подготовка боя → лут.

## Принципы

- Итерации: сначала короткий план → ok → код / commit / push / PR
- Глобальной роли «мастер / игрок» нет; мастер появляется в контексте пачки
- Биллинг позже; auth тонкий
- UI: React mobile-first (позже React Native); визуальный редизайн с дизайнером позже
- Каталоги: свой seed + SRD (CC-BY); API TTG недоступен; ждём dnd.su; чужие сайты не скрейпим

## Стек

- Frontend: React + Vite
- Backend: Python + FastAPI (REST)
- DB: PostgreSQL
- Auth: email/password + JWT; OAuth Yandex/VK — stubs до секретов

## Статус (сейчас)

Уже в продуктовой ветке / PR:

- Auth (register/login/refresh, auto-refresh на 401)
- Characters CRUD, hybrid JSONB sheet + `sheet_version` (409 на конфликт)
- Catalogs: races / classes / weapons + sample damaging artifacts
- Sheet: identity, abilities, saves, skills
- Attacks (weapon | artifact | custom)
- Sticky combat header (AC / speed / HP / initiative / inspiration)
- Multi-tab sync: BroadcastChannel + conflict UI
- Text blocks: rename (`customLabel`), hide, add/delete custom notes; dual-write legacy LSS-shaped fields
- Text blocks reorder: ↑↓ + `text_blocks_order` в sheet JSON
- Inventory: coins, items (qty/weight/equipped), auto weight total + STR×15 capacity; gear seed with `weight_lb`
- Spells S1: casting ability, DC/attack, slot pips, known list + filter, sample spell seed
- Spells S2: prepare dialog (prepared vs available), combat list = cantrips + prepared, optional max_prepared
- Spells S3: cast button + confirm; spends slot (cantrips free); reusable `spendSpellSlot`
- Spells S4: grimoire dialog (search / class / level filters, add to known); expanded sample seed (~32)
- Play S1: conditions (catalog seed + chips), exhaustion 0–6, limited resources + SlotPips, short/long rest (long clears spell slots, −1 exhaustion)

## Очередь

Ближайшее:

1. Play S2: death saves + temp HP / hit dice на отдыхе (как на LSS classic)
2. Classic interactive sheet (PDF-like) after digital sheet MVP

Дальше по верхнему уровню (не начинать раньше времени):

- **Классический интерактивный лист (PDF-like)** — после стабильного цифрового листа
- Party frame (QR join, мастер пачки)
- Encounter prep → loot

Backlog (отдельные слайсы): multiclass; race → эффекты на лист; rich-text в блоках; onboarding → тема UI; кабинет / мульти-auth.

## Репозиторий и ветки

- Продуктовая работа — в feature-ветках `cursor/<name>-eb8e`, в `main` только через PR
- После каждого approved-слайса: commit → push → обновить PR
- Секреты и `.env` с ключами не коммитить (только `.env.example`)
- Прод (Timeweb): http://201.34.132.252/ — деплой только по явной просьбе (`./deploy/sync-and-up.sh`, см. `deploy/README.md`)

Основной PR разработки: смотри открытые PR в репо (обычно auth/sheet ветка).

## Backend

```bash
docker compose up -d db
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Auth:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /auth/oauth/{yandex|vk}/start` (stub)
- `GET /auth/oauth/{yandex|vk}/callback` (stub)

Characters / catalog — REST под `/characters`, `/catalog`.

## Frontend

Слои:

- `src/ui` — примитивы
- `src/features` — фичи
- `src/pages` — страницы
- `src/shared/api` — REST-клиент

```bash
cd frontend
npm install
npm run dev
```

Dev UI: `http://127.0.0.1:5173` (Vite проксирует API на `:8000`).
