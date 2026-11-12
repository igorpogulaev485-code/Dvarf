"""L-02: процессор картинок, права загрузки, квота и закрытие /uploads/lobbies."""

from __future__ import annotations

import io
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from PIL import Image

from app.core.exceptions import AppError
from app.models.lobby import LOBBY_ROLE_COMASTER, LOBBY_ROLE_OBSERVER, LobbyRole
from app.services import lobby_roles as roles
from app.services import media as media_svc
from app.services.media import (
    LOBBY_FULL_MAX_SIDE,
    LOBBY_PREVIEW_MAX_SIDE,
    LOBBY_QUOTA_BYTES,
    MAX_UPLOAD_BYTES,
    LobbyMediaService,
    LobbyMediaUsage,
    can_upload_lobby_media,
    process_image,
    process_lobby_image,
)


def _jpeg_bytes(width: int, height: int, *, quality: int = 85) -> bytes:
    img = Image.new("RGB", (width, height), color=(40, 120, 200))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    return buf.getvalue()


def _png_rgba_bytes(width: int, height: int) -> bytes:
    img = Image.new("RGBA", (width, height), color=(10, 20, 30, 128))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _user(uid=None):
    return SimpleNamespace(id=uid or uuid4())


def _lobby(owner_id, members=None, lobby_id=None):
    return SimpleNamespace(
        id=lobby_id or uuid4(),
        owner_id=owner_id,
        members=list(members or []),
    )


class RoleMemoryDB:
    def __init__(self, role_rows: list[LobbyRole] | None = None):
        self.role_rows = list(role_rows or [])

    def scalars(self, stmt):  # noqa: ANN001
        return SimpleNamespace(all=lambda: list(self.role_rows))

    def scalar(self, stmt):  # noqa: ANN001
        return None


@pytest.fixture(autouse=True)
def _patch_roles(monkeypatch):
    def fake_has_role(db, lobby_id, user_id, role, *, session_id=None):
        if not isinstance(db, RoleMemoryDB):
            return False
        for row in db.role_rows:
            if row.lobby_id != lobby_id or row.user_id != user_id or row.role != role:
                continue
            if role == "lead_today":
                if session_id is None or row.session_id != session_id:
                    continue
            elif row.session_id is not None:
                continue
            return True
        return False

    def fake_can_view(db, lobby, user):
        if lobby.owner_id == user.id:
            return True
        if any(getattr(m, "user_id", None) == user.id for m in lobby.members):
            return True
        if isinstance(db, RoleMemoryDB):
            return any(r.lobby_id == lobby.id and r.user_id == user.id for r in db.role_rows)
        return False

    monkeypatch.setattr(roles, "_has_role", fake_has_role)
    monkeypatch.setattr(roles, "can_view_lobby", fake_can_view)
    monkeypatch.setattr(roles, "has_character_in_lobby", lambda *a, **k: False)


def test_process_lobby_image_webp_and_sides():
    raw = _jpeg_bytes(2400, 1200)
    assert len(raw) > 1024
    out = process_lobby_image(raw, content_type="image/jpeg")
    assert max(out.full.width, out.full.height) <= LOBBY_FULL_MAX_SIDE
    assert max(out.preview.width, out.preview.height) <= LOBBY_PREVIEW_MAX_SIDE
    full_img = Image.open(io.BytesIO(out.full.data))
    assert full_img.format == "WEBP"
    preview_img = Image.open(io.BytesIO(out.preview.data))
    assert preview_img.format == "WEBP"
    assert out.bytes_on_disk == len(out.full.data) + len(out.preview.data)


def test_process_preserves_transparency():
    raw = _png_rgba_bytes(800, 600)
    out = process_lobby_image(raw, content_type="image/png")
    img = Image.open(io.BytesIO(out.full.data))
    assert img.mode in {"RGBA", "RGB"}  # WebP may keep alpha
    # alpha channel present when saved from RGBA source
    assert "A" in img.getbands() or img.mode == "RGBA"


def test_rejects_oversize_upload():
    data = b"x" * (MAX_UPLOAD_BYTES + 1)
    with pytest.raises(AppError) as exc:
        process_image(data, max_side=256, content_type="image/jpeg")
    assert exc.value.status_code == 400
    assert "10 МБ" in exc.value.message


def test_rejects_non_image_bytes():
    with pytest.raises(AppError) as exc:
        process_lobby_image(b"not-an-image", content_type="image/jpeg")
    assert exc.value.status_code == 400


def test_rejects_gif_by_content():
    img = Image.new("RGB", (32, 32), color=(1, 2, 3))
    buf = io.BytesIO()
    img.save(buf, format="GIF")
    with pytest.raises(AppError) as exc:
        process_lobby_image(buf.getvalue(), content_type="image/gif")
    assert exc.value.status_code == 400


