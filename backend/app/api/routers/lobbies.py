from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query, Response, WebSocket, WebSocketDisconnect

from app.api.deps import CurrentUser, DbSession
from app.core.exceptions import UnauthorizedError
from app.core.security import decode_token
from app.db.session import SessionLocal
from app.models.user import User
from app.realtime.hub import lobby_hub, session_hub
from app.repositories.auth_session import AuthSessionRepository
from app.repositories.user import UserRepository
from app.schemas.chat import (
    ChatChannelCreateRequest,
    ChatChannelOut,
    ChatMessageCreateRequest,
    ChatMessageOut,
    MasterLetterBadgeOut,
    MasterLetterCreateRequest,
    MasterLetterOut,
    MasterLetterReplyRequest,
    MasterLetterSummary,
)
from app.schemas.lobby import (
    AddLobbyMemberRequest,
    CombatPatchRequest,
    CombatStartRequest,
    CombatantCreateRequest,
    CombatantPatchRequest,
    JoinLobbyRequest,
    EncounterGenerateRequest,
    EncounterGenerateResult,
    EncounterTemplateCreateRequest,
    EncounterTemplateSaveFromSessionRequest,
    InventoryTransferRequest,
    InventoryTransferResult,
    LootAwardRequest,
    LootAwardResult,
    XpAwardRequest,
    XpAwardResult,
    JournalEntryCreateRequest,
    JournalEntryOut,
    JournalEntryUpdateRequest,
    JournalPageOut,
    LobbyCreateRequest,
    LobbyDetail,
    LobbyShareEffectRequest,
    LobbyShareEffectResponse,
    LobbySummary,
    LobbyUpdateRequest,
    SeatCompanionCreateRequest,
    SeatCompanionPatchRequest,
    SeatCombatPatchRequest,
    SeatRequest,
    SessionCloseRequest,
    SessionCloseResponse,
    SessionCreateRequest,
    SessionDetail,
    SessionEventOut,
    SessionRollCreateRequest,
    SessionUpdateRequest,
    SettingArtifactCreateRequest,
    SettingArtifactUpdateRequest,
    SettingCreateRequest,
    SettingDetail,
    SettingPageCreateRequest,
    SettingPageLinkCreateRequest,
    SettingPageUpdateRequest,
    SettingSummary,
    SettingUpdateRequest,
)
from app.schemas.note import NoteCreateRequest, NoteOut, NoteUpdateRequest
from app.services.chat import ChatService
from app.services.lobby import LobbyService
from app.services.note import NoteService

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


