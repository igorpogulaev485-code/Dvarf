"""W-API-10: MCP-коннектор — инструменты поверх REST, без живых ChatGPT."""

from __future__ import annotations

import asyncio
import json
import re
from pathlib import Path
from unittest.mock import MagicMock
from uuid import uuid4

import httpx
import pytest

from app.core.exceptions import AppError
from app.mcp.rest_bridge import WorldImportRestBridge, WorldImportRestError
from app.mcp.world_import import TOOL_NAMES, create_world_import_mcp
from app.services.world_import_git import (
    MAX_GIT_ARCHIVE_BYTES,
    download_git_archive,
    validate_git_url,
)

FIXTURE_ROOT = Path(__file__).resolve().parent / "fixtures" / "who_vault"
REPO_ROOT = Path(__file__).resolve().parents[2]


def _fixture_files(*rel_paths: str) -> list[dict]:
    files = []
    for rel in rel_paths:
        path = FIXTURE_ROOT / rel
        files.append(
            {
                "path": rel.replace("\\", "/"),
                "content": path.read_text(encoding="utf-8"),
            }
        )
    return files


def _mock_transport(handler):
    return httpx.MockTransport(handler)


def _tool_payload(result) -> dict:
    """call_tool → (content_blocks, structured); достаём JSON текста."""
    if isinstance(result, tuple):
        blocks = result[0]
    else:
        blocks = result
    text = blocks[0].text
    return json.loads(text)