def test_owner_and_comaster_can_upload_player_observer_cannot():
    owner = _user()
    comaster = _user()
    player = _user()
    observer = _user()
    stranger = _user()
    lobby = _lobby(owner.id, members=[SimpleNamespace(user_id=player.id)])
    db = RoleMemoryDB(
        [
            LobbyRole(
                id=uuid4(),
                lobby_id=lobby.id,
                user_id=comaster.id,
                role=LOBBY_ROLE_COMASTER,
            ),
            LobbyRole(
                id=uuid4(),
                lobby_id=lobby.id,
                user_id=observer.id,
                role=LOBBY_ROLE_OBSERVER,
            ),
        ]
    )
    assert can_upload_lobby_media(db, lobby, owner) is True
    assert can_upload_lobby_media(db, lobby, comaster) is True
    assert can_upload_lobby_media(db, lobby, player) is False
    assert can_upload_lobby_media(db, lobby, observer) is False
    assert can_upload_lobby_media(db, lobby, stranger) is False


def test_quota_message_and_limit_constant():
    assert LOBBY_QUOTA_BYTES == 200 * 1024 * 1024
    usage = LobbyMediaUsage(used_bytes=LOBBY_QUOTA_BYTES, free_bytes=0)
    assert usage.limit_mb == 200.0
    assert usage.free_mb == 0.0


def test_uploads_lobbies_not_public_static():
    from app.main import app

    mount_paths = []
    for route in app.routes:
        path = getattr(route, "path", None)
        if path:
            mount_paths.append(path)
    assert "/uploads/avatars" in mount_paths
    assert "/uploads/character-avatars" in mount_paths
    assert "/uploads" not in mount_paths
    assert not any(p.startswith("/uploads/lobbies") for p in mount_paths)


def test_delete_for_attachment_removes_files(tmp_path, monkeypatch):
    monkeypatch.setattr(media_svc.settings, "uploads_dir", str(tmp_path))

    class FakeDB:
        def __init__(self):
            self.rows: list = []
            self.deleted: list = []

        def get(self, model, pk):  # noqa: ANN001
            for row in self.rows:
                if row.id == pk:
                    return row
            return None

        def scalars(self, stmt):  # noqa: ANN001
            return SimpleNamespace(all=lambda: list(self.rows))

        def delete(self, row):  # noqa: ANN001
            self.deleted.append(row)
            self.rows = [r for r in self.rows if r.id != row.id]

        def commit(self):
            return None

        def add(self, row):  # noqa: ANN001
            self.rows.append(row)

        def refresh(self, row):  # noqa: ANN001
            return None

        def scalar(self, stmt):  # noqa: ANN001
            return sum(r.bytes_on_disk for r in self.rows)

    lobby_id = uuid4()
    media_id = uuid4()
    page_id = uuid4()
    full = tmp_path / "lobbies" / str(lobby_id) / f"{media_id}.webp"
    preview = tmp_path / "lobbies" / str(lobby_id) / f"{media_id}_p.webp"
    full.parent.mkdir(parents=True)
    full.write_bytes(b"full")
    preview.write_bytes(b"prev")

    row = SimpleNamespace(
        id=media_id,
        lobby_id=lobby_id,
        kind="wiki",
        attached_to_id=page_id,
        bytes_on_disk=8,
    )
    db = FakeDB()
    db.rows.append(row)

    # scalars() used by delete_for_attachment — return matching rows
    def fake_scalars(stmt):  # noqa: ANN001
        return SimpleNamespace(
            __iter__=lambda self: iter(db.rows),
            all=lambda: list(db.rows),
        )

    # SQLAlchemy Result is iterable via scalars() returning ScalarResult
    class ScalarResult:
        def __iter__(self):
            return iter(db.rows)

        def all(self):
            return list(db.rows)

    db.scalars = lambda stmt: ScalarResult()  # type: ignore[method-assign]

    svc = LobbyMediaService(db)  # type: ignore[arg-type]
    removed = svc.delete_for_attachment(lobby_id, "wiki", page_id)
    assert removed == 1
    assert not full.exists()
    assert not preview.exists()
    assert db.deleted == [row]


def test_avatar_uses_shared_processor(tmp_path, monkeypatch):
    from app.services import avatar as avatar_svc

    monkeypatch.setattr(media_svc.settings, "uploads_dir", str(tmp_path))
    user_id = uuid4()
    raw = _jpeg_bytes(900, 900)
    # >2 МБ раньше было запрещено; теперь общий лимит 10 МБ
    url = avatar_svc.save_avatar_image(
        user_id=user_id,
        data=raw,
        content_type="image/jpeg",
    )
    assert url.startswith("/uploads/avatars/")
    path = Path(tmp_path) / "avatars" / f"{user_id}.webp"
    assert path.exists()
    img = Image.open(path)
    assert max(img.size) <= 256
    assert img.format == "WEBP"
