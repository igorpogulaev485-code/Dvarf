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

**Prod:** http://201.34.132.252/ (`./deploy/sync-and-up.sh`, ветка `cursor/classic-sheet-from-card-013d` поверх sessions/auth).

Уже на проде / в продуктовой ветке:

- Personal cabinet: profile, phone, avatar, change password/email (SMTP Mail.ru), sessions (revoke/logout everywhere), danger zone
- Auth (register/login/refresh with session tracking, email verification)
- Characters CRUD, hybrid JSONB sheet + `sheet_version` (409 на конфликт)
- Catalogs: races / classes / weapons + sample damaging artifacts
- Цифровой лист: identity, abilities, saves, skills
- Attacks (weapon | artifact | custom)
- Sticky combat header (AC / speed / HP / initiative / inspiration)
- Multi-tab sync: BroadcastChannel + conflict UI
- Text blocks: rename (`customLabel`), hide, add/delete custom notes; dual-write legacy LSS-shaped fields
- Text blocks reorder: ↑↓ + `text_blocks_order` в sheet JSON
- Inventory: coins, items (qty/weight/equipped), auto weight total + STR×15 capacity; gear seed with `weight_lb`
- **Классический интерактивный лист 2014** (PDF-like): `/characters/:id/classic`
  - вход с карточки персонажа и со страницы детали
  - тот же `GET/PATCH /characters/:id`, autosave + BroadcastChannel (как LSS digital ↔ classic)
  - layout 2014; `rulesEdition` и `sheetLayout` задуманы раздельно (сначала 2014 layout)

## Очередь

Ближайшее:

1. Spells на цифровом листе (slots + known/prepared + seed) — есть черновики в `cursor/sheet-*`, на текущем проде ещё нет
2. Дожать play-контур цифрового листа (условия, ресурсы rest reset и т.п. по IA-референсу)
3. Классический лист: layout 2024 (при `rulesEdition` 2014), print/PDF polish, expanding text blocks под печать

Дальше по верхнему уровню (не начинать раньше времени):

- Party frame (QR join, мастер пачки)
- Encounter prep → loot

Backlog (отдельные слайсы): multiclass; race → эффекты на лист; rich-text в блоках; onboarding → тема UI; OAuth link/unlink в кабинете.

## Репозиторий и ветки

- Продуктовая работа — в feature-ветках `cursor/<name>-…`, в `main` только через PR
- Перед новым слайсом: `git fetch` + аудит веток/`frontend`+`backend` (см. `.cursor/skills/dvarf-dev-workflow/SKILL.md`) — не поднимать greenfield / GitHub Pages вместо Timeweb
- После каждого approved-слайса: commit → push → обновить PR; деплой на Timeweb **только** по явной команде
- Секреты и `.env` с ключами не коммитить (только `.env.example`)

Актуальный продуктовый PR классического листа: https://github.com/igorpogulaev485-code/Dvarf/pull/13

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
- `POST /auth/logout` (отзыв текущей сессии)
- `GET /auth/sessions` / `DELETE /auth/sessions` / `DELETE /auth/sessions/{id}`
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
