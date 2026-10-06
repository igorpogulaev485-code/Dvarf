from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.exceptions import UnauthorizedError
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User
from app.repositories.user import UserRepository

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    db: DbSession,
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError("Нужен токен авторизации")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_token(token)
    except Exception as exc:  # noqa: BLE001
        raise UnauthorizedError("Недействительный access-токен") from exc

    if payload.get("type") != "access":
        raise UnauthorizedError("Недействительный access-токен")

    user = UserRepository(db).get_by_id(UUID(payload["sub"]))
    if user is None:
        raise UnauthorizedError("Пользователь не найден")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
