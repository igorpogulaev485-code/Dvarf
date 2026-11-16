"""ADM-03: запись событий в точках успеха; ошибка записи не ломает действие."""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

from app.models.character import RulesEdition
from app.models.product_event import ProductEventType
from app.schemas.character import CharacterCreateRequest
from app.schemas.lobby import LobbyCreateRequest, SessionCreateRequest
from app.services import character as character_mod
from app.services.character import CharacterService
from app.services.lobby import LobbyService


class HookDB:
    def __init__(self) -> None:
        self.commits = 0
        self.added: list = []

    def add(self, obj) -> None:  # noqa: ANN001
        self.added.append(obj)

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        return None

    def refresh(self, obj) -> None:  # noqa: ANN001
        return None


def test_character_create_records_event(monkeypatch):
    db = HookDB()
    recorded: list = []

    def capture(db_arg, event_type, **kwargs):
        recorded.append(
            (
                getattr(event_type, "value", event_type),
                kwargs.get("user_id"),
                kwargs.get("rules_edition"),
            )
        )

    import app.services.product_events as pe

    monkeypatch.setattr(pe, "record_product_event", capture)

    char_id = uuid4()
    user = SimpleNamespace(id=uuid4())
    character = SimpleNamespace(
        id=char_id,
        user_id=user.id,
        rules_edition=RulesEdition.edition_2014,
        name="Герой",
        is_draft=False,
    )

    svc = CharacterService(db)  # type: ignore[arg-type]
    monkeypatch.setattr(svc, "characters", SimpleNamespace(create=lambda **kw: character))
    monkeypatch.setattr(
        character_mod,
        "to_detail",
        lambda c, db=None: SimpleNamespace(id=c.id, name=c.name),
    )
    monkeypatch.setattr(character_mod, "empty_character_sheet", lambda: {})

    result = svc.create(
        user,
        CharacterCreateRequest(name="Герой", rules_edition=RulesEdition.edition_2014),
    )
    assert result.id == char_id
    assert any(r[0] == "character_created" and r[2] == "2014" for r in recorded)


def test_lobby_create_and_play_start_record(monkeypatch):
    db = HookDB()
    recorded: list = []

    def capture(db_arg, event_type, **kwargs):
        recorded.append(getattr(event_type, "value", event_type))

    import app.services.product_events as pe

    monkeypatch.setattr(pe, "record_product_event", capture)

    user = SimpleNamespace(id=uuid4())
    lobby = SimpleNamespace(id=uuid4(), owner_id=user.id, name="Стол", campaign_rules={})
    session = SimpleNamespace(id=uuid4(), lobby_id=lobby.id, name="Партия")

    svc = LobbyService(db)  # type: ignore[arg-type]
    monkeypatch.setattr(
        svc,
        "lobbies",
        SimpleNamespace(
            create=lambda **kw: lobby,
            get_setting=lambda sid: None,
            create_session=lambda **kw: session,
            get_member=lambda *a, **k: SimpleNamespace(),
            add_seat=lambda **kw: None,
        ),
    )
    monkeypatch.setattr(svc, "_require_lobby", lambda lid: lobby)
    monkeypatch.setattr(svc, "_to_detail", lambda L, u: SimpleNamespace(id=L.id, name=L.name))
    monkeypatch.setattr(svc, "_require_run", lambda L, u: None)
    monkeypatch.setattr(
        svc,
        "get_session",
        lambda u, sid: SimpleNamespace(id=sid, name="Партия"),
    )

    detail = svc.create(user, LobbyCreateRequest(name="Стол"))
    assert detail.id == lobby.id
    assert "lobby_created" in recorded

    recorded.clear()
    play = svc.create_session(
        user,
        lobby.id,
        SessionCreateRequest(name="Партия", character_ids=[]),
    )
    assert play.id == session.id
    assert "play_started" in recorded


