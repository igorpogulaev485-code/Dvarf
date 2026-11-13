from __future__ import annotations

import json
from uuid import UUID

from fastapi import APIRouter, File, Form, Query, Response, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse

from app.api.deps import CurrentUser, DbSession
from app.core.exceptions import AppError, UnauthorizedError
from app.core.security import decode_token
from app.db.session import SessionLocal
from app.models.user import User
from app.realtime.hub import lobby_hub, session_hub
from app.repositories.auth_session import AuthSessionRepository
from app.repositories.user import UserRepository
from app.services import wiki_presence
from app.schemas.chat import (
    ChatChannelCreateRequest,
    ChatChannelOut,
    ChatMessageCreateRequest,
    ChatMessageOut,
    ChatReadRequest,
    ChatsBadgeOut,
    MasterLetterBadgeOut,
    MasterLetterCreateRequest,
    MasterLetterOut,
    MasterLetterReplyRequest,
    MasterLetterSummary,
    WhisperCreateRequest,
    WhisperFactOut,
    WhisperMessageCreateRequest,
    WhisperMessageOut,
    WhisperPeerOut,
    WhisperThreadOut,
)
from app.schemas.lobby import (
    AddLobbyMemberRequest,
    CombatAttackRequest,
    CombatAttackResult,
    CombatInitiativeRequest,
    CombatPatchRequest,
    CombatReactionRequest,
    CombatStartRequest,
    CombatFromWikiRequest,
    CombatTargetsOut,
    WikiCombatPagesOut,
    CombatantCreateRequest,
    CombatantPatchRequest,
    CombatantStudyRequest,
    CombatantStudyResolveRequest,
    InviteMetaOut,
    JoinLobbyOut,
    JoinLobbyRequest,
    RemoveLobbyMemberRequest,
    EncounterGenerateRequest,
    EncounterGenerateResult,
    InventoryGrantRequest,
    InventoryGrantResult,
    InventoryTransferRequest,
    InventoryTransferResult,
    PartyRestRequest,
    PartyRestResult,
    LeadTodayRequest,
    LobbyRoleAssignRequest,
    LobbyRoleRemoveRequest,
    LobbyTransferRequest,
    LootAwardRequest,
    LootAwardResult,
    LootChestRequest,
    LootChestResult,
    XpAwardRequest,
    XpAwardResult,
    JournalEntryCreateRequest,
    JournalEntryOut,
    JournalEntryUpdateRequest,
    JournalPageOut,
    LobbyCreateRequest,
    LobbyDeleteRequest,
    LobbyDetail,
    LobbyMediaOut,
    LobbyMediaUsageOut,
    LobbyShareEffectRequest,
    LobbyShareEffectResponse,
    LobbySyncInfusionEffectsRequest,
    LobbySummary,
    LobbyUpdateRequest,
    PietyAwardRequest,
    PietyAwardResult,
    SeatCompanionCreateRequest,
    SeatCompanionPatchRequest,
    SeatCombatPatchRequest,
    SeatRequest,
    SessionCloseRequest,
    SessionCloseResponse,
    SessionCreateRequest,
    SessionDetail,
    SessionEventOut,
    SessionQuestStatusRequest,
    SessionQuestStatusResult,
    SessionRevealPageRequest,
    SessionRevealPageResult,
    SessionRollCreateRequest,
    SessionUpdateRequest,
    SettingArtifactCreateRequest,
    SettingArtifactSetCreateRequest,
    SettingArtifactSetUpdateRequest,
    SettingArtifactUpdateRequest,
    SettingChoosePrimaryRequest,
    SettingCreateRequest,
    SettingDetail,
    SettingPageBulkCreateRequest,
    SettingPageCreateRequest,
    SettingPageLinkCreateRequest,
    SettingPageUpdateRequest,
    SettingPageVersionOut,
    SettingSummary,
    SettingTrashListOut,
    SettingUpdateRequest,
    WikiCopyRequest,
    WikiMentionResolveOut,
)
from app.schemas.note import NoteCreateRequest, NoteOut, NotesExportOut, NoteUpdateRequest
from app.models.lobby_media import LOBBY_MEDIA_KINDS, LobbyMedia
from app.services.chat import ChatService
from app.services.lobby import LobbyService
from app.services.media import LobbyMediaService
from app.services.note import NoteService

