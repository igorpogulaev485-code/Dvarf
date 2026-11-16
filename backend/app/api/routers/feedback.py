"""API обратной связи игрока (ADM-04). Работает без флага админки."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.feedback import FeedbackCreateRequest, FeedbackCreateResponse
from app.services.feedback import FeedbackService

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackCreateResponse)
def create_feedback(
    payload: FeedbackCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> FeedbackCreateResponse:
    """Принять сообщение от вошедшего игрока. Аноним — user_id не сохраняется."""
    return FeedbackService(db).create(
        current_user,
        topic=payload.topic,
        body=payload.body,
        is_anonymous=payload.is_anonymous,
        character_id=payload.character_id,
        lobby_id=payload.lobby_id,
        page_path=payload.page_path,
    )