def test_auth_login_and_signup_call_record(monkeypatch):
    """Проверяем, что login/register вызывают record после успеха (через патч модуля)."""
    from app.services.auth import AuthService

    db = HookDB()
    recorded: list = []

    def capture(db_arg, event_type, **kwargs):
        recorded.append(getattr(event_type, "value", event_type))

    import app.services.product_events as pe

    monkeypatch.setattr(pe, "record_product_event", capture)
    monkeypatch.setattr(pe, "record_product_events", lambda *a, **k: None)

    svc = AuthService(db)  # type: ignore[arg-type]
    user = SimpleNamespace(
        id=uuid4(),
        email="new@example.com",
        email_verified_at=None,
        password_hash="x",
        display_name="Новый",
    )
    monkeypatch.setattr(
        svc,
        "users",
        SimpleNamespace(
            get_by_email=lambda email: None,
            create_user=lambda **kw: user,
            add_identity=lambda **kw: None,
            get_by_id=lambda uid: user,
        ),
    )
    monkeypatch.setattr(svc, "_issue_verification_and_send", lambda u: ("ok", None))

    from app.core.security import hash_password

    user.password_hash = hash_password("Password1!")
    result = svc.register("new@example.com", "Password1!", "Новый")
    assert result.message
    assert "signup" in recorded

    recorded.clear()
    user.email_verified_at = __import__("datetime").datetime.now(
        __import__("datetime").timezone.utc
    )
    monkeypatch.setattr(
        svc,
        "users",
        SimpleNamespace(
            get_by_email=lambda email: user,
            get_by_id=lambda uid: user,
        ),
    )
    monkeypatch.setattr(
        "app.services.admin.raise_if_blocked",
        lambda u: None,
    )
    monkeypatch.setattr(
        svc,
        "issue_tokens",
        lambda loaded, **kw: SimpleNamespace(
            access_token="a",
            refresh_token="r",
            user=SimpleNamespace(id=loaded.id),
        ),
    )
    from app.core.security import verify_password as _vp

    monkeypatch.setattr(
        "app.services.auth.verify_password",
        lambda password, hashed: True,
    )

    tokens = svc.login("new@example.com", "Password1!")
    assert tokens.access_token == "a"
    assert "login" in recorded


def test_event_write_failure_does_not_break_character_create(monkeypatch):
    db = HookDB()

    def boom(db_arg, event_type, **kwargs):
        # Как настоящий record_product_event — глотает ошибку
        try:
            raise RuntimeError("disk full")
        except Exception:
            pass

    import app.services.product_events as pe

    monkeypatch.setattr(pe, "record_product_event", boom)

    user = SimpleNamespace(id=uuid4())
    character = SimpleNamespace(
        id=uuid4(),
        user_id=user.id,
        rules_edition=RulesEdition.edition_2014,
        name="Герой",
        is_draft=False,
    )
    svc = CharacterService(db)  # type: ignore[arg-type]
    monkeypatch.setattr(svc, "characters", SimpleNamespace(create=lambda **kw: character))
    monkeypatch.setattr(character_mod, "to_detail", lambda c, db=None: SimpleNamespace(id=c.id))
    monkeypatch.setattr(character_mod, "empty_character_sheet", lambda: {})

    result = svc.create(
        user,
        CharacterCreateRequest(name="Герой", rules_edition=RulesEdition.edition_2014),
    )
    assert result.id == character.id


def test_oauth_login_records_login(monkeypatch):
    from app.models.user import AuthProvider
    from app.services.auth import AuthService
    from app.services.oauth.base import OAuthProfile

    db = HookDB()
    recorded: list = []

    def capture(db_arg, event_type, **kwargs):
        recorded.append(getattr(event_type, "value", event_type))

    import app.services.product_events as pe

    monkeypatch.setattr(pe, "record_product_event", capture)

    existing = SimpleNamespace(
        id=uuid4(),
        avatar_url=None,
        email="oauth@example.com",
    )
    svc = AuthService(db)  # type: ignore[arg-type]
    monkeypatch.setattr(
        svc,
        "users",
        SimpleNamespace(
            get_by_identity=lambda *a, **k: existing,
            get_by_id=lambda uid: existing,
        ),
    )
    monkeypatch.setattr("app.services.admin.raise_if_blocked", lambda u: None)
    monkeypatch.setattr(
        svc,
        "issue_tokens",
        lambda loaded, **kw: SimpleNamespace(access_token="a", refresh_token="r", user=None),
    )

    profile = OAuthProfile(
        provider=AuthProvider.yandex,
        provider_user_id="ya-1",
        email="oauth@example.com",
        display_name="OAuth",
    )
    tokens = svc.login_with_oauth_profile(profile)
    assert tokens.access_token == "a"
    assert "login" in recorded
