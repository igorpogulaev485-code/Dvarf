"""P24-01: lobby rules_edition helpers."""

from __future__ import annotations

from typing import Any

from app.core.exceptions import AppError
from app.models.character import RulesEdition


def normalize_lobby_rules_edition(value: str | RulesEdition | None) -> RulesEdition:
    """Parse create payload; missing/blank → 2014."""
    if value is None or value == "":
        return RulesEdition.edition_2014
    if isinstance(value, RulesEdition):
        return value
    text = str(value).strip()
    if text == "2014":
        return RulesEdition.edition_2014
    if text == "2024":
        return RulesEdition.edition_2024
    raise AppError(
        "Редакция лобби должна быть 2014 или 2024",
        code="lobby_rules_edition_invalid",
        status_code=400,
    )


def lobby_rules_edition_value(lobby: Any) -> str:
    """Resolve edition string for API out; legacy rows without column → 2014."""
    raw = getattr(lobby, "rules_edition", None)
    if raw is None:
        return "2014"
    if isinstance(raw, RulesEdition):
        return raw.value
    text = str(raw).strip()
    return text if text in {"2014", "2024"} else "2014"


def character_rules_edition_value(character: Any) -> str:
    raw = getattr(character, "rules_edition", None)
    if isinstance(raw, RulesEdition):
        return raw.value
    text = str(raw or "2014").strip()
    return text if text in {"2014", "2024"} else "2014"


def ensure_character_matches_lobby(*, lobby: Any, character: Any) -> None:
    """Reject seating/joining a character of the other edition."""
    lobby_ed = lobby_rules_edition_value(lobby)
    char_ed = character_rules_edition_value(character)
    if lobby_ed == char_ed:
        return
    raise AppError(
        f"Этот стол играет по редакции {lobby_ed}. "
        f"Персонаж создан по редакции {char_ed} — посадить нельзя. "
        f"Выберите героя той же редакции или другое лобби.",
        code="lobby_rules_edition_mismatch",
        status_code=400,
        data={
            "lobby_rules_edition": lobby_ed,
            "character_rules_edition": char_ed,
        },
    )
