"""Selfcheck for OAuth helpers (no network)."""

from __future__ import annotations

from app.services.oauth.state import consume_oauth_state, issue_oauth_state, make_pkce_pair


def main() -> None:
    state = issue_oauth_state()
    payload = consume_oauth_state(state)
    assert payload is not None
    assert payload.code_verifier is None

    verifier, challenge = make_pkce_pair()
    assert len(verifier) >= 43
    assert challenge
    state2 = issue_oauth_state(code_verifier=verifier)
    payload2 = consume_oauth_state(state2)
    assert payload2 is not None
    assert payload2.code_verifier == verifier

    assert consume_oauth_state("tampered.sig") is None
    assert consume_oauth_state(None) is None
    print("oauth_selfcheck ok")


if __name__ == "__main__":
    main()
