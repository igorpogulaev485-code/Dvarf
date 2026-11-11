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

app = FastAPI(title="Dvarf API", version="0.1.0")

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
(uploads_path / "avatars").mkdir(parents=True, exist_ok=True)
(uploads_path / "character-avatars").mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")


@app.exception_handler(AppError)
async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message, "code": exc.code},
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
