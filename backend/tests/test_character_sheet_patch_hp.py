"""Sheet-only character PATCH must not null column HP from empty combat.hp_*."""

from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from app.schemas.character import CharacterUpdateRequest
from app.services.character import CharacterService
from tests.test_l01_lobby_roles import _user


def _character(*, hp_current: int = 24, hp_max: int = 27) -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid4(),
        sheet_version=1,
        name="Даррак",
        avatar_url=None,
        level=3,
        class_name="Жрец 3",
        race_name="Дварф",
        hp_current=hp_current,
        hp_max=hp_max,
        rules_edition="2014",
        is_draft=False,
        sheet={
            "combat": {
                "ac": 18,
                "hp_temp": 0,
                # no hp_current / hp_max — same as print-settings sheet payloads
            },
            "ui": {},
        },
    )


def test_sheet_only_patch_keeps_column_hp_when_combat_omits_hp(monkeypatch):
    """
    Classic print settings save PATCH /characters/{id} with only ``sheet``
    (layout, pencil blanks, typography). extract_summary_from_sheet then
    returns combat.hp_* = None — must not wipe character.hp_current/max.
    """
    character = _character()
    svc = CharacterService(MagicMock())
    svc.characters = MagicMock()
    svc.characters.get_for_user.return_value = character
    svc.lobbies = MagicMock()
    svc.lobbies.list_open_session_ids_for_character.return_value = []
    svc.db = MagicMock()
    monkeypatch.setattr(svc, "_recompute_start_rules_mark", lambda *_a, **_k: None)
    monkeypatch.setattr(svc, "_broadcast_seated_sessions_changed", AsyncMock())
    monkeypatch.setattr(
        "app.services.character.to_detail",
        lambda *_args, **_kwargs: SimpleNamespace(id=character.id),
    )

    next_sheet = {
        "combat": {"ac": 18, "hp_temp": 0},
        "ui": {"classic_sheet_layout": "2024", "classic_pencil_blanks": True},
    }
    asyncio.run(
        svc.update(
            _user(),
            character.id,
            CharacterUpdateRequest(sheet_version=1, sheet=next_sheet),
        )
    )

    assert character.hp_current == 24
    assert character.hp_max == 27
    assert character.sheet_version == 2
    assert character.sheet["ui"]["classic_sheet_layout"] == "2024"


def test_sheet_patch_still_syncs_hp_when_combat_has_numbers(monkeypatch):
    character = _character(hp_current=10, hp_max=10)
    svc = CharacterService(MagicMock())
    svc.characters = MagicMock()
    svc.characters.get_for_user.return_value = character
    svc.lobbies = MagicMock()
    svc.lobbies.list_open_session_ids_for_character.return_value = []
    svc.db = MagicMock()
    monkeypatch.setattr(svc, "_recompute_start_rules_mark", lambda *_a, **_k: None)
    monkeypatch.setattr(svc, "_broadcast_seated_sessions_changed", AsyncMock())
    monkeypatch.setattr(
        "app.services.character.to_detail",
        lambda *_args, **_kwargs: SimpleNamespace(id=character.id),
    )

    asyncio.run(
        svc.update(
            _user(),
            character.id,
            CharacterUpdateRequest(
                sheet_version=1,
                sheet={"combat": {"hp_current": 58, "hp_max": 62, "hp_temp": 5}},
            ),
        )
    )

    assert character.hp_current == 58
    assert character.hp_max == 62
