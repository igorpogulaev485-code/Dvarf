"""W-API-10: MCP-сервер импорта мира (streamable HTTP поверх REST)."""

from __future__ import annotations

import json
import logging
from typing import Any
from urllib.parse import urlparse

from mcp.server.fastmcp import Context, FastMCP
from mcp.server.transport_security import TransportSecuritySettings

from app.core.config import settings
from app.mcp.rest_bridge import WorldImportRestBridge, WorldImportRestError

logger = logging.getLogger(__name__)

INSTRUCTIONS_RU = """\
Импорт мира Creed20/Dvarf (D&D 5e 2014) в черновик сверки мастера.

Порядок работы:
1) Сначала validate_world — проверить пакет без записи в канон.
2) Затем upsert_world_files или import_world_from_git — залить в черновик.
3) get_import_diff / get_import_status — посмотреть сверку.
4) confirm_import — только если мастер явно попросил ИЛИ включён тумблер
   «ИИ может подтверждать» (по умолчанию выключен; сервер всё равно проверяет).
5) undo_import_confirm — отменить последнее подтверждение.

Токен API (Bearer wapi_…) передавайте в заголовке Authorization клиента MCP.
Не включайте сырой токен в текст чата и не просите его логировать.
Редакция правил: только 2014 (поле rules_edition; иначе — ошибка).
Мир остаётся только внутри лобби мастера: без публикации и без общего каталога.
"""

TOOL_NAMES = (
    "validate_world",
    "upsert_world_files",
    "import_world_from_git",
    "get_import_status",
    "get_import_diff",
    "confirm_import",
    "undo_import_confirm",
)

# Единый мост; ASGI-приложение привязывается при mount.
bridge = WorldImportRestBridge()


def _hosts_from_public_url(public_url: str) -> list[str]:
    hosts = [
        "localhost",
        "localhost:*",
        "127.0.0.1",
        "127.0.0.1:*",
        "[::1]",
        "[::1]:*",
    ]
    raw = (public_url or "").strip()
    if raw:
        parsed = urlparse(raw if "://" in raw else f"https://{raw}")
        host = (parsed.hostname or "").strip().lower()
        if host and host not in {"localhost", "127.0.0.1", "::1"}:
            hosts.append(host)
            hosts.append(f"{host}:*")
    # Доп. хосты из env (через запятую).
    extra = getattr(settings, "mcp_allowed_hosts", "") or ""
    for part in str(extra).split(","):
        h = part.strip()
        if h and h not in hosts:
            hosts.append(h)
    return hosts


def _origins_from_public_url(public_url: str) -> list[str]:
    origins = [
        "http://localhost",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://127.0.0.1",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
    ]
    raw = (public_url or "").strip().rstrip("/")
    if raw:
        if "://" not in raw:
            raw = f"https://{raw}"
        if raw not in origins:
            origins.append(raw)
    return origins


def _authorization_from_ctx(ctx: Context | None, authorization: str | None) -> str:
    if authorization and authorization.strip():
        return authorization.strip()
    if ctx is None:
        return ""
    try:
        req = ctx.request_context.request
    except ValueError:
        return ""
    if req is None:
        return ""
    headers = getattr(req, "headers", None)
    if headers is None:
        return ""
    return str(headers.get("authorization") or headers.get("Authorization") or "")


def _tool_result(payload: dict[str, Any]) -> str:
    return json.dumps(payload, ensure_ascii=False, default=str)


def _error_result(exc: WorldImportRestError) -> str:
    return _tool_result(exc.as_tool_payload())


