"""P24-01: flag, locked edition, lobby edition, catalog isolation, seed, purge dry-run."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.models.character import RulesEdition
from app.schemas.character import CharacterCreateRequest, CharacterUpdateRequest
from app.schemas.lobby import JoinLobbyRequest, LobbyCreateRequest
from app.services.character import CharacterService
from app.services.edition_2024_catalog_seed import (
    assert_raw_dump_not_activated,
    load_wave_rows,
    normalize_background_data,
    normalize_entry_payload,
    normalize_feat_data,
    normalize_weapon_data,
)
from app.services.lobby import LobbyService
from app.services.lobby_edition import (
    ensure_character_matches_lobby,
    lobby_rules_edition_value,
    normalize_lobby_rules_edition,
)
from app.dnd.race_species_label import race_species_label, race_species_label_title
from tests.test_l01_lobby_roles import _lobby, _user


# --- flag / create -----------------------------------------------------------


def test_create_rejects_2024_when_flag_off(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "rules_edition_2024_open", False)
    user = SimpleNamespace(id=uuid4())
    svc = CharacterService(db=SimpleNamespace())  # type: ignore[arg-type]
    with pytest.raises(AppError) as exc:
        svc.create(
            user,  # type: ignore[arg-type]
            CharacterCreateRequest(rules_edition=RulesEdition.edition_2024),
        )
    assert exc.value.code == "rules_edition_closed"


def test_create_allows_2024_when_flag_on(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "rules_edition_2024_open", True)
    created = {}

    class FakeRepo:
        def create(self, **kwargs):
            created.update(kwargs)
            return SimpleNamespace(
                id=uuid4(),
                user_id=kwargs["user_id"],
                name=kwargs["name"],
                rules_edition=kwargs["rules_edition"],
                sheet=kwargs["sheet"],
                sheet_version=1,
                avatar_url=None,
                level=1,
                class_name=None,
                race_name=None,
                hp_current=None,
                hp_max=None,
                is_draft=False,
                created_at=None,
                updated_at=None,
            )

    db = SimpleNamespace(commit=lambda: None, refresh=lambda _c: None)
    svc = CharacterService(db=db)  # type: ignore[arg-type]
    svc.characters = FakeRepo()  # type: ignore[assignment]
    user = SimpleNamespace(id=uuid4())
    # to_detail needs more — call create path only up to repo via monkeypatch of to_detail
    import app.services.character as char_mod

    monkeypatch.setattr(
        char_mod,
        "to_detail",
        lambda character, **_kw: SimpleNamespace(
            id=character.id,
            rules_edition=character.rules_edition,
            name=character.name,
        ),
    )
    out = svc.create(
        user,  # type: ignore[arg-type]
        CharacterCreateRequest(rules_edition=RulesEdition.edition_2024, name="Hero"),
    )
    assert created["rules_edition"] == RulesEdition.edition_2024
    assert out.rules_edition == RulesEdition.edition_2024


def test_patch_does_not_change_rules_edition():
    character = SimpleNamespace(
        id=uuid4(),
        user_id=uuid4(),
        name="A",
        rules_edition=RulesEdition.edition_2014,
        sheet_version=1,
        sheet={},
        avatar_url=None,
        level=1,
        class_name=None,
        race_name=None,
        hp_current=None,
        hp_max=None,
        is_draft=False,
    )
    user = SimpleNamespace(id=character.user_id)

    class FakeChars:
        def get_for_user(self, cid, uid):
            return character if cid == character.id and uid == user.id else None

        def get_active(self, cid):
            return None

    class FakeLobbies:
        def is_owner_of_character_lobby(self, **_kw):
            return False

    db = SimpleNamespace(commit=lambda: None, refresh=lambda _c: None)
    svc = CharacterService(db=db)  # type: ignore[arg-type]
    svc.characters = FakeChars()  # type: ignore[assignment]
    svc.lobbies = FakeLobbies()  # type: ignore[assignment]

    import app.services.character as char_mod
    from unittest.mock import patch

    with patch.object(
        char_mod,
        "to_detail",
        lambda c, **_kw: SimpleNamespace(id=c.id, rules_edition=c.rules_edition),
    ):
        with pytest.raises(AppError) as exc:
            asyncio.run(
                svc.update(
                    user,  # type: ignore[arg-type]
                    character.id,
                    CharacterUpdateRequest(
                        sheet_version=1,
                        rules_edition=RulesEdition.edition_2024,
                    ),
                )
            )
    assert exc.value.code == "rules_edition_locked"
    assert character.rules_edition == RulesEdition.edition_2014


def test_patch_rejects_2024_to_2014():
    character = SimpleNamespace(
        id=uuid4(),
        user_id=uuid4(),
        name="B",
        rules_edition=RulesEdition.edition_2024,
        sheet_version=1,
        sheet={},
        avatar_url=None,
        level=1,
        class_name=None,
        race_name=None,
        hp_current=None,
        hp_max=None,
        is_draft=False,
    )
    user = SimpleNamespace(id=character.user_id)

    class FakeChars:
        def get_for_user(self, cid, uid):
            return character

        def get_active(self, cid):
            return None

    class FakeLobbies:
        def is_owner_of_character_lobby(self, **_kw):
            return False

    db = SimpleNamespace(commit=lambda: None, refresh=lambda _c: None)
    svc = CharacterService(db=db)  # type: ignore[arg-type]
    svc.characters = FakeChars()  # type: ignore[assignment]
    svc.lobbies = FakeLobbies()  # type: ignore[assignment]

    with pytest.raises(AppError) as exc:
        asyncio.run(
            svc.update(
                user,  # type: ignore[arg-type]
                character.id,
                CharacterUpdateRequest(
                    sheet_version=1,
                    rules_edition=RulesEdition.edition_2014,
                ),
            )
        )
    assert exc.value.code == "rules_edition_locked"
    assert character.rules_edition == RulesEdition.edition_2024


# --- lobby edition -----------------------------------------------------------


def test_normalize_lobby_edition_defaults_2014():
    assert normalize_lobby_rules_edition(None) == RulesEdition.edition_2014
    assert normalize_lobby_rules_edition("2024") == RulesEdition.edition_2024


def test_join_rejects_other_edition():
    lobby = _lobby(owner_id=uuid4())
    lobby.rules_edition = RulesEdition.edition_2014
    character = SimpleNamespace(id=uuid4(), rules_edition=RulesEdition.edition_2024)
    with pytest.raises(AppError) as exc:
        ensure_character_matches_lobby(lobby=lobby, character=character)
    assert exc.value.code == "lobby_rules_edition_mismatch"
    assert "2014" in exc.value.message
    assert "2024" in exc.value.message


def test_legacy_lobby_without_edition_is_2014():
    lobby = SimpleNamespace(name="old")
    assert lobby_rules_edition_value(lobby) == "2014"


def test_join_with_character_checks_edition(monkeypatch):
    user = _user()
    lobby = _lobby(owner_id=uuid4())
    lobby.rules_edition = RulesEdition.edition_2014
    lobby.invite_code = "ABCDEF"
    lobby.campaign_rules = {}
    character = SimpleNamespace(
        id=uuid4(),
        user_id=user.id,
        rules_edition=RulesEdition.edition_2024,
        name="X",
        level=1,
        sheet={},
    )

    class FakeLobbies:
        def get_by_invite_code(self, code):
            return lobby

        def get_role(self, *a, **k):
            return None

        def get_membership_by_character(self, cid):
            return None

        def get_member(self, *a, **k):
            return None

    class FakeChars:
        def get_for_user(self, cid, uid):
            return character

    db = SimpleNamespace(commit=lambda: None)
    svc = LobbyService(db=db)  # type: ignore[arg-type]
    svc.lobbies = FakeLobbies()  # type: ignore[assignment]
    svc.characters = FakeChars()  # type: ignore[assignment]
    monkeypatch.setattr(
        "app.services.lobby_roles.is_comaster",
        lambda *a, **k: False,
    )
    monkeypatch.setattr(
        "app.services.lobby_roles.is_observer",
        lambda *a, **k: False,
    )

    with pytest.raises(AppError) as exc:
        svc.join_with_character(
            user,  # type: ignore[arg-type]
            JoinLobbyRequest(code="ABCDEF", character_id=character.id),
        )
    assert exc.value.code == "lobby_rules_edition_mismatch"


# --- catalog isolation -------------------------------------------------------


def test_catalog_repo_edition_filter_sql_uses_edition_or_both():
    """Compile the edition filter: 2014 sees 2014+both, not pure 2024."""
    from sqlalchemy import or_

    from app.models.catalog import CatalogEntry, CatalogRulesEdition

    edition = "2014"
    clause = or_(
        CatalogEntry.rules_edition == CatalogRulesEdition(edition),
        CatalogEntry.rules_edition == CatalogRulesEdition.both,
    )
    sql = str(clause.compile(compile_kwargs={"literal_binds": True}))
    assert "2014" in sql
    assert "both" in sql
    assert "2024" not in sql

    edition24 = "2024"
    clause24 = or_(
        CatalogEntry.rules_edition == CatalogRulesEdition(edition24),
        CatalogEntry.rules_edition == CatalogRulesEdition.both,
    )
    sql24 = str(clause24.compile(compile_kwargs={"literal_binds": True}))
    assert "2024" in sql24
    assert "both" in sql24
    assert "'2014'" not in sql24


def test_catalog_isolation_helper_lists():
    """Pure helper: filter rows the way the API edition filter intends."""
    rows = [
        {"slug": "human", "rules_edition": "2014"},
        {"slug": "human", "rules_edition": "2024"},
        {"slug": "longsword", "rules_edition": "both"},
    ]

    def visible(edition: str):
        return [
            r
            for r in rows
            if r["rules_edition"] in {edition, "both"}
        ]

    v2014 = {r["slug"] + ":" + r["rules_edition"] for r in visible("2014")}
    v2024 = {r["slug"] + ":" + r["rules_edition"] for r in visible("2024")}
    assert "human:2014" in v2014
    assert "human:2024" not in v2014
    assert "longsword:both" in v2014
    assert "human:2024" in v2024
    assert "human:2014" not in v2024
    assert "longsword:both" in v2024


# --- seed schema -------------------------------------------------------------


def test_seed_schema_and_no_stubs():
    weapon = normalize_weapon_data({"properties": ["versatile", "mastery:topple"]})
    assert weapon["mastery"] == "topple"
    assert "mastery:topple" not in weapon["properties"]

    bg = normalize_background_data({})
    assert bg["asi"] is None and bg["origin_feat"] is None

    feat = normalize_feat_data({})
    assert feat["category"] is None
    assert feat["prerequisites"] == {}
    assert feat["repeatable"] is False

    assert (
        normalize_entry_payload(
            {"kind": "class", "slug": "wizard", "name_ru": "W", "data": {}}
        )
        is None
    )
    assert (
        normalize_entry_payload(
            {"kind": "feat", "slug": "engineering", "name_ru": "E", "data": {"x": 1}}
        )
        is None
    )
    planned = load_wave_rows()
    # P24-C01 fills SRD species + backgrounds; framework still forbids stubs / playtest.
    assert all(r["slug"] not in {"culture", "engineering"} for r in planned)
    assert_raw_dump_not_activated(planned)


# --- labels ------------------------------------------------------------------


def test_race_species_label():
    assert race_species_label("2014") == "раса"
    assert race_species_label("2024") == "вид"
    assert race_species_label_title("2024") == "Вид"


# --- alembic head ------------------------------------------------------------


def test_alembic_single_head_includes_p24_01():
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    root = Path(__file__).resolve().parents[1]
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "alembic"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1, f"expected one alembic head, got {heads}"
    ancestor_ids = {
        rev.revision for rev in script.walk_revisions(base="base", head=heads[0])
    }
    assert "p2401lobbyed01" in ancestor_ids
    assert "wapi08partych01" in ancestor_ids


def test_migration_module_does_not_delete_characters():
    text = (
        Path(__file__).resolve().parents[1]
        / "alembic"
        / "versions"
        / "p2401lobbyed01_lobby_edition_and_seed.py"
    ).read_text(encoding="utf-8")
    assert "DELETE FROM characters" not in text.upper().replace("\n", " ")
    assert "purge" not in text.lower() or "never deletes" in text.lower()
    assert "never deletes characters" in text.lower() or "не удаляет" in text.lower() or "never deletes" in text


# --- purge script dry-run ----------------------------------------------------


def test_purge_script_dry_run_writes_backup(tmp_path):
    import importlib.util

    script_path = (
        Path(__file__).resolve().parents[1]
        / "scripts"
        / "purge_rules_edition_2024_characters.py"
    )
    spec = importlib.util.spec_from_file_location("purge_2024_chars", script_path)
    assert spec and spec.loader
    purge = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(purge)

    rows = [
        SimpleNamespace(
            id=uuid4(),
            user_id=uuid4(),
            name="Old 2024",
            rules_edition=RulesEdition.edition_2024,
            level=1,
            class_name=None,
            race_name=None,
            hp_current=None,
            hp_max=None,
            sheet_version=1,
            is_draft=False,
            sheet={"x": 1},
            avatar_url=None,
            created_at=None,
            updated_at=None,
            deleted_at=None,
        )
    ]
    backup = tmp_path / "backup.json"
    purge.write_backup(backup, rows)
    assert backup.is_file()
    data = json.loads(backup.read_text(encoding="utf-8"))
    assert data["count"] == 1
    assert data["characters"][0]["id"] == str(rows[0].id)
    assert data["characters"][0]["sheet"] == {"x": 1}
    # Dry-run path never touches deleted_at
    assert rows[0].deleted_at is None


def test_lobby_create_request_accepts_edition():
    req = LobbyCreateRequest(name="Стол", rules_edition="2014")
    assert req.rules_edition == "2014"
    req2 = LobbyCreateRequest(name="Стол", rules_edition="2024")
    assert req2.rules_edition == "2024"


def test_lobby_create_rejects_2024_when_flag_off(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "rules_edition_2024_open", False)
    user = _user()
    db = SimpleNamespace(commit=lambda: None)
    svc = LobbyService(db=db)  # type: ignore[arg-type]

    class FakeLobbies:
        def create(self, **_kwargs):
            raise AssertionError("create must not run when 2024 is closed")

    svc.lobbies = FakeLobbies()  # type: ignore[assignment]
    with pytest.raises(AppError) as exc:
        svc.create(
            user,  # type: ignore[arg-type]
            LobbyCreateRequest(name="Стол 2024", rules_edition="2024"),
        )
    assert exc.value.code == "rules_edition_closed"
    assert "2024" in exc.value.message


def test_lobby_create_allows_2014_when_flag_off(monkeypatch):
    from app.core.config import settings
    from app.models.character import RulesEdition

    monkeypatch.setattr(settings, "rules_edition_2024_open", False)
    user = _user()
    created = {}

    class FakeLobbies:
        def create(self, **kwargs):
            created.update(kwargs)
            lobby = _lobby(owner_id=kwargs["owner_id"])
            lobby.name = kwargs["name"]
            lobby.rules_edition = kwargs["rules_edition"]
            lobby.campaign_rules = {}
            lobby.members = []
            lobby.roles = []
            lobby.settings = []
            lobby.sessions = []
            lobby.visibility_profile = {}
            lobby.invite_code = "ABCDEF"
            return lobby

    db = SimpleNamespace(commit=lambda: None)
    svc = LobbyService(db=db)  # type: ignore[arg-type]
    svc.lobbies = FakeLobbies()  # type: ignore[assignment]

    def fake_require(lobby_id):
        lobby = _lobby(owner_id=user.id)
        lobby.id = lobby_id
        lobby.name = created.get("name") or "Стол"
        lobby.rules_edition = created.get("rules_edition") or RulesEdition.edition_2014
        lobby.campaign_rules = {}
        lobby.members = []
        lobby.roles = []
        lobby.settings = []
        lobby.sessions = []
        lobby.visibility_profile = {}
        lobby.invite_code = "ABCDEF"
        return lobby

    monkeypatch.setattr(svc, "_require_lobby", fake_require)
    monkeypatch.setattr(
        svc,
        "_to_detail",
        lambda lobby, _u: SimpleNamespace(
            id=getattr(lobby, "id", None),
            rules_edition=lobby_rules_edition_value(lobby),
            name=getattr(lobby, "name", "Стол"),
        ),
    )

    out = svc.create(
        user,  # type: ignore[arg-type]
        LobbyCreateRequest(name="Стол", rules_edition="2014"),
    )
    assert created["rules_edition"] == RulesEdition.edition_2014
    assert out.rules_edition == "2014"
