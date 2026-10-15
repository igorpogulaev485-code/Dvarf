from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query, Response, WebSocket, WebSocketDisconnect

from app.api.deps import CurrentUser, DbSession
from app.core.exceptions import UnauthorizedError
from app.core.security import decode_token
from app.db.session import SessionLocal
from app.models.user import User
from app.realtime.session_hub import session_hub
from app.repositories.auth_session import AuthSessionRepository
from app.repositories.user import UserRepository
from app.schemas.lobby import (
    AddLobbyMemberRequest,
    JoinLobbyRequest,
    JournalEntryCreateRequest,
    JournalEntryOut,
    JournalEntryUpdateRequest,
    JournalPageOut,
    LobbyCreateRequest,
    LobbyDetail,
    LobbySummary,
    LobbyUpdateRequest,
    SeatRequest,
    SessionCloseRequest,
    SessionCloseResponse,
    SessionCreateRequest,
    SessionDetail,
    SessionEventOut,
    SessionRollCreateRequest,
    SessionUpdateRequest,
    SettingCreateRequest,
    SettingSummary,
    SettingUpdateRequest,
)
from app.services.lobby import LobbyService

router = APIRouter(tags=["lobbies"])


def _user_from_ws_token(token: str) -> User:
    try:
        payload = decode_token(token)
    except Exception as exc:  # noqa: BLE001
        raise UnauthorizedError("Недействительный токен") from exc
    if payload.get("type") != "access":
        raise UnauthorizedError("Недействительный токен")
    sid_raw = payload.get("sid")
    if not sid_raw:
        raise UnauthorizedError("Сессия устарела")
    db = SessionLocal()
    try:
        session = AuthSessionRepository(db).get_active_by_id(UUID(str(sid_raw)))
        if session is None:
            raise UnauthorizedError("Сессия завершена")
        user = UserRepository(db).get_by_id(UUID(payload["sub"]))
        if user is None or user.id != session.user_id:
            raise UnauthorizedError("Пользователь не найден")
        return user
    finally:
        db.close()


@router.get("/lobbies", response_model=list[LobbySummary])
def list_lobbies(current_user: CurrentUser, db: DbSession) -> list[LobbySummary]:
    return LobbyService(db).list_mine(current_user)