router = APIRouter(tags=["lobbies"])


def _media_out(row: LobbyMedia, *, quota_remaining_bytes: int | None = None) -> LobbyMediaOut:
    return LobbyMediaOut(
        id=row.id,
        lobby_id=row.lobby_id,
        url=row.url,
        preview_url=row.preview_url,
        bytes_on_disk=row.bytes_on_disk,
        width=row.width,
        height=row.height,
        type=row.kind,  # type: ignore[arg-type]
        attached_to_id=row.attached_to_id,
        is_primary=row.is_primary,
        original_filename=row.original_filename,
        uploaded_by=row.uploaded_by,
        created_at=row.created_at,
        updated_at=row.updated_at,
        quota_remaining_bytes=quota_remaining_bytes,
    )


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


async def _ws_reject(websocket: WebSocket, code: int) -> None:
    """Рукопожатие, затем close с кодом. До accept uvicorn превращает close в HTTP 403."""
    await websocket.accept()
    await websocket.close(code=code)


async def _ws_text_loop(
    websocket: WebSocket,
    *,
    lobby_id: UUID | None = None,
    user_id: UUID | None = None,
    display_name: str = "",
) -> None:
    """Держим сокет. ping→pong; W-02 wiki_editing heartbeat."""
    while True:
        text = await websocket.receive_text()
        if text == "ping":
            await websocket.send_text('{"type":"pong"}')
            continue
        if lobby_id is None or user_id is None:
            continue
        try:
            data = json.loads(text)
        except Exception:  # noqa: BLE001
            continue
        if not isinstance(data, dict):
            continue
        msg_type = data.get("type")
        if msg_type == "wiki_editing":
            raw_page = data.get("page_id")
            if not raw_page:
                continue
            try:
                page_id = UUID(str(raw_page))
            except Exception:  # noqa: BLE001
                continue
            wiki_presence.touch(
                lobby_id=lobby_id,
                page_id=page_id,
                user_id=user_id,
                display_name=display_name,
            )
            await lobby_hub.broadcast(
                lobby_id,
                {
                    "type": "wiki_editing",
                    "page_id": str(page_id),
                    "user_id": str(user_id),
                    "display_name": display_name or "Мастер",
                },
            )
        elif msg_type == "wiki_editing_stop":
            raw_page = data.get("page_id")
            if not raw_page:
                continue
            try:
                page_id = UUID(str(raw_page))
            except Exception:  # noqa: BLE001
                continue
            wiki_presence.clear(lobby_id=lobby_id, page_id=page_id, user_id=user_id)
            await lobby_hub.broadcast(
                lobby_id,
                {
                    "type": "wiki_editing_stop",
                    "page_id": str(page_id),
                    "user_id": str(user_id),
                },
            )


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


@router.get("/lobbies/invite/{code}", response_model=InviteMetaOut)
def lobby_invite_meta(
    code: str,
    current_user: CurrentUser,
    db: DbSession,
) -> InviteMetaOut:
    """Имя лобби по коду до входа в состав. can_view_lobby не требуется."""
    return LobbyService(db).invite_meta(current_user, code)


