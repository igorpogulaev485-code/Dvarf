"""Запуск: python -m app.mcp.world_import из каталога backend."""

from app.mcp.world_import import world_import_mcp
from app.core.config import settings

if __name__ == "__main__":
    world_import_mcp.settings.host = "127.0.0.1"
    world_import_mcp.settings.port = int(settings.mcp_port or 8100)
    world_import_mcp.settings.streamable_http_path = "/mcp/world-import"
    world_import_mcp.run(transport="streamable-http")