@router.post("/lobbies", response_model=LobbyDetail, status_code=201)
def create_lobby(
    payload: LobbyCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> LobbyDetail:
    return LobbyService(db).create(current_user, payload)


@router.post("/lobbies/join", response_model=LobbyDetail)
def join_lobby(
    payload: JoinLobbyRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> LobbyDetail:
    return LobbyService(db).join_with_character(current_user, payload)


@router.get("/lobbies/{lobby_id}", response_model=LobbyDetail)
def get_lobby(
    lobby_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> LobbyDetail:
    return LobbyService(db).get(current_user, lobby_id)


@router.patch("/lobbies/{lobby_id}", response_model=LobbyDetail)
def update_lobby(
    lobby_id: UUID,
    payload: LobbyUpdateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> LobbyDetail:
    return LobbyService(db).update(current_user, lobby_id, payload)


@router.delete("/lobbies/{lobby_id}", status_code=204)
def delete_lobby(
    lobby_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> Response:
    LobbyService(db).delete(current_user, lobby_id)
    return Response(status_code=204)


@router.post("/lobbies/{lobby_id}/members", response_model=LobbyDetail)
def add_lobby_member(
    lobby_id: UUID,
    payload: AddLobbyMemberRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> LobbyDetail:
    return LobbyService(db).add_own_member(current_user, lobby_id, payload)


@router.delete("/lobbies/{lobby_id}/members/{character_id}", response_model=LobbyDetail)
def remove_lobby_member(
    lobby_id: UUID,
    character_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> LobbyDetail:
    return LobbyService(db).remove_member(current_user, lobby_id, character_id)


@router.post("/lobbies/{lobby_id}/settings", response_model=SettingSummary, status_code=201)
def create_setting(
    lobby_id: UUID,
    payload: SettingCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SettingSummary:
    return LobbyService(db).create_setting(current_user, lobby_id, payload)


@router.get("/settings/{setting_id}", response_model=SettingSummary)
def get_setting(
    setting_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> SettingSummary:
    return LobbyService(db).get_setting(current_user, setting_id)


@router.patch("/settings/{setting_id}", response_model=SettingSummary)
def update_setting(
    setting_id: UUID,
    payload: SettingUpdateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SettingSummary:
    return LobbyService(db).update_setting(current_user, setting_id, payload)


@router.delete("/settings/{setting_id}", status_code=204)
def delete_setting(
    setting_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> Response:
    LobbyService(db).delete_setting(current_user, setting_id)
    return Response(status_code=204)


@router.post("/lobbies/{lobby_id}/sessions", response_model=SessionDetail, status_code=201)
def create_session(
    lobby_id: UUID,
    payload: SessionCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionDetail:
    return LobbyService(db).create_session(current_user, lobby_id, payload)


@router.get("/sessions/{session_id}", response_model=SessionDetail)
def get_session(
    session_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionDetail:
    return LobbyService(db).get_session(current_user, session_id)


@router.patch("/sessions/{session_id}", response_model=SessionDetail)
def update_session(
    session_id: UUID,
    payload: SessionUpdateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionDetail:
    return LobbyService(db).update_session(current_user, session_id, payload)


@router.delete("/sessions/{session_id}", status_code=204)
def delete_session(
    session_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> Response:
    LobbyService(db).delete_session(current_user, session_id)
    return Response(status_code=204)


@router.post("/sessions/{session_id}/seats", response_model=SessionDetail)
def seat_character(
    session_id: UUID,
    payload: SeatRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionDetail:
    return LobbyService(db).seat_character(current_user, session_id, payload)


@router.delete("/sessions/{session_id}/seats/{character_id}", response_model=SessionDetail)
def unseat_character(
    session_id: UUID,
    character_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionDetail:
    return LobbyService(db).unseat_character(current_user, session_id, character_id)


@router.get("/sessions/{session_id}/events", response_model=list[SessionEventOut])
def list_session_events(
    session_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    rolls_only: bool = Query(default=False),
) -> list[SessionEventOut]:
    return LobbyService(db).list_session_events(
        current_user,
        session_id,
        rolls_only=rolls_only,
    )


@router.post(
    "/sessions/{session_id}/close",
    response_model=SessionCloseResponse,
)
def close_session(
    session_id: UUID,
    payload: SessionCloseRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionCloseResponse:
    return LobbyService(db).close_session(current_user, session_id, payload)


@router.get("/lobbies/{lobby_id}/journal", response_model=JournalPageOut)
def list_journal(
    lobby_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=50),
) -> JournalPageOut:
    return LobbyService(db).list_journal(
        current_user,
        lobby_id,
        offset=offset,
        limit=limit,
    )


@router.post(
    "/lobbies/{lobby_id}/journal",
    response_model=JournalEntryOut,
    status_code=201,
)
def create_journal_entry(
    lobby_id: UUID,
    payload: JournalEntryCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> JournalEntryOut:
    return LobbyService(db).create_journal_entry(current_user, lobby_id, payload)


@router.patch("/journal/{entry_id}", response_model=JournalEntryOut)
def update_journal_entry(
    entry_id: UUID,
    payload: JournalEntryUpdateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> JournalEntryOut:
    return LobbyService(db).update_journal_entry(current_user, entry_id, payload)


@router.delete("/journal/{entry_id}", status_code=204)
def delete_journal_entry(
    entry_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> Response:
    LobbyService(db).delete_journal_entry(current_user, entry_id)
    return Response(status_code=204)


@router.post(
    "/sessions/{session_id}/rolls",
    response_model=SessionEventOut,
    status_code=201,
)
async def create_session_roll(
    session_id: UUID,
    payload: SessionRollCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionEventOut:
    return await LobbyService(db).create_manual_roll(current_user, session_id, payload)


@router.websocket("/sessions/{session_id}/ws")
async def session_ws(session_id: UUID, websocket: WebSocket) -> None:
    token = websocket.query_params.get("token") or ""
    if not token:
        await websocket.close(code=4401)
        return
    try:
        user = _user_from_ws_token(token)
    except UnauthorizedError:
        await websocket.close(code=4401)
        return

    db = SessionLocal()
    try:
        LobbyService(db).get_session(user, session_id)
    except Exception:  # noqa: BLE001
        await websocket.close(code=4403)
        return
    finally:
        db.close()

    await session_hub.connect(session_id, websocket)
    try:
        while True:
            # Держим соединение; клиент может слать ping.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await session_hub.disconnect(session_id, websocket)
