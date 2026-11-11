"""Signed OAuth state (works across multiple uvicorn workers).

Optional PKCE code_verifier is embedded for VK ID.
Optional link purpose + user_id for cabinet «Привязать».
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from dataclasses import dataclass
from uuid import UUID

from app.core.config import settings

_STATE_TTL_SECONDS = 600
_PURPOSE_LOGIN = "login"
_PURPOSE_LINK = "link"


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
    purpose: str = _PURPOSE_LOGIN
    user_id: UUID | None = None

    @property
    def is_link(self) -> bool:
        return self.purpose == _PURPOSE_LINK and self.user_id is not None


def issue_oauth_state(
    *,
    code_verifier: str | None = None,
    purpose: str = _PURPOSE_LOGIN,
    user_id: UUID | None = None,
) -> str:
    if purpose not in {_PURPOSE_LOGIN, _PURPOSE_LINK}:
        raise ValueError(f"unsupported oauth purpose: {purpose}")
    if purpose == _PURPOSE_LINK and user_id is None:
        raise ValueError("link purpose requires user_id")

    payload: dict = {
        "n": secrets.token_urlsafe(16),
        "e": int(time.time()) + _STATE_TTL_SECONDS,
        "p": purpose,
    }
    if code_verifier:
        payload["v"] = code_verifier
    if user_id is not None:
        payload["u"] = str(user_id)
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
    purpose = str(raw.get("p") or _PURPOSE_LOGIN).strip() or _PURPOSE_LOGIN
    if purpose not in {_PURPOSE_LOGIN, _PURPOSE_LINK}:
        return None
    verifier = raw.get("v")
    user_id: UUID | None = None
    raw_uid = raw.get("u")
    if raw_uid:
        try:
            user_id = UUID(str(raw_uid))
        except (TypeError, ValueError):
            return None
    if purpose == _PURPOSE_LINK and user_id is None:
        return None
    return OAuthStatePayload(
        nonce=nonce,
        exp=exp,
        code_verifier=str(verifier) if verifier else None,
        purpose=purpose,
        user_id=user_id,
    )


def make_pkce_pair() -> tuple[str, str]:
    """Return (code_verifier, code_challenge S256)."""
    verifier = secrets.token_urlsafe(64)[:128]
    challenge = _b64url(hashlib.sha256(verifier.encode("ascii")).digest())
    return verifier, challenge