def test_validate_and_upsert_return_diff_shaped_payload():
    setting_id = str(uuid4())
    job_id = str(uuid4())
    files = _fixture_files("world/locations/lunnyy-most.md")
    calls: list[tuple[str, str]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append((request.method, request.url.path))
        auth = request.headers.get("authorization", "")
        assert auth.startswith("Bearer wapi_"), "токен должен уходить в Authorization"
        assert "wapi_test_secret_never_commit" in auth
        if request.url.path.endswith("/validate"):
            return httpx.Response(
                200,
                json={
                    "ok": True,
                    "rules_edition": "2014",
                    "type_counts": {"location": 1},
                    "file_count": 1,
                    "text_bytes": 10,
                    "errors": [],
                    "warnings": [],
                },
            )
        if request.url.path.endswith("/world-imports") and request.method == "POST":
            body = json.loads(request.content.decode("utf-8"))
            assert body.get("source_kind") == "mcp"
            assert body.get("rules_edition") == "2014"
            return httpx.Response(
                201,
                json={
                    "job": {
                        "id": job_id,
                        "setting_id": setting_id,
                        "status": "draft",
                        "rules_edition": "2014",
                        "source_kind": "mcp",
                    },
                    "items": [
                        {
                            "id": str(uuid4()),
                            "job_id": job_id,
                            "item_type": "location",
                            "source_key": "location:lunnyy-most",
                            "status": "proposed",
                            "proposal": {"title": "Лунный мост"},
                        }
                    ],
                    "created_count": 1,
                    "updated_count": 0,
                    "links": [],
                    "links_count": 0,
                },
            )
        if request.url.path.endswith("/diff"):
            return httpx.Response(
                200,
                json={
                    "job_id": job_id,
                    "setting_id": setting_id,
                    "entries": [
                        {
                            "source_key": "location:lunnyy-most",
                            "item_type": "location",
                            "status": "new",
                            "title": "Лунный мост",
                        }
                    ],
                    "counts": {"new": 1},
                },
            )
        return httpx.Response(404, json={"detail": "not found", "code": "not_found"})

    async def _run() -> None:
        async with httpx.AsyncClient(
            transport=_mock_transport(handler), base_url="http://test"
        ) as client:
            bridge = WorldImportRestBridge(client=client, base_url="http://test")
            mcp = create_world_import_mcp(rest=bridge)

            v_payload = _tool_payload(
                await mcp.call_tool(
                    "validate_world",
                    {
                        "setting_id": setting_id,
                        "files": files,
                        "rules_edition": "2014",
                        "authorization": "Bearer wapi_test_secret_never_commit",
                    },
                )
            )
            assert v_payload["ok"] is True
            assert v_payload["type_counts"]["location"] == 1

            u_payload = _tool_payload(
                await mcp.call_tool(
                    "upsert_world_files",
                    {
                        "setting_id": setting_id,
                        "files": files,
                        "rules_edition": "2014",
                        "authorization": "Bearer wapi_test_secret_never_commit",
                        "idempotency_key": "mcp-test-1",
                    },
                )
            )
            assert u_payload["job"]["id"] == job_id
            assert u_payload["created_count"] == 1

            d_payload = _tool_payload(
                await mcp.call_tool(
                    "get_import_diff",
                    {
                        "setting_id": setting_id,
                        "job_id": job_id,
                        "authorization": "Bearer wapi_test_secret_never_commit",
                    },
                )
            )
            assert d_payload["counts"]["new"] == 1
            assert d_payload["entries"][0]["status"] == "new"

    asyncio.run(_run())
    assert ("POST", f"/settings/{setting_id}/world-imports/validate") in calls
    assert any(p.endswith("/diff") for _, p in calls)


def test_confirm_import_ai_disabled():
    setting_id = str(uuid4())
    job_id = str(uuid4())

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith("/confirm")
        return httpx.Response(
            403,
            json={
                "detail": "Подтверждение импорта через ИИ выключено",
                "code": "confirm_ai_disabled",
                "data": {
                    "hint": "Мастер включает тумблер в настройках импорта или подтверждает сам"
                },
            },
        )

    async def _run() -> dict:
        async with httpx.AsyncClient(
            transport=_mock_transport(handler), base_url="http://test"
        ) as client:
            bridge = WorldImportRestBridge(client=client, base_url="http://test")
            mcp = create_world_import_mcp(rest=bridge)
            return _tool_payload(
                await mcp.call_tool(
                    "confirm_import",
                    {
                        "setting_id": setting_id,
                        "job_id": job_id,
                        "authorization": "Bearer wapi_test_secret_never_commit",
                    },
                )
            )

    payload = asyncio.run(_run())
    assert payload["ok"] is False
    assert payload["code"] == "confirm_ai_disabled"
    assert "тумблер" in payload["hint"].lower() or "Мастер" in payload["hint"]


def test_import_world_from_git_rejects_file_scheme():
    setting_id = str(uuid4())

    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content.decode("utf-8"))
        assert body["url"].startswith("file:")
        return httpx.Response(
            400,
            json={
                "detail": "Схема file:// запрещена",
                "code": "git_url_rejected",
                "data": {"hint": "Только https://github.com/… или gitlab.com"},
            },
        )

    async def _run() -> dict:
        async with httpx.AsyncClient(
            transport=_mock_transport(handler), base_url="http://test"
        ) as client:
            bridge = WorldImportRestBridge(client=client, base_url="http://test")
            mcp = create_world_import_mcp(rest=bridge)
            return _tool_payload(
                await mcp.call_tool(
                    "import_world_from_git",
                    {
                        "setting_id": setting_id,
                        "url": "file:///tmp/world.git",
                        "authorization": "Bearer wapi_test_secret_never_commit",
                    },
                )
            )

    payload = asyncio.run(_run())
    assert payload["code"] == "git_url_rejected"

    with pytest.raises(AppError) as ei:
        validate_git_url("file:///tmp/world.git")
    assert ei.value.code == "git_url_rejected"


