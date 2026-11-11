"""Совместимость: session_hub живёт в app.realtime.hub."""

from app.realtime.hub import session_hub

__all__ = ["session_hub"]