def create_world_import_mcp(
    *,
    rest: WorldImportRestBridge | None = None,
) -> FastMCP:
    """Создаёт FastMCP с инструментами импорта мира."""
    active = rest or bridge
    mcp = FastMCP(
        name="creed20-world-import",
        instructions=INSTRUCTIONS_RU,
        website_url=settings.app_public_url or None,
        host="0.0.0.0",
        streamable_http_path="/",
        json_response=True,
        stateless_http=True,
        # Крупные пакеты markdown+base64 PDF; потолок тела MCP выше дефолтных 4 МиБ.
        max_request_body_size=12 * 1024 * 1024,
        transport_security=TransportSecuritySettings(
            enable_dns_rebinding_protection=True,
            allowed_hosts=_hosts_from_public_url(settings.app_public_url),
            allowed_origins=_origins_from_public_url(settings.app_public_url),
        ),
    )

    @mcp.tool(
        name="validate_world",
        description=(
            "Сначала проверьте пакет мира без записи в канон и без устойчивого задания. "
            "Передайте файлы [{path, content}] и опционально rules_edition (только 2014). "
            "После успешной проверки можно вызывать upsert_world_files."
        ),
    )
    async def validate_world(
        setting_id: str,
        files: list[dict[str, Any]],
        rules_edition: str = "2014",
        authorization: str | None = None,
        ctx: Context | None = None,
    ) -> str:
        try:
            out = await active.validate_world(
                setting_id=setting_id,
                authorization=_authorization_from_ctx(ctx, authorization),
                files=files,
                rules_edition=rules_edition,
            )
            if isinstance(out, dict):
                out = {"ok": bool(out.get("ok", True)), **out}
            return _tool_result(out if isinstance(out, dict) else {"ok": True, "result": out})
        except WorldImportRestError as exc:
            return _error_result(exc)

    @mcp.tool(
        name="upsert_world_files",
        description=(
            "Залить файлы мира в черновик сверки (после validate_world). "
            "Канон вики не трогает, пока нет confirm_import. "
            "source_kind=mcp. rules_edition — только 2014."
        ),
    )
    async def upsert_world_files(
        setting_id: str,
        files: list[dict[str, Any]],
        rules_edition: str = "2014",
        idempotency_key: str | None = None,
        authorization: str | None = None,
        ctx: Context | None = None,
    ) -> str:
        try:
            out = await active.upsert_world_files(
                setting_id=setting_id,
                authorization=_authorization_from_ctx(ctx, authorization),
                files=files,
                rules_edition=rules_edition,
                idempotency_key=idempotency_key,
            )
            return _tool_result(out if isinstance(out, dict) else {"result": out})
        except WorldImportRestError as exc:
            return _error_result(exc)

    @mcp.tool(
        name="import_world_from_git",
        description=(
            "Импорт из публичной HTTPS git-ссылки (github.com / gitlab.com) в черновик. "
            "file://, localhost и частные IP запрещены. Сначала лучше validate_world на локальных файлах."
        ),
    )
    async def import_world_from_git(
        setting_id: str,
        url: str,
        rules_edition: str = "2014",
        idempotency_key: str | None = None,
        authorization: str | None = None,
        ctx: Context | None = None,
    ) -> str:
        try:
            out = await active.import_world_from_git(
                setting_id=setting_id,
                authorization=_authorization_from_ctx(ctx, authorization),
                url=url,
                rules_edition=rules_edition,
                idempotency_key=idempotency_key,
            )
            return _tool_result(out if isinstance(out, dict) else {"result": out})
        except WorldImportRestError as exc:
            return _error_result(exc)

    @mcp.tool(
        name="get_import_status",
        description="Статус задания импорта мира (черновик / confirmed / cancelled).",
    )
    async def get_import_status(
        setting_id: str,
        job_id: str,
        authorization: str | None = None,
        ctx: Context | None = None,
    ) -> str:
        try:
            out = await active.get_import_status(
                setting_id=setting_id,
                job_id=job_id,
                authorization=_authorization_from_ctx(ctx, authorization),
            )
            return _tool_result(out if isinstance(out, dict) else {"result": out})
        except WorldImportRestError as exc:
            return _error_result(exc)

    @mcp.tool(
        name="get_import_diff",
        description=(
            "Сверка черновика с каноном: new / update / conflict / missing_in_source. "
            "Смотрите перед confirm_import."
        ),
    )
    async def get_import_diff(
        setting_id: str,
        job_id: str,
        authorization: str | None = None,
        ctx: Context | None = None,
    ) -> str:
        try:
            out = await active.get_import_diff(
                setting_id=setting_id,
                job_id=job_id,
                authorization=_authorization_from_ctx(ctx, authorization),
            )
            return _tool_result(out if isinstance(out, dict) else {"result": out})
        except WorldImportRestError as exc:
            return _error_result(exc)

    @mcp.tool(
        name="confirm_import",
        description=(
            "Подтвердить черновик и записать в канон. "
            "Вызывайте только если мастер явно попросил или тумблер «ИИ может подтверждать» включён. "
            "Сервер отклонит с confirm_ai_disabled, если тумблер выключен (по умолчанию так)."
        ),
    )
    async def confirm_import(
        setting_id: str,
        job_id: str,
        item_ids: list[str] | None = None,
        authorization: str | None = None,
        ctx: Context | None = None,
    ) -> str:
        try:
            out = await active.confirm_import(
                setting_id=setting_id,
                job_id=job_id,
                authorization=_authorization_from_ctx(ctx, authorization),
                item_ids=item_ids,
            )
            return _tool_result(out if isinstance(out, dict) else {"result": out})
        except WorldImportRestError as exc:
            return _error_result(exc)

    @mcp.tool(
        name="undo_import_confirm",
        description="Отменить последнее подтверждение импорта (откат канона к снимку до confirm).",
    )
    async def undo_import_confirm(
        setting_id: str,
        job_id: str,
        authorization: str | None = None,
        ctx: Context | None = None,
    ) -> str:
        try:
            out = await active.undo_import_confirm(
                setting_id=setting_id,
                job_id=job_id,
                authorization=_authorization_from_ctx(ctx, authorization),
            )
            return _tool_result(out if isinstance(out, dict) else {"result": out})
        except WorldImportRestError as exc:
            return _error_result(exc)

    return mcp


# Экземпляр по умолчанию для mount и `python -m app.mcp.world_import`.
world_import_mcp = create_world_import_mcp()
_mcp_asgi_app: Any | None = None


def get_world_import_mcp_asgi() -> Any:
    """Starlette-приложение streamable HTTP (один раз на процесс)."""
    global _mcp_asgi_app
    if _mcp_asgi_app is None:
        _mcp_asgi_app = world_import_mcp.streamable_http_app()
    return _mcp_asgi_app


def mount_world_import_mcp(app: Any) -> FastMCP:
    """Примонтировать streamable HTTP MCP на FastAPI по пути /mcp/world-import."""
    bridge.bind_asgi_app(app)
    app.mount("/mcp/world-import", get_world_import_mcp_asgi())
    logger.info("MCP world-import mounted at /mcp/world-import")
    return world_import_mcp


if __name__ == "__main__":
    # Локальный запуск отдельным процессом (см. docs/world-import-mcp.md).
    world_import_mcp.settings.host = "127.0.0.1"
    world_import_mcp.settings.port = int(getattr(settings, "mcp_port", 8100) or 8100)
    world_import_mcp.settings.streamable_http_path = "/mcp/world-import"
    world_import_mcp.run(transport="streamable-http")
