from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Response

from app.api.deps import CurrentUser, DbSession
from app.schemas.lobby import (
    AddLobbyMemberRequest,
    JoinLobbyRequest,
    LobbyCreateRequest,
    LobbyDetail,
    LobbySummary,
    LobbyUpdateRequest,
    SeatRequest,
    SessionCreateRequest,
    SessionDetail,
    SessionUpdateRequest,
    SettingCreateRequest,
    SettingSummary,
    SettingUpdateRequest,
)
from app.services.lobby import LobbyService

router = APIRouter(tags=["lobbies"])


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
