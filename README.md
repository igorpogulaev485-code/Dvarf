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
- Auth: email/password + JWT; регистрация с обязательным никнеймом и подтверждением email; OAuth Yandex/VK — stubs до секретов

## Статус (сейчас)

Уже в продуктовой ветке / PR:

- Auth (register/login/refresh, auto-refresh на 401)
- Personal cabinet: profile, phone, avatar, change password/email (SMTP Mail.ru), danger zone (delete account)
- Characters CRUD, hybrid JSONB sheet + `sheet_version` (409 на конфликт)
- Catalogs: races / classes / weapons + sample damaging artifacts
- Sheet: identity, abilities, saves, skills
- Attacks (weapon | artifact | custom)
- Sticky combat header (AC / speed / HP / initiative / inspiration)
- Multi-tab sync: BroadcastChannel + conflict UI
- Text blocks: rename (`customLabel`), hide, add/delete custom notes; dual-write legacy LSS-shaped fields
- Text blocks reorder: ↑↓ + `text_blocks_order` в sheet JSON
- Inventory: coins, items (qty/weight/equipped), auto weight total + STR×15 capacity; gear seed with `weight_lb`

## Очередь

Ближайшее:

1. Spells на цифровом листе (slots + known/prepared + seed)
2. Дожать play-контур листа (условия, ресурсы rest reset и т.п. по IA-референсу)

Дальше по верхнему уровню (не начинать раньше времени):

- **Классический интерактивный лист (PDF-like)** — после стабильного цифрового листа
- Party frame (QR join, мастер пачки)
- Encounter prep → loot

Backlog (отдельные слайсы): multiclass; race → эффекты на лист; rich-text в блоках; onboarding → тема UI; OAuth link/unlink в кабинете.

## Репозиторий и ветки

- Продуктовая работа — в feature-ветках `cursor/<name>-eb8e`, в `main` только через PR
- После каждого approved-слайса: commit → push → обновить PR
- Секреты и `.env` с ключами не коммитить (только `.env.example`)

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

- `POST /auth/register` (никнейм обязателен; письмо подтверждения, токены только после verify)
- `POST /auth/verify-email` / `POST /auth/resend-verification`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `PATCH /auth/me` (профиль: display_name, full_name, phone)
- `POST /auth/change-password`
- `POST /auth/me/avatar` / `DELETE /auth/me/avatar`
- `POST /auth/me/email/request` / `POST /auth/me/email/confirm` (письмо на текущую почту; SMTP или stub)
- `DELETE /auth/me` (удаление аккаунта)
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
