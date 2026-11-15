"""HTTP-мост MCP → REST импорта мира (без дублирования бизнес-логики)."""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

import httpx

logger = logging.getLogger(__name__)


class WorldImportRestError(Exception):
    """Ответ REST с кодом ошибки импорта (для инструментов MCP)."""

    def __init__(
        self,
        message: str,
        *,
        code: str,
        status_code: int = 400,
        data: dict[str, Any] | None = None,
        path: str = "",
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.data = data or {}
        self.path = path

    def as_tool_payload(self) -> dict[str, Any]:
        hint = ""
        if isinstance(self.data, dict):
            hint = str(self.data.get("hint") or "")
        return {
            "ok": False,
            "code": self.code,
            "path": self.path,
            "message": self.message,
            "hint": hint,
            "data": self.data,
            "status_code": self.status_code,
        }


def _auth_header(authorization: str) -> dict[str, str]:
    raw = (authorization or "").strip()
    if not raw:
        raise WorldImportRestError(
            "Нужен токен импорта мира (Bearer wapi_…)",
            code="unauthorized",
            status_code=401,
            data={"hint": "Укажите токен в заголовке Authorization клиента MCP"},
        )
    if raw.lower().startswith("bearer "):
        return {"Authorization": raw}
    return {"Authorization": f"Bearer {raw}"}


def _parse_error(resp: httpx.Response, *, path: str) -> WorldImportRestError:
    code = "http_error"
    message = f"Ошибка REST ({resp.status_code})"
    data: dict[str, Any] = {}
    try:
        body = resp.json()
    except Exception:  # noqa: BLE001
        body = None
    if isinstance(body, dict):
        code = str(body.get("code") or code)
        message = str(body.get("detail") or body.get("message") or message)
        raw_data = body.get("data")
        if isinstance(raw_data, dict):
            data = raw_data
    return WorldImportRestError(
        message,
        code=code,
        status_code=resp.status_code,
        data=data,
        path=path,
    )


class WorldImportRestBridge:
    """Вызовы существующих эндпоинтов /settings/{id}/world-imports/…."""

    def __init__(
        self,
        *,
        client: httpx.AsyncClient | None = None,
        asgi_app: Any | None = None,
        base_url: str = "http://world-import-mcp.internal",
    ) -> None:
        self._client = client
        self._asgi_app = asgi_app
        self._base_url = base_url.rstrip("/")

    def bind_asgi_app(self, app: Any) -> None:
        """Привязать FastAPI-приложение для in-process ASGI-вызовов."""
        self._asgi_app = app

    async def _request(
        self,
        method: str,
        path: str,
        *,
        authorization: str,
        json_body: dict[str, Any] | None = None,
        idempotency_key: str | None = None,
    ) -> Any:
        headers = _auth_header(authorization)
        headers["Accept"] = "application/json"
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key
        url = f"{self._base_url}{path}"
        logger.info(
            "mcp_world_import rest method=%s path=%s idempotency=%s",
            method,
            path,
            "yes" if idempotency_key else "no",
        )
        if self._client is not None:
            resp = await self._client.request(
                method, url, headers=headers, json=json_body
            )
        elif self._asgi_app is not None:
            transport = httpx.ASGITransport(
                app=self._asgi_app, raise_app_exceptions=False
            )
            async with httpx.AsyncClient(
                transport=transport, base_url=self._base_url
            ) as client:
                resp = await client.request(
                    method, path, headers=headers, json=json_body
                )
        else:
            async with httpx.AsyncClient(base_url=self._base_url) as client:
                resp = await client.request(
                    method, path, headers=headers, json=json_body
                )

        if resp.status_code >= 400:
            raise _parse_error(resp, path=path)
        if resp.status_code == 204 or not resp.content:
            return {}
        return resp.json()

    async def validate_world(
        self,
        *,
        setting_id: str | UUID,
        authorization: str,
        files: list[dict[str, Any]],
        rules_edition: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"files": files}
        if rules_edition is not None:
            body["rules_edition"] = rules_edition
        return await self._request(
            "POST",
            f"/settings/{setting_id}/world-imports/validate",
            authorization=authorization,
            json_body=body,
        )

    async def upsert_world_files(
        self,
        *,
        setting_id: str | UUID,
        authorization: str,
        files: list[dict[str, Any]],
        rules_edition: str | None = None,
        idempotency_key: str | None = None,
        source_ref: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {
            "files": files,
            "source_kind": "mcp",
        }
        if rules_edition is not None:
            body["rules_edition"] = rules_edition
        if source_ref is not None:
            body["source_ref"] = source_ref
        return await self._request(
            "POST",
            f"/settings/{setting_id}/world-imports",
            authorization=authorization,
            json_body=body,
            idempotency_key=idempotency_key,
        )

    async def import_world_from_git(
        self,
        *,
        setting_id: str | UUID,
        authorization: str,
        url: str,
        rules_edition: str | None = None,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"url": url}
        if rules_edition is not None:
            body["rules_edition"] = rules_edition
        return await self._request(
            "POST",
            f"/settings/{setting_id}/world-imports/from-git",
            authorization=authorization,
            json_body=body,
            idempotency_key=idempotency_key,
        )

    async def get_import_status(
        self,
        *,
        setting_id: str | UUID,
        job_id: str | UUID,
        authorization: str,
    ) -> dict[str, Any]:
        return await self._request(
            "GET",
            f"/settings/{setting_id}/world-imports/{job_id}",
            authorization=authorization,
        )

    async def get_import_diff(
        self,
        *,
        setting_id: str | UUID,
        job_id: str | UUID,
        authorization: str,
    ) -> dict[str, Any]:
        return await self._request(
            "GET",
            f"/settings/{setting_id}/world-imports/{job_id}/diff",
            authorization=authorization,
        )

    async def confirm_import(
        self,
        *,
        setting_id: str | UUID,
        job_id: str | UUID,
        authorization: str,
        item_ids: list[str] | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {}
        if item_ids is not None:
            body["item_ids"] = item_ids
        return await self._request(
            "POST",
            f"/settings/{setting_id}/world-imports/{job_id}/confirm",
            authorization=authorization,
            json_body=body or None,
        )

    async def undo_import_confirm(
        self,
        *,
        setting_id: str | UUID,
        job_id: str | UUID,
        authorization: str,
    ) -> dict[str, Any]:
        return await self._request(
            "POST",
            f"/settings/{setting_id}/world-imports/{job_id}/undo",
            authorization=authorization,
        )