@router.post(
    "/lobbies/{lobby_id}/share-effect",
    response_model=LobbyShareEffectResponse,
)
def share_lobby_effect(
    lobby_id: UUID,
    payload: LobbyShareEffectRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> LobbyShareEffectResponse:
    """С листа: повесить эффект на союзников лобби (данные → их sheet.combat.effects)."""
    return LobbyService(db).share_effect(current_user, lobby_id, payload)


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


@router.get("/settings/{setting_id}", response_model=SettingDetail)
def get_setting(
    setting_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> SettingDetail:
    return LobbyService(db).get_setting(current_user, setting_id)


@router.post(
    "/settings/{setting_id}/pages",
    response_model=SettingDetail,
    status_code=201,
)
def create_setting_page(
    setting_id: UUID,
    payload: SettingPageCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SettingDetail:
    return LobbyService(db).create_setting_page(current_user, setting_id, payload)


@router.patch("/settings/pages/{page_id}", response_model=SettingDetail)
def update_setting_page(
    page_id: UUID,
    payload: SettingPageUpdateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SettingDetail:
    return LobbyService(db).update_setting_page(current_user, page_id, payload)


@router.delete("/settings/pages/{page_id}", response_model=SettingDetail)
def delete_setting_page(
    page_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> SettingDetail:
    return LobbyService(db).delete_setting_page(current_user, page_id)


@router.post(
    "/settings/pages/{page_id}/links",
    response_model=SettingDetail,
    status_code=201,
)
def create_setting_page_link(
    page_id: UUID,
    payload: SettingPageLinkCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SettingDetail:
    return LobbyService(db).create_setting_page_link(current_user, page_id, payload)


@router.delete("/settings/page-links/{link_id}", response_model=SettingDetail)
def delete_setting_page_link(
    link_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> SettingDetail:
    return LobbyService(db).delete_setting_page_link(current_user, link_id)


@router.post(
    "/settings/{setting_id}/artifacts",
    response_model=SettingDetail,
    status_code=201,
)
def create_setting_artifact(
    setting_id: UUID,
    payload: SettingArtifactCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SettingDetail:
    return LobbyService(db).create_setting_artifact(current_user, setting_id, payload)


@router.patch("/settings/artifacts/{artifact_id}", response_model=SettingDetail)
def update_setting_artifact(
    artifact_id: UUID,
    payload: SettingArtifactUpdateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SettingDetail:
    return LobbyService(db).update_setting_artifact(current_user, artifact_id, payload)


@router.delete("/settings/artifacts/{artifact_id}", response_model=SettingDetail)
def delete_setting_artifact(
    artifact_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> SettingDetail:
    return LobbyService(db).delete_setting_artifact(current_user, artifact_id)


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


@router.patch(
    "/sessions/{session_id}/seats/{character_id}/combat",
    response_model=SessionDetail,
)
async def patch_seat_combat(
    session_id: UUID,
    character_id: UUID,
    payload: SeatCombatPatchRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionDetail:
    return await LobbyService(db).patch_seat_combat(
        current_user,
        session_id,
        character_id,
        payload,
    )


@router.post(
    "/sessions/{session_id}/seats/{character_id}/companions",
    response_model=SessionDetail,
    status_code=201,
)
async def add_seat_companion(
    session_id: UUID,
    character_id: UUID,
    payload: SeatCompanionCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionDetail:
    return await LobbyService(db).add_seat_companion(
        current_user,
        session_id,
        character_id,
        payload,
    )


@router.patch(
    "/sessions/{session_id}/seats/{character_id}/companions/{companion_id}",
    response_model=SessionDetail,
)
async def patch_seat_companion(
    session_id: UUID,
    character_id: UUID,
    companion_id: str,
    payload: SeatCompanionPatchRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionDetail:
    return await LobbyService(db).patch_seat_companion(
        current_user,
        session_id,
        character_id,
        companion_id,
        payload,
    )


@router.delete(
    "/sessions/{session_id}/seats/{character_id}/companions/{companion_id}",
    response_model=SessionDetail,
)
async def delete_seat_companion(
    session_id: UUID,
    character_id: UUID,
    companion_id: str,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionDetail:
    return await LobbyService(db).delete_seat_companion(
        current_user,
        session_id,
        character_id,
        companion_id,
    )


@router.post(
    "/sessions/{session_id}/combatants",
    response_model=SessionDetail,
    status_code=201,
)
async def add_session_combatants(
    session_id: UUID,
    payload: CombatantCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionDetail:
    return await LobbyService(db).add_combatants(current_user, session_id, payload)


@router.patch(
    "/sessions/{session_id}/combatants/{combatant_id}",
    response_model=SessionDetail,
)
async def patch_session_combatant(
    session_id: UUID,
    combatant_id: str,
    payload: CombatantPatchRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionDetail:
    return await LobbyService(db).patch_combatant(
        current_user,
        session_id,
        combatant_id,
        payload,
    )


@router.delete(
    "/sessions/{session_id}/combatants/{combatant_id}",
    response_model=SessionDetail,
)
async def delete_session_combatant(
    session_id: UUID,
    combatant_id: str,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionDetail:
    return await LobbyService(db).delete_combatant(
        current_user,
        session_id,
        combatant_id,
    )


@router.post(
    "/sessions/{session_id}/combat/start",
    response_model=SessionDetail,
)
async def start_session_combat(
    session_id: UUID,
    payload: CombatStartRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionDetail:
    return await LobbyService(db).start_combat(current_user, session_id, payload)


@router.patch(
    "/sessions/{session_id}/combat",
    response_model=SessionDetail,
)
async def patch_session_combat(
    session_id: UUID,
    payload: CombatPatchRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionDetail:
    return await LobbyService(db).patch_combat(current_user, session_id, payload)


@router.post(
    "/sessions/{session_id}/xp",
    response_model=XpAwardResult,
)
async def award_session_xp(
    session_id: UUID,
    payload: XpAwardRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> XpAwardResult:
    return await LobbyService(db).award_xp(current_user, session_id, payload)


@router.post(
    "/sessions/{session_id}/loot",
    response_model=LootAwardResult,
)
async def award_session_loot(
    session_id: UUID,
    payload: LootAwardRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> LootAwardResult:
    return await LobbyService(db).award_loot(current_user, session_id, payload)


@router.post(
    "/lobbies/{lobby_id}/transfers",
    response_model=InventoryTransferResult,
)
async def transfer_lobby_inventory(
    lobby_id: UUID,
    payload: InventoryTransferRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> InventoryTransferResult:
    return await LobbyService(db).transfer_inventory(current_user, lobby_id, payload)


@router.post(
    "/lobbies/{lobby_id}/encounters",
    response_model=LobbyDetail,
    status_code=201,
)
def create_lobby_encounter(
    lobby_id: UUID,
    payload: EncounterTemplateCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> LobbyDetail:
    return LobbyService(db).create_encounter_template(current_user, lobby_id, payload)


@router.delete(
    "/lobbies/{lobby_id}/encounters/{template_id}",
    response_model=LobbyDetail,
)
def delete_lobby_encounter(
    lobby_id: UUID,
    template_id: str,
    current_user: CurrentUser,
    db: DbSession,
) -> LobbyDetail:
    return LobbyService(db).delete_encounter_template(
        current_user, lobby_id, template_id
    )


@router.post(
    "/sessions/{session_id}/encounters/save",
    response_model=LobbyDetail,
)
def save_session_encounter(
    session_id: UUID,
    payload: EncounterTemplateSaveFromSessionRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> LobbyDetail:
    return LobbyService(db).save_encounter_from_session(
        current_user, session_id, payload
    )


@router.post(
    "/sessions/{session_id}/encounters/{template_id}/deploy",
    response_model=SessionDetail,
)
async def deploy_session_encounter(
    session_id: UUID,
    template_id: str,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionDetail:
    return await LobbyService(db).deploy_encounter_template(
        current_user, session_id, template_id
    )


@router.post(
    "/sessions/{session_id}/encounters/generate",
    response_model=EncounterGenerateResult,
)
def generate_session_encounter(
    session_id: UUID,
    payload: EncounterGenerateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> EncounterGenerateResult:
    """B8: умный генератор — предложения босс+пачка (UI draft)."""
    return LobbyService(db).generate_encounter(current_user, session_id, payload)


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


@router.get("/lobbies/{lobby_id}/channels", response_model=list[ChatChannelOut])
def list_channels(
    lobby_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> list[ChatChannelOut]:
    return ChatService(db).list_channels(current_user, lobby_id)


@router.post(
    "/lobbies/{lobby_id}/channels",
    response_model=ChatChannelOut,
    status_code=201,
)
def create_channel(
    lobby_id: UUID,
    payload: ChatChannelCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> ChatChannelOut:
    return ChatService(db).create_channel(current_user, lobby_id, payload)


@router.get("/channels/{channel_id}/messages", response_model=list[ChatMessageOut])
def list_channel_messages(
    channel_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    limit: int = Query(default=50, ge=1, le=100),
) -> list[ChatMessageOut]:
    return ChatService(db).list_messages(current_user, channel_id, limit=limit)


@router.post(
    "/channels/{channel_id}/messages",
    response_model=ChatMessageOut,
    status_code=201,
)
async def post_channel_message(
    channel_id: UUID,
    payload: ChatMessageCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> ChatMessageOut:
    return await ChatService(db).post_message(current_user, channel_id, payload)


@router.get("/lobbies/{lobby_id}/letters", response_model=list[MasterLetterSummary])
def list_letters(
    lobby_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> list[MasterLetterSummary]:
    return ChatService(db).list_letters(current_user, lobby_id)


@router.get("/lobbies/{lobby_id}/letters/badge", response_model=MasterLetterBadgeOut)
def letter_badge(
    lobby_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> MasterLetterBadgeOut:
    return ChatService(db).letter_badge(current_user, lobby_id)


@router.post(
    "/lobbies/{lobby_id}/letters",
    response_model=MasterLetterOut,
    status_code=201,
)
async def create_letter(
    lobby_id: UUID,
    payload: MasterLetterCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> MasterLetterOut:
    return await ChatService(db).create_letter(current_user, lobby_id, payload)


@router.get("/letters/{letter_id}", response_model=MasterLetterOut)
def get_letter(
    letter_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> MasterLetterOut:
    return ChatService(db).get_letter(current_user, letter_id)


@router.post("/letters/{letter_id}/messages", response_model=MasterLetterOut)
async def reply_letter(
    letter_id: UUID,
    payload: MasterLetterReplyRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> MasterLetterOut:
    return await ChatService(db).reply_letter(current_user, letter_id, payload)


@router.post("/letters/{letter_id}/close", response_model=MasterLetterOut)
def close_letter(
    letter_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> MasterLetterOut:
    return ChatService(db).close_letter(current_user, letter_id)


@router.get("/lobbies/{lobby_id}/notes", response_model=list[NoteOut])
def list_notes(
    lobby_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    scope: str | None = Query(default=None),
) -> list[NoteOut]:
    return NoteService(db).list_notes(current_user, lobby_id, scope=scope)


@router.post(
    "/lobbies/{lobby_id}/notes",
    response_model=NoteOut,
    status_code=201,
)
async def create_note(
    lobby_id: UUID,
    payload: NoteCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> NoteOut:
    return await NoteService(db).create_note(current_user, lobby_id, payload)


@router.patch("/notes/{note_id}", response_model=NoteOut)
async def update_note(
    note_id: UUID,
    payload: NoteUpdateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> NoteOut:
    return await NoteService(db).update_note(current_user, note_id, payload)


@router.delete("/notes/{note_id}", status_code=204)
async def delete_note(
    note_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> Response:
    await NoteService(db).delete_note(current_user, note_id)
    return Response(status_code=204)


@router.websocket("/lobbies/{lobby_id}/ws")
async def lobby_ws(lobby_id: UUID, websocket: WebSocket) -> None:
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
        LobbyService(db).get(user, lobby_id)
    except Exception:  # noqa: BLE001
        await websocket.close(code=4403)
        return
    finally:
        db.close()

    await lobby_hub.connect(lobby_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await lobby_hub.disconnect(lobby_id, websocket)
