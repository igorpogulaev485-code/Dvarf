# Dvarf

Инструменты для DnD: листы персонажей, фрейм пачки, подготовка боя и лут.

## Стек

- Frontend: React (mobile-first; later React Native)
- Backend: Python + FastAPI
- DB: PostgreSQL

## Backend (сейчас)

Каркас API и схема пользователей:

```bash
docker compose up -d db
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

Таблицы: `users`, `user_identities`.
