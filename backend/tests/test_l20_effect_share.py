"""L-20: один путь записи, только свой источник, догон инфузий, одна голова Alembic."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory

from app.core.exceptions import AppError
from app.services.lobby import LobbyService
from app.services.sheet_effects import (
    apply_infusion_effect_sync,
    read_infusion_ally_share,
    write_infusion_ally_share,
)


def test_alembic_head_single_no_new_migration():
    cfg = Config("alembic.ini")
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1
    # L-20 не добавляет миграцию — голова ветки старта (W-04 / C-03) в предках.
    ids = {rev.revision for rev in script.walk_revisions()}
    assert "w04sets8a1b2c" in ids


@patch("app.services.sheet_effects.flag_modified")
def test_infusion_snapshot_roundtrip(_flag):
    char = SimpleNamespace(sheet={}, sheet_version=1)
    rows = [
        {
            "target_character_id": str(uuid4()),
            "name": "Улучшенная защита · +1 КД",
            "slug": "enhanced_defense",
            "ac_bonus": 1,
            "mods": [{"target": "ac", "op": "add", "value": 1}],
        }
    ]
    write_infusion_ally_share(char, rows)
    assert read_infusion_ally_share(char.sheet)[0]["ac_bonus"] == 1


@patch("app.services.sheet_effects.flag_modified")
def test_catchup_writes_ally_mark_from_snapshot(_flag):
    ally_id = uuid4()
    art_id = uuid4()
    ally = SimpleNamespace(
        id=ally_id,
        name="Союзник",
        sheet={"combat": {"effects": []}},
        sheet_version=1,
        hp_max=20,
        hp_current=20,
    )
    art = SimpleNamespace(
        id=art_id,
        name="Изобретатель",
        sheet={
            "infusion_ally_share": [
                {
                    "id": "fx1",
                    "target_character_id": str(ally_id),
                    "name": "Улучшенная защита · +1 КД",
                    "slug": "enhanced_defense",
                    "kind": "infusion",
                    "ac_bonus": 1,
                    "mods": [{"target": "ac", "op": "add", "value": 1}],
                }
            ]
        },
        sheet_version=2,
    )
    lobby = SimpleNamespace(
        id=uuid4(),
        members=[
            SimpleNamespace(character_id=art_id),
            SimpleNamespace(character_id=ally_id),
        ],
    )

    svc = LobbyService.__new__(LobbyService)
    svc.db = SimpleNamespace(commit=lambda: None)
    svc.lobbies = SimpleNamespace(
        get=lambda lid: lobby,
        get_characters_map=lambda ids: {art_id: art, ally_id: ally},
    )

    touched = svc.apply_infusion_catchup(lobby.id)
    assert ally_id in touched
    effects = ally.sheet["combat"]["effects"]
    assert any(e.get("slug") == "enhanced_defense" for e in effects)


def test_require_own_source_rejects_foreign_even_for_master():
    """L-20: мастер/сомастер не вешает эффект от чужого героя."""
    owner = SimpleNamespace(id=uuid4())
    foreign_char = uuid4()
    lobby = SimpleNamespace(id=uuid4(), owner_id=owner.id, members=[])

    svc = LobbyService.__new__(LobbyService)
    svc.db = MagicMock()
    svc.lobbies = SimpleNamespace(
        get_member=lambda lid, cid: SimpleNamespace(
            character_id=cid, user_id=uuid4()
        ),
    )
    svc.characters = SimpleNamespace(get_for_user=lambda cid, uid: None)

    with pytest.raises(AppError) as exc:
        svc._require_own_lobby_source(owner, lobby, foreign_char)
    assert exc.value.status_code == 403
    assert "чужого" in exc.value.message.lower()


def test_require_own_source_ok_for_own_character():
    user = SimpleNamespace(id=uuid4())
    char_id = uuid4()
    lobby = SimpleNamespace(id=uuid4())
    char = SimpleNamespace(id=char_id, user_id=user.id, name="Герой")

    svc = LobbyService.__new__(LobbyService)
    svc.characters = SimpleNamespace(get_for_user=lambda cid, uid: char)
    svc.lobbies = SimpleNamespace(
        get_member=lambda lid, cid: SimpleNamespace(character_id=cid, user_id=user.id),
    )
    assert svc._require_own_lobby_source(user, lobby, char_id) is char


@patch("app.services.sheet_effects.flag_modified")
def test_apply_infusion_effect_sync_still_replaces(_flag):
    """Регрессия: sync не сливается в append — замена пометок источника."""
    target = SimpleNamespace(
        sheet={
            "combat": {
                "effects": [
                    {
                        "id": "old",
                        "name": "Улучшенная защита · +1 КД",
                        "source_character_id": "art",
                        "origin": "infusion",
                        "ac_bonus": 1,
                        "linked_concentration": False,
                    }
                ]
            }
        },
        sheet_version=1,
        hp_max=10,
        hp_current=10,
    )
    changed = apply_infusion_effect_sync(
        target,
        source_id="art",
        source_name="Изобретатель",
        replacements=[
            {
                "id": "new",
                "name": "Улучшенная защита · +2 КД",
                "source_character_id": "art",
                "origin": "infusion",
                "ac_bonus": 2,
                "mods": [{"target": "ac", "op": "add", "value": 2}],
                "linked_concentration": False,
            }
        ],
    )
    assert changed is True
    effects = target.sheet["combat"]["effects"]
    assert len(effects) == 1
    assert effects[0]["ac_bonus"] == 2
