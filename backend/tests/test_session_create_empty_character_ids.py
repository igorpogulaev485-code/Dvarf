"""Audit M4: character_ids=[] при создании сессии ≠ всем членам лобби."""

from uuid import uuid4

from app.schemas.lobby import CombatantCreateRequest, SessionCreateRequest


def test_session_create_request_allows_empty_character_ids():
    payload = SessionCreateRequest(name="Пустой стол", character_ids=[])
    assert payload.character_ids == []


def test_session_create_empty_ids_does_not_imply_all_members():
    """Контракт: пустой список — никого не сажаем (см. LobbyService.create_session)."""
    payload = SessionCreateRequest(character_ids=[])
    assert list(payload.character_ids) == []
    # Явный список — только переданные id
    a, b = uuid4(), uuid4()
    filled = SessionCreateRequest(character_ids=[a, b])
    assert filled.character_ids == [a, b]


def test_custom_npc_without_cr_is_valid_payload():
    bare = CombatantCreateRequest(name="Без ПО", hp_max=12, ac=14, count=1)
    assert bare.cr is None
    assert bare.xp is None