def test_rules_edition_2024_error_is_readable():
    setting_id = str(uuid4())

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            400,
            json={
                "detail": "в этой версии импорта мира доступна только редакция 2014",
                "code": "rules_edition_unsupported",
                "data": {"hint": "Укажите rules_edition=2014 или опустите поле"},
            },
        )

    async def _run() -> dict:
        async with httpx.AsyncClient(
            transport=_mock_transport(handler), base_url="http://test"
        ) as client:
            bridge = WorldImportRestBridge(client=client, base_url="http://test")
            mcp = create_world_import_mcp(rest=bridge)
            return _tool_payload(
                await mcp.call_tool(
                    "validate_world",
                    {
                        "setting_id": setting_id,
                        "files": [],
                        "rules_edition": "2024",
                        "authorization": "Bearer wapi_test_secret_never_commit",
                    },
                )
            )

    payload = asyncio.run(_run())
    assert payload["code"] == "rules_edition_unsupported"
    assert "2014" in payload["message"]


def test_mcp_tool_names_and_instructions():
    mcp = create_world_import_mcp(rest=WorldImportRestBridge())
    names = {t.name for t in mcp._tool_manager.list_tools()}  # noqa: SLF001
    for name in TOOL_NAMES:
        assert name in names
    text = mcp.instructions or ""
    assert "validate_world" in text
    assert "confirm_import" in text
    assert "выключен" in text.lower() or "тумблер" in text.lower()


def test_no_hardcoded_world_api_tokens_in_repo():
    """В продуктовом коде/доках нет захардкоженных секретов вида token_urlsafe."""
    # Реальный секрет: wapi_ + secrets.token_urlsafe(32) (~43 urlsafe символа).
    pattern = re.compile(r"wapi_[A-Za-z0-9_-]{24,}")
    scanned = 0
    hits: list[str] = []
    roots = [REPO_ROOT / "backend" / "app", REPO_ROOT / "docs", REPO_ROOT / "frontend" / "src"]
    for root in roots:
        if not root.is_dir():
            continue
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            rel = path.relative_to(REPO_ROOT).as_posix()
            if "__pycache__" in rel or path.suffix.lower() not in {
                ".py",
                ".md",
                ".ts",
                ".tsx",
                ".json",
                ".yml",
                ".yaml",
                ".txt",
            }:
                continue
            try:
                text = path.read_text(encoding="utf-8")
            except (UnicodeDecodeError, OSError):
                continue
            scanned += 1
            for match in pattern.findall(text):
                # Плейсхолдеры вроде wapi_… / wapi_your_token_here — не секреты.
                lower = match.lower()
                if "your" in lower or "example" in lower or "placeholder" in lower:
                    continue
                hits.append(f"{rel}: {match[:28]}")
    assert scanned > 20
    assert hits == [], f"Найдены похожие на секреты токены: {hits[:5]}"


def test_file_too_large_hint_does_not_mention_who():
    """Продуктовый hint не ссылается на учебный мир Who."""
    parsed = validate_git_url("https://github.com/owner/repo")
    req = httpx.Request("GET", parsed.archive_url)
    too_big = MAX_GIT_ARCHIVE_BYTES + 1
    resp = httpx.Response(
        200,
        headers={"content-length": str(too_big)},
        request=req,
    )

    class FakeStream:
        def __enter__(self):
            return resp

        def __exit__(self, *args):
            return False

    client = MagicMock()
    client.stream = MagicMock(return_value=FakeStream())

    with pytest.raises(AppError) as ei:
        download_git_archive(parsed, client=client, resolve_host=lambda h: None)
    assert ei.value.code == "file_too_large"
    hint = str((ei.value.data or {}).get("hint") or "")
    assert "Who" not in hint
    assert "урезанный zip" in hint


def test_rest_bridge_error_payload_shape():
    err = WorldImportRestError(
        "нет",
        code="confirm_ai_disabled",
        status_code=403,
        data={"hint": "включите тумблер"},
        path="/settings/x/world-imports/y/confirm",
    )
    payload = err.as_tool_payload()
    assert payload["ok"] is False
    assert payload["code"] == "confirm_ai_disabled"
    assert payload["hint"] == "включите тумблер"
