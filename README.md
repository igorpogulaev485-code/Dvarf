# Dvarf

Инструменты для DnD: листы персонажей, фрейм пачки, подготовка боя и лут.

## Стек

- Frontend: React (mobile-first; later React Native)
- Backend: Python + FastAPI (REST)
- DB: PostgreSQL
- Auth: email/password + JWT; Yandex/VK OAuth stubs

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

Auth endpoints:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /auth/oauth/{yandex|vk}/start` (stub until secrets)
- `GET /auth/oauth/{yandex|vk}/callback` (stub)

## Frontend

Component layers:

- `src/ui` — reusable UI primitives
- `src/features` — feature components
- `src/pages` — page compositions
- `src/shared/api` — REST client

```bash
cd frontend
npm install
npm run dev
```

Debug auth page: `http://localhost:5173`
