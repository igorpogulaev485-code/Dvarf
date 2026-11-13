from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import OperationalError

from app.api.routers import auth as auth_router
from app.api.routers import catalog as catalog_router
from app.api.routers import characters as characters_router
from app.api.routers import lobbies as lobbies_router
from app.core.config import settings
from app.core.exceptions import AppError
from app.realtime.bus import start_realtime, stop_realtime


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    await start_realtime()
    try:
        yield
    finally:
        await stop_realtime()


app = FastAPI(title="Dvarf API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(catalog_router.router)
app.include_router(characters_router.router)
app.include_router(lobbies_router.router)

uploads_path = Path(settings.uploads_dir)
uploads_path.mkdir(parents=True, exist_ok=True)
avatars_path = uploads_path / "avatars"
character_avatars_path = uploads_path / "character-avatars"
lobbies_uploads_path = uploads_path / "lobbies"
avatars_path.mkdir(parents=True, exist_ok=True)
character_avatars_path.mkdir(parents=True, exist_ok=True)
lobbies_uploads_path.mkdir(parents=True, exist_ok=True)
# Аватарки кабинета — публичный StaticFiles. Папка lobbies НЕ монтируется:
# раздача только через /lobbies/{id}/media/{media_id}/file|preview с can_view_lobby.
app.mount("/uploads/avatars", StaticFiles(directory=str(avatars_path)), name="uploads-avatars")
app.mount(
    "/uploads/character-avatars",
    StaticFiles(directory=str(character_avatars_path)),
    name="uploads-character-avatars",
)


@app.exception_handler(AppError)
async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    content: dict = {"detail": exc.message, "code": exc.code}
    if exc.data:
        content["data"] = exc.data
    return JSONResponse(
        status_code=exc.status_code,
        content=content,
    )


@app.exception_handler(OperationalError)
async def operational_error_handler(_: Request, _exc: OperationalError) -> JSONResponse:
    # statement_timeout / lock_timeout / pool checkout — return JSON 503, not a hang.
    return JSONResponse(
        status_code=503,
        content={
            "detail": "Сервер временно недоступен — подождите пару секунд и повторите",
            "code": "api_unavailable",
        },
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