@router.post("/lobbies/join", response_model=JoinLobbyOut)
async def join_lobby(
    payload: JoinLobbyRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> JoinLobbyOut:
    svc = LobbyService(db)
    result = svc.join_with_character(current_user, payload)
    await lobby_hub.broadcast(result.lobby.id, {"type": "lobby_resync"})
    touched = getattr(svc, "_pending_sheet_effect_ids", None) or []
    if touched:
        from app.services.sheet_effects import broadcast_sheet_effects_changed

        await broadcast_sheet_effects_changed(svc.lobbies, touched)
    return result


@router.post("/lobbies/{lobby_id}/members/{character_id}/waive-start-rules", response_model=LobbyDetail)
async def waive_start_rules(
    lobby_id: UUID,
    character_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> LobbyDetail:
    """L-16: мастер/сомастер снимает пометку «не по правилам старта»."""
    detail = LobbyService(db).waive_start_rules(current_user, lobby_id, character_id)
    await lobby_hub.broadcast(detail.id, {"type": "lobby_resync"})
    return detail


@router.post("/lobbies/{lobby_id}/roles", response_model=LobbyDetail)
def assign_lobby_role(
    lobby_id: UUID,
    payload: LobbyRoleAssignRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> LobbyDetail:
    return LobbyService(db).assign_role(current_user, lobby_id, payload)


@router.post("/lobbies/{lobby_id}/roles/remove", response_model=LobbyDetail)
def remove_lobby_role(
    lobby_id: UUID,
    payload: LobbyRoleRemoveRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> LobbyDetail:
    return LobbyService(db).remove_role(current_user, lobby_id, payload)


@router.post("/lobbies/{lobby_id}/transfer", response_model=LobbyDetail)
def transfer_lobby(
    lobby_id: UUID,
    payload: LobbyTransferRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> LobbyDetail:
    return LobbyService(db).transfer_ownership(current_user, lobby_id, payload)


@router.post("/lobbies/{lobby_id}/lead-today", response_model=LobbyDetail)
def assign_lead_today(
    lobby_id: UUID,
    payload: LeadTodayRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> LobbyDetail:
    return LobbyService(db).assign_lead_today(current_user, lobby_id, payload)


@router.delete("/lobbies/{lobby_id}/lead-today/{session_id}", response_model=LobbyDetail)
def clear_lead_today(
    lobby_id: UUID,
    session_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> LobbyDetail:
    return LobbyService(db).clear_lead_today(current_user, lobby_id, session_id)


@router.get("/lobbies/{lobby_id}", response_model=LobbyDetail)
def get_lobby(
    lobby_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> LobbyDetail:
    return LobbyService(db).get(current_user, lobby_id)


@router.get("/lobbies/{lobby_id}/media/usage", response_model=LobbyMediaUsageOut)
def get_lobby_media_usage(
    lobby_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> LobbyMediaUsageOut:
    usage = LobbyMediaService(db).get_usage_for_user(current_user, lobby_id)
    return LobbyMediaUsageOut(
        used_bytes=usage.used_bytes,
        free_bytes=usage.free_bytes,
        limit_bytes=usage.limit_bytes,
        used_mb=usage.used_mb,
        free_mb=usage.free_mb,
        limit_mb=usage.limit_mb,
    )


@router.post("/lobbies/{lobby_id}/media", response_model=LobbyMediaOut, status_code=201)
async def upload_lobby_media(
    lobby_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    file: UploadFile = File(...),
    type: str = Form("other"),
    attached_to_id: UUID | None = Form(None),
    is_primary: bool = Form(False),
) -> LobbyMediaOut:
    kind = (type or "other").strip().lower()
    if kind not in LOBBY_MEDIA_KINDS:
        raise AppError(
            "Тип медиа: journal, wiki, map или other",
            code="invalid_media_kind",
            status_code=400,
        )
    data = await file.read()
    row = LobbyMediaService(db).upload(
        current_user,
        lobby_id,
        data=data,
        content_type=file.content_type,
        original_filename=file.filename,
        kind=kind,  # type: ignore[arg-type]
        attached_to_id=attached_to_id,
        is_primary=is_primary,
    )
    usage = LobbyMediaService(db).usage(lobby_id)
    return _media_out(row, quota_remaining_bytes=usage.free_bytes)


@router.delete("/lobbies/{lobby_id}/media/{media_id}", response_model=LobbyMediaUsageOut)
def delete_lobby_media(
    lobby_id: UUID,
    media_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> LobbyMediaUsageOut:
    usage = LobbyMediaService(db).delete(current_user, lobby_id, media_id)
    return LobbyMediaUsageOut(
        used_bytes=usage.used_bytes,
        free_bytes=usage.free_bytes,
        limit_bytes=usage.limit_bytes,
        used_mb=usage.used_mb,
        free_mb=usage.free_mb,
        limit_mb=usage.limit_mb,
    )


@router.get("/lobbies/{lobby_id}/media/{media_id}/file")
def get_lobby_media_file(
    lobby_id: UUID,
    media_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> FileResponse:
    path = LobbyMediaService(db).open_file_for_user(
        current_user, lobby_id, media_id, preview=False
    )
    return FileResponse(path, media_type="image/webp", filename=path.name)


@router.get("/lobbies/{lobby_id}/media/{media_id}/preview")
def get_lobby_media_preview(
    lobby_id: UUID,
    media_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> FileResponse:
    path = LobbyMediaService(db).open_file_for_user(
        current_user, lobby_id, media_id, preview=True
    )
    return FileResponse(path, media_type="image/webp", filename=path.name)


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
    payload: LobbyDeleteRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> Response:
    LobbyService(db).delete(current_user, lobby_id, payload)
    return Response(status_code=204)


@router.post("/lobbies/{lobby_id}/invite-code", response_model=LobbyDetail)
async def rotate_lobby_invite_code(
    lobby_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> LobbyDetail:
    detail = LobbyService(db).rotate_invite_code(current_user, lobby_id)
    await lobby_hub.broadcast(lobby_id, {"type": "lobby_resync"})
    return detail


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
async def share_lobby_effect(
    lobby_id: UUID,
    payload: LobbyShareEffectRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> LobbyShareEffectResponse:
    """С листа: повесить эффект на союзников лобби (данные → их sheet.combat.effects)."""
    return await LobbyService(db).share_effect(current_user, lobby_id, payload)


@router.post(
    "/lobbies/{lobby_id}/piety",
    response_model=PietyAwardResult,
)
async def award_lobby_piety(
    lobby_id: UUID,
    payload: PietyAwardRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> PietyAwardResult:
    return await LobbyService(db).award_piety(current_user, lobby_id, payload)


@router.post(
    "/lobbies/{lobby_id}/sync-infusion-effects",
    response_model=LobbyShareEffectResponse,
)
async def sync_lobby_infusion_effects(
    lobby_id: UUID,
    payload: LobbySyncInfusionEffectsRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> LobbyShareEffectResponse:
    """Инфузия на союзника: записать КД в его лист и снять пометку, когда инфузию убрали."""
    return await LobbyService(db).sync_infusion_effects(current_user, lobby_id, payload)


@router.delete("/lobbies/{lobby_id}/members/{character_id}", response_model=LobbyDetail)
async def remove_lobby_member(
    lobby_id: UUID,
    character_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    payload: RemoveLobbyMemberRequest | None = None,
) -> LobbyDetail:
    detail = LobbyService(db).remove_member(
        current_user,
        lobby_id,
        character_id,
        payload,
    )
    await lobby_hub.broadcast(lobby_id, {"type": "lobby_resync"})
    return detail


@router.post("/lobbies/{lobby_id}/settings", response_model=SettingSummary, status_code=201)
def create_setting(
    lobby_id: UUID,
    payload: SettingCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SettingSummary:
    return LobbyService(db).create_setting(current_user, lobby_id, payload)


@router.post("/lobbies/{lobby_id}/settings/primary", response_model=LobbyDetail)
def choose_primary_setting(
    lobby_id: UUID,
    payload: SettingChoosePrimaryRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> LobbyDetail:
    """W-01: выбрать основной сеттинг; остальные активные → is_extra."""
    return LobbyService(db).choose_primary_setting(
        current_user,
        lobby_id,
        payload.setting_id,
    )


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


@router.post(
    "/settings/{setting_id}/pages/bulk",
    response_model=SettingDetail,
    status_code=201,
)
def bulk_create_setting_pages(
    setting_id: UUID,
    payload: SettingPageBulkCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SettingDetail:
    return LobbyService(db).bulk_create_setting_pages(current_user, setting_id, payload)


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


@router.post(
    "/settings/{setting_id}/artifact-sets",
    response_model=SettingDetail,
    status_code=201,
)
def create_setting_artifact_set(
    setting_id: UUID,
    payload: SettingArtifactSetCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SettingDetail:
    return LobbyService(db).create_setting_artifact_set(current_user, setting_id, payload)


@router.patch("/settings/artifact-sets/{set_id}", response_model=SettingDetail)
def update_setting_artifact_set(
    set_id: UUID,
    payload: SettingArtifactSetUpdateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SettingDetail:
    return LobbyService(db).update_setting_artifact_set(current_user, set_id, payload)


@router.delete("/settings/artifact-sets/{set_id}", response_model=SettingDetail)
def delete_setting_artifact_set(
    set_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> SettingDetail:
    return LobbyService(db).delete_setting_artifact_set(current_user, set_id)


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
    """W-02: в корзину (soft-delete)."""
    LobbyService(db).delete_setting(current_user, setting_id)
    return Response(status_code=204)


@router.get(
    "/lobbies/{lobby_id}/wiki/trash",
    response_model=SettingTrashListOut,
)
def list_wiki_trash(
    lobby_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> SettingTrashListOut:
    return LobbyService(db).wiki().list_trash(current_user, lobby_id)


@router.post("/settings/{setting_id}/restore", response_model=SettingSummary)
def restore_setting(
    setting_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> SettingSummary:
    return LobbyService(db).wiki().restore_setting(current_user, setting_id)


@router.delete("/settings/{setting_id}/purge", status_code=204)
def purge_setting(
    setting_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> Response:
    LobbyService(db).wiki().purge_setting(current_user, setting_id)
    return Response(status_code=204)


@router.post("/settings/pages/{page_id}/restore", response_model=SettingDetail)
def restore_setting_page(
    page_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> SettingDetail:
    return LobbyService(db).wiki().restore_page(current_user, page_id)


@router.delete("/settings/pages/{page_id}/purge", response_model=SettingDetail)
def purge_setting_page(
    page_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> SettingDetail:
    return LobbyService(db).wiki().purge_page(current_user, page_id)


@router.get(
    "/settings/pages/{page_id}/versions",
    response_model=list[SettingPageVersionOut],
)
def list_setting_page_versions(
    page_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> list[SettingPageVersionOut]:
    return LobbyService(db).wiki().list_versions(current_user, page_id)


@router.post(
    "/settings/pages/{page_id}/versions/{version_id}/restore",
    response_model=SettingDetail,
)
def restore_setting_page_version(
    page_id: UUID,
    version_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> SettingDetail:
    return LobbyService(db).wiki().restore_version(current_user, page_id, version_id)


@router.get(
    "/settings/{setting_id}/mentions/resolve",
    response_model=WikiMentionResolveOut,
)
def resolve_wiki_mention(
    setting_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    title: str = Query(..., min_length=1, max_length=200),
) -> WikiMentionResolveOut:
    return LobbyService(db).wiki().resolve_mention(current_user, setting_id, title)


@router.post(
    "/settings/{setting_id}/pages/copy",
    response_model=SettingDetail,
    status_code=201,
)
def copy_wiki_pages(
    setting_id: UUID,
    payload: WikiCopyRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SettingDetail:
    return LobbyService(db).wiki().copy_from_lobby(current_user, setting_id, payload)


@router.get(
    "/settings/pages/{page_id}/media",
    response_model=list[LobbyMediaOut],
)
def list_setting_page_media(
    page_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> list[LobbyMediaOut]:
    return LobbyService(db).wiki().list_page_media(current_user, page_id)


@router.get("/settings/pages/{page_id}/editors")
def list_page_editors(
    page_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> list[dict]:
    """W-02: кто сейчас правит страницу (presence)."""
    page, setting, lobby = LobbyService(db).wiki()._page_setting_lobby(page_id)
    from app.services import lobby_roles as roles

    roles.require_can_edit_wiki(db, lobby, current_user)
    rows = wiki_presence.editors_for_page(lobby_id=lobby.id, page_id=page.id)
    return [
        {
            "page_id": str(r.page_id),
            "user_id": str(r.user_id),
            "display_name": r.display_name,
        }
        for r in rows
        if r.user_id != current_user.id
    ]


@router.post("/lobbies/{lobby_id}/sessions", response_model=SessionDetail, status_code=201)
async def create_session(
    lobby_id: UUID,
    payload: SessionCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionDetail:
    detail = LobbyService(db).create_session(current_user, lobby_id, payload)
    await lobby_hub.broadcast(lobby_id, {"type": "lobby_resync"})
    return detail


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
async def seat_character(
    session_id: UUID,
    payload: SeatRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionDetail:
    return await LobbyService(db).seat_character(current_user, session_id, payload)


@router.delete("/sessions/{session_id}/seats/{character_id}", response_model=SessionDetail)
async def unseat_character(
    session_id: UUID,
    character_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionDetail:
    return await LobbyService(db).unseat_character(
        current_user, session_id, character_id
    )


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


@router.post(
    "/sessions/{session_id}/combatants/{combatant_id}/study",
    response_model=SessionDetail,
)
async def study_session_combatant(
    session_id: UUID,
    combatant_id: str,
    payload: CombatantStudyRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionDetail:
    return await LobbyService(db).study_combatant(
        current_user,
        session_id,
        combatant_id,
        payload,
    )


@router.post(
    "/sessions/{session_id}/combatants/{combatant_id}/study/resolve",
    response_model=SessionDetail,
)
async def resolve_study_session_combatant(
    session_id: UUID,
    combatant_id: str,
    payload: CombatantStudyResolveRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionDetail:
    return await LobbyService(db).resolve_study_combatant(
        current_user,
        session_id,
        combatant_id,
        payload,
    )


@router.post(
    "/sessions/{session_id}/combatants/{combatant_id}/share-study",
    response_model=SessionDetail,
)
async def share_studied_session_combatant(
    session_id: UUID,
    combatant_id: str,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionDetail:
    return await LobbyService(db).share_studied_combatant(
        current_user,
        session_id,
        combatant_id,
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


@router.post(
    "/sessions/{session_id}/combat/from-wiki",
    response_model=SessionDetail,
)
async def start_session_combat_from_wiki(
    session_id: UUID,
    payload: CombatFromWikiRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionDetail:
    """W-03: высадить страницу «Бой» на стол (волны S-02)."""
    return await LobbyService(db).combat_from_wiki(current_user, session_id, payload)


@router.get(
    "/sessions/{session_id}/wiki-combats",
    response_model=WikiCombatPagesOut,
)
def list_session_wiki_combats(
    session_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> WikiCombatPagesOut:
    """W-03: «Бои этой локации» (+ бои под квестами involved)."""
    return LobbyService(db).list_session_wiki_combats(current_user, session_id)


@router.post(
    "/sessions/{session_id}/combat/initiative",
    response_model=SessionDetail,
)
async def roll_session_combat_initiative(
    session_id: UUID,
    payload: CombatInitiativeRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionDetail:
    """S-02: игрок бросает инициативу за своего ПК; ведущий — за любого."""
    return await LobbyService(db).roll_combat_initiative(
        current_user, session_id, payload
    )


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
    detail = await LobbyService(db).patch_combat(current_user, session_id, payload)
    if payload.action == "end":
        await lobby_hub.broadcast(detail.lobby_id, {"type": "lobby_resync"})
    return detail


@router.post(
    "/sessions/{session_id}/combat/attack",
    response_model=CombatAttackResult,
)
async def resolve_session_combat_attack(
    session_id: UUID,
    payload: CombatAttackRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> CombatAttackResult:
    """S-04: атака / действие врага по цели."""
    return await LobbyService(db).resolve_combat_attack(
        current_user, session_id, payload
    )


@router.post(
    "/sessions/{session_id}/combat/reaction",
    response_model=SessionDetail,
)
async def resolve_session_combat_reaction(
    session_id: UUID,
    payload: CombatReactionRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionDetail:
    """S-04: объявить реакцию или пропустить."""
    return await LobbyService(db).resolve_combat_reaction(
        current_user, session_id, payload
    )


@router.get(
    "/sessions/{session_id}/combat/targets",
    response_model=CombatTargetsOut,
)
def list_session_combat_targets(
    session_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> CombatTargetsOut:
    """S-04 / T-01: участники боя, видимые зрителю (состояния, сторона-крючок)."""
    return LobbyService(db).list_combat_targets(current_user, session_id)


@router.post(
    "/sessions/{session_id}/reveal-page",
    response_model=SessionRevealPageResult,
)
async def reveal_session_page(
    session_id: UUID,
    payload: SessionRevealPageRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionRevealPageResult:
    """T2: раскрыть страницу сеттинга mid-session → лента + realtime."""
    return await LobbyService(db).reveal_session_page(current_user, session_id, payload)


@router.post(
    "/sessions/{session_id}/quest-status",
    response_model=SessionQuestStatusResult,
)
async def update_session_quest_status(
    session_id: UUID,
    payload: SessionQuestStatusRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionQuestStatusResult:
    """T4: статус квеста mid-session → лента + опционально дневник."""
    result = await LobbyService(db).update_session_quest_status(
        current_user, session_id, payload
    )
    if result.journal_entry is not None:
        await lobby_hub.broadcast(
            result.session.lobby_id,
            {"type": "journal_changed", "published": True},
        )
    return result


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
    "/sessions/{session_id}/loot/chest",
    response_model=LootChestResult,
)
async def session_loot_chest(
    session_id: UUID,
    payload: LootChestRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> LootChestResult:
    """S-06: сундук добычи (выдача / стол / генератор). Контракт для G-01."""
    return await LobbyService(db).loot_chest(current_user, session_id, payload)


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
    "/sessions/{session_id}/inventory-grants",
    response_model=InventoryGrantResult,
)
async def grant_session_inventory(
    session_id: UUID,
    payload: InventoryGrantRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> InventoryGrantResult:
    """S-07: мастер выдаёт предмет/монеты «из воздуха» (не сундук S-06)."""
    return await LobbyService(db).grant_inventory(current_user, session_id, payload)


@router.post(
    "/sessions/{session_id}/party-rest",
    response_model=PartyRestResult,
)
async def start_session_party_rest(
    session_id: UUID,
    payload: PartyRestRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> PartyRestResult:
    """S-07: короткий/долгий отдых партии со стола."""
    return await LobbyService(db).start_party_rest(current_user, session_id, payload)


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
    feed_filter: str | None = Query(
        default=None,
        pattern="^(all|combat|rolls)$",
        description="S-04: фильтр ленты Всё / Бой / Броски",
    ),
) -> list[SessionEventOut]:
    return LobbyService(db).list_session_events(
        current_user,
        session_id,
        rolls_only=rolls_only,
        feed_filter=feed_filter,
    )


@router.post(
    "/sessions/{session_id}/close",
    response_model=SessionCloseResponse,
)
async def close_session(
    session_id: UUID,
    payload: SessionCloseRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionCloseResponse:
    result = LobbyService(db).close_session(current_user, session_id, payload)
    await lobby_hub.broadcast(result.session.lobby_id, {"type": "lobby_resync"})
    if result.journal_entry is not None:
        await lobby_hub.broadcast(
            result.session.lobby_id,
            {"type": "journal_changed", "published": True},
        )
    return result


@router.get("/lobbies/{lobby_id}/journal", response_model=JournalPageOut)
def list_journal(
    lobby_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=50),
    q: str | None = Query(default=None, max_length=200),
    chapter_id: UUID | None = Query(default=None),
) -> JournalPageOut:
    return LobbyService(db).list_journal(
        current_user,
        lobby_id,
        offset=offset,
        limit=limit,
        q=q,
        chapter_id=chapter_id,
    )


@router.post(
    "/lobbies/{lobby_id}/journal",
    response_model=JournalEntryOut,
    status_code=201,
)
async def create_journal_entry(
    lobby_id: UUID,
    payload: JournalEntryCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> JournalEntryOut:
    out = LobbyService(db).create_journal_entry(current_user, lobby_id, payload)
    # Черновики игрокам не светим в теле события — только флаг published.
    await lobby_hub.broadcast(
        lobby_id,
        {"type": "journal_changed", "published": not out.is_draft},
    )
    return out


@router.patch("/journal/{entry_id}", response_model=JournalEntryOut)
async def update_journal_entry(
    entry_id: UUID,
    payload: JournalEntryUpdateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> JournalEntryOut:
    out = LobbyService(db).update_journal_entry(current_user, entry_id, payload)
    # published=True → клиент ставит точку «новое» (публикация / раскрытие / правка поста).
    became_or_stays_public = not out.is_draft
    await lobby_hub.broadcast(
        out.lobby_id,
        {"type": "journal_changed", "published": became_or_stays_public},
    )
    return out


@router.delete("/journal/{entry_id}", status_code=204)
async def delete_journal_entry(
    entry_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> Response:
    lobby_id, was_published = LobbyService(db).delete_journal_entry(current_user, entry_id)
    await lobby_hub.broadcast(
        lobby_id,
        {"type": "journal_changed", "published": was_published},
    )
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
        await _ws_reject(websocket, 4401)
        return
    try:
        user = _user_from_ws_token(token)
        user_id = user.id
    except UnauthorizedError:
        await _ws_reject(websocket, 4401)
        return

    db = SessionLocal()
    try:
        LobbyService(db).get_session(user, session_id)
    except Exception:  # noqa: BLE001
        await _ws_reject(websocket, 4403)
        return
    finally:
        db.close()

    await session_hub.connect(session_id, websocket, user_id=user_id)
    try:
        await _ws_text_loop(websocket)
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
async def close_letter(
    letter_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> MasterLetterOut:
    return await ChatService(db).close_letter(current_user, letter_id)


@router.get("/lobbies/{lobby_id}/whispers/peers", response_model=list[WhisperPeerOut])
def list_whisper_peers(
    lobby_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> list[WhisperPeerOut]:
    return ChatService(db).list_whisper_peers(current_user, lobby_id)


@router.get("/lobbies/{lobby_id}/whispers", response_model=list[WhisperThreadOut])
def list_whispers(
    lobby_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> list[WhisperThreadOut]:
    return ChatService(db).list_whispers(current_user, lobby_id)


@router.get("/lobbies/{lobby_id}/whispers/facts", response_model=list[WhisperFactOut])
def list_whisper_facts(
    lobby_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> list[WhisperFactOut]:
    return ChatService(db).list_whisper_facts(current_user, lobby_id)


@router.post(
    "/lobbies/{lobby_id}/whispers",
    response_model=WhisperThreadOut,
    status_code=201,
)
def open_whisper(
    lobby_id: UUID,
    payload: WhisperCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> WhisperThreadOut:
    return ChatService(db).open_whisper(current_user, lobby_id, payload)


@router.get("/whispers/{thread_id}/messages", response_model=list[WhisperMessageOut])
def list_whisper_messages(
    thread_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    limit: int = Query(default=50, ge=1, le=100),
) -> list[WhisperMessageOut]:
    return ChatService(db).list_whisper_messages(current_user, thread_id, limit=limit)


@router.post(
    "/whispers/{thread_id}/messages",
    response_model=WhisperMessageOut,
    status_code=201,
)
async def post_whisper_message(
    thread_id: UUID,
    payload: WhisperMessageCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> WhisperMessageOut:
    return await ChatService(db).post_whisper_message(current_user, thread_id, payload)


@router.get("/lobbies/{lobby_id}/chats/badge", response_model=ChatsBadgeOut)
def chats_badge(
    lobby_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> ChatsBadgeOut:
    return ChatService(db).chats_badge(current_user, lobby_id)


@router.post("/lobbies/{lobby_id}/chats/read", response_model=ChatsBadgeOut)
def mark_chat_read(
    lobby_id: UUID,
    payload: ChatReadRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> ChatsBadgeOut:
    return ChatService(db).mark_read(current_user, lobby_id, payload)


@router.get("/lobbies/{lobby_id}/notes", response_model=list[NoteOut])
def list_notes(
    lobby_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    scope: str | None = Query(default=None),
) -> list[NoteOut]:
    return NoteService(db).list_notes(current_user, lobby_id, scope=scope)


@router.get("/lobbies/{lobby_id}/notes/export", response_model=NotesExportOut)
def export_notes(
    lobby_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> NotesExportOut:
    return NoteService(db).export_notes(current_user, lobby_id)


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
        await _ws_reject(websocket, 4401)
        return
    try:
        user = _user_from_ws_token(token)
        user_id = user.id
    except UnauthorizedError:
        await _ws_reject(websocket, 4401)
        return

    db = SessionLocal()
    try:
        LobbyService(db).get(user, lobby_id)
    except Exception:  # noqa: BLE001
        await _ws_reject(websocket, 4403)
        return
    finally:
        db.close()

    display_name = (
        getattr(user, "display_name", None) or getattr(user, "login", None) or "Мастер"
    )
    await lobby_hub.connect(lobby_id, websocket, user_id=user_id)
    try:
        await _ws_text_loop(
            websocket,
            lobby_id=lobby_id,
            user_id=user_id,
            display_name=str(display_name)[:120],
        )
    except WebSocketDisconnect:
        pass
    finally:
        cleared = wiki_presence.clear_user_lobby(lobby_id=lobby_id, user_id=user_id)
        for page_id in cleared:
            await lobby_hub.broadcast(
                lobby_id,
                {
                    "type": "wiki_editing_stop",
                    "page_id": str(page_id),
                    "user_id": str(user_id),
                },
            )
        await lobby_hub.disconnect(lobby_id, websocket)
