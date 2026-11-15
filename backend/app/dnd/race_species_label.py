"""P24-01: UI label for lineage — «раса» (2014) / «вид» (2024).

Catalog kind stays ``race`` for both editions. Only the player-facing word changes.
"""

from __future__ import annotations

from typing import Any


def race_species_label(rules_edition: str | Any | None) -> str:
    """Return the Russian noun for the lineage field."""
    value = getattr(rules_edition, "value", rules_edition)
    text = str(value or "2014").strip()
    if text == "2024":
        return "вид"
    return "раса"


def race_species_label_title(rules_edition: str | Any | None) -> str:
    """Capitalized label for form fields and section titles."""
    word = race_species_label(rules_edition)
    return word[:1].upper() + word[1:]


def race_species_section_title(rules_edition: str | Any | None) -> str:
    """Section heading: «Раса и прошлое» / «Вид и прошлое»."""
    return f"{race_species_label_title(rules_edition)} и прошлое"
