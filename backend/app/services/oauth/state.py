"""Signed OAuth state (works across multiple uvicorn workers).

Optional PKCE code_verifier is embedded for VK ID.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from dataclasses import dataclass

from app.core.config import settings

_STATE_TTL_SECONDS = 600


def _signing_key() -> bytes:
    # Prefer JWT secret so state is stable across restarts without extra env.
    return (settings.jwt_secret or "dvarf-oauth-dev").encode("utf-8")


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _b64url_decode(data: str) -> bytes:
    pad = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + pad)


def _sign(payload_b64: str) -> str:
    digest = hmac.new(_signing_key(), payload_b64.encode("ascii"), hashlib.sha256).digest()
    return _b64url(digest)


@dataclass(frozen=True)
class OAuthStatePayload:
    nonce: str
    exp: int
    code_verifier: str | None = None


def issue_oauth_state(*, code_verifier: str | None = None) -> str:
    payload = {
        "n": secrets.token_urlsafe(16),
        "e": int(time.time()) + _STATE_TTL_SECONDS,
    }
    if code_verifier:
        payload["v"] = code_verifier
    payload_b64 = _b64url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    return f"{payload_b64}.{_sign(payload_b64)}"


def consume_oauth_state(state: str | None) -> OAuthStatePayload | None:
    """Verify signature + expiry. Returns payload or None."""
    if not state or "." not in state:
        return None
    payload_b64, _, sig = state.partition(".")
    if not payload_b64 or not sig:
        return None
    if not hmac.compare_digest(_sign(payload_b64), sig):
        return None
    try:
        raw = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError):
        return None
    try:
        exp = int(raw.get("e", 0))
    except (TypeError, ValueError):
        return None
    if exp < int(time.time()):
        return None
    nonce = str(raw.get("n") or "").strip()
    if not nonce:
        return None
    verifier = raw.get("v")
    return OAuthStatePayload(
        nonce=nonce,
        exp=exp,
        code_verifier=str(verifier) if verifier else None,
    )


def make_pkce_pair() -> tuple[str, str]:
    """Return (code_verifier, code_challenge S256)."""
    verifier = secrets.token_urlsafe(64)[:128]
    challenge = _b64url(hashlib.sha256(verifier.encode("ascii")).digest())
    return verifier, challenge
