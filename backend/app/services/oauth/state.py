from __future__ import annotations

import secrets
import time

_STATE_TTL_SECONDS = 600
_oauth_states: dict[str, float] = {}


def issue_oauth_state() -> str:
    state = secrets.token_urlsafe(24)
    _oauth_states[state] = time.time() + _STATE_TTL_SECONDS
    return state


def consume_oauth_state(state: str | None) -> bool:
    if not state:
        return False
    expires_at = _oauth_states.pop(state, None)
    if expires_at is None:
        return False
    return expires_at >= time.time()
